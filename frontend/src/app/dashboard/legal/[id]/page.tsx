
import { notFound, redirect } from 'next/navigation';
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
  LegalUrgency,
  RiskLevel,
  LegalNextStep,
  LegalRecommendation,
  LegalCitation
} from '@/lib/legal/types';
import { Suspense } from 'react';
import { LegalQuery, LegalResponse } from '@/lib/legal/types';


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
    const supabase = createClient();
    
    // Check if the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      redirect('/login');
    }
    
    // Get the query
    const { data: query, error: queryError } = await supabase
      .from('legal_queries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (queryError || !query || query.userId !== session.user.id) {
      notFound();
    }
    
    // Get the response if available
    const { data: response } = await supabase
      .from('legal_responses')
      .select('*')
      .eq('query_id', id)
      .single();
    
    return { query, response, session };
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
  const getRiskBadgeClass = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.CRITICAL:
        return 'bg-red-100 text-red-800';
      case RiskLevel.HIGH:
        return 'bg-orange-100 text-orange-800';
      case RiskLevel.MODERATE:
        return 'bg-yellow-100 text-yellow-800';
      case RiskLevel.LOW:
        return 'bg-green-100 text-green-800';
      case RiskLevel.MINIMAL:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Legal Query Details</h1>
        <Link href="/dashboard/legal" className="btn-secondary inline-flex items-center">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Legal Queries
        </Link>
      </div>
      
      {/* Query details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-medium">Legal Query</h2>
          <div className="flex items-center">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              query.urgency === LegalUrgency.EMERGENCY ? 'bg-red-100 text-red-800' :
              query.urgency === LegalUrgency.URGENT ? 'bg-orange-100 text-orange-800' :
              query.urgency === LegalUrgency.HIGH ? 'bg-yellow-100 text-yellow-800' :
              query.urgency === LegalUrgency.MEDIUM ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {query.urgency.replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
              Priority {query.priority}
            </span>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4 whitespace-pre-line">{query.content}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <span className="text-sm text-gray-500">Domain</span>
            <div className="flex items-center mt-1">
              <Briefcase className="h-4 w-4 text-gray-400 mr-1" />
              <p className="font-medium capitalize">{query.domain.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Jurisdiction</span>
            <div className="flex items-center mt-1">
              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
              <p className="font-medium capitalize">{query.jurisdiction}</p>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Submitted</span>
            <div className="flex items-center mt-1">
              <Clock className="h-4 w-4 text-gray-400 mr-1" />
              <p className="font-medium">{formattedDate(query.created_at || query.createdAt || new Date().toISOString())}</p>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <div className="flex items-center mt-1">
              {status === 'processing' ? (
                <Clock className="h-4 w-4 text-blue-500 mr-1" />
              ) : status === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              )}
              <p className="font-medium capitalize">{status}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-500">Client</span>
            <div className="flex items-center mt-1">
              <User className="h-4 w-4 text-gray-400 mr-1" />
              <p className="font-medium">{clientInfo.name}</p>
              {clientInfo.matterNumber && (
                <span className="ml-2 text-sm text-gray-500">Matter: {clientInfo.matterNumber}</span>
              )}
            </div>
          </div>
          
          {query.deadline && (
            <div>
              <span className="text-sm text-gray-500">Deadline</span>
              <div className="flex items-center mt-1">
                <AlertCircle className="h-4 w-4 text-gray-400 mr-1" />
                <p className="font-medium">{formattedDate(query.deadline)}</p>
              </div>
            </div>
          )}
        </div>
        
        {relatedCases.length > 0 && (
          <div className="mb-4">
            <span className="text-sm text-gray-500">Related Cases</span>
            <div className="mt-1">
              <ul className="list-disc pl-5 space-y-1">
                {relatedCases.map((caseTitle: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{caseTitle}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          {query.requiresResearch && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
              Requires Research
            </span>
          )}
          {query.billable && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              Billable
            </span>
          )}
          {!query.billable && (
            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
              Non-Billable
            </span>
          )}
        </div>
      </div>
      
      {/* Response section */}
      {!response ? (
        // Processing state
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-700">Processing Legal Query</h3>
            <p className="text-gray-500 mt-1">
              This may take a moment. The page will automatically update when complete.
            </p>
          </div>
        </div>
      ) : (
        // Response content
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">Response Details</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadgeClass(response.riskLevel)}`}>
                {response.riskLevel.toUpperCase()} RISK
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <span className="text-sm text-gray-500">Jurisdiction Analysis</span>
                <div className="mt-1">
                  <p className="font-medium">{response.jurisdictionAnalysis.type} Jurisdiction</p>
                  <ul className="mt-1 text-sm text-gray-600">
                    {response.jurisdictionAnalysis.keyRequirements?.map((req: string, idx: number) => (
                      <li key={idx} className="list-disc ml-5">{req}</li>
                    )).slice(0, 2)}
                    {response.jurisdictionAnalysis.keyRequirements?.length > 2 && (
                      <li className="list-disc ml-5 text-blue-600">
                        {response.jurisdictionAnalysis.keyRequirements.length - 2} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Citations</span>
                <div className="mt-1">
                  <p className="font-medium">{response.citations.length} Legal Citations</p>
                  <ul className="mt-1 text-sm text-gray-600">
                    {response.citations.map((citation: LegalCitation, idx: number) => (
                      <li key={idx} className="list-disc ml-5 truncate">{citation.citation}</li>
                    )).slice(0, 2)}
                    {response.citations.length > 2 && (
                      <li className="list-disc ml-5 text-blue-600">
                        {response.citations.length - 2} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Billing Information</span>
                <div className="mt-1">
                  {response.billingInfo.billable === false ? (
                    <p className="font-medium">Non-Billable</p>
                  ) : (
                    <>
                      <p className="font-medium">${response.billingInfo.totalEstimatedCharge?.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        {response.billingInfo.aiProcessingHours} hours @ ${response.billingInfo.hourlyRate}/hr
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-sm text-gray-500">Recommendations</span>
              <div className="mt-2 space-y-2">
                  {response.recommendations.map((rec: LegalRecommendation, idx: number) => (
                  <div key={idx} className={`p-3 rounded-md ${
                    rec.priority === 'CRITICAL' ? 'bg-red-50 border border-red-100' :
                    rec.priority === 'HIGH' ? 'bg-orange-50 border border-orange-100' :
                    rec.priority === 'MODERATE' ? 'bg-yellow-50 border border-yellow-100' :
                    'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex justify-between">
                      <p className="font-medium">{rec.action}</p>
                      <span className="text-sm text-gray-600">{rec.timeline}</span>
                    </div>
                    <p className="text-sm mt-1">{rec.details}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <span className="text-sm text-gray-500">Next Steps</span>
              <div className="mt-2">
                <ul className="space-y-2">
                  {response.nextSteps.map((step: LegalNextStep, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                      <div>
                        <p className="font-medium">{step.step}</p>
                        <p className="text-sm text-gray-600">
                          Assigned to: {step.assignee} • Due: {step.deadline}
                        </p>
                        {step.actionItems && step.actionItems.length > 0 && (
                          <ul className="mt-1 text-sm text-gray-600">
                            {step.actionItems.map((item: string, itemIdx: number) => (
                              <li key={itemIdx} className="list-disc ml-5">{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mt-4">
              Processing Time: {response.processingTime.toFixed(2)}s • 
              {response.tokenCount} tokens • 
              {response.modelUsed}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Legal Analysis</h3>
            <div className="prose max-w-none markdown">
              {response.content.split('\n\n').map((paragraph: string, idx: number) => {
                if (paragraph.startsWith('##')) {
                  return <h4 key={idx} className="text-lg font-semibold mt-4 mb-2">{paragraph.replace('##', '')}</h4>;
                } else if (paragraph.startsWith('#')) {
                  return <h3 key={idx} className="text-xl font-semibold mt-5 mb-3">{paragraph.replace('#', '')}</h3>;
                } else if (paragraph.startsWith('-')) {
                  return (
                    <ul key={idx} className="list-disc pl-5 mb-4">
                      {paragraph.split('\n').map((item: string, i: number) => (
                        <li key={i}>{item.replace('-', '').trim()}</li>
                      ))}
                    </ul>
                  );
                } else if (paragraph.match(/^\d\./)) {
                  return (
                    <ol key={idx} className="list-decimal pl-5 mb-4">
                      {paragraph.split('\n').map((item: string, i: number) => {
                        const numMatch = item.match(/^\d\./);
                        return numMatch ? (
                          <li key={i}>{item.replace(numMatch[0], '').trim()}</li>
                        ) : null;
                      }).filter(Boolean)}
                    </ol>
                  );
                } else {
                  return <p key={idx} className="mb-4">{paragraph}</p>;
                }
              })}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-700">
              <h4 className="font-semibold text-gray-900 mb-1">Confidentiality Notice</h4>
              <div className="whitespace-pre-line">{response.confidentialityNotice}</div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-700">
              <h4 className="font-semibold text-gray-900 mb-1">Legal Disclaimer</h4>
              <div className="whitespace-pre-line">{response.legalDisclaimer}</div>
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