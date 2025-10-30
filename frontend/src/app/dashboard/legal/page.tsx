// app/dashboard/legal/page.tsx
import Link from 'next/link';
import { PlusCircle, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  LegalUrgency, 
  RiskLevel 
} from '@/lib/legal/types';
import { redirect } from 'next/navigation';
import { LegalQuery, LegalResponse } from '@/lib/legal/types';
import { createClient } from '@/utils/supabase/client';


// Legal statistics card component
function StatCard({ title, value, icon, className }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-500">{title}</h3>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-blue-500">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Activity item component
function QueryListItem({ 
  query, 
  response 
}: { 
  query: unknown; 
  response?: unknown;
}) {
  // Format date
  const formattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Determine status and icon
  let statusIcon;
  if (!response) {
    statusIcon = <Clock className="h-5 w-5 text-blue-500" />;
  } else if ((response as LegalResponse).riskLevel === RiskLevel.CRITICAL || (response as LegalResponse).riskLevel === RiskLevel.HIGH) {
    statusIcon = <AlertTriangle className="h-5 w-5 text-orange-500" />;
  } else {
    statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
  }
  
  // Get urgency badge class
  const getUrgencyBadgeClass = (urgency: LegalUrgency) => {
    switch (urgency) {
      case LegalUrgency.EMERGENCY:
        return 'badge-emergency';
      case LegalUrgency.URGENT:
        return 'badge-urgent';
      case LegalUrgency.HIGH:
        return 'badge-semi-urgent';
      case LegalUrgency.MEDIUM:
        return 'badge-routine';
      case LegalUrgency.LOW:
        return 'badge-non-urgent';
      default:
        return 'badge-routine';
    }
  };
  
  return (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {(query as LegalQuery).content.length > 100 
              ? `${(query as LegalQuery).content.substring(0, 100)}...` 
              : (query as LegalQuery).content}
          </div>
          <div className="text-sm text-gray-500 mt-1 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formattedDate((query as LegalQuery).created_at || (query as LegalQuery).createdAt || new Date().toISOString())}
          </div>
          <div className="flex items-center mt-2">
            <span className={getUrgencyBadgeClass((query as LegalQuery).urgency)}>
              {(query as LegalQuery).urgency.replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
            <span className="ml-2 text-xs text-gray-500 capitalize">
              {(query as LegalQuery).domain.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          {statusIcon}
        </div>
      </div>
    </div>
  );
}

export default async function LegalDashboardPage() {
  const supabase = createClient();
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Get recent queries
  const { data: recentQueries } = await supabase
    .from('legal_queries')
    .select(`
      *,
      legal_responses(*)
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get overall statistics
  const { count: totalQueries } = await supabase
    .from('legal_queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);
  
  const { count: totalResponses } = await supabase
    .from('legal_responses')
    .select('*', { count: 'exact', head: true })
    .in('query_id', supabase.from('legal_queries').select('id').eq('user_id', session.user.id) as unknown as string[]);

  const { count: pendingQueries } = await supabase
    .from('legal_queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('status', 'pending');
  
  const { data: highRiskCases } = await supabase
    .from('legal_responses')
    .select('*', { count: 'exact' })
    .in('query_id', supabase.from('legal_queries').select('id').eq('user_id', session.user.id) as unknown as string[])
    .in('risk_level', [RiskLevel.CRITICAL, RiskLevel.HIGH]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Legal Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Legal Queries" 
          value={totalQueries || 0} 
          icon={<FileText className="h-8 w-8" />} 
        />
        <StatCard 
          title="Completed Responses" 
          value={totalResponses || 0} 
          icon={<CheckCircle className="h-8 w-8" />} 
        />
        <StatCard 
          title="Pending Queries" 
          value={pendingQueries || 0} 
          icon={<Clock className="h-8 w-8" />} 
          className={pendingQueries ? "bg-yellow-50 border border-yellow-100" : ""}
        />
        <StatCard 
          title="High Risk Cases" 
          value={highRiskCases?.length || 0} 
          icon={<AlertTriangle className="h-8 w-8" />} 
          className={highRiskCases?.length ? "bg-red-50 border border-red-100" : ""}
        />
      </div>
      
      {/* Actions */}
      <div className="mb-8">
        <Link 
          href="/dashboard/legal/new" 
          className="btn-primary inline-flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Legal Query
        </Link>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium">Recent Legal Queries</h2>
        </div>
        
        {recentQueries && recentQueries.length > 0 ? (
          <div>
            {recentQueries.map((query) => (
              <Link href={`/dashboard/legal/${query.id}`} key={query.id}>
                <QueryListItem 
                  query={query} 
                  response={query.legal_responses?.length ? query.legal_responses[0] : null}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No recent queries. Start by submitting a new legal query.
          </div>
        )}
        
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Link href="/dashboard/legal/history" className="text-blue-600 hover:text-blue-800">
            View all legal queries
          </Link>
        </div>
      </div>
      
      {/* Domain Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Legal Domain Distribution</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          {/* Placeholder for domain distribution chart */}
          <p>Chart would display distribution of queries by legal domain</p>
        </div>
      </div>
    </div>
  );
}