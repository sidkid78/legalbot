// app/dashboard/legal/page.tsx
import Link from 'next/link';
import { PlusCircle, FileText, Clock, CheckCircle, AlertTriangle, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { 
  LegalUrgency, 
  RiskLevel 
} from '@/lib/legal/types';
import { LegalQuery, LegalResponse } from '@/lib/legal/types';
import { db } from '@/lib/database/json-db-manager';


// Modern Legal statistics card component
function StatCard({ title, value, icon, gradient, trend }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  gradient: string;
  trend?: string;
}) {
  return (
    <div className="stat-card card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${gradient} rounded-xl`}>
          {icon}
        </div>
        {trend && (
          <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
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
  
  const getUrgencyClassModern = (urgency: LegalUrgency) => {
    switch (urgency) {
      case LegalUrgency.EMERGENCY:
        return 'risk-critical';
      case LegalUrgency.URGENT:
        return 'risk-high';
      case LegalUrgency.HIGH:
        return 'risk-moderate';
      default:
        return 'bg-blue-500 text-white';
    }
  };
  
  const getRiskBorder = () => {
    if (!response) return 'border-blue-400';
    const riskLevel = (response as LegalResponse).riskLevel;
    if (riskLevel === RiskLevel.CRITICAL) return 'border-red-500';
    if (riskLevel === RiskLevel.HIGH) return 'border-orange-500';
    if (riskLevel === RiskLevel.MODERATE) return 'border-yellow-500';
    return 'border-green-500';
  };

  return (
    <div className={`glass rounded-xl p-5 mb-4 card-hover border-l-4 ${getRiskBorder()}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className={`badge ${getUrgencyClassModern((query as LegalQuery).urgency)}`}>
              {(query as LegalQuery).urgency.toUpperCase()}
            </span>
            <span className="badge bg-purple-100 text-purple-700 capitalize">
              {(query as LegalQuery).domain.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="font-semibold text-gray-800 mb-2 line-clamp-2">
            {(query as LegalQuery).content.length > 120 
              ? `${(query as LegalQuery).content.substring(0, 120)}...` 
              : (query as LegalQuery).content}
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formattedDate((query as LegalQuery).timestamp)}
            </span>
            {response && (response as LegalResponse).riskLevel && (
              <span className={`badge text-xs ${
                (response as LegalResponse).riskLevel === RiskLevel.CRITICAL || 
                (response as LegalResponse).riskLevel === RiskLevel.HIGH
                  ? 'risk-high' : 'risk-low'
              }`}>
                {((response as LegalResponse).riskLevel as string).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!response ? (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
              <span className="text-xs font-medium">Processing</span>
            </div>
          ) : (
            <CheckCircle className="h-6 w-6 text-green-500" />
          )}
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}

export default async function LegalDashboardPage() {
  // Get data from JSON database (no authentication needed)
  const allQueries = db.getLegalQueriesByUser('default-user', 100);
  const recentQueries = allQueries.slice(0, 10);
  
  // Calculate statistics
  const totalQueries = allQueries.length;
  const totalResponses = allQueries.filter(q => q.status === 'completed').length;
  const pendingQueries = allQueries.filter(q => q.status === 'pending').length;
  
  // Get high risk cases
  const highRiskCases = allQueries.filter(q => {
    if (q.status !== 'completed') return false;
    const response = db.getLegalResponse(q.id || '');
    return response && (response.riskLevel === RiskLevel.CRITICAL || response.riskLevel === RiskLevel.HIGH);
  });
  
  // Attach responses to queries
  const queriesWithResponses = recentQueries.map(query => ({
    ...query,
    response: query.status === 'completed' ? db.getLegalResponse(query.id || '') : null
  }));

  return (
    <div className="content-wrapper min-h-screen py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Legal Case Management</h1>
          <p className="text-purple-100">Manage and track all your legal queries in one place</p>
        </div>
        <Link 
          href="/legal" 
          className="btn-primary inline-flex items-center gap-2 group"
        >
          <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform" />
          New Legal Query
        </Link>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Total Cases" 
          value={totalQueries || 0} 
          icon={<FileText className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard 
          title="Completed" 
          value={totalResponses || 0} 
          icon={<CheckCircle className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          trend="+8%"
        />
        <StatCard 
          title="In Progress" 
          value={pendingQueries || 0} 
          icon={<Clock className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-yellow-500 to-orange-600"
        />
        <StatCard 
          title="High Risk" 
          value={highRiskCases.length} 
          icon={<AlertTriangle className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-red-500 to-pink-600"
        />
      </div>
      
      {/* Recent Queries Section */}
      <div className="glass rounded-2xl p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Recent Legal Queries</h2>
              <p className="text-sm text-gray-500">Latest case analyses and updates</p>
            </div>
          </div>
          {queriesWithResponses.length > 0 && (
            <Link href="/legal" className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        
        {queriesWithResponses.length > 0 ? (
          <div>
            {queriesWithResponses.map((item) => (
              <Link href={`/dashboard/legal/${item.id}`} key={item.id}>
                <QueryListItem 
                  query={item} 
                  response={item.response}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-4">
              <FileText className="h-16 w-16 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Legal Queries Yet</h3>
            <p className="text-gray-600 mb-6">Start by submitting your first legal query to get AI-powered analysis</p>
            <Link 
              href="/legal" 
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Create Your First Query
            </Link>
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      {queriesWithResponses.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800">Success Rate</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {totalQueries > 0 ? Math.round((totalResponses / totalQueries) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Cases successfully analyzed</p>
          </div>
          
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800">Risk Alert</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {highRiskCases.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">High-priority cases requiring attention</p>
          </div>
          
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800">Average Speed</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">2.3s</p>
            <p className="text-sm text-gray-500 mt-1">Average analysis time</p>
          </div>
        </div>
      )}
    </div>
  );
}