/**
 * Gemini Client for legal analysis
 * Following best practices from the official documentation
 */
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { LegalQuery } from './types';

interface GeminiCompletionResponse {
  content: string;
  model: string;
  processingTime: number;
  tokenCount: number;
}

export class LegalGeminiClient {
  private client: GoogleGenAI;
  private modelName: string;

  constructor(
    apiKey: string = process.env.GEMINI_API_KEY || '',
    modelName: string = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    apiVersion: string = 'v1beta'
  ) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    // Initialize the official SDK client
    this.client = new GoogleGenAI({
      apiKey: apiKey,
      apiVersion: apiVersion
    });

    this.modelName = modelName;
    this.logConfiguration();
  }

  private logConfiguration(): void {
    console.log('Legal Gemini Client Configuration:');
    console.log(`- API Key: Set (hidden)`);
    console.log(`- Model: ${this.modelName}`);
  }

  async generateCompletion(
    systemInstruction: string,
    userContent: string,
    temperature: number = 0.3,
    maxTokens: number = 2048
  ) {
    // Use the SDK's generateContent method 
    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: userContent,
      config: {
        systemInstruction: systemInstruction,
        temperature: temperature,
        maxOutputTokens: maxTokens,
        candidateCount: 1,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
          },
          {
            category: HarmCategory.HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
          },
          {
            category: HarmCategory.HARM_CATEGORY_IMAGE_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
          },
          {
            category: HarmCategory.HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
          }
        ]
      }
    });

    return response;
  }

  async processLegalQuery(query: LegalQuery): Promise<GeminiCompletionResponse> {
    console.log(`Processing legal query with Gemini (Task ID: ${query.taskId || 'N/A'})`);

    try {
      const systemInstruction = `You are an expert legal AI assistant. Analyze the provided query within its context (domain, jurisdiction, urgancy). Provide a comprehensive response covering:
1.  **Jurisdictional Analysis:** Key requirements, deadlines, considerations for the specified jurisdiction.
2.  **Applicable Law:** Identify relevant statutes, regulations, and common law principles.
3.  **Precedent Review:** Mention significant relevant case law (if applicable and research is enabled).
4.  **Risk Assessment:** Evaluate potential legal risks and their severity.
5.  **Legal Recommendations:** Offer actionable advice based on the analysis.
6.  **Next Steps:** Outline concrete steps for the legal team or client.
7.  **Timeline:** Consider urgency and deadlines.
Include specific citations (e.g., case names, statute numbers). Maintain confidentiality.`;

      const userContent = `
      **Legal Context:**
      - Task ID ${query.taskId || 'N/A'}
      - Domain: ${query.domain}
      - Jurisdiction: ${query.jurisdiction}
      - Urgency: ${query.urgency} (${query.priority}/5 priority)
      - Client: ${query.clientInfo.name} (Matter: ${query.clientInfo.matterNumber})
      - Related Cases: ${query.relatedCases ? query.relatedCases.join(', ') : 'None'}
      - Deadline: ${query.deadline || 'N/A'}
      - Research Required: ${query.requiresResearch}
      
      **Legal Query:**
      ${query.content}

      **Instructions:** Provide a detailed legal analysis based on the context and query above. Structure the response clearly according to the sections outlined in the system prompt. Ensure all recommendations are practical and legally sound for the specified jurisdiction.
      `;

      const startTime = new Date();
      const result = await this.generateCompletion(
        systemInstruction,
        userContent,
        query.temperature || 0.3,
        query.maxTokens || 2048
      );
      const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;

      // Extract content using SDK response format
      const content = result.text || 'No response generated';
      const tokenCount = result.usageMetadata?.totalTokenCount || 0;

      return {
        content,
        model: this.modelName,
        processingTime,
        tokenCount
      };
    } catch (error) {
      console.error('Error processing legal query with Gemini:', error);

      // Fallback response
      return {
        content: `# Fallback Legal Response...`,
        model: "fallback-model",
        processingTime: 0.1,
        tokenCount: 150
      };
    }
  }
}

// interface GeminiCompletionResponse {
//   content: string;
//   model: string;
//   processingTime: number;
//   tokenCount: number;
// }

// interface GeminiAPIResponse {
//   candidates: {
//     content: {
//       parts: {
//         text: string;
//       }[];
//     };
//     finishReason?: string;
//   }[];
//   usageMetadata?: {
//     promptTokenCount: number;
//     candidatesTokenCount: number;
//     totalTokenCount: number;
//   };
//   modelVersion?: string;
// }

// export class LegalGeminiClient {
//   private apiKey: string;
//   private modelName: string;
//   private apiVersion: string;
//   private baseUrl: string;

//   constructor(
//     apiKey: string = process.env.GEMINI_API_KEY || '',
//     modelName: string = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
//     apiVersion: string = 'v1beta'
//   ) {
//     this.apiKey = apiKey;
//     this.modelName = modelName;
//     this.apiVersion = apiVersion;
//     this.baseUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
    
//     this.logConfiguration();
//   }
  
//   private logConfiguration(): void {
//     console.log('Legal Gemini Client Configuration:');
//     console.log(`- API Key: ${this.apiKey ? 'Set (hidden)' : 'Not set'}`);
//     console.log(`- Model: ${this.modelName}`);
//     console.log(`- API Version: ${this.apiVersion}`);
//     console.log(`- Base URL: ${this.baseUrl}`);
//   }
  
//   getConfigInfo(): Record<string, string> {
//     return {
//       apiKey: this.apiKey ? 'Set (hidden)' : 'Not set',
//       modelName: this.modelName,
//       apiVersion: this.apiVersion,
//       baseUrl: this.baseUrl,
//     };
//   }

//   async generateCompletion(
//     systemInstruction: string,
//     userContent: string,
//     temperature: number = 0.3,
//     maxTokens: number = 2048
//   ): Promise<GeminiAPIResponse> {
//     if (!this.apiKey) {
//       throw new Error('Gemini API key is not configured');
//     }
    
//     const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
    
//     console.log(`Making Gemini API request for legal workflow to: ${url}`);
    
//     const payload = {
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             {
//               text: userContent
//             }
//           ]
//         }
//       ],
//       systemInstruction: {
//         parts: [
//           {
//             text: systemInstruction
//           }
//         ]
//       },
//       generationConfig: {
//         temperature: temperature,
//         maxOutputTokens: maxTokens,
//         candidateCount: 1
//       },
//       safetySettings: [
//         {
//           category: 'HARM_CATEGORY_HATE_SPEECH',
//           threshold: 'BLOCK_ONLY_HIGH'
//         },
//         {
//           category: 'HARM_CATEGORY_DANGEROUS_CONTENT', 
//           threshold: 'BLOCK_ONLY_HIGH'
//         },
//         {
//           category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
//           threshold: 'BLOCK_ONLY_HIGH'
//         },
//         {
//           category: 'HARM_CATEGORY_HARASSMENT',
//           threshold: 'BLOCK_ONLY_HIGH'
//         }
//       ]
//     };

//     try {
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(payload),
//       });
  
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error(`Legal Gemini API error (${response.status}): ${errorText}`);
//         throw new Error(`Gemini API error: ${errorText}`);
//       }
  
//       return await response.json();
//     } catch (error) {
//       if (error instanceof Error) {
//         if (error.message.includes('429')) {
//           throw new Error('Gemini Rate Limit Hit - Too many requests');
//         }
//         if (error.message.includes('403')) {
//           throw new Error('Gemini API key is invalid or access denied');
//         }
//         console.error('Legal Gemini API Error:', error.message);
//         throw error;
//       }
//       throw new Error('Unknown error communicating with Gemini API');
//     }
//   }

//   async processLegalQuery(query: LegalQuery): Promise<GeminiCompletionResponse> {
//     console.log(`Processing legal query with Gemini (Task ID: ${query.taskId || 'N/A'})`);
    
//     try {
//       const systemInstruction = `You are an expert legal AI assistant. Analyze the provided query within its context (domain, jurisdiction, urgency). Provide a comprehensive response covering:
// 1.  **Jurisdictional Analysis:** Key requirements, deadlines, considerations for the specified jurisdiction.
// 2.  **Applicable Law:** Identify relevant statutes, regulations, and common law principles.
// 3.  **Precedent Review:** Mention significant relevant case law (if applicable and research is enabled).
// 4.  **Risk Assessment:** Evaluate potential legal risks and their severity.
// 5.  **Legal Recommendations:** Offer actionable advice based on the analysis.
// 6.  **Next Steps:** Outline concrete steps for the legal team or client.
// 7.  **Timeline:** Consider urgency and deadlines.
// Include specific citations (e.g., case names, statute numbers). Maintain confidentiality.`;
      
//       const userContent = `
//         **Legal Context:**
//         - Task ID: ${query.taskId || 'N/A'}
//         - Domain: ${query.domain}
//         - Jurisdiction: ${query.jurisdiction}
//         - Urgency: ${query.urgency} (${query.priority}/5 priority)
//         - Client: ${query.clientInfo.name} (Matter: ${query.clientInfo.matterNumber})
//         - Related Cases: ${query.relatedCases ? query.relatedCases.join(', ') : 'None'}
//         - Deadline: ${query.deadline || 'N/A'}
//         - Research Required: ${query.requiresResearch}

//         **Legal Query:**
//         ${query.content}

//         **Instructions:** Provide a detailed legal analysis based on the context and query above. Structure the response clearly according to the sections outlined in the system prompt. Ensure all recommendations are practical and legally sound for the specified jurisdiction.
//         `;
      
//       const startTime = new Date();
//       const result = await this.generateCompletion(
//         systemInstruction,
//         userContent,
//         query.temperature || 0.3,
//         query.maxTokens || 2048
//       );
//       const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;
      
//       // Extract content from Gemini response
//       const content = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
//       const tokenCount = result.usageMetadata?.totalTokenCount || 0;
      
//       return {
//         content,
//         model: this.modelName,
//         processingTime,
//         tokenCount
//       };
//     } catch (error) {
//       console.error('Error processing legal query with Gemini:', error);
      
//       // Provide a fallback response for testing purposes
//       return {
//         content: `# Fallback Legal Response

// ## Jurisdictional Analysis
// This is a fallback response due to an issue with the Gemini API. The API key may not be configured properly or the service may be temporarily unavailable.

// ## Applicable Law
// N/A - Unable to access legal database due to technical issues.

// ## Risk Assessment
// MODERATE - Technical issues prevent full risk assessment.

// ## Recommendations
// 1. Please check your Gemini API key configuration
// 2. Verify that GEMINI_API_KEY environment variable is set correctly
// 3. Ensure you have proper access to the Gemini API
// 4. Check if you have sufficient API quota remaining

// ## Technical Details
// - Error: ${error instanceof Error ? error.message : 'Unknown error'}
// - Query content: ${query.content.substring(0, 100)}...
// - Model: ${this.modelName}

// ## Next Steps
// Please contact your system administrator to resolve this issue or check the Gemini API documentation for troubleshooting steps.`,
//         model: "fallback-model",
//         processingTime: 0.1,
//         tokenCount: 150
//       };
//     }
//   }
// }

// // Singleton instance
// let legalGeminiClient: LegalGeminiClient | null = null;

// export function getLegalGeminiClient(): LegalGeminiClient {
//   if (!legalGeminiClient) {
//     const apiKey = process.env.GEMINI_API_KEY;
//     const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
//     const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
    
//     console.log(`Creating Legal Gemini client with model: ${modelName}`);
    
//     if (!apiKey) {
//       throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
//     }
    
//     legalGeminiClient = new LegalGeminiClient(apiKey, modelName, apiVersion);
//   }
  
//   return legalGeminiClient;
// }

// // Export for backward compatibility (can be used as drop-in replacement)
// export function getLegalAzureOpenAIClient(): LegalGeminiClient {
//   console.warn('getLegalAzureOpenAIClient is deprecated. Use getLegalGeminiClient instead.');
//   return getLegalGeminiClient();
// }