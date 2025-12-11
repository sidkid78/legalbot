// app/dashboard/page.tsx
import Link from 'next/link';
import { 
  Briefcase,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react';
import { db } from '@/lib/database/json-db-manager';

// Modern Dashboard statistics card component
function DashboardStatCard({ title, value, icon, gradient, trend }: { 
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

// Modern System card component
function SystemCard({ 
  title, 
  description, 
  icon, 
  link, 
  count,
  pending
}: { 
  title: string; 
  description: string;
  icon: React.ReactNode;
  link: string;
  count: number;
  pending: number;
}) {
  return (
    <Link href={link}>
      <div className="glass rounded-2xl p-8 card-hover group cursor-pointer">
        <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="flex gap-2">
            <span className="badge bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              {count} Cases
            </span>
            {pending > 0 && (
              <span className="badge risk-high pulse-glow">
                {pending} Active
              </span>
            )}
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-3 text-gray-800 group-hover:text-purple-600 transition-colors">{title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
        <div className="flex items-center text-purple-600 font-semibold group-hover:gap-3 gap-2 transition-all">
          <span>Access System</span>
          <Zap className="h-5 w-5 group-hover:text-yellow-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  // Get statistics (no authentication needed)
  const stats = db.getStats() || { queries: 0, responses: 0, users: 0 };
  const totalQueries = stats.queries || 0;
  const totalResponses = stats.responses || 0;
  const pendingQueries = totalQueries - totalResponses;
  
  const userQueries = db.getLegalQueriesByUser('default-user', 100) || [];
  const totalLegalQueries = userQueries.length || 0;
  const pendingLegalQueries = userQueries.filter(q => q.status === 'pending').length || 0;
  
  return (
    <div className="content-wrapper min-h-screen py-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">LawyerBot Dashboard</h1>
        <p className="text-purple-100 text-lg">AI-powered legal analysis and case management</p>
      </div>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <DashboardStatCard 
          title="Total Queries" 
          value={totalQueries} 
          icon={<Activity className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <DashboardStatCard 
          title="Completed" 
          value={totalResponses} 
          icon={<CheckCircle className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          trend="+12%"
        />
        <DashboardStatCard 
          title="Active Cases" 
          value={pendingQueries} 
          icon={<Clock className="h-8 w-8 text-white" />} 
          gradient="bg-gradient-to-br from-orange-500 to-red-600"
        />
      </div>
      
      {/* Welcome Card */}
      <div className="glass rounded-2xl p-8 mb-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to LawyerBot</h2>
            <p className="text-gray-600 leading-relaxed">
              Access specialized AI workflows tailored for legal professionals. 
              Get jurisdiction-aware analysis, risk assessment, and comprehensive legal recommendations powered by Google Gemini.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{totalLegalQueries}</div>
            <div className="text-sm text-gray-500">Total Cases Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{totalResponses}</div>
            <div className="text-sm text-gray-500">Cases Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">{pendingLegalQueries}</div>
            <div className="text-sm text-gray-500">Cases In Progress</div>
          </div>
        </div>
      </div>
      
      {/* Legal System Card */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-6">Your Legal Workspace</h2>
        <SystemCard 
          title="Legal Professional System" 
          description="Domain-specific legal analysis with jurisdiction-aware recommendations, risk assessment, and automated case law research. Supports Corporate, IP, Employment, Criminal, Civil, and Family Law."
          icon={<Briefcase className="h-12 w-12 text-white" />}
          link="/dashboard/legal"
          count={totalLegalQueries || 0}
          pending={pendingLegalQueries || 0}
        />
      </div>
      
      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/legal" className="glass rounded-2xl p-6 card-hover group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">New Legal Query</h3>
              <p className="text-sm text-gray-500">Start a new case analysis</p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Submit a legal question and get comprehensive AI-powered analysis with case law citations and actionable recommendations.
          </p>
          <div className="flex items-center text-green-600 font-semibold group-hover:gap-2 gap-1 transition-all">
            <span>Create Query</span>
            <Zap className="h-4 w-4" />
          </div>
        </Link>
        
        <Link href="/dashboard/legal" className="glass rounded-2xl p-6 card-hover group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">View All Cases</h3>
              <p className="text-sm text-gray-500">Browse your case history</p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Access all your legal queries, review past analyses, and track the status of ongoing cases in one centralized location.
          </p>
          <div className="flex items-center text-purple-600 font-semibold group-hover:gap-2 gap-1 transition-all">
            <span>Browse Cases</span>
            <Zap className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}