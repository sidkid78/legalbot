/**
 * Case Law Search Service - Updated for CourtListener API v4 actual response format
 */
import { FunctionDeclaration } from '@google/genai';

export interface CaseSearchResult {
  caseName: string;
  citation: string;
  court: string;
  date: string;
  snippet: string;
  url: string;
  jurisdiction?: string;
  docketNumber?: string;
}

export interface SearchResponse {
  results: CaseSearchResult[];
  count: number;
  searchQuery: string;
}

export class CaseLawService {
  private apiKey: string;
  private baseUrl = 'https://www.courtlistener.com/api/rest/v4';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.COURTLISTENER_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ CourtListener API key not provided. Get one at: https://www.courtlistener.com/sign-in/');
    }
  }

  /**
   * Transform CourtListener v4 API response to our format
   * Based on actual API response structure (camelCase fields)
   */
  private transformResult(item: {
    caseName?: string;
    citation?: string[];
    court?: string;
    court_id?: string;
    dateFiled?: string;
    snippet?: string;
    opinions?: Array<{ snippet?: string }>;
    absolute_url?: string;
    court_jurisdiction?: string;
    docketNumber?: string;
  }): CaseSearchResult {
    // Extract snippet from opinions array if available
    const snippet = item.opinions?.[0]?.snippet?.substring(0, 300) || 
                   item.snippet || 
                   '';

    // Handle citation - API returns array, join if multiple as string
    const citation = Array.isArray(item.citation) && item.citation.length > 0
      ? item.citation.join(', ')
      : 'No citation available';

    return {
      caseName: item.caseName || 'Unknown Case',
      citation,
      court: item.court || item.court_id || 'Unknown Court',
      date: item.dateFiled || 'Unknown Date',
      snippet: snippet.replace(/\s+/g, ' ').trim(), // Clean up whitespace
      url: item.absolute_url 
        ? `https://www.courtlistener.com${item.absolute_url}` 
        : '',
      jurisdiction: item.court_jurisdiction || undefined,
      docketNumber: item.docketNumber || undefined,
    };
  }

  /**
   * Search case law using CourtListener API v4
   */
  async searchCaseLaw(
    query: string,
    jurisdiction?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 5
  ): Promise<SearchResponse> {
    console.log(`🔍 Searching case law for: "${query}" in ${jurisdiction || 'all jurisdictions'}`);

    if (!this.apiKey) {
      console.warn('⚠️ No API key - returning empty results');
      return { results: [], count: 0, searchQuery: query };
    }

    try {
      const params = new URLSearchParams({
        q: query,
        type: 'o', // Opinions
        page_size: limit.toString(),
        order_by: 'score desc',
      });

      // Add filters - ONLY for federal courts
      // For state courts, let the search algorithm use query text naturally
      if (jurisdiction) {
        const mappedCourt = this.mapJurisdiction(jurisdiction);
        
        // Only apply court filter for federal courts (single court IDs)
        // State courts benefit from broader search with query context
        const federalCourts = ['scotus', 'ca1', 'ca2', 'ca3', 'ca4', 'ca5', 'ca6', 'ca7', 'ca8', 'ca9', 'ca10', 'ca11', 'cadc', 'cafc'];
        
        if (federalCourts.includes(mappedCourt)) {
          params.append('court', mappedCourt);
          console.log(`🏛️ Filtering by federal court: ${mappedCourt}`);
        } else {
          // For state courts, rely on query text (e.g., "Texas child custody")
          // This gives better results as CourtListener's search includes the state name
          console.log(`📍 State jurisdiction: ${jurisdiction} - relying on query text for filtering`);
        }
      }
      if (startDate) {
        params.append('filed_after', startDate);
      }
      if (endDate) {
        params.append('filed_before', endDate);
      }

      const url = `${this.baseUrl}/search/?${params.toString()}`;
      console.log(`📡 Calling: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error [${response.status}]:`, errorText);
        throw new Error(`CourtListener API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Found ${data.count || 0} total results (returning ${limit})`);

      // Transform results
      const results = (data.results || []).map((item: {
        caseName?: string;
        citation?: string[];
        court?: string;
        court_id?: string;
        dateFiled?: string;
        snippet?: string;
        opinions?: Array<{ snippet?: string }>;
        absolute_url?: string;
        court_jurisdiction?: string;
        docketNumber?: string;
      }) => this.transformResult(item));

      return {
        results,
        count: data.count || results.length,
        searchQuery: query
      };

    } catch (error) {
      console.error('❌ Search error:', error);
      return { results: [], count: 0, searchQuery: query };
    }
  }

  /**
   * Map jurisdiction to CourtListener court IDs
   * 
   * KEY INSIGHT: Only federal courts benefit from explicit court filtering.
   * State courts get BETTER results when we let the query text (e.g., "Texas child custody") 
   * naturally guide the search algorithm. This returns more relevant cases from all court levels.
   * 
   * Example: "Texas child custody" without filter → 1,078 results including Court of Appeals
   *          "Texas child custody" with court=tex → 7 results, Supreme Court only
   */
  private mapJurisdiction(jurisdiction: string): string {
    const jurisdictionMap: Record<string, string> = {
      // ===== FEDERAL COURTS (benefit from explicit filtering) =====
      'supreme_court': 'scotus',
      'scotus': 'scotus',
      
      // Federal Circuit Courts
      'first_circuit': 'ca1',
      'second_circuit': 'ca2',
      'third_circuit': 'ca3',
      'fourth_circuit': 'ca4',
      'fifth_circuit': 'ca5',
      'sixth_circuit': 'ca6',
      'seventh_circuit': 'ca7',
      'eighth_circuit': 'ca8',
      'ninth_circuit': 'ca9',
      'tenth_circuit': 'ca10',
      'eleventh_circuit': 'ca11',
      'dc_circuit': 'cadc',
      'federal_circuit': 'cafc',
      
      // ===== STATE COURTS (return generic markers, won't filter) =====
      // These return non-federal-court values so they're not filtered
      // The query text will naturally include state names for better results
      'federal': 'federal',
      'state': 'state',
      'california': 'california',
      'texas': 'texas',
      'new_york': 'new_york',
      'florida': 'florida',
      'illinois': 'illinois',
      'pennsylvania': 'pennsylvania',
      'ohio': 'ohio',
      'georgia': 'georgia',
      'north_carolina': 'north_carolina',
      'michigan': 'michigan',
      'new_jersey': 'new_jersey',
      'virginia': 'virginia',
      'washington': 'washington',
      'arizona': 'arizona',
      'massachusetts': 'massachusetts',
      'tennessee': 'tennessee',
      'indiana': 'indiana',
      'missouri': 'missouri',
      'maryland': 'maryland',
      'wisconsin': 'wisconsin',
      'colorado': 'colorado',
      'minnesota': 'minnesota',
      'south_carolina': 'south_carolina',
      'alabama': 'alabama',
      'louisiana': 'louisiana',
      'kentucky': 'kentucky',
      'oregon': 'oregon',
      'oklahoma': 'oklahoma',
      'connecticut': 'connecticut',
      'iowa': 'iowa',
      'mississippi': 'mississippi',
      'arkansas': 'arkansas',
      'kansas': 'kansas',
      'utah': 'utah',
      'nevada': 'nevada',
      'new_mexico': 'new_mexico',
      'nebraska': 'nebraska',
      'west_virginia': 'west_virginia',
      'idaho': 'idaho',
      'hawaii': 'hawaii',
      'new_hampshire': 'new_hampshire',
      'maine': 'maine',
      'rhode_island': 'rhode_island',
      'montana': 'montana',
      'delaware': 'delaware',
      'south_dakota': 'south_dakota',
      'north_dakota': 'north_dakota',
      'alaska': 'alaska',
      'dc': 'dc',
      'vermont': 'vermont',
      'wyoming': 'wyoming',
      
      // Common state abbreviations
      'ca': 'california',
      'tx': 'texas',
      'ny': 'new_york',
      'fl': 'florida',
      'il': 'illinois',
      'pa': 'pennsylvania',
      'oh': 'ohio',
      'ga': 'georgia',
      'nc': 'north_carolina',
      'mi': 'michigan',
      'nj': 'new_jersey',
      'va': 'virginia',
      'wa': 'washington',
      'az': 'arizona',
      'ma': 'massachusetts',
      'tn': 'tennessee',
      'in': 'indiana',
      'mo': 'missouri',
      'md': 'maryland',
      'wi': 'wisconsin',
      'co': 'colorado',
      'mn': 'minnesota',
      'sc': 'south_carolina',
      'al': 'alabama',
      'la': 'louisiana',
      'ky': 'kentucky',
      'or': 'oregon',
      'ok': 'oklahoma',
      'ct': 'connecticut',
      'ia': 'iowa',
      'ms': 'mississippi',
      'ar': 'arkansas',
      'ks': 'kansas',
      'ut': 'utah',
      'nv': 'nevada',
      'nm': 'new_mexico',
      'ne': 'nebraska',
      'wv': 'west_virginia',
      'id': 'idaho',
      'hi': 'hawaii',
      'nh': 'new_hampshire',
      'me': 'maine',
      'ri': 'rhode_island',
      'mt': 'montana',
      'de': 'delaware',
      'sd': 'south_dakota',
      'nd': 'north_dakota',
      'ak': 'alaska',
      'vt': 'vermont',
      'wy': 'wyoming',
    };

    return jurisdictionMap[jurisdiction.toLowerCase()] || jurisdiction;
  }

  /**
   * Format search results for AI consumption
   */
  formatResultsForAI(searchResults: SearchResponse): string {
    if (searchResults.count === 0) {
      return `No relevant case law found for query: "${searchResults.searchQuery}"\n\nSuggestion: Try broadening your search terms or removing date/jurisdiction filters.`;
    }

    let formatted = `**Case Law Research Results**\n\n`;
    formatted += `Found ${searchResults.count} total cases matching "${searchResults.searchQuery}"\n`;
    formatted += `Showing top ${searchResults.results.length} most relevant:\n\n`;
    formatted += `---\n\n`;

    searchResults.results.forEach((result, index) => {
      formatted += `### ${index + 1}. ${result.caseName}\n\n`;
      formatted += `**Citation:** ${result.citation}\n\n`;
      formatted += `**Court:** ${result.court}\n\n`;
      formatted += `**Date Filed:** ${result.date}\n\n`;
      
      if (result.docketNumber) {
        formatted += `**Docket Number:** ${result.docketNumber}\n\n`;
      }
      
      if (result.snippet) {
        formatted += `**Excerpt:**\n> ${result.snippet}...\n\n`;
      }
      
      if (result.url) {
        formatted += `**Full Opinion:** ${result.url}\n\n`;
      }
      
      formatted += `---\n\n`;
    });

    formatted += `\n*Source: CourtListener.com (Free Law Project) - Includes federal case law and Harvard Caselaw Access Project data*\n`;
    formatted += `*Note: Use these cases to support your legal analysis with proper citations.*`;

    return formatted;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/search/?q=test&type=o&page_size=1`,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let caseLawService: CaseLawService | null = null;

export function getCaseLawService(apiKey?: string): CaseLawService {
  if (!caseLawService) {
    caseLawService = new CaseLawService(apiKey);
  }
  return caseLawService;
}

/**
 * Function declaration for Gemini function calling
 */
export const caseLawSearchFunction: FunctionDeclaration = {
  name: 'search_case_law',
  description: 'Search comprehensive legal case law databases via CourtListener (includes federal courts, state courts, and Harvard Caselaw Access Project). Returns case names, citations, court information, dates, and case excerpts. Use this when you need to cite specific cases or find legal precedents to support your analysis.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for case law. Examples: "parol evidence rule", "adverse possession", "contract interpretation", "child custody relocation". Be specific for better results.',
      },
      jurisdiction: {
        type: 'string',
        description: 'Optional: Filter by jurisdiction. Use state names (e.g., "texas", "california", "new_york"), abbreviations (e.g., "tx", "ca", "ny"), federal courts ("federal", "supreme_court", "ninth_circuit"), or "state" for all state courts. Full list of ~100+ courts supported including supreme and appellate courts for all 50 states.'
      },
      start_date: {
        type: 'string',
        description: 'Optional: Only include cases filed on or after this date (YYYY-MM-DD format, e.g., "2020-01-01")'
      },
      end_date: {
        type: 'string',
        description: 'Optional: Only include cases filed on or before this date (YYYY-MM-DD format, e.g., "2023-12-31")'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5, max: 10). Use 3-5 for focused analysis.'
      }
    },
    required: ['query']
  }
};



//       // Transform results to our standard format
//       const results: CaseSearchResult[] = (data.results || []).map((item: { case_name: string; citations: string[]; court_id: string; date_filed: string; text: string; absolute_url: string; jurisdiction: string; docket_number: string; }) => ({
//         caseName: item.case_name || 'Unknown Case',
//         citation: item.citations?.[0] || 'No citation',
//         court: item.court_id || 'Unknown Court',
//         date: item.date_filed || 'Unknown Date',
//         snippet: item.text?.substring(0, 300) || '',
//         url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : '',
//         jurisdiction: item.jurisdiction || undefined,
//         docketNumber: item.docket_number || undefined,
//       }));

//       return {
//         results,
//         count: results.length,
//         searchQuery: query
//       };

//     } catch (error) {
//       console.error('❌ Error searching case law:', error);
//       return {
//         results: [],
//         count: 0,
//         searchQuery: query
//       };
//     }
//   }

//   /**
//    * Map generic jurisdiction to CourtListener court identifiers
//    */
//   private mapJurisdiction(jurisdiction: string): string {
//     const jurisdictionMap: Record<string, string> = {
//       'federal': 'ca1,ca2,ca3,ca4,ca5,ca6,ca7,ca8,ca9,ca10,ca11,cadc,scotus',
//       'state': 'cal,ny,ill,tex,fla', // Add more as needed
//       'supreme_court': 'scotus',
//       'circuit': 'ca1,ca2,ca3,ca4,ca5,ca6,ca7,ca8,ca9,ca10,ca11,cadc',
//       'district': 'ca1,ca2,ca3,ca4,ca5,ca6,ca7,ca8,ca9,ca10,ca11,cadc',
//     };

//     return jurisdictionMap[jurisdiction.toLowerCase()] || jurisdiction;
//   }

//   /**
//    * Get case details by CourtListener opinion ID
//    */
//   async getCaseDetails(opinionId: string): Promise<CaseSearchResult | null> {
//     if (!this.apiKey) {
//       console.warn('CourtListener API key required for detailed case lookup');
//       return null;
//     }

//     try {
//       const response = await fetch(
//         `${this.baseUrl}/opinions/${opinionId}/`,
//         {
//           headers: {
//             'Authorization': `Token ${this.apiKey}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`CourtListener API error: ${response.statusText}`);
//       }

//       const data = await response.json();

//       return {
//         caseName: data.case_name || 'Unknown Case',
//         citation: data.citation || 'No citation',
//         court: data.court || 'Unknown Court',
//         date: data.date_filed || 'Unknown Date',
//         snippet: data.plain_text?.substring(0, 500) || data.html?.substring(0, 500) || '',
//         url: `https://www.courtlistener.com${data.absolute_url}`,
//         jurisdiction: data.jurisdiction,
//         docketNumber: data.docket_number,
//       };

//     } catch (error) {
//       console.error('Error fetching case details:', error);
//       return null;
//     }
//   }

//   /**
//    * Format search results for AI consumption
//    */
//   formatResultsForAI(searchResults: SearchResponse): string {
//     if (searchResults.count === 0) {
//       return `No relevant case law found for query: "${searchResults.searchQuery}"\n\nSuggestion: Try broadening your search terms or removing date/jurisdiction filters.`;
//     }

//     let formatted = `**Case Law Search Results** (${searchResults.count} cases found for: "${searchResults.searchQuery}")\n\n`;
//     formatted += `*Data source: CourtListener.com (includes Harvard Caselaw Access Project data)*\n\n`;

//     searchResults.results.forEach((result, index) => {
//       formatted += `### ${index + 1}. ${result.caseName}\n\n`;
//       formatted += `- **Citation**: ${result.citation}\n`;
//       formatted += `- **Court**: ${result.court}\n`;
//       formatted += `- **Date Filed**: ${result.date}\n`;
      
//       if (result.docketNumber) {
//         formatted += `- **Docket Number**: ${result.docketNumber}\n`;
//       }
      
//       if (result.snippet) {
//         formatted += `- **Summary**: ${result.snippet}\n`;
//       }
      
//       if (result.url) {
//         formatted += `- **Full Text**: [View on CourtListener](${result.url})\n`;
//       }
      
//       formatted += '\n---\n\n';
//     });

//     formatted += `\n*Note: These cases are sourced from CourtListener's comprehensive database, which includes federal and state case law from the Harvard Caselaw Access Project.*`;

//     return formatted;
//   }

//   /**
//    * Check API key validity
//    */
//   async testConnection(): Promise<boolean> {
//     if (!this.apiKey) {
//       return false;
//     }

//     try {
//       const response = await fetch(
//         `${this.baseUrl}/search/?q=test&type=o&page_size=1`,
//         {
//           headers: {
//             'Authorization': `Token ${this.apiKey}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       return response.ok;
//     } catch (error) {
//       console.error('Connection test failed:', error);
//       return false;
//     }
//   }
// }

// // Singleton instance
// let caseLawService: CaseLawService | null = null;

// export function getCaseLawService(apiKey?: string): CaseLawService {
//   if (!caseLawService) {
//     caseLawService = new CaseLawService(apiKey);
//   }
//   return caseLawService;
// }

// /**
//  * Function declaration for Gemini function calling
//  * Updated to reflect CourtListener as the single data source
//  */
// export const caseLawSearchFunction: FunctionDeclaration = {
//   name: 'search_case_law',
//   description: 'Search comprehensive legal case law databases via CourtListener (includes federal cases, state cases, and Harvard Caselaw Access Project data). Use this to find relevant cases, precedents, and legal citations to support your legal analysis. Returns case names, citations, court information, dates, and snippets.',
//   parametersJsonSchema: {
//     type: 'object',
//     properties: {
//       query: {
//         type: 'string',
//         description: 'Search query for case law. Can include: case names (e.g., "Roe v. Wade"), legal concepts (e.g., "adverse possession"), statutes (e.g., "42 USC 1983"), or keywords (e.g., "contract interpretation"). Be specific for better results.',
//       },
//       jurisdiction: {
//         type: 'string',
//         enum: ['federal', 'state', 'supreme_court', 'circuit', 'district'],
//         description: 'Optional: Filter by jurisdiction. "federal" includes all federal courts, "supreme_court" is SCOTUS only, "circuit" is federal circuit courts, "district" is federal district courts, "state" searches state courts.'
//       },
//       start_date: {
//         type: 'string',
//         description: 'Optional: Only include cases filed on or after this date (format: YYYY-MM-DD, e.g., "2020-01-01")'
//       },
//       end_date: {
//         type: 'string',
//         description: 'Optional: Only include cases filed on or before this date (format: YYYY-MM-DD, e.g., "2023-12-31")'
//       },
//       limit: {
//         type: 'number',
//         description: 'Maximum number of results to return (default: 5, recommended range: 3-10). Use lower numbers for more focused results.'
//       }
//     },
//     required: ['query']
//   }
// };

//   /**
//    * Search for case law using CourtListener API
//    */
//   async searchCourtListener(
//     query: string,
//     jurisdiction?: string,
//     startDate?: string,
//     endDate?: string,
//     limit: number = 5
//   ): Promise<CaseSearchResult[]> {
//     if (!this.courtListenerApiKey) {
//       throw new Error('CourtListener API key is required');
//     }

//     try {
//       const params = new URLSearchParams({
//         q: query,
//         order_by: 'score desc',
//         type: 'o', // Opinions
//       });

//       if (jurisdiction) {
//         params.append('court', jurisdiction);
//       }
//       if (startDate) {
//         params.append('filed_after', startDate);
//       }
//       if (endDate) {
//         params.append('filed_before', endDate);
//       }

//       const response = await fetch(
//         `${this.courtListenerBaseUrl}/search/?${params.toString()}`,
//         {
//           headers: {
//             'Authorization': `Token ${this.courtListenerApiKey}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`CourtListener API error: ${response.statusText}`);
//       }

//       const data = await response.json();

//       // Transform results
//       const results: CaseSearchResult[] = (data.results || []).slice(0, limit).map((item: CourtListenerSearchResult) => ({
//         caseName: item.caseName || 'Unknown Case',
//         citation: item.citation || 'No citation',
//         court: item.court || 'Unknown Court',
//         date: item.dateFiled || 'Unknown Date',
//         snippet: item.snippet || '',
//         url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : '',
//         source: 'courtlistener' as const,
//       }));

//       console.log(`CourtListener found ${results.length} cases for: ${query}`);
//       return results;
//     } catch (error) {
//       console.error('Error searching CourtListener:', error);
//       return [];
//     }
//   }

//   /**
//    * Search for case law using Harvard CAP API
//    */
//   async searchHarvardCAP(
//     query: string,
//     jurisdiction?: string,
//     limit: number = 5
//   ): Promise<CaseSearchResult[]> {
//     try {
//       const params = new URLSearchParams({
//         search: query,
//         page_size: limit.toString(),
//       });

//       if (jurisdiction) {
//         // Map jurisdiction to CAP's jurisdiction format
//         const jurisdictionMap: Record<string, string> = {
//           'federal': 'us',
//           'state': 'ill,ny,ca,tx,fl', // Common states
//         };
//         const capJurisdiction = jurisdictionMap[jurisdiction.toLowerCase()];
//         if (capJurisdiction) {
//           params.append('jurisdiction', capJurisdiction);
//         }
//       }

//       const headers: HeadersInit = {
//         'Content-Type': 'application/json',
//       };

//       // CAP API key is optional for limited access
//       if (this.courtListenerApiKey) {
//         headers['Authorization'] = `Token ${this.courtListenerApiKey}`;
//       }

//       const response = await fetch(
//         `${this.capBaseUrl}/cases/?${params.toString()}`,
//         { headers }
//       );

//       if (!response.ok) {
//         throw new Error(`Harvard CAP API error: ${response.statusText}`);
//       }

//       const data = await response.json();

//       // Transform results
//       const results: CaseSearchResult[] = (data.results || []).map((item: HarvardCAPSearchResult) => ({
//         caseName: item.name || item.name_abbreviation || 'Unknown Case',
//         citation: item.citations?.[0]?.cite || 'No citation',
//         court: item.court?.name || 'Unknown Court',
//         date: item.decision_date || 'Unknown Date',
//         snippet: item.preview?.[0] || item.casebody?.data?.head_matter?.substring(0, 300) || '',
//         url: item.frontend_url || item.url || '',
//         source: 'cap' as const,
//       }));

//       console.log(`Harvard CAP found ${results.length} cases for: ${query}`);
//       return results;
//     } catch (error) {
//       console.error('Error searching Harvard CAP:', error);
//       return [];
//     }
//   }

//   /**
//    * Search both APIs and combine results
//    */
//   async searchCaseLaw(
//     query: string,
//     jurisdiction?: string,
//     startDate?: string,
//     endDate?: string,
//     limit: number = 5
//   ): Promise<SearchResponse> {
//     console.log(`Searching case law for: "${query}" in ${jurisdiction || 'all jurisdictions'}`);

//     const resultsPerSource = Math.ceil(limit / 2);

//     // Search both APIs in parallel
//     const [courtListenerResults, capResults] = await Promise.all([
//       this.searchCourtListener(query, jurisdiction, startDate, endDate, resultsPerSource),
//       this.searchHarvardCAP(query, jurisdiction, resultsPerSource),
//     ]);

//     // Combine and deduplicate results
//     const allResults = [...courtListenerResults, ...capResults];
//     const uniqueResults = allResults.filter(
//       (result, index, self) =>
//         index === self.findIndex((r) => r.caseName === result.caseName && r.date === result.date)
//     );

//     // Sort by relevance (CourtListener first as it has better relevance scoring)
//     const sortedResults = uniqueResults.slice(0, limit);

//     return {
//       results: sortedResults,
//       count: sortedResults.length,
//     };
//   }

//   /**
//    * Format search results for Gemini to use
//    */
//   formatResultsForAI(searchResults: SearchResponse): string {
//     if (searchResults.count === 0) {
//       return 'No relevant case law found for this query.';
//     }

//     let formatted = `Found ${searchResults.count} relevant cases:\n\n`;

//     searchResults.results.forEach((result, index) => {
//       formatted += `${index + 1}. **${result.caseName}**\n`;
//       formatted += `   Citation: ${result.citation}\n`;
//       formatted += `   Court: ${result.court}\n`;
//       formatted += `   Date: ${result.date}\n`;
//       formatted += `   Summary: ${result.snippet}\n`;
//       formatted += `   Source: ${result.source === 'courtlistener' ? 'CourtListener' : 'Harvard CAP'}\n`;
//       if (result.url) {
//         formatted += `   URL: ${result.url}\n`;
//       }
//       formatted += '\n';
//     });

//     return formatted;
//   }
// }

// // Singleton instance
// let caseLawService: CaseLawService | null = null;

// export function getCaseLawService(apiKey?: string): CaseLawService {
//   if (!caseLawService) {
//     caseLawService = new CaseLawService(apiKey);
//   }
//   return caseLawService;
// }

// // Function declarations for Gemini function calling
// export const caseLawSearchFunction: FunctionDeclaration = {
//   name: 'search_case_law',
//   description: 'Search legal case law databases (CourtListener and Harvard CAP) for relevant cases, precedents, and legal citations. Use this when you need to find specific cases, understand precedent, or cite legal authority.',
//   parametersJsonSchema: {
//     type: 'object',
//     properties: {
//       query: {
//         type: 'string',
//         description: 'The search query for case law. Can include case names, legal concepts, statutes, or keywords.',
//       },
//       jurisdiction: {
//         type: 'string',
//         enum: ['federal', 'state', 'international'],
//         description: 'Optional: The jurisdiction to search within.'
//       },
//       start_date: {
//         type: 'string',
//         description: 'Optional: Start date for cases (YYYY-MM-DD format).'
//       },
//       end_date: {
//         type: 'string',
//         description: 'Optional: End date for cases (YYYY-MM-DD format).'
//       },
//       limit: {
//         type: 'number',
//         description: 'Maximum number of results to return (default: 5, max: 10).'
//       }
//     },
//     required: ['query']
//   }
// };

