import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ChevronLeft, 
  User, 
  Briefcase,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { 
  RiskLevel,
  LegalNextStep,
  LegalRecommendation,
  LegalCitation
} from '@/lib/legal/types';
import { Suspense } from 'react';
import { LegalQuery, LegalResponse } from '@/lib/legal/types';
import { db } from '@/lib/database/json-db-manager';


// Loading component
function LegalDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

function QueryDetailView({ id }: { id: string }) {
  // This is an async component
  async function getDetails() {
    const query = db.getLegalQuery(id);
    const response = db.getLegalResponse(id);
    if (!query || !response) {
      notFound();
    }
    return { query, response };
  }
    
  
  
  return (
    <Suspense fallback={<LegalDetailSkeleton />}>
      <DetailContent getDetails={getDetails} />
    </Suspense>
  );
}

// This component will use the results of the async function
async function DetailContent({ getDetails }: { getDetails: () => Promise<{ query: LegalQuery, response: LegalResponse }> }) {
  const { query, response } = await getDetails();
  
  // Format dates
  const formattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Determine status
  const status = !response 
    ? 'processing' 
    : (response.riskLevel as RiskLevel) === RiskLevel.CRITICAL || (response.riskLevel as RiskLevel) === RiskLevel.HIGH
      ? 'warning'
      : 'completed';

  // Format client info
  const clientInfo = query.clientInfo || { name: 'Confidential Client', matterNumber: 'N/A' };
  
  // Format related cases
  const relatedCases = query.relatedCases || [];

  // Get risk badge class
  const riskBadgeClass = (risk: RiskLevel) => {
    return `badge ${
      risk === RiskLevel.CRITICAL ? 'risk-critical' :
      risk === RiskLevel.HIGH ? 'risk-high' :
      risk === RiskLevel.MODERATE ? 'risk-moderate' :
      'bg-white text-gray-700'
    }`;
  };

  return (
    <div className="content-wrapper min-h-screen py-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard/legal" className="inline-flex items-center text-white hover:text-purple-200 transition-colors mb-3">
            <ChevronLeft className="mr-1 h-5 w-5" />
            <span className="font-medium">Back to Legal Queries</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Legal Query Analysis</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={riskBadgeClass(response.riskLevel as RiskLevel)}>
            {response.riskLevel.replace(/\b\w/g, (l: string) => l.toUpperCase())} Priority
          </span>
        </div>
      </div>
      
      {/* Query Card with Modern Design */}
      <div className="glass rounded-2xl p-8 mb-6 card-hover">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Legal Query</h2>
            <p className="text-sm text-gray-500">Submitted {formattedDate(query.timestamp)}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-6 mb-6">
          <p className="text-gray-800 leading-relaxed whitespace-pre-line text-lg">{query.content}</p>
        </div>
        
        {/* Info Grid with Icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-purple-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain</span>
            </div>
            <p className="text-lg font-bold text-gray-800 capitalize">{query.domain.replace(/_/g, ' ')}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jurisdiction</span>
            </div>
            <p className="text-lg font-bold text-gray-800 capitalize">{query.jurisdiction}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-green-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{clientInfo.name}</p>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              {status === 'processing' ? (
                <Clock className="h-5 w-5 text-blue-500 pulse-glow" />
              ) : status === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
            </div>
            <p className="text-lg font-bold text-gray-800 capitalize">{status}</p>
          </div>
        </div>
        
        {/* Additional Info */}
        {(clientInfo.matterNumber || query.deadline || relatedCases.length > 0) && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientInfo.matterNumber && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Matter Number</span>
                  <p className="font-semibold text-gray-700 mt-1">{clientInfo.matterNumber}</p>
                </div>
              )}
              
              {query.deadline && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Deadline</span>
                  <div className="flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <p className="font-semibold text-gray-700">{formattedDate(query.deadline)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {relatedCases.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Related Cases</span>
                <div className="mt-2 space-y-1">
                  {relatedCases.map((caseTitle: string, idx: number) => (
                    <div key={idx} className="flex items-center text-sm text-gray-700">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      {caseTitle}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {query.requiresResearch && (
            <span className="badge bg-blue-500 text-white">
              📚 Requires Research
            </span>
          )}
          {query.billable && (
            <span className="badge bg-green-500 text-white">
              💰 Billable
            </span>
          )}
          {!query.billable && (
            <span className="badge bg-gray-400 text-white">
              Non-Billable
            </span>
          )}
          <span className="badge bg-purple-500 text-white">
            Priority {query.priority}
          </span>
        </div>
      </div>
      
      {/* Response section */}
      {!response ? (
        // Processing state with modern loader
        <div className="glass rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0 left-0"></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mt-6">Processing Legal Query</h3>
            <p className="text-gray-500 mt-2 text-center max-w-md">
              Our AI is analyzing your case with Google Gemini. This may take a moment...
            </p>
          </div>
        </div>
      ) : (
        // Response content
        <>
          {/* Risk Level Banner */}
          <div className={`rounded-2xl p-6 mb-6 ${
            response.riskLevel === RiskLevel.CRITICAL ? 'risk-critical' :
            response.riskLevel === RiskLevel.HIGH ? 'risk-high' :
            response.riskLevel === RiskLevel.MODERATE ? 'risk-moderate' :
            response.riskLevel === RiskLevel.LOW ? 'risk-low' :
            'risk-minimal'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-10 w-10" />
                <div>
                  <h3 className="text-2xl font-bold">Risk Assessment: {response.riskLevel.toUpperCase()}</h3>
                  <p className="opacity-90 mt-1">This case requires {
                    response.riskLevel === RiskLevel.CRITICAL ? 'immediate attention' :
                    response.riskLevel === RiskLevel.HIGH ? 'prompt action' :
                    response.riskLevel === RiskLevel.MODERATE ? 'timely review' :
                    'standard processing'
                  }</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Processing Time</p>
                <p className="text-2xl font-bold">{response.processingTime.toFixed(2)}s</p>
              </div>
            </div>
          </div>
          
          {/* Function Calls & Case Law Results */}
          {(response.functionCalls && response.functionCalls.length > 0) && (
            <div className="glass rounded-2xl p-8 mb-6 card-hover">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">AI Research Activity</h3>
                  <p className="text-sm text-gray-500">Gemini used these tools to research your query</p>
                </div>
              </div>

              {/* Function Calls */}
              {response.functionCalls.map((fc, idx) => (
                <div key={idx} className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 mb-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">🔍 {fc.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        {fc.result?.success && (
                          <p className="text-sm text-green-600 font-medium">✓ Found {fc.result.totalResults?.toLocaleString()} results</p>
                        )}
                        {fc.result?.error && (
                          <p className="text-sm text-red-600 font-medium">✗ {fc.result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Search Parameters */}
                  <div className="bg-white/50 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search Parameters</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      <p className="text-sm font-semibold text-gray-700 mb-3">📑 Cases Found ({fc.result.data.length})</p>
                      <div className="space-y-3">
                        {fc.result.data.map((caseLaw, caseIdx) => (
                          <a
                            key={caseIdx}
                            href={caseLaw.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white rounded-lg p-4 hover:shadow-lg transition-shadow border border-gray-200 hover:border-blue-300"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-bold text-gray-800 text-sm">{caseLaw.caseName}</h5>
                              {caseLaw.relevanceScore && (
                                <span className="badge bg-purple-100 text-purple-700 text-xs">
                                  Score: {caseLaw.relevanceScore.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {caseLaw.citation}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {caseLaw.court}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(caseLaw.dateFiled).toLocaleDateString()}
                              </span>
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

          {/* Key Metrics */}
          <div className="glass rounded-2xl p-8 mb-6 card-hover">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Analysis Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Jurisdiction */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-6 w-6 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jurisdiction</span>
                </div>
                <p className="text-xl font-bold text-gray-800 mb-2">{response.jurisdictionAnalysis.type}</p>
                <div className="space-y-1">
                  {response.jurisdictionAnalysis.keyRequirements?.slice(0, 2).map((req: string, idx: number) => (
                    <div key={idx} className="flex items-start text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2 mt-1.5"></span>
                      <span>{req}</span>
                    </div>
                  ))}
                  {response.jurisdictionAnalysis.keyRequirements?.length > 2 && (
                    <p className="text-xs text-purple-600 font-medium ml-3.5">
                      +{response.jurisdictionAnalysis.keyRequirements.length - 2} more requirements
                    </p>
                  )}
                </div>
              </div>
              
              {/* Citations */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-6 w-6 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legal Citations</span>
                </div>
                <p className="text-xl font-bold text-gray-800 mb-2">{response.citations.length} Citations</p>
                <div className="space-y-1">
                  {response.citations.slice(0, 2).map((citation: LegalCitation, idx: number) => (
                    <div key={idx} className="text-sm text-gray-600 truncate">
                      <span className="font-medium">•</span> {citation.citation}
                    </div>
                  ))}
                  {response.citations.length > 2 && (
                    <p className="text-xs text-blue-600 font-medium">
                      +{response.citations.length - 2} more citations
                    </p>
                  )}
                </div>
              </div>
              
              {/* Billing */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing</span>
                </div>
                {response.billingInfo.billable === false ? (
                  <div>
                    <p className="text-xl font-bold text-gray-800">Non-Billable</p>
                    <p className="text-sm text-gray-500 mt-1">No charges applied</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      ${response.billingInfo.totalEstimatedCharge?.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {response.billingInfo.aiProcessingHours} hrs × ${response.billingInfo.hourlyRate}/hr
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="mb-8">
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-500" />
                Key Recommendations
              </h4>
              <div className="space-y-3">
                {response.recommendations.map((rec: LegalRecommendation, idx: number) => (
                  <div key={idx} className={`p-4 rounded-xl border-l-4 ${
                    rec.priority === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                    rec.priority === 'HIGH' ? 'bg-orange-50 border-orange-500' :
                    rec.priority === 'MODERATE' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          rec.priority === 'CRITICAL' ? 'risk-critical' :
                          rec.priority === 'HIGH' ? 'risk-high' :
                          rec.priority === 'MODERATE' ? 'risk-moderate' :
                          'bg-blue-500 text-white'
                        }`}>
                          {rec.priority}
                        </span>
                        <p className="font-bold text-gray-800">{rec.action}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full">
                        {rec.timeline}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-2">{rec.details}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Next Steps */}
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Action Items
              </h4>
              <div className="space-y-3">
                {response.nextSteps.map((step: LegalNextStep, idx: number) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 mb-2">{step.step}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {step.assignee}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {step.deadline}
                          </span>
                        </div>
                        {step.actionItems && step.actionItems.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.actionItems.map((item: string, itemIdx: number) => (
                              <div key={itemIdx} className="flex items-start text-sm text-gray-700">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Metadata Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {response.processingTime.toFixed(2)}s
                </span>
                <span>{response.tokenCount.toLocaleString()} tokens</span>
              </div>
              <span className="badge bg-purple-100 text-purple-700">{response.modelUsed}</span>
            </div>
          </div>
          
          {/* Legal Analysis - Full Content */}
          <div className="glass rounded-2xl p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Detailed Legal Analysis</h3>
            </div>
            
            <div className="prose prose-lg max-w-none">
              {response.content.split('\n\n').map((paragraph: string, idx: number) => {
                if (paragraph.startsWith('##')) {
                  return (
                    <h4 key={idx} className="text-xl font-bold text-gray-800 mt-6 mb-3 flex items-center gap-2">
                      <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded"></span>
                      {paragraph.replace('##', '').trim()}
                    </h4>
                  );
                } else if (paragraph.startsWith('#')) {
                  return (
                    <h3 key={idx} className="text-2xl font-bold text-gray-800 mt-8 mb-4">
                      {paragraph.replace('#', '').trim()}
                    </h3>
                  );
                } else if (paragraph.startsWith('-')) {
                  return (
                    <ul key={idx} className="space-y-2 mb-4 ml-2">
                      {paragraph.split('\n').map((item: string, i: number) => (
                        <li key={i} className="flex items-start text-gray-700">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>{item.replace('-', '').trim()}</span>
                        </li>
                      ))}
                    </ul>
                  );
                } else if (paragraph.match(/^\d\./)) {
                  return (
                    <ol key={idx} className="space-y-2 mb-4 ml-2 counter-reset">
                      {paragraph.split('\n').map((item: string, i: number) => {
                        const numMatch = item.match(/^\d\./);
                        return numMatch ? (
                          <li key={i} className="flex items-start text-gray-700">
                            <span className="font-bold text-purple-600 mr-3 flex-shrink-0">{numMatch[0]}</span>
                            <span>{item.replace(numMatch[0], '').trim()}</span>
                          </li>
                        ) : null;
                      }).filter(Boolean)}
                    </ol>
                  );
                } else {
                  return <p key={idx} className="mb-4 text-gray-700 leading-relaxed">{paragraph}</p>;
                }
              })}
            </div>
          </div>
          
          {/* Legal Notices */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-bold text-gray-900">Confidentiality Notice</h4>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {response.confidentialityNotice}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-gray-900">Legal Disclaimer</h4>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {response.legalDisclaimer}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default async function LegalQueryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QueryDetailView id={id} />;
}