// app/login/page.tsx — Entry of Appearance
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RECITALS = [
  {
    n: 'I',
    title: 'Jurisdiction-aware analysis',
    body: 'Every matter is read for its governing forum before a word of advice is drafted.',
  },
  {
    n: 'II',
    title: 'Authority, retrieved',
    body: 'Case law is pulled from CourtListener and cited in full, never invented.',
  },
  {
    n: 'III',
    title: 'Risk, assessed',
    body: 'Exposure is graded and ranked so the urgent work surfaces first.',
  },
];

export default function LoginPage() {
  const [formData, setFormData] = useState({ name: '', email: '', organization: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email) {
      setError('Name and email are required to enter an appearance.');
      return;
    }

    setIsLoading(true);

    try {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: crypto.randomUUID(),
          name: formData.name,
          email: formData.email,
          organization: formData.organization,
          loginTime: new Date().toISOString(),
        })
      );

      if (!localStorage.getItem('legalQueries')) {
        localStorage.setItem('legalQueries', JSON.stringify([]));
      }
      if (!localStorage.getItem('medicalQueries')) {
        localStorage.setItem('medicalQueries', JSON.stringify([]));
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Appearance could not be entered. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="measure grid gap-16 py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-24 lg:py-24">
      {/* ── Title page ─────────────────────────────────────────── */}
      <section className="rise rise-1 flex flex-col justify-center">
        <p className="label label-accent">In the matter of</p>

        <h1 className="mt-5 text-[clamp(3rem,9vw,5.75rem)] leading-[0.92] text-ink">
          Counsel,
          <br />
          <span className="italic text-accent">drafted</span> before
          <br />
          you ask twice.
        </h1>

        <div
          className="rule-in mt-9 h-px w-full bg-rule-strong"
          style={{ animationDelay: '0.4s' }}
        />

        <p className="mt-8 max-w-lg text-lg leading-relaxed text-ink-soft">
          LawyerBot reads a situation the way an associate does — forum first,
          then authority, then exposure — and returns a memorandum you can
          actually file against.
        </p>

        {/* Recitals */}
        <ol className="mt-12 space-y-0 border-t border-rule">
          {RECITALS.map((r) => (
            <li
              key={r.n}
              className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-rule py-5"
            >
              <span className="label pt-1 tabular-nums">{r.n}</span>
              <div>
                <h2 className="font-display text-lg text-ink">{r.title}</h2>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-faint">
                  {r.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Appearance form ────────────────────────────────────── */}
      <section className="rise rise-3 flex flex-col justify-center">
        <div className="sheet sheet-filed p-8 sm:p-10">
          <p className="section-mark">Entry of appearance</p>

          <h2 className="mt-4 font-display text-3xl text-ink">
            Identify yourself
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-faint">
            A demonstration instrument. No password is taken and nothing leaves
            this browser.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-6 border-l-2 border-accent bg-inset py-2 pl-3 text-sm text-accent"
            >
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-9 space-y-7">
            <div>
              <label htmlFor="name" className="label block">
                Full name <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="field mt-2"
                placeholder="Jordan Reyes"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="label block">
                Email address <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="field mt-2"
                placeholder="jreyes@firm.example"
                required
              />
            </div>

            <div>
              <label htmlFor="organization" className="label block">
                Firm or organization
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
                className="field mt-2"
                placeholder="Optional"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-seal mt-2 w-full"
            >
              {isLoading ? (
                <>
                  <span className="spin-seal h-3.5 w-3.5 rounded-full border border-seal-ink/40 border-t-seal-ink" />
                  Entering
                </>
              ) : (
                'Enter appearance'
              )}
            </button>
          </form>
        </div>

        <p className="label mt-6 leading-relaxed">
          By proceeding you accept that generated analysis is not legal advice
          and creates no attorney–client relationship.
        </p>
      </section>
    </div>
  );
}
