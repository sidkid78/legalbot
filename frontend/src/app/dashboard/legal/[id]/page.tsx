// app/dashboard/legal/[id]/page.tsx — the memorandum
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  RiskLevel,
  LegalNextStep,
  LegalRecommendation,
  LegalCitation,
  LegalQuery,
  LegalResponse,
} from '@/lib/legal/types';
import { db } from '@/lib/database/json-db-manager';
import { Mark, riskTone, formatDate, titleCase } from '@/components/press';

/* ------------------------------------------------------------------ */

function MemorandumSkeleton() {
  return (
    <div className="measure animate-pulse pt-12 pb-4">
      <div className="h-3 w-32 bg-rule" />
      <div className="mt-6 h-14 w-2/3 bg-rule" />
      <div className="mt-10 h-px w-full bg-rule" />
      <div className="mt-10 space-y-3">
        <div className="h-4 w-full bg-rule" />
        <div className="h-4 w-full bg-rule" />
        <div className="h-4 w-3/4 bg-rule" />
      </div>
      <div className="mt-12 grid gap-px bg-rule sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-paper" />
        ))}
      </div>
    </div>
  );
}

/** A labelled particular in the caption block. */
function Particular({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-sheet px-5 py-5">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-lg leading-tight text-ink">
        {children}
      </p>
    </div>
  );
}

function riskCounsel(risk: RiskLevel | string) {
  switch (risk) {
    case RiskLevel.CRITICAL:
      return 'Immediate attention is required.';
    case RiskLevel.HIGH:
      return 'Prompt action is required.';
    case RiskLevel.MODERATE:
      return 'Timely review is advised.';
    default:
      return 'Standard processing is sufficient.';
  }
}

/* ------------------------------------------------------------------ */

async function Memorandum({ id }: { id: string }) {
  const query: LegalQuery | null | undefined = db.getLegalQuery(id);
  if (!query) notFound();

  const response: LegalResponse | null | undefined = db.getLegalResponse(id);

  const clientInfo = query.clientInfo || {
    name: 'Confidential Client',
    matterNumber: 'N/A',
  };
  const relatedCases = query.relatedCases || [];
  const tone = riskTone(response?.riskLevel);

  return (
    <div className="measure pb-4">
      {/* ── Caption ─────────────────────────────────────────── */}
      <header className="rise rise-1 pt-12 pb-8 lg:pt-16">
        <div>
          <Link
            href="/dashboard/legal"
            className="link-draw label inline-flex items-center gap-2 hover:text-accent"
          >
            <span aria-hidden="true">&larr;</span> Back to the docket
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-mark">Memorandum of advice</p>
            <h1 className="mt-4 font-display text-[clamp(2.2rem,5.5vw,3.5rem)] leading-[1.02] text-ink">
              {clientInfo.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {response && (
              <Mark tone={tone}>{String(response.riskLevel)} exposure</Mark>
            )}
            <span className="docket text-ink-faint">
              {clientInfo.matterNumber}
            </span>
          </div>
        </div>

        <div
          className="rule-in mt-8 h-0.5 w-full bg-ink"
          style={{ animationDelay: '0.3s' }}
        />
      </header>

      {/* ── Statement of facts ──────────────────────────────── */}
      <section className="rise rise-2">
        <p className="section-mark mb-5">Statement of facts</p>
        <blockquote className="border-l-2 border-accent py-1 pl-6">
          <p className="max-w-3xl text-xl leading-relaxed whitespace-pre-line text-ink">
            {query.content}
          </p>
        </blockquote>
        <p className="docket mt-5 pl-6 text-ink-faint">
          Filed {formatDate(query.timestamp)}
        </p>
      </section>

      {/* ── Particulars ─────────────────────────────────────── */}
      <section className="rise rise-3 mt-12">
        <p className="section-mark mb-5">Particulars</p>
        <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
          <Particular label="Domain">{titleCase(query.domain)}</Particular>
          <Particular label="Jurisdiction">
            {titleCase(query.jurisdiction)}
          </Particular>
          <Particular label="Urgency">{titleCase(query.urgency)}</Particular>
          <Particular label="Priority">
            {query.priority} of 5
          </Particular>
        </div>

        {(query.deadline || relatedCases.length > 0) && (
          <div className="mt-6 grid gap-8 border-t border-rule pt-6 sm:grid-cols-2">
            {query.deadline && (
              <div>
                <p className="label">Deadline</p>
                <p className="mt-2 font-display text-lg text-accent">
                  {formatDate(query.deadline)}
                </p>
              </div>
            )}
            {relatedCases.length > 0 && (
              <div>
                <p className="label">Related matters</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {relatedCases.map((caseTitle: string, idx: number) => (
                    <li key={idx} className="text-[0.95rem] italic text-ink">
                      <span className="mr-2 not-italic text-accent">§</span>
                      {caseTitle}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {query.requiresResearch && <Mark>Research required</Mark>}
          <Mark tone={query.billable ? 'risk-low' : 'risk-none'}>
            {query.billable ? 'Billable' : 'Non-billable'}
          </Mark>
        </div>
      </section>

      {/* ── Disposition ─────────────────────────────────────── */}
      {!response ? (
        <section className="rise rise-4 mt-16">
          <div className="sheet flex flex-col items-center px-6 py-24 text-center">
            <span className="spin-seal h-10 w-10 rounded-full border border-rule border-t-accent" />
            <h2 className="mt-8 font-display text-3xl text-ink">
              Under consideration
            </h2>
            <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-faint">
              The matter is being read, authority gathered and exposure graded.
              This page will hold the memorandum when it is settled.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Risk band */}
          <section className={`rise rise-4 mt-16 ${tone}`}>
            <div className="border-y-2 border-current py-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label" style={{ color: 'currentColor' }}>
                    Assessed exposure
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.5rem)] leading-none text-current">
                    {String(response.riskLevel).toUpperCase()}
                  </h2>
                  <p className="mt-4 text-lg text-ink-soft">
                    {riskCounsel(response.riskLevel)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="label">Drafting time</p>
                  <p className="numeral mt-2 text-4xl text-ink">
                    {response.processingTime.toFixed(2)}s
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Table of authorities */}
          {response.functionCalls && response.functionCalls.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 flex items-baseline justify-between border-b border-rule pb-4">
                <div>
                  <p className="section-mark">Table of authorities</p>
                  <h2 className="mt-3 font-display text-2xl text-ink">
                    Research undertaken
                  </h2>
                </div>
                <span className="label">
                  {response.functionCalls.length} search
                  {response.functionCalls.length === 1 ? '' : 'es'}
                </span>
              </div>

              <div className="flex flex-col gap-8">
                {response.functionCalls.map((fc, idx) => (
                  <div key={idx} className="sheet p-6 sm:p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-4">
                      <h3 className="flex items-baseline gap-3 font-display text-xl text-ink">
                        <span className="docket text-accent">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {titleCase(fc.name)}
                      </h3>
                      {fc.result?.success && (
                        <span className="label text-verdigris">
                          {fc.result.totalResults?.toLocaleString()} results
                        </span>
                      )}
                      {fc.result?.error && (
                        <span className="label text-accent">
                          {fc.result.error}
                        </span>
                      )}
                    </div>

                    <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
                      {Object.entries(fc.args).map(([key, value]) => (
                        <div key={key}>
                          <dt className="label">{key.replace(/_/g, ' ')}</dt>
                          <dd className="docket mt-1.5 text-ink">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {fc.result?.data && fc.result.data.length > 0 && (
                      <div className="mt-7">
                        <p className="label border-t border-rule pt-5">
                          Cases returned · {fc.result.data.length}
                        </p>
                        <ol className="mt-4 flex flex-col gap-px bg-rule">
                          {fc.result.data.map((caseLaw, caseIdx) => (
                            <li key={caseIdx}>
                              <a
                                href={caseLaw.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block bg-sheet px-4 py-4 transition-colors hover:bg-inset"
                              >
                                <div className="flex items-baseline justify-between gap-4">
                                  <h4 className="font-display text-[1.05rem] italic leading-snug text-ink transition-colors group-hover:text-accent">
                                    {caseLaw.caseName}
                                  </h4>
                                  {caseLaw.relevanceScore && (
                                    <span className="docket shrink-0 text-ink-faint">
                                      {caseLaw.relevanceScore.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <p className="docket mt-2 text-ink-soft">
                                  {caseLaw.citation} · {caseLaw.court} ·{' '}
                                  {new Date(
                                    caseLaw.dateFiled
                                  ).toLocaleDateString()}
                                </p>
                                {caseLaw.snippet && (
                                  <p className="mt-2 line-clamp-2 text-[0.9rem] leading-relaxed text-ink-faint">
                                    {caseLaw.snippet}
                                  </p>
                                )}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Findings */}
          <section className="mt-16">
            <p className="section-mark mb-6">Findings</p>
            <div className="grid gap-px border border-rule bg-rule md:grid-cols-3">
              {/* Jurisdiction */}
              <div className="bg-sheet p-6">
                <p className="label">Governing forum</p>
                <p className="mt-3 font-display text-2xl text-ink">
                  {titleCase(response.jurisdictionAnalysis?.type)}
                </p>
                <ul className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
                  {response.jurisdictionAnalysis?.keyRequirements
                    ?.slice(0, 3)
                    .map((req: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-[0.9rem] leading-snug text-ink-soft"
                      >
                        <span className="mr-2 text-accent">§</span>
                        {req}
                      </li>
                    ))}
                </ul>
                {(response.jurisdictionAnalysis?.keyRequirements?.length || 0) >
                  3 && (
                  <p className="label mt-3">
                    +
                    {(response.jurisdictionAnalysis?.keyRequirements?.length ||
                      0) - 3}{' '}
                    further requirements
                  </p>
                )}
              </div>

              {/* Citations */}
              <div className="bg-sheet p-6">
                <p className="label">Authority cited</p>
                <p className="numeral mt-3 text-4xl text-ink">
                  {response.citations.length}
                </p>
                {response.citations.length > 0 ? (
                  <>
                    <ul className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
                      {response.citations
                        .slice(0, 3)
                        .map((citation: LegalCitation, idx: number) => (
                          <li key={idx} className="docket truncate text-ink-soft">
                            {citation.citation}
                          </li>
                        ))}
                    </ul>
                    {response.citations.length > 3 && (
                      <p className="label mt-3">
                        +{response.citations.length - 3} more
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 border-t border-rule pt-4 text-[0.9rem] text-ink-faint">
                    No authority was returned for this matter.
                  </p>
                )}
              </div>

              {/* Billing */}
              <div className="bg-sheet p-6">
                <p className="label">Billing</p>
                {response.billingInfo?.billable === false ? (
                  <>
                    <p className="mt-3 font-display text-2xl text-ink">
                      Non-billable
                    </p>
                    <p className="mt-4 border-t border-rule pt-4 text-[0.9rem] text-ink-faint">
                      No charges applied to this matter.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="numeral mt-3 text-4xl text-verdigris">
                      ${response.billingInfo?.totalEstimatedCharge?.toFixed(2)}
                    </p>
                    <p className="docket mt-4 border-t border-rule pt-4 text-ink-soft">
                      {response.billingInfo?.aiProcessingHours} hrs × $
                      {response.billingInfo?.hourlyRate}/hr
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Recommendations */}
          {response.recommendations?.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 border-b border-rule pb-4">
                <p className="section-mark">Recommendations</p>
                <h2 className="mt-3 font-display text-2xl text-ink">
                  What counsel should do
                </h2>
              </div>

              <ol className="flex flex-col gap-px bg-rule">
                {response.recommendations.map(
                  (rec: LegalRecommendation, idx: number) => {
                    const recTone = riskTone(rec.priority?.toLowerCase());
                    return (
                      <li
                        key={idx}
                        className={`bind ${recTone} bg-sheet px-6 py-6`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div className="flex flex-wrap items-baseline gap-3">
                            <Mark tone={recTone}>{rec.priority}</Mark>
                            <h3 className="font-display text-xl text-ink">
                              {rec.action}
                            </h3>
                          </div>
                          <span className="label">{rec.timeline}</span>
                        </div>
                        <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">
                          {rec.details}
                        </p>
                      </li>
                    );
                  }
                )}
              </ol>
            </section>
          )}

          {/* Next steps */}
          {response.nextSteps?.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 border-b border-rule pb-4">
                <p className="section-mark">Directions</p>
                <h2 className="mt-3 font-display text-2xl text-ink">
                  Action items
                </h2>
              </div>

              <ol className="flex flex-col">
                {response.nextSteps.map((step: LegalNextStep, idx: number) => (
                  <li
                    key={idx}
                    className="grid gap-4 border-b border-rule py-7 sm:grid-cols-[3rem_1fr] sm:gap-7"
                  >
                    <span className="numeral text-3xl text-rule-strong">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-display text-xl text-ink">
                        {step.step}
                      </h3>
                      <p className="docket mt-2 text-ink-faint">
                        {step.assignee} · due {step.deadline}
                      </p>
                      {step.actionItems && step.actionItems.length > 0 && (
                        <ul className="mt-4 flex flex-col gap-2">
                          {step.actionItems.map(
                            (item: string, itemIdx: number) => (
                              <li
                                key={itemIdx}
                                className="text-[0.95rem] leading-snug text-ink-soft"
                              >
                                <span className="mr-2 text-verdigris">✓</span>
                                {item}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* The analysis */}
          {response.content?.trim() ? (
            <section className="mt-16">
              <p className="section-mark mb-6">The analysis</p>
              <div className="legal-prose" data-dropcap="true">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response.content}
                </ReactMarkdown>
              </div>
            </section>
          ) : (
            <section className="mt-16">
              <p className="section-mark mb-6">The analysis</p>
              <p className="border-l-2 border-rule-strong py-1 pl-6 text-ink-faint italic">
                No written analysis was recorded for this matter.
              </p>
            </section>
          )}

          {/* Notices */}
          <section className="mt-16 grid gap-px border border-rule bg-rule md:grid-cols-2">
            <div className="bg-sheet p-7">
              <p className="label label-accent">Confidentiality notice</p>
              <div className="legal-prose mt-4 text-[0.9rem]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response.confidentialityNotice}
                </ReactMarkdown>
              </div>
            </div>
            <div className="bg-sheet p-7">
              <p className="label label-accent">Legal disclaimer</p>
              <div className="legal-prose mt-4 text-[0.9rem]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response.legalDisclaimer}
                </ReactMarkdown>
              </div>
            </div>
          </section>

          {/* Colophon */}
          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4 border-t border-rule pt-6">
            <p className="docket text-ink-faint">
              {response.processingTime.toFixed(2)}s ·{' '}
              {response.tokenCount.toLocaleString()} tokens
            </p>
            <Mark>{response.modelUsed}</Mark>
          </div>
        </>
      )}
    </div>
  );
}

export default async function LegalQueryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<MemorandumSkeleton />}>
      <Memorandum id={id} />
    </Suspense>
  );
}
