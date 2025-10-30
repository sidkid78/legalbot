// app/dashboard/legal/new/page.tsx
import LegalQueryForm from '@/components/forms/legal-query-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Legal Query - Legal Professional System',
  description: 'Submit a new legal query for analysis',
};

export default function NewLegalQueryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New Legal Query</h1>
      
      <LegalQueryForm />
    </div>
  );
}