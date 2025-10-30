// app/dashboard/page.tsx
import Link from 'next/link';
import { 
  Briefcase,
  Stethoscope
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
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
      <Link href={link} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
        Access System
        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Get medical queries count
  const { count: totalMedicalQueries } = await supabase
    .from('medical_queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);
    
  const { count: pendingMedicalQueries } = await supabase
    .from('medical_queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .not('id', 'in', supabase.from('medical_responses').select('query_id'));

  // Get legal queries count
  const { count: totalLegalQueries } = await supabase
    .from('legal_queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);
    
  const { count: pendingLegalQueries } = await supabase
    .from('legal_queries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('status', 'pending');
  
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      
      <div className="mb-10">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Professional AI Workflow System</h2>
          <p className="text-gray-700 mb-4">
            Access specialized AI workflows tailored for professional domains. 
            Choose from the systems below to get started with your queries.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <SystemCard 
          title="Medical Professional System" 
          description="AI-powered clinical decision support with evidence-based recommendations for healthcare professionals."
          icon={<Stethoscope className="h-12 w-12" />}
          link="/dashboard/queries"
          count={totalMedicalQueries || 0}
          pending={pendingMedicalQueries || 0}
        />
        
        <SystemCard 
          title="Legal Professional System" 
          description="Domain-specific legal analysis with jurisdiction-aware recommendations and risk assessment."
          icon={<Briefcase className="h-12 w-12" />}
          link="/dashboard/legal"
          count={totalLegalQueries || 0}
          pending={pendingLegalQueries || 0}
        />
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        
        <div className="flex justify-between mb-6">
          <div className="flex">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-l-md">All</button>
            <button className="px-4 py-2 border border-gray-300 bg-white text-gray-700">Medical</button>
            <button className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-r-md">Legal</button>
          </div>
          
          <div>
            <Link href="/dashboard/activity" className="text-blue-600 hover:text-blue-800">
              View all activity
            </Link>
          </div>
        </div>
        
        <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed border-gray-300 rounded-md">
          Combined activity timeline would be displayed here
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">System Analytics</h2>
        <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed border-gray-300 rounded-md">
          Combined analytics dashboard would be displayed here
        </div>
      </div>
    </div>
  );
}