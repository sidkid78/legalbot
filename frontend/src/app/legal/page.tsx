'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LegalQuery {
  content: string;
  domain?: string;
  jurisdiction?: string;
  urgency?: string;
  priority: number;
  requiresResearch: boolean;
  clientInfo: {
    name: string;
    matterNumber: string;
  };
  temperature: number;
  maxTokens: number;
}

interface CaseLawResult {
  caseName: string;
  citation: string;
  court: string;
  dateFiled: string;
  url: string;
  snippet?: string;
  relevanceScore?: number;
}

interface FunctionCall {
  name: string;
  args: Record<string, string | number | boolean>;
  result?: {
    success: boolean;
    data?: CaseLawResult[];
    searchQuery?: string;
    totalResults?: number;
    error?: string;
  };
}

interface AnalysisResult {
  content: string;
  model: string;
  processingTime: number;
  tokenCount: number;
  detectedDomain?: string;
  detectedJurisdiction?: string;
  detectedUrgency?: string;
  confidence?: {
    domain: number;
    jurisdiction: number;
    urgency: number;
  };
  functionCalls?: FunctionCall[];
  caseLawResults?: CaseLawResult[];
}

export default function SimpleLegalPage() {
  const [query, setQuery] = useState<LegalQuery>({
    content: '',
    priority: 3,
    requiresResearch: true,
    clientInfo: {
      name: 'Test Client',
      matterNumber: 'M-' + Date.now()
    },
    temperature: 0.3,
    maxTokens: 2048
  });

  const [response, setResponse] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.content.trim()) {
      setError('Please enter a legal query');
      return;
    }
    
    setAnalyzing(true);
    setLoading(true);
    setError('');
    setResponse(null);
    
    try {
      // First, let Gemini analyze the query to determine domain, jurisdiction, and urgency
      const analysisRes = await fetch('/api/legal-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: query.content }),
      });
      
      const analysisData = await analysisRes.json();
      
      if (!analysisRes.ok) {
        throw new Error(analysisData.error || 'Failed to analyze query');
      }
      
      setAnalyzing(false);
      
      // Update query with detected parameters
      const enhancedQuery = {
        ...query,
        domain: analysisData.domain,
        jurisdiction: analysisData.jurisdiction,
        urgency: analysisData.urgency
      };
      
      // Now process the full legal query with the detected parameters
      const res = await fetch('/api/legal-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedQuery),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process query');
      }
      
      // Extract response content from the legal workflow response
      const responseContent = data.response?.content || data.content || 'No analysis available';
      
      setResponse({
        content: responseContent,
        model: data.response?.modelUsed || 'gemini-2.5-flash',
        processingTime: data.response?.processingTime || 0,
        tokenCount: data.response?.tokenCount || 0,
        detectedDomain: analysisData.domain,
        detectedJurisdiction: analysisData.jurisdiction,
        detectedUrgency: analysisData.urgency,
        confidence: analysisData.confidence,
        functionCalls: data.response?.functionCalls,
        caseLawResults: data.response?.caseLawResults
      });
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="content-wrapper min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
              <span className="text-3xl">⚖️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Smart Legal AI
              </h1>
              <p className="text-purple-600 font-medium">Powered by Google Gemini</p>
            </div>
          </div>
          <p className="text-gray-600 mb-8 text-lg">
            🧠 Just describe your legal situation - Gemini will automatically detect the domain, jurisdiction, and urgency level
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe Your Legal Situation *
              </label>
              <textarea
                value={query.content}
                onChange={(e) => setQuery({ ...query, content: e.target.value })}
                placeholder="Example: 'My startup needs to draft a non-disclosure agreement for sharing proprietary algorithms with potential investors in California. We need this done quickly as we have meetings scheduled next week.'

Try more examples:
• 'Our company received a cease and desist letter claiming patent infringement. This is urgent.'
• 'Need to review employment contracts for remote workers across multiple states.'
• 'Client wants to understand SEC compliance requirements for their IPO filing.'"
                className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={6}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Include details like: what type of legal issue, location/jurisdiction, timeline, and any specific concerns
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name (Optional)
                </label>
                <input
                  type="text"
                  title="Client Name"
                  value={query.clientInfo.name}
                  onChange={(e) => setQuery({ 
                    ...query, 
                    clientInfo: { ...query.clientInfo, name: e.target.value }
                  })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Client or company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matter Number (Optional)
                </label>
                <input
                  type="text"
                  title="Matter Number"
                  value={query.clientInfo.matterNumber}
                  onChange={(e) => setQuery({ 
                    ...query, 
                    clientInfo: { ...query.clientInfo, matterNumber: e.target.value }
                  })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Matter reference number"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || analyzing}
              className="btn-primary w-full py-4 px-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? '🧠 Analyzing Query...' : 
               loading ? '⚖️ Generating Legal Analysis...' : 
               '🚀 Get Smart Legal Analysis'}
            </button>
            
            {(analyzing || loading) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-blue-800 text-sm">
                    {analyzing ? 
                      '🔍 Gemini is analyzing your query to detect legal domain, jurisdiction, and urgency...' :
                      '📝 Generating comprehensive legal analysis with recommendations...'
                    }
                  </p>
                </div>
              </div>
            )}
          </form>

          {response && (
            <div className="mt-8 glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <span className="text-3xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Smart Legal Analysis
                </h2>
              </div>
              
              {/* Detection Results */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <span>🧠</span>
                  AI Detection Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-md p-4 border border-blue-100">
                    <div className="text-sm font-medium text-gray-600">Legal Domain</div>
                    <div className="text-lg font-bold text-blue-900 capitalize">
                      {response.detectedDomain?.replace('_', ' ') || 'Unknown'}
                    </div>
                    {response.confidence?.domain && (
                      <div className="text-xs text-gray-500">
                        Confidence: {Math.round(response.confidence.domain * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-md p-4 border border-blue-100">
                    <div className="text-sm font-medium text-gray-600">Jurisdiction</div>
                    <div className="text-lg font-bold text-blue-900 capitalize">
                      {response.detectedJurisdiction || 'Unknown'}
                    </div>
                    {response.confidence?.jurisdiction && (
                      <div className="text-xs text-gray-500">
                        Confidence: {Math.round(response.confidence.jurisdiction * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-md p-4 border border-blue-100">
                    <div className="text-sm font-medium text-gray-600">Urgency Level</div>
                    <div className="text-lg font-bold text-blue-900 capitalize">
                      {response.detectedUrgency || 'Unknown'}
                    </div>
                    {response.confidence?.urgency && (
                      <div className="text-xs text-gray-500">
                        Confidence: {Math.round(response.confidence.urgency * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Function Calls & Case Law Results */}
              {response.functionCalls && response.functionCalls.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <span>🔍</span>
                    AI Research Activity
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">Gemini used these tools to research your query</p>
                  
                  {response.functionCalls.map((fc, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-5 mb-4 border border-blue-300 shadow-sm">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-gray-800 mb-1">
                            🔍 {fc.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </h4>
                          {fc.result?.success && (
                            <p className="text-sm text-green-600 font-medium">
                              ✓ Found {fc.result.totalResults?.toLocaleString()} results
                            </p>
                          )}
                          {fc.result?.error && (
                            <p className="text-sm text-red-600 font-medium">✗ {fc.result.error}</p>
                          )}
                        </div>
                      </div>

                      {/* Search Parameters */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search Parameters</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {Object.entries(fc.args).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-xs text-gray-500">{key.replace(/_/g, ' ')}:</span>
                              <p className="font-medium text-gray-700">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Case Law Results */}
                      {fc.result?.data && fc.result.data.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-3">
                            📑 Cases Found ({fc.result.data.length})
                          </p>
                          <div className="space-y-2">
                            {fc.result.data.map((caseLaw, caseIdx) => (
                              <a
                                key={caseIdx}
                                href={caseLaw.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <h5 className="font-bold text-gray-800 text-sm">{caseLaw.caseName}</h5>
                                  {caseLaw.relevanceScore && (
                                    <span className="badge bg-purple-100 text-purple-700 text-xs ml-2">
                                      Score: {caseLaw.relevanceScore.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                                  <span>📋 {caseLaw.citation}</span>
                                  <span>🏛️ {caseLaw.court}</span>
                                  <span>📅 {new Date(caseLaw.dateFiled).toLocaleDateString()}</span>
                                </div>
                                {caseLaw.snippet && (
                                  <p className="text-xs text-gray-600 line-clamp-2">{caseLaw.snippet}</p>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Analysis Content */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-4">
                <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-3">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">{children}</h3>,
                      p: ({children}) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-gray-700 ml-4">{children}</li> as React.ReactNode,
                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">{children}</blockquote>
                    }}
                  >
                    {response.content}
                  </ReactMarkdown>
                </div>
              </div>
              
              {/* Metadata */}
              <div className="bg-gradient-to-r from-gray-50 to-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="stat-card text-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Model</span>
                    <div className="text-lg font-bold text-gray-800">{response.model}</div>
                  </div>
                  <div className="stat-card text-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Processing Time</span>
                    <div className="text-lg font-bold text-green-600">{response.processingTime.toFixed(2)}s</div>
                  </div>
                  <div className="stat-card text-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Tokens Used</span>
                    <div className="text-lg font-bold text-blue-600">{response.tokenCount.toLocaleString()}</div>
                  </div>
                  <div className="stat-card text-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Analysis Type</span>
                    <div className="text-lg font-bold text-purple-600">Smart AI</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}