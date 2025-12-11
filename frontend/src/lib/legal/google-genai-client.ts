import { GoogleGenAI, SafetySetting, FunctionCall, GenerateContentConfig } from '@google/genai';
import { LegalQuery } from './types';
import { getCaseLawService, caseLawSearchFunction } from './caselaw-service';

export class LegalGoogleGenAIClient {
  private client: GoogleGenAI;
  private modelName: string;
  private caseLawService;

  constructor(
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash'
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
    this.caseLawService = getCaseLawService(process.env.COURTLISTENER_API_KEY);
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
    temperature: number = 0.3,
    maxOutputTokens: number = 8196,
    enableCaseLawSearch: boolean = true  // ✅ Option to enable/disable function calling
  ) {
    try {
      const config: GenerateContentConfig = {
        temperature,
        maxOutputTokens,
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

      // ✅ First request to the model
      let response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
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
            role: 'model',
            parts: response.functionCalls.map(fc => ({
              functionCall: {
                name: fc.name,
                args: fc.args
              }
            }))
          },
          {
            role: 'user',
            parts: functionResponses.map(fr => ({
              functionResponse: fr
            }))
          }
        ];

        // ✅ Get final response from model
        response = await this.client.models.generateContent({
          model: this.modelName,
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
  }> {
    const userContent = `
**Legal Context:**
- Domain: ${query.domain}
- Jurisdiction: ${query.jurisdiction}
- Query: ${query.content}

When you need to cite specific cases, use the search_case_law function to find relevant precedents.
`;

    const startTime = new Date();
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
    const config = {
      temperature: query.temperature || 0.3,
      maxOutputTokens: query.maxTokens || 8196,
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
      ] as SafetySetting[],
      tools: query.requiresResearch ? [{
        functionDeclarations: [caseLawSearchFunction]
      }] : undefined
    };

    let response = await this.client.models.generateContent({
      model: this.modelName,
      contents: [{
        role: 'user',
        parts: [{ text: userContent }]
      }],
      config: config
    });

    // ✅ Handle function calls and capture metadata
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log('Model requested function calls:', response.functionCalls);

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

      // ✅ Send function results back to model
      const contents = [
        {
          role: 'user',
          parts: [{ text: userContent }]
        },
        {
          role: 'model',
          parts: response.functionCalls.map(fc => ({
            functionCall: {
              name: fc.name,
              args: fc.args
            }
          }))
        },
        {
          role: 'user',
          parts: functionResponses.map(fr => ({
            functionResponse: fr
          }))
        }
      ];

      // ✅ Get final response from model
      response = await this.client.models.generateContent({
        model: this.modelName,
        contents: contents,
        config: config
      });
    }
    
    const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;

    return {
      content: response.text || '',
      model: this.modelName,
      processingTime,
      tokenCount: response.usageMetadata?.totalTokenCount || 0,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      caseLawResults: allCaseLawResults.length > 0 ? allCaseLawResults : undefined
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
      const response = await this.generateContent(analysisPrompt, undefined, 0.1, 1000);
      
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

// Old commented code below - keeping for reference
//   async analyzeLegalQuery(content: string): Promise<{
//     domain: string;
//     jurisdiction: string;
//     urgency: string;
//     confidence: {
//       domain: number;
//       jurisdiction: number;
//       urgency: number;
//     };
//     reasoning: {
//       domain: string;
//       jurisdiction: string;
//       urgency: string;
//     };
//   }> {
//     const analysisPrompt = `You are a legal AI assistant. Analyze the following legal query and determine:

// 1. Legal Domain (choose ONE that best fits):
//    - contract_law
//    - corporate_law  
//    - litigation
//    - ip_law (intellectual property)
//    - employment_law
//    - real_estate_law
//    - tax_law
//    - regulatory_compliance
//    - family_law

// 2. Jurisdiction (choose ONE that best fits):
//    - federal
//    - state
//    - international
//    - administrative

// 3. Urgency Level (choose ONE that best fits):
//    - emergency (immediate action required)
//    - urgent (24-48 hours)
//    - high (within a week)
//    - medium (within a month)
//    - low (no immediate timeline)

// 4. Confidence scores (0.0 to 1.0) for each classification.

// Query to analyze: "${content}"

// Respond ONLY with a JSON object in this exact format:
// {
//   "domain": "contract_law",
//   "jurisdiction": "federal", 
//   "urgency": "medium",
//   "confidence": {
//     "domain": 0.85,
//     "jurisdiction": 0.70,
//     "urgency": 0.90
//   },
//   "reasoning": {
//     "domain": "Brief explanation why this domain was chosen",
//     "jurisdiction": "Brief explanation why this jurisdiction was chosen", 
//     "urgency": "Brief explanation why this urgency level was chosen"
//   }
// }`;

//     try {
//       const response = await this.generateContent(analysisPrompt, undefined, 0.1, 1000);
      
//       // Extract text from response using the official SDK
//       const analysisText = response.text;
      
//       if (!analysisText) {
//         throw new Error('No analysis response from Google GenAI');
//       }

//       console.log('Raw Google GenAI analysis response:', analysisText);

//       // Parse the JSON response
//       try {
//         // Clean the response text (remove markdown formatting if present)
//         const cleanedText = analysisText
//           .replace(/```json\s*/g, '')
//           .replace(/```\s*/g, '')
//           .trim();
        
//         const analysis = JSON.parse(cleanedText);
        
//         // Validate the response structure
//         if (!analysis.domain || !analysis.jurisdiction || !analysis.urgency) {
//           throw new Error('Invalid analysis response structure');
//         }
        
//         return {
//           domain: analysis.domain,
//           jurisdiction: analysis.jurisdiction,
//           urgency: analysis.urgency,
//           confidence: analysis.confidence || {
//             domain: 0.8,
//             jurisdiction: 0.7,
//             urgency: 0.8
//           },
//           reasoning: analysis.reasoning || {
//             domain: 'Analysis completed',
//             jurisdiction: 'Analysis completed',
//             urgency: 'Analysis completed'
//           }
//         };
        
//       } catch (parseError) {
//         console.error('Failed to parse Google GenAI analysis response:', parseError);
//         console.error('Raw response:', analysisText);
        
//         // Fallback: try to extract values using regex
//         const domainMatch = analysisText.match(/"domain":\s*"([^"]+)"/);
//         const jurisdictionMatch = analysisText.match(/"jurisdiction":\s*"([^"]+)"/);
//         const urgencyMatch = analysisText.match(/"urgency":\s*"([^"]+)"/);
        
//         if (domainMatch && jurisdictionMatch && urgencyMatch) {
//           return {
//             domain: domainMatch[1],
//             jurisdiction: jurisdictionMatch[1],
//             urgency: urgencyMatch[1],
//             confidence: {
//               domain: 0.7,
//               jurisdiction: 0.6,
//               urgency: 0.7
//             },
//             reasoning: {
//               domain: 'Extracted from response',
//               jurisdiction: 'Extracted from response',
//               urgency: 'Extracted from response'
//             }
//           };
//         }
        
//         // Ultimate fallback
//         return {
//           domain: 'contract_law',
//           jurisdiction: 'federal',
//           urgency: 'medium',
//           confidence: {
//             domain: 0.5,
//             jurisdiction: 0.5,
//             urgency: 0.5
//           },
//           reasoning: {
//             domain: 'Default fallback',
//             jurisdiction: 'Default fallback',
//             urgency: 'Default fallback'
//           }
//         };
//       }
      
//     } catch (error) {
//       console.error('Error analyzing legal query with Google GenAI:', error);
//       throw error;
//     }
//   }

//   /**
//    * Process legal query with comprehensive analysis
//    */
//   async processLegalQuery(query: LegalQuery): Promise<{
//     content: string;
//     model: string;
//     processingTime: number;
//     tokenCount: number;
//   }> {
//     console.log(`Processing legal query (Task ID: ${query.taskId || 'N/A'})`);

//     try {
//       const systemInstruction = `You are an expert legal AI assistant. Analyze the provided query within its context (domain, jurisdiction, urgency). 

// Format your response using clear markdown with proper headers, lists, and emphasis. Provide a comprehensive response covering:

// # Legal Analysis

// ## 1. Jurisdictional Analysis
// Key requirements, deadlines, and considerations for the specified jurisdiction.

// ## 2. Applicable Law
// Identify relevant statutes, regulations, and common law principles with proper citations.

// ## 3. Precedent Review
// Mention significant relevant case law (if applicable and research is enabled).

// ## 4. Risk Assessment
// Evaluate potential legal risks and their severity levels.

// ## 5. Legal Recommendations
// Offer actionable advice based on the analysis with specific steps.

// ## 6. Next Steps
// Outline concrete steps for the legal team or client with timelines.

// ## 7. Timeline Considerations
// Consider urgency and deadlines based on the specified urgency level.

// Use proper markdown formatting:
// - **Bold** for important terms and concepts
// - *Italics* for case names and legal terms
// - Numbered lists for sequential steps
// - Bullet points for key considerations
// - > Blockquotes for important legal principles

// Include specific citations (e.g., case names, statute numbers). Maintain confidentiality.`;

//       const userContent = `
// **Legal Context:**
// - Task ID: ${query.taskId || 'N/A'}
// - Domain: ${query.domain}
// - Jurisdiction: ${query.jurisdiction}
// - Urgency: ${query.urgency} (${query.priority}/5 priority)
// - Client: ${query.clientInfo.name} (Matter: ${query.clientInfo.matterNumber})
// - Related Cases: ${query.relatedCases ? query.relatedCases.join(', ') : 'None'}
// - Deadline: ${query.deadline || 'N/A'}
// - Research Required: ${query.requiresResearch}

// **Legal Query:**
// ${query.content}

// **Instructions:** Provide a detailed legal analysis based on the context and query above. Structure the response clearly according to the sections outlined in the system prompt. Ensure all recommendations are practical and legally sound for the specified jurisdiction.
// `;

//       const startTime = new Date();
//       const response = await this.generateContent(
//         userContent,
//         systemInstruction,
//         query.temperature || 0.3,
//         query.maxTokens || 2048
//       );
//       const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;

//       // Extract content and usage metadata using the official SDK
//       const content = response.text;
//       const usageMetadata = response.usageMetadata;

//       if (!content) {
//         throw new Error('No content generated by Google GenAI');
//       }

//       return {
//         content,
//         model: this.modelName,
//         processingTime,
//         tokenCount: usageMetadata?.totalTokenCount || 0
//       };
      
//     } catch (error) {
//       console.error('Error processing legal query with Google GenAI:', error);
      
//       // Fallback response for testing purposes
//       return {
//         content: `# Fallback Legal Response

// This is a fallback response due to an issue with the Google GenAI API. The API key may be invalid, or there might be a network issue.

// ## Applicable Law
// N/A - Unable to access legal database due to technical issues.

// ## Risk Assessment
// MODERATE - Technical issues prevent full risk assessment.

// ## Recommendations
// 1. Please check your GEMINI_API_KEY environment variable.
// 2. Verify that your API key is valid and has access to the Google GenAI API.
// 3. If you've just created the API key, wait a few minutes and try again.

// ## Technical Details
// - Error: ${error instanceof Error ? error.message : 'Unknown error'}
// - Query content: ${query.content.substring(0, 100)}...
// `,
//         model: "fallback-model",
//         processingTime: 0.1,
//         tokenCount: 150
//       };
//     }
//   }
// }

// Singleton instance
let legalGoogleGenAIClient: LegalGoogleGenAIClient | null = null;

export function getLegalGoogleGenAIClient(): LegalGoogleGenAIClient {
  if (!legalGoogleGenAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

    console.log(`Creating Legal Google GenAI client with model: ${modelName}`);

    if (!apiKey) {
      throw new Error('Google GenAI API key not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
    }

    legalGoogleGenAIClient = new LegalGoogleGenAIClient(apiKey, modelName);
  }
  return legalGoogleGenAIClient;
}