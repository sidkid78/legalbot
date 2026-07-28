// components/forms/legal-query-form.tsx — the long form instrument
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LegalDomain, JurisdictionType, LegalUrgency } from '@/lib/legal/types';

/** A numbered article of the instrument. */
function Article({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-rule py-9 lg:grid-cols-[15rem_1fr] lg:gap-12">
      <div>
        <p className="label label-accent">Article {n}</p>
        <h2 className="mt-2 font-display text-xl text-ink">{title}</h2>
        {note && (
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-faint">
            {note}
          </p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label block">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function LegalQueryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [domain, setDomain] = useState<LegalDomain>(LegalDomain.CONTRACTS);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionType>(
    JurisdictionType.STATE
  );
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
      toast.error('A statement of facts is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/legal-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            matterNumber: matterNumber || `M-${Date.now()}`,
          },
          relatedCases: relatedCases
            ? relatedCases.split(',').map((c) => c.trim())
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit query');
      }

      toast.success('Matter filed');
      router.push(`/dashboard/legal/${data.queryId}`);
    } catch (error) {
      console.error('Error submitting legal query:', error);
      toast.error('Filing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Article
        n="I"
        title="Statement of facts"
        note="Set out the situation as fully as you would to a colleague."
      >
        <textarea
          id="content"
          className="field field-box"
          rows={10}
          placeholder="Describe the matter, its background, the parties involved and the outcome sought…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </Article>

      <Article
        n="II"
        title="Classification"
        note="How the matter should be characterised and where it will be heard."
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <Field id="domain" label="Legal domain">
            <select
              id="domain"
              className="field mt-2"
              value={domain}
              onChange={(e) => setDomain(e.target.value as LegalDomain)}
            >
              {Object.values(LegalDomain).map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </Field>

          <Field id="jurisdiction" label="Jurisdiction">
            <select
              id="jurisdiction"
              className="field mt-2"
              value={jurisdiction}
              onChange={(e) =>
                setJurisdiction(e.target.value as JurisdictionType)
              }
            >
              {Object.values(JurisdictionType).map((value) => (
                <option key={value} value={value}>
                  {value.replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Article>

      <Article
        n="III"
        title="Posture"
        note="How quickly the matter must move, and where it sits against your other work."
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <Field id="urgency" label="Urgency">
            <select
              id="urgency"
              className="field mt-2"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as LegalUrgency)}
            >
              <option value={LegalUrgency.EMERGENCY}>
                Emergency — immediate
              </option>
              <option value={LegalUrgency.URGENT}>Urgent — 24 to 48 hours</option>
              <option value={LegalUrgency.HIGH}>High — within a week</option>
              <option value={LegalUrgency.MEDIUM}>Medium — within a month</option>
              <option value={LegalUrgency.LOW}>Low — no fixed timeline</option>
            </select>
          </Field>

          <Field id="priority" label="Priority">
            <select
              id="priority"
              className="field mt-2"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
            >
              <option value={1}>1 — Critical</option>
              <option value={2}>2 — High</option>
              <option value={3}>3 — Medium</option>
              <option value={4}>4 — Low</option>
              <option value={5}>5 — Minimal</option>
            </select>
          </Field>
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-rule pt-6 sm:flex-row sm:gap-10">
          <label
            htmlFor="requiresResearch"
            className="flex cursor-pointer items-center gap-3"
          >
            <input
              type="checkbox"
              id="requiresResearch"
              className="check"
              checked={requiresResearch}
              onChange={(e) => setRequiresResearch(e.target.checked)}
            />
            <span className="label">Requires case-law research</span>
          </label>

          <label
            htmlFor="billable"
            className="flex cursor-pointer items-center gap-3"
          >
            <input
              type="checkbox"
              id="billable"
              className="check"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
            />
            <span className="label">Billable to client</span>
          </label>
        </div>
      </Article>

      <Article
        n="IV"
        title="Particulars"
        note="For your own records. None of this is required."
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <Field id="clientName" label="Client">
            <input
              id="clientName"
              type="text"
              className="field mt-2"
              placeholder="Client or company name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </Field>

          <Field id="matterNumber" label="Matter number">
            <input
              id="matterNumber"
              type="text"
              className="field mt-2 font-mono text-sm"
              placeholder="M-000000"
              value={matterNumber}
              onChange={(e) => setMatterNumber(e.target.value)}
            />
          </Field>

          <Field id="relatedCases" label="Related matters (comma separated)">
            <input
              id="relatedCases"
              type="text"
              className="field mt-2"
              placeholder="Smith v. Jones, Doe v. Corp"
              value={relatedCases}
              onChange={(e) => setRelatedCases(e.target.value)}
            />
          </Field>

          <Field id="deadline" label="Deadline">
            <input
              id="deadline"
              type="date"
              className="field mt-2 font-mono text-sm"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </Field>
        </div>
      </Article>

      {/* Execution */}
      <div className="flex flex-col gap-5 border-t-2 border-ink pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="label max-w-sm leading-relaxed">
          Filing submits the matter for analysis. Generated advice must be
          verified before it is relied upon.
        </p>
        <button
          type="submit"
          className="btn btn-seal"
          disabled={loading || !content.trim()}
        >
          {loading ? (
            <>
              <span className="spin-seal h-3.5 w-3.5 rounded-full border border-seal-ink/40 border-t-seal-ink" />
              Filing
            </>
          ) : (
            'File the matter'
          )}
        </button>
      </div>
    </form>
  );
}
