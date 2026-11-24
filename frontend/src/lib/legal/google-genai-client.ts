import { GoogleGenAI, GoogleGenAIInteraction, Interactions } from '@google/genai';
import { LegalQuery } from './types';
import { getCaseLawService, caseLawSearchFunction } from './caselaw-service';

// All model calls use the Interactions API (client.interactions.create). The
// server keeps conversation state, so a function-calling round only sends the
// new function results plus previous_interaction_id, and thought signatures
// never have to be echoed back by hand.

// The model may search several times before answering; this bounds the loop so a
// model that keeps requesting searches cannot spin forever.
const MAX_FUNCTION_CALL_ROUNDS = 5;

// Transient upstream failures ("model is experiencing high demand" is a 503).
// These are retried with backoff, then the request falls back to another model.
const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);
const RETRY_DELAYS_MS = [1000, 3000];
// A different model has separate capacity, so it is usually up when the primary is overloaded.
const DEFAULT_FALLBACK_MODEL = 'gemini-3.8-flash';

// Gemini 4 defaults safety to off; keep the app's previous thresholds explicit.
const SAFETY_SETTINGS: Interactions.SafetySetting[] = [
  { type: 'hate_speech', threshold: 'block_only_high' },
  { type: 'dangerous_content', threshold: 'block_only_high' },
];

const CASE_LAW_TOOL: Interactions.Tool = {
  type: 'function',
  name: caseLawSearchFunction.name!,
  description: caseLawSearchFunction.description,
  parameters: caseLawSearchFunction.parametersJsonSchema as Record<string, unknown>,
};

type CreateParams = Omit<
  Interactions.InteractionCreateParams.CreateModelInteractionParamsNonStreaming,
  'model'
>;

// The model serving one request. Set by its first successful call and then held
// for the rest of that request: a previous_interaction_id chain belongs to the
// model that produced it and must not be continued on a different one.
type ModelPin = { model?: string };

type CaseLawSearchArgs = {
  query: string;
  jurisdiction?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
};

type CaseLawResult = {
  caseName: string;
  citation: string;
  court: string;
  dateFiled: string;
  url: string;
  snippet?: string;
  relevanceScore?: number;
};

type FunctionCallRecord = {
  name: string;
  args: Record<string, string | number | boolean>;
  result?: {
    success: boolean;
    data?: CaseLawResult[];
    searchQuery?: string;
    totalResults?: number;
    error?: string;
  };
};

function isRetryable(error: unknown): boolean {
  // generateContent errors are ApiError and Interactions errors are APIError;
  // both carry a numeric status, so read it structurally.
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return RETRYABLE_STATUSES.has(status);
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|500|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(message);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function functionCallSteps(interaction: GoogleGenAIInteraction): Interactions.FunctionCallStep[] {
  return interaction.steps.filter(
    (step): step is Interactions.FunctionCallStep => step.type === 'function_call'
  );
}

// Uploaded files are referenced by their Files API URI; the content type picks
// the input kind.
function fileInput(doc: { uri: string; mimeType: string }): Interactions.Content {
  if (doc.mimeType.startsWith('image/')) return { type: 'image', uri: doc.uri, mime_type: doc.mimeType } as Interactions.Content;
  if (doc.mimeType.startsWith('audio/')) return { type: 'audio', uri: doc.uri, mime_type: doc.mimeType } as Interactions.Content;
  if (doc.mimeType.startsWith('video/')) return { type: 'video', uri: doc.uri, mime_type: doc.mimeType } as Interactions.Content;
  return { type: 'document', uri: doc.uri, mime_type: doc.mimeType };
}

export class LegalGoogleGenAIClient {
  private client: GoogleGenAI;
  private modelName: string;
  private fallbackModelName: string;
  private caseLawService;

  constructor(
    apiKey?: string,
    modelName: string = 'gemini-4-hydrogen'
  ) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!key) {
      throw new Error('Google GenAI API key is required.');
    }

    this.client = new GoogleGenAI({
      apiKey: key
    });

    this.modelName = modelName;
    this.fallbackModelName = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
    this.caseLawService = getCaseLawService(process.env.COURTLISTENER_API_KEY);
  }

  /**
   * Create an interaction, retrying transient failures (overload, rate limit)
   * with backoff, then trying the fallback model once the primary keeps failing.
   * Only the first call of a request may fall back; later calls stay on the
   * pinned model. Non-transient errors (bad request, auth) are thrown immediately.
   */
  private async createInteraction(pin: ModelPin, params: CreateParams): Promise<GoogleGenAIInteraction> {
    const models = pin.model ? [pin.model] : [this.modelName];
    if (!pin.model && this.fallbackModelName && this.fallbackModelName !== this.modelName) {
      models.push(this.fallbackModelName);
    }

    let lastError: unknown;
    for (const model of models) {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          const interaction = await this.client.interactions.create({ ...params, model });
          pin.model = model;
          return interaction;
        } catch (error) {
          lastError = error;
          if (!isRetryable(error)) throw error;
          if (attempt < RETRY_DELAYS_MS.length) {
            console.warn(`[${model}] transient error, retrying in ${RETRY_DELAYS_MS[attempt]}ms:`, error instanceof Error ? error.message : error);
            await sleep(RETRY_DELAYS_MS[attempt]);
          }
        }
      }
      console.warn(`[${model}] still unavailable after retries; trying next model.`);
    }
    throw lastError;
  }

  /**
   * ✅ NEW: Verify citations in the analysis text
   */
  private verifyCitations(analysisText: string): string[] {
    // Volume + reporter + page, e.g. 70 N.Y.2d 76 / 3 Cal.App.5th 655 / 814 F. Supp. 337.
    // Reporters carry digits and spaces, and the model wraps citations in markdown
    // emphasis, so both have to be accounted for or nothing matches.
    const citationPattern = /\b\d+\s+[A-Z][A-Za-z.]*(?:\s[A-Z][A-Za-z.]*)*(?:\s?\d+(?:d|th|st|nd|rd))?\s+\d+\b/g;
    const citations = analysisText.replace(/[*`_]+/g, '').match(citationPattern) || [];
    return [...new Set(citations)]; // Deduplicate
  }

  /**
   * Single-turn text generation with no tools.
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    // No sampling params (temperature/top_p): Gemini 4 ignores or rejects them.
    // No max_output_tokens: thinking shares the budget, and any cap truncates.
    const interaction = await this.createInteraction({}, {
      input: prompt,
      system_instruction: systemInstruction,
      safety_settings: SAFETY_SETTINGS,
      // Short classification; deep reasoning only adds latency here.
      generation_config: { thinking_level: 'low' },
    });
    return interaction.output_text || '';
  }

  /**
   * ✅ Process legal query with function calling and capture all metadata
   */
  async processLegalQuery(query: LegalQuery): Promise<{
    content: string;
    model: string;
    processingTime: number;
    tokenCount: number;
    functionCalls?: FunctionCallRecord[];
    caseLawResults?: CaseLawResult[];
    verifiedCitations?: string[];
  }> {
    const userContent = `
**Legal Context:**
- Domain: ${query.domain}
- Jurisdiction: ${query.jurisdiction}
- Query: ${query.content}

When you need to cite specific cases, use the search_case_law function to find relevant precedents.
`;

    const startTime = new Date();
    const pin: ModelPin = {};
    const functionCalls: FunctionCallRecord[] = [];
    const allCaseLawResults: CaseLawResult[] = [];
    let tokenCount = 0;

    // tools / safety_settings are interaction-scoped, so they are resent each round.
    // Hydrogen defaults to 'high' thinking. 'medium' matches what this app ran at
    // on 3.8 Flash and keeps a multi-search request well inside the route timeout.
    const generationConfig: Interactions.GenerationConfig = { thinking_level: 'medium' };
    const baseParams: CreateParams = {
      safety_settings: SAFETY_SETTINGS,
      generation_config: generationConfig,
      tools: query.requiresResearch ? [CASE_LAW_TOOL] : undefined,
    };

    const initialInput: Interactions.Content[] = [{ type: 'text', text: userContent }];
    for (const doc of query.documents ?? []) {
      initialInput.push(fileInput(doc));
    }

    // A list input is a list of steps, so the prompt and documents go in one user_input step.
    let interaction = await this.createInteraction(pin, {
      ...baseParams,
      input: [{ type: 'user_input', content: initialInput }] as Interactions.Step[],
    });
    tokenCount += interaction.usage?.total_tokens ?? 0;

    // The model routinely searches more than once before it answers, so keep
    // feeding results back until it stops asking.
    let rounds = 0;
    let calls = functionCallSteps(interaction);
    while (calls.length > 0 && rounds < MAX_FUNCTION_CALL_ROUNDS) {
      rounds++;
      console.log(`Model requested function calls (round ${rounds}):`, calls.map(c => ({ name: c.name, args: c.arguments })));

      const results = await Promise.all(calls.map(call => this.runCaseLawCall(call, functionCalls, allCaseLawResults)));

      interaction = await this.createInteraction(pin, {
        ...baseParams,
        previous_interaction_id: interaction.id,
        input: results,
      });
      tokenCount += interaction.usage?.total_tokens ?? 0;
      calls = functionCallSteps(interaction);
    }

    // If we ran out of rounds while the model still wanted to search, it has not
    // written an answer yet. Answer its pending calls, withhold the tools, and
    // tell it to write the analysis from what it already has.
    if (calls.length > 0) {
      console.warn(
        `Stopped after ${MAX_FUNCTION_CALL_ROUNDS} function-calling rounds while the model was ` +
        `still requesting searches; forcing a final answer from the results gathered so far.`
      );

      interaction = await this.createInteraction(pin, {
        safety_settings: SAFETY_SETTINGS,
        generation_config: generationConfig,
        previous_interaction_id: interaction.id,
        input: [
          ...calls.map((call): Interactions.FunctionResultStep => ({
            type: 'function_result',
            call_id: call.id,
            name: call.name,
            result: 'Search limit reached; no further searches are available.',
          })),
          { type: 'user_input', content: [{ type: 'text', text: 'Stop searching and provide your complete legal analysis now, using the case law already retrieved.' }] },
        ] as Interactions.Step[],
      });
      tokenCount += interaction.usage?.total_tokens ?? 0;
    }

    const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;
    const content = interaction.output_text || '';
    const verifiedCitations = this.verifyCitations(content);
    const model = pin.model ?? this.modelName;

    // Partial legal advice must never be passed off as a complete analysis.
    if (interaction.status && interaction.status !== 'completed') {
      console.warn(
        `[${model}] Interaction ended with status=${interaction.status}; ` +
        `the analysis may be incomplete and must not be treated as final.`
      );
    }

    return {
      content,
      model,
      processingTime,
      tokenCount,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      caseLawResults: allCaseLawResults.length > 0 ? allCaseLawResults : undefined,
      verifiedCitations
    };
  }

  /**
   * Run one search_case_law call, record it, and build the function_result step.
   */
  private async runCaseLawCall(
    call: Interactions.FunctionCallStep,
    functionCalls: FunctionCallRecord[],
    allCaseLawResults: CaseLawResult[]
  ): Promise<Interactions.FunctionResultStep> {
    // Drop undefined values so the recorded args stay serialisable.
    const cleanArgs = Object.fromEntries(
      Object.entries(call.arguments || {}).filter(([, v]) => v !== undefined)
    ) as Record<string, string | number | boolean>;

    if (call.name !== 'search_case_law') {
      functionCalls.push({ name: call.name, args: cleanArgs, result: { success: false, error: `Unknown function: ${call.name}` } });
      return { type: 'function_result', call_id: call.id, name: call.name, result: `Unknown function: ${call.name}`, is_error: true };
    }

    const args = call.arguments as CaseLawSearchArgs;
    try {
      const searchResults = await this.caseLawService.searchCaseLaw(
        args.query,
        args.jurisdiction,
        args.start_date,
        args.end_date,
        args.limit || 5
      );

      const caseLawData: CaseLawResult[] = searchResults.results.map(r => ({
        caseName: r.caseName,
        citation: r.citation,
        court: r.court,
        dateFiled: r.date,
        url: r.url,
        snippet: r.snippet,
        relevanceScore: undefined // CourtListener doesn't expose BM25 score in transformed results
      }));

      functionCalls.push({
        name: call.name,
        args: cleanArgs,
        result: {
          success: true,
          data: caseLawData,
          searchQuery: args.query,
          totalResults: searchResults.count
        }
      });
      allCaseLawResults.push(...caseLawData);

      return {
        type: 'function_result',
        call_id: call.id,
        name: call.name,
        result: this.caseLawService.formatResultsForAI(searchResults),
      };
    } catch (error) {
      console.error(`Function call error for ${call.name}:`, error);
      functionCalls.push({
        name: call.name,
        args: cleanArgs,
        result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return { type: 'function_result', call_id: call.id, name: call.name, result: 'Error executing function', is_error: true };
    }
  }

  /**
   * Analyze legal query to detect domain, jurisdiction, and urgency
   */
  async analyzeLegalQuery(content: string): Promise<{
    domain: string;
    jurisdiction: string;
    urgency: string;
    confidence: {
      domain: number;
      jurisdiction: number;
      urgency: number;
    };
    reasoning: {
      domain: string;
      jurisdiction: string;
      urgency: string;
    };
  }> {
    const analysisPrompt = `You are a legal AI assistant. Analyze the following legal query and determine:

1. Legal Domain (choose ONE that best fits):
   - contract_law
   - corporate_law  
   - litigation
   - ip_law (intellectual property)
   - employment_law
   - real_estate_law
   - tax_law
   - regulatory_compliance
   - family_law

2. Jurisdiction (choose ONE that best fits):
   - federal
   - state
   - international
   - administrative

3. Urgency Level (choose ONE that best fits):
   - emergency (immediate action required)
   - urgent (24-48 hours)
   - high (within a week)
   - medium (within a month)
   - low (no immediate timeline)

4. Confidence scores (0.0 to 1.0) for each classification.

Query to analyze: "${content}"

Respond ONLY with a JSON object in this exact format:
{
  "domain": "contract_law",
  "jurisdiction": "federal", 
  "urgency": "medium",
  "confidence": {
    "domain": 0.85,
    "jurisdiction": 0.70,
    "urgency": 0.90
  },
  "reasoning": {
    "domain": "Brief explanation why this domain was chosen",
    "jurisdiction": "Brief explanation why this jurisdiction was chosen", 
    "urgency": "Brief explanation why this urgency level was chosen"
  }
}`;

    try {
      // No tools: this is a pure JSON classification, and a tool call here would
      // leave the response text empty and break the JSON parse.
      const analysisText = await this.generateText(analysisPrompt);

      if (!analysisText) {
        throw new Error('No analysis response from Gemini');
      }

      console.log('Raw Gemini analysis response:', analysisText);

      try {
        const cleanedText = analysisText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        const analysis = JSON.parse(cleanedText);

        if (!analysis.domain || !analysis.jurisdiction || !analysis.urgency) {
          throw new Error('Invalid analysis response structure');
        }

        return {
          domain: analysis.domain,
          jurisdiction: analysis.jurisdiction,
          urgency: analysis.urgency,
          confidence: analysis.confidence || {
            domain: 0.8,
            jurisdiction: 0.7,
            urgency: 0.8
          },
          reasoning: analysis.reasoning || {
            domain: 'Analysis completed',
            jurisdiction: 'Analysis completed',
            urgency: 'Analysis completed'
          }
        };

      } catch (parseError) {
        console.error('Failed to parse Gemini analysis response:', parseError);
        console.error('Raw response:', analysisText);

        const domainMatch = analysisText.match(/"domain":\s*"([^"]+)"/);
        const jurisdictionMatch = analysisText.match(/"jurisdiction":\s*"([^"]+)"/);
        const urgencyMatch = analysisText.match(/"urgency":\s*"([^"]+)"/);

        if (domainMatch && jurisdictionMatch && urgencyMatch) {
          return {
            domain: domainMatch[1],
            jurisdiction: jurisdictionMatch[1],
            urgency: urgencyMatch[1],
            confidence: {
              domain: 0.7,
              jurisdiction: 0.6,
              urgency: 0.7
            },
            reasoning: {
              domain: 'Extracted from response',
              jurisdiction: 'Extracted from response',
              urgency: 'Extracted from response'
            }
          };
        }

        return {
          domain: 'contract_law',
          jurisdiction: 'federal',
          urgency: 'medium',
          confidence: {
            domain: 0.5,
            jurisdiction: 0.5,
            urgency: 0.5
          },
          reasoning: {
            domain: 'Default fallback',
            jurisdiction: 'Default fallback',
            urgency: 'Default fallback'
          }
        };
      }

    } catch (error) {
      console.error('Error analyzing legal query with Gemini:', error);
      throw error;
    }
  }
}

// Singleton instance
let legalGoogleGenAIClient: LegalGoogleGenAIClient | null = null;

export function getLegalGoogleGenAIClient(): LegalGoogleGenAIClient {
  if (!legalGoogleGenAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-4-hydrogen';

    console.log(`Creating Legal Google GenAI client with model: ${modelName}`);

    if (!apiKey) {
      throw new Error('Google GenAI API key not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
    }

    legalGoogleGenAIClient = new LegalGoogleGenAIClient(apiKey, modelName);
  }
  return legalGoogleGenAIClient;
}