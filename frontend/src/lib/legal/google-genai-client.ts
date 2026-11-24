import { GoogleGenAI, ApiError, SafetySetting, FunctionCall, GenerateContentConfig, GenerateContentParameters, GenerateContentResponse, Content, Part } from '@google/genai';
import { LegalQuery } from './types';
import { getCaseLawService, caseLawSearchFunction } from './caselaw-service';

// The model may search several times before answering; this bounds the loop so a
// model that keeps requesting searches cannot spin forever.
const MAX_FUNCTION_CALL_ROUNDS = 5;

// Transient upstream failures ("model is experiencing high demand" is a 503).
// These are retried with backoff, then the request falls back to another model.
const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);
const RETRY_DELAYS_MS = [1000, 3000];
// A different model has separate capacity, so it is usually up when the primary is overloaded.
const DEFAULT_FALLBACK_MODEL = 'gemini-3.8-flash';

// The model serving one request. Set by its first successful call and then held
// for the rest of that request: thought signatures and model turns in the
// history belong to that model and must not be replayed to a different one.
type ModelPin = { model?: string };

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return RETRYABLE_STATUSES.has(error.status);
  const message = error instanceof Error ? error.message : String(error);
  return /(429|500|503|504)|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(message);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // ✅ Correct initialization
    this.client = new GoogleGenAI({
      apiKey: key
    });

    this.modelName = modelName;
    this.fallbackModelName = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
    this.caseLawService = getCaseLawService(process.env.COURTLISTENER_API_KEY);
  }

  /**
   * Call the model, retrying transient failures (overload, rate limit) with
   * backoff, then trying the fallback model once the primary keeps failing.
   * Only the first call of a request may fall back; later calls stay on the
   * pinned model. Non-transient errors (bad request, auth) are thrown immediately.
   */
  private async callModel(
    pin: ModelPin,
    params: Omit<GenerateContentParameters, 'model'>
  ): Promise<GenerateContentResponse> {
    const models = pin.model ? [pin.model] : [this.modelName];
    if (!pin.model && this.fallbackModelName && this.fallbackModelName !== this.modelName) {
      models.push(this.fallbackModelName);
    }

    let lastError: unknown;
    for (const model of models) {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          const response = await this.client.models.generateContent({ ...params, model });
          pin.model = model;
          return response;
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
   * ✅ NEW: Handle function calls from the model
   */
  private async executeFunctionCall(functionCall: FunctionCall): Promise<string> {
    if (functionCall.name === 'search_case_law') {
      const args = functionCall.args as {
        query: string;
        jurisdiction?: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
      };

      // Execute the actual case law search
      const searchResults = await this.caseLawService.searchCaseLaw(
        args.query,
        args.jurisdiction,
        args.start_date,
        args.end_date,
        args.limit || 5
      );

      // Return formatted results
      return this.caseLawService.formatResultsForAI(searchResults);
    }

    throw new Error(`Unknown function: ${functionCall.name}`);
  }

  /**
   * ✅ Generate content with function calling support
   */
  async generateContent(
    prompt: string,
    systemInstruction?: string,
    enableCaseLawSearch: boolean = true,  // ✅ Option to enable/disable function calling
    documents?: { uri: string; mimeType: string; name: string }[] // ✅ Added documents support
  ) {
    const pin: ModelPin = {};
    try {
      // No temperature: Gemini 3.x is tuned for its default of 1.0, and lowering
      // it risks looping and degraded reasoning.
      // No maxOutputTokens: thinking is drawn from the same budget, so any cap
      // truncates the analysis mid-sentence. Legal advice must never be cut off.
      const config: GenerateContentConfig = {
        candidateCount: 1,
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ] as SafetySetting[]
      };

      if (systemInstruction) {
        config.systemInstruction = {
          role: 'system',
          parts: [{ text: systemInstruction }]
        };
      }

      // ✅ Add function calling if enabled
      if (enableCaseLawSearch) {
        config.tools = [{
          functionDeclarations: [caseLawSearchFunction]
        }];
        // Optional: force function calling
        // config.toolConfig = {
        //   functionCallingConfig: {
        //     mode: 'AUTO' // or 'ANY' to force
        //   }
        // };
      }

      // Build initial parts with text prompt
      const initialParts: Part[] = [{ text: prompt }];

      // ✅ Add documents if any exist
      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          initialParts.push({
            fileData: {
              fileUri: doc.uri,
              mimeType: doc.mimeType
            }
          });
        });
      }

      // ✅ First request to the model
      let response = await this.callModel(pin, {
        contents: [{
          role: 'user',
          parts: initialParts
        }] as Content[],
        config: config
      });

      // ✅ Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        console.log('Model requested function calls:', response.functionCalls);

        // Execute all function calls
        const functionResponses = await Promise.all(
          response.functionCalls.map(async (fc) => {
            const result = await this.executeFunctionCall(fc);
            return {
              name: fc.name,
              response: { result }
            };
          })
        );

        // ✅ Send function results back to model
        const contents = [
          {
            role: 'user',
            parts: [{ text: prompt }]
          },
          {
            // Echo the model turn unchanged so its thought signatures survive.
            role: 'model',
            parts: response.candidates?.[0]?.content?.parts || []
          },
          {
            role: 'user',
            parts: functionResponses.map(fr => ({
              functionResponse: fr
            }))
          }
        ];

        // ✅ Get final response from model
        response = await this.callModel(pin, {
          contents: contents,
          config: config
        });
      }

      return response;
    } catch (error) {
      console.error('Google GenAI API error:', error);
      throw error;
    }
  }

  /**
   * Process legal query with function calling support
   */
  async processLegalQuery(query: LegalQuery): Promise<{
    content: string;
    model: string;
    processingTime: number;
    tokenCount: number;
    functionCalls?: Array<{
      name: string;
      args: Record<string, string | number | boolean>;
      result?: {
        success: boolean;
        data?: Array<{
          caseName: string;
          citation: string;
          court: string;
          dateFiled: string;
          url: string;
          snippet?: string;
          relevanceScore?: number;
        }>;
        searchQuery?: string;
        totalResults?: number;
        error?: string;
      };
    }>;
    caseLawResults?: Array<{
      caseName: string;
      citation: string;
      court: string;
      dateFiled: string;
      url: string;
      snippet?: string;
      relevanceScore?: number;
    }>;
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
    const functionCalls: Array<{
      name: string;
      args: Record<string, string | number | boolean>;
      result?: {
        success: boolean;
        data?: Array<{
          caseName: string;
          citation: string;
          court: string;
          dateFiled: string;
          url: string;
          snippet?: string;
          relevanceScore?: number;
        }>;
        searchQuery?: string;
        totalResults?: number;
        error?: string;
      };
    }> = [];
    const allCaseLawResults: Array<{
      caseName: string;
      citation: string;
      court: string;
      dateFiled: string;
      url: string;
      snippet?: string;
      relevanceScore?: number;
    }> = [];

    // ✅ Custom generate content to capture function calls
    // No temperature: Gemini 3.x is tuned for its default of 1.0, and lowering it
    // risks looping and degraded reasoning.
    // No maxOutputTokens: thinking is drawn from the same budget, so any cap
    // truncates the analysis mid-sentence. Legal advice must never be cut off.
    const config = {
      candidateCount: 1,
      thinkingConfig: {
        includeThoughts: true
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ] as SafetySetting[],
      tools: query.requiresResearch ? [{
        functionDeclarations: [caseLawSearchFunction]
      }] : undefined
    };

    // Conversation history, accumulated across rounds. The model's own parts are
    // passed back verbatim so Gemini 3 thought signatures survive the round trip.
    const initialParts: Part[] = [{ text: userContent }];

    if (query.documents && query.documents.length > 0) {
      query.documents.forEach(doc => {
        initialParts.push({
          fileData: {
            fileUri: doc.uri,
            mimeType: doc.mimeType
          }
        });
      });
    }

    const contents: Content[] = [{
      role: 'user',
      parts: initialParts
    }];

    let response = await this.callModel(pin, {
      contents: contents,
      config: config
    });

    // ✅ Handle function calls and capture metadata.
    // The model routinely searches more than once before it answers, so keep
    // feeding results back until it stops asking. Handling only a single round
    // leaves response.text empty whenever it wants a follow-up search.
    let rounds = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && rounds < MAX_FUNCTION_CALL_ROUNDS) {
      rounds++;
      console.log(`Model requested function calls (round ${rounds}):`, response.functionCalls);

      // Execute all function calls and capture results
      const functionResponses = await Promise.all(
        response.functionCalls.map(async (fc) => {
          const args = fc.args as {
            query: string;
            jurisdiction?: string;
            start_date?: string;
            end_date?: string;
            limit?: number;
          };

          try {
            // Execute the case law search
            const searchResults = await this.caseLawService.searchCaseLaw(
              args.query,
              args.jurisdiction,
              args.start_date,
              args.end_date,
              args.limit || 5
            );

            // Convert to our format
            const caseLawData = searchResults.results.map(r => ({
              caseName: r.caseName,
              citation: r.citation,
              court: r.court,
              dateFiled: r.date,
              url: r.url,
              snippet: r.snippet,
              relevanceScore: undefined // CourtListener doesn't expose BM25 score in transformed results
            }));

            // Store function call metadata
            const callResult = {
              success: true,
              data: caseLawData,
              searchQuery: args.query,
              totalResults: searchResults.count
            };

            // Filter out undefined values from args
            const cleanArgs = Object.fromEntries(
              Object.entries(fc.args || {}).filter(([, v]) => v !== undefined)
            ) as Record<string, string | number | boolean>;

            functionCalls.push({
              name: fc.name || 'unknown_function',
              args: cleanArgs,
              result: callResult
            });

            // Accumulate case law results
            allCaseLawResults.push(...caseLawData);

            // Return formatted results for AI
            return {
              name: fc.name,
              response: {
                result: this.caseLawService.formatResultsForAI(searchResults)
              }
            };
          } catch (error) {
            console.error(`Function call error for ${fc.name}:`, error);
            const errorResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };

            // Filter out undefined values from args
            const cleanArgs = Object.fromEntries(
              Object.entries(fc.args || {}).filter(([, v]) => v !== undefined)
            ) as Record<string, string | number | boolean>;

            functionCalls.push({
              name: fc.name || 'unknown_function',
              args: cleanArgs,
              result: errorResult
            });
            return {
              name: fc.name,
              response: { result: 'Error executing function' }
            };
          }
        })
      );

      // ✅ Append this round to the history, then ask the model again
      contents.push({
        role: 'model',
        parts: response.candidates?.[0]?.content?.parts || []
      });
      contents.push({
        role: 'user',
        parts: functionResponses.map(fr => ({
          functionResponse: fr
        }))
      });

      response = await this.callModel(pin, {
        contents: contents,
        config: config
      });
    }

    // If we ran out of rounds while the model still wanted to search, it has not
    // written an answer yet and response.text would be empty. Ask once more with
    // the tools withheld so it must produce the analysis from what it already has.
    if (rounds >= MAX_FUNCTION_CALL_ROUNDS && response.functionCalls && response.functionCalls.length > 0) {
      console.warn(
        `Stopped after ${MAX_FUNCTION_CALL_ROUNDS} function-calling rounds while the model was ` +
        `still requesting searches; forcing a final answer from the results gathered so far.`
      );

      contents.push({
        role: 'model',
        parts: response.candidates?.[0]?.content?.parts || []
      });
      contents.push({
        role: 'user',
        parts: [{ text: 'Stop searching and provide your complete legal analysis now, using the case law already retrieved.' }]
      });

      response = await this.callModel(pin, {
        contents: contents,
        config: { ...config, tools: undefined }
      });
    }

    const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;
    const content = response.text || '';
    const verifiedCitations = this.verifyCitations(content);

    // No token cap is sent, so this should not fire; it remains as a guard against
    // hitting the model's own limits. Partial legal advice must never be passed
    // off as a complete analysis.
    if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn(
        `[${this.modelName}] Response TRUNCATED (finishReason=MAX_TOKENS, ` +
        `${response.usageMetadata?.thoughtsTokenCount ?? 0} tokens went to thinking). ` +
        `The analysis is cut off and must not be treated as complete.`
      );
    }

    return {
      content,
      model: pin.model ?? this.modelName,
      processingTime,
      tokenCount: response.usageMetadata?.totalTokenCount || 0,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      caseLawResults: allCaseLawResults.length > 0 ? allCaseLawResults : undefined,
      verifiedCitations
    };
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
      // Case law search is off: this is a pure JSON classification, and a tool
      // call here would leave the response text empty and break the JSON parse.
      const response = await this.generateContent(analysisPrompt, undefined, false);

      const analysisText = response.text;

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