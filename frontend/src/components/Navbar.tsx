// components/Navbar.tsx - Simple navbar with logout
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Stethoscope, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('legalQueries');
    localStorage.removeItem('medicalQueries');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="flex items-center mr-4">
                <Briefcase className="w-6 h-6 text-blue-600 mr-1" />
                <Stethoscope className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xl font-semibold text-gray-900">
                AI Workflows
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <Link 
                href="/dashboard" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link 
                href="/legal" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Legal
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-1" />
                {user.name}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}