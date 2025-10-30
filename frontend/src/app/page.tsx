// app/page.tsx
'use client';

import Link from 'next/link';
import { Clock, Stethoscope, Briefcase, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Types for local storage data
interface QueryStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
}

interface DashboardData {
  medical: QueryStats;
  legal: QueryStats;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'medical' | 'legal';
  action: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// Dashboard statistics card component
function DashboardStatCard({ title, value, icon, className }: { 
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

// System card component
function SystemCard({ 
  title, 
  description, 
  icon, 
  link, 
  count,
  pending,
  isEnabled = true
}: { 
  title: string; 
  description: string;
  icon: React.ReactNode;
  link: string;
  count: number;
  pending: number;
  isEnabled?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 transition-shadow ${
      isEnabled ? 'hover:shadow-lg' : 'opacity-50'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="text-blue-600">
          {icon}
        </div>
        <div className="flex">
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            {count} total
          </span>
          {pending > 0 && (
            <span className="ml-2 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
              {pending} pending
            </span>
          )}
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {isEnabled ? (
        <Link href={link} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
          Access System
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </Link>
      ) : (
        <span className="text-gray-400 font-medium inline-flex items-center">
          Coming Soon
          <Clock className="ml-1 w-4 h-4" />
        </span>
      )}
    </div>
  );
}

// Activity item component
function ActivityItemComponent({ item }: { item: ActivityItem }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medical': return <Stethoscope className="w-4 h-4" />;
      case 'legal': return <Briefcase className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-3">
        <div className="text-blue-500">
          {getTypeIcon(item.type)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{item.action}</p>
          <p className="text-xs text-gray-500">
            {new Date(item.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
        {item.status}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    medical: { total: 0, pending: 0, completed: 0, failed: 0 },
    legal: { total: 0, pending: 0, completed: 0, failed: 0 },
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    // Check if user is logged in (simple check)
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadDashboardData();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const loadDashboardData = () => {
    try {
      // Load medical queries from localStorage
      const medicalQueries = JSON.parse(localStorage.getItem('medicalQueries') || '[]');
      const medicalStats = calculateStats(medicalQueries);

      // Load legal queries from localStorage
      const legalQueries = JSON.parse(localStorage.getItem('legalQueries') || '[]');
      const legalStats = calculateStats(legalQueries);

      // Load recent activity
      const allActivity = [
        ...medicalQueries.map((q: QueryStats) => ({
          id: q.total,
          type: 'medical' as const,
          action: `Medical query: ${q.total}...`,
          timestamp: q.completed,
          status: q.completed || 'completed'
        })),
        ...legalQueries.map((q: QueryStats) => ({
          id: q.total,
          type: 'legal' as const,
          action: `Legal query: ${q.total}...`,
          timestamp: q.completed,
          status: q.completed || 'completed'
        }))
      ];

      // Sort by timestamp and take the 5 most recent
      const recentActivity = allActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      setDashboardData({
        medical: medicalStats,
        legal: legalStats,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (queries: QueryStats[]): QueryStats => {
    return {
      total: queries.length,
      pending: queries.filter(q => q.pending || !q.pending).length,
      completed: queries.filter(q => q.completed || !q.completed).length,
      failed: queries.filter(q => q.failed || !q.failed).length
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalQueries = dashboardData.medical.total + dashboardData.legal.total;
  const totalPending = dashboardData.medical.pending + dashboardData.legal.pending;
  const totalCompleted = dashboardData.medical.completed + dashboardData.legal.completed;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {user && (
          <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
        )}
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <DashboardStatCard 
          title="Total Queries" 
          value={totalQueries}
          icon={<Activity className="h-8 w-8" />}
        />
        <DashboardStatCard 
          title="Completed" 
          value={totalCompleted}
          icon={<BarChart3 className="h-8 w-8" />}
          className="border-l-4 border-green-500"
        />
        <DashboardStatCard 
          title="Pending" 
          value={totalPending}
          icon={<Clock className="h-8 w-8" />}
          className="border-l-4 border-yellow-500"
        />
        <DashboardStatCard 
          title="API Status" 
          value="Online"
          icon={<AlertCircle className="h-8 w-8" />}
          className="border-l-4 border-blue-500"
        />
      </div>
      
      <div className="mb-10">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Professional AI Workflow System</h2>
          <p className="text-gray-700 mb-4">
            Access specialized AI workflows tailored for professional domains. 
            Choose from the systems below to get started with your queries.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                <strong>Legal System:</strong> Fully operational with Google Gemini AI integration. 
                <strong>Medical System:</strong> Coming soon.
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <SystemCard 
          title="Legal Professional System" 
          description="Domain-specific legal analysis with jurisdiction-aware recommendations and risk assessment powered by Google Gemini AI."
          icon={<Briefcase className="h-12 w-12" />}
          link="/legal"
          count={dashboardData.legal.total}
          pending={dashboardData.legal.pending}
          isEnabled={true}
        />
        
        <SystemCard 
          title="Medical Professional System" 
          description="AI-powered clinical decision support with evidence-based recommendations for healthcare professionals."
          icon={<Stethoscope className="h-12 w-12" />}
          link="/medical"
          count={dashboardData.medical.total}
          pending={dashboardData.medical.pending}
          isEnabled={false}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/activity" className="text-blue-600 hover:text-blue-800 text-sm">
              View all
            </Link>
          </div>
          
          {dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-0">
              {dashboardData.recentActivity.map((item) => (
                <ActivityItemComponent key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Submit your first query to get started</p>
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              href="/legal" 
              className="block w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center">
                <Briefcase className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium">New Legal Query</h3>
                  <p className="text-sm text-gray-600">Get legal analysis and recommendations</p>
                </div>
              </div>
            </Link>
            
            <div className="block w-full p-4 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
              <div className="flex items-center">
                <Stethoscope className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-500">New Medical Query</h3>
                  <p className="text-sm text-gray-400">Coming soon</p>
                </div>
              </div>
            </div>
            
            <Link 
              href="/settings" 
              className="block w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-gray-600 mr-3" />
                <div>
                  <h3 className="font-medium">View Analytics</h3>
                  <p className="text-sm text-gray-600">Detailed usage statistics</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}