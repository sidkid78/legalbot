// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Stethoscope, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    setIsLoading(true);

    try {
      // Simple client-side "authentication" - just store user data
      const userData = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        organization: formData.organization,
        loginTime: new Date().toISOString()
      };

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Initialize empty data stores if they don't exist
      if (!localStorage.getItem('legalQueries')) {
        localStorage.setItem('legalQueries', JSON.stringify([]));
      }
      if (!localStorage.getItem('medicalQueries')) {
        localStorage.setItem('medicalQueries', JSON.stringify([]));
      }

      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <div className="p-3 bg-blue-600 rounded-lg mr-3">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div className="p-3 bg-green-600 rounded-lg">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Professional AI Workflows
            </h1>
            <p className="text-gray-600 mt-2">
              Access specialized AI systems for legal and medical professionals
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Get Started
            </h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization (Optional)
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your law firm, hospital, clinic, etc."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Getting Started...
                  </div>
                ) : (
                  'Access Dashboard'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                This is a demo application. No account creation or passwords required.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Available Systems</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <Briefcase className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <h4 className="font-medium">Legal Professional System</h4>
                  <p className="text-sm text-gray-600">
                    AI-powered legal analysis with jurisdiction-specific recommendations
                  </p>
                </div>
              </div>
              <div className="flex items-start opacity-50">
                <Stethoscope className="w-5 h-5 text-green-600 mt-1 mr-3" />
                <div>
                  <h4 className="font-medium">Medical Professional System</h4>
                  <p className="text-sm text-gray-600">
                    Clinical decision support (Coming Soon)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}