// app/dashboard/legal/new/page.tsx
import Link from 'next/link';
import { Metadata } from 'next';
import LegalQueryForm from '@/components/forms/legal-query-form';

export const metadata: Metadata = {
  title: 'File a Matter — LawyerBot',
  description: 'Submit a legal matter for analysis, in full.',
};

export default function NewLegalQueryPage() {
  return (
    <div className="measure pb-4">
      <header className="rise rise-1 pt-12 pb-10 lg:pt-16">
        <div>
          <Link
            href="/dashboard/legal"
            className="link-draw label inline-flex items-center gap-2 hover:text-accent"
          >
            <span aria-hidden="true">&larr;</span> Back to the docket
          </Link>
        </div>

        <p className="section-mark mt-8">Long form</p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4rem)] leading-[0.98] text-ink">
          File a matter,
          <br />
          <span className="italic text-accent">in full.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Four articles. Use this when you already know the domain and the forum
          — otherwise{' '}
          <Link href="/legal" className="link-draw text-accent">
            describe it plainly
          </Link>{' '}
          and let the classification be inferred.
        </p>
      </header>

      <div className="rise rise-2">
        <LegalQueryForm />
      </div>
    </div>
  );
}
