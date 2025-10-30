// components/forms/legal-query-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  LegalDomain, 
  JurisdictionType, 
  LegalUrgency 
} from '@/lib/legal/types';

export default function LegalQueryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [domain, setDomain] = useState<LegalDomain>(LegalDomain.CONTRACTS);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionType>(JurisdictionType.STATE);
  const [urgency, setUrgency] = useState<LegalUrgency>(LegalUrgency.MEDIUM);
  const [priority, setPriority] = useState(3);
  const [requiresResearch, setRequiresResearch] = useState(true);
  const [billable, setBillable] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [clientName, setClientName] = useState('');
  const [matterNumber, setMatterNumber] = useState('');
  const [relatedCases, setRelatedCases] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter a legal query');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/legal-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          domain,
          jurisdiction,
          urgency,
          priority,
          requiresResearch,
          billable,
          deadline: deadline || undefined,
          clientInfo: {
            name: clientName || 'Confidential Client',
            matterNumber: matterNumber || `M-${Date.now()}`
          },
          relatedCases: relatedCases ? relatedCases.split(',').map(c => c.trim()) : undefined
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit query');
      }
      
      toast.success('Legal query submitted successfully');
      router.push(`/dashboard/legal/${data.queryId}`);
    } catch (error) {
      console.error('Error submitting legal query:', error);
      toast.error('Failed to submit legal query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Legal Query
          </label>
          <textarea
            id="content"
            className="form-textarea h-48"
            placeholder="Enter your legal query here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Legal Domain
            </label>
            <select
              id="domain"
              className="form-select"
              value={domain}
              onChange={(e) => setDomain(e.target.value as LegalDomain)}
            >
              {Object.values(LegalDomain).map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700 mb-2">
              Jurisdiction
            </label>
            <select
              id="jurisdiction"
              className="form-select"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as JurisdictionType)}
            >
              {Object.values(JurisdictionType).map((value) => (
                <option key={value} value={value}>
                  {value.replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level
            </label>
            <select
              id="urgency"
              className="form-select"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as LegalUrgency)}
            >
              <option value={LegalUrgency.EMERGENCY}>Emergency (Immediate)</option>
              <option value={LegalUrgency.URGENT}>Urgent (24-48 hours)</option>
              <option value={LegalUrgency.HIGH}>High (Within a week)</option>
              <option value={LegalUrgency.MEDIUM}>Medium (Within a month)</option>
              <option value={LegalUrgency.LOW}>Low (No immediate timeline)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <select
              id="priority"
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
            >
              <option value={1}>1 - Critical</option>
              <option value={2}>2 - High</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - Low</option>
              <option value={5}>5 - Minimal</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
              Client Name
            </label>
            <input
              id="clientName"
              type="text"
              className="form-input"
              placeholder="Enter client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="matterNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Matter Number
            </label>
            <input
              id="matterNumber"
              type="text"
              className="form-input"
              placeholder="Enter matter number"
              value={matterNumber}
              onChange={(e) => setMatterNumber(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="relatedCases" className="block text-sm font-medium text-gray-700 mb-2">
              Related Cases (comma separated)
            </label>
            <input
              id="relatedCases"
              type="text"
              className="form-input"
              placeholder="e.g. Smith v. Jones, Doe v. Corp"
              value={relatedCases}
              onChange={(e) => setRelatedCases(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
              Deadline (if applicable)
            </label>
            <div className="relative">
              <input
                id="deadline"
                type="date"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresResearch"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={requiresResearch}
              onChange={(e) => setRequiresResearch(e.target.checked)}
            />
            <label htmlFor="requiresResearch" className="ml-2 block text-sm text-gray-700">
              Requires legal research
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="billable"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
            />
            <label htmlFor="billable" className="ml-2 block text-sm text-gray-700">
              Billable to client
            </label>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary inline-flex items-center"
            disabled={loading || !content.trim()}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Legal Query
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}