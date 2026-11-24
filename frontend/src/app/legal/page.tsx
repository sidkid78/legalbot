'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LegalQuery {
  content: string;
  domain?: string;
  jurisdiction?: string;
  urgency?: string;
  priority: number;
  requiresResearch: boolean;
  clientInfo: {
    name: string;
    matterNumber: string;
  };
}

interface CaseLawResult {
  caseName: string;
  citation: string;
  court: string;
  dateFiled: string;
  url: string;
  snippet?: string;
  relevanceScore?: number;
}

interface FunctionCall {
  name: string;
  args: Record<string, string | number | boolean>;
  result?: {
    success: boolean;
    data?: CaseLawResult[];
    searchQuery?: string;
    totalResults?: number;
    error?: string;
  };
}

interface AnalysisResult {
  content: string;
  model: string;
  processingTime: number;
  tokenCount: number;
  detectedDomain?: string;
  detectedJurisdiction?: string;
  detectedUrgency?: string;
  confidence?: {
    domain: number;
    jurisdiction: number;
    urgency: number;
  };
  functionCalls?: FunctionCall[];
  caseLawResults?: CaseLawResult[];
}

const PROMPTS = [
  'Our company received a cease and desist letter claiming patent infringement. This is urgent.',
  'Need to review employment contracts for remote workers across multiple states.',
  'Client wants to understand SEC compliance requirements for their IPO filing.',
];

const tidy = (value?: string) =>
  value
    ? value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Undetermined';

/** A determination with its confidence drawn as a hairline meter. */
function Determination({
  label,
  value,
  confidence,
}: {
  label: string;
  value?: string;
  confidence?: number;
}) {
  const pct = confidence ? Math.round(confidence * 100) : null;

  return (
    <div className="bg-sheet px-5 py-5">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-xl leading-tight text-ink">
        {tidy(value)}
      </p>
      {pct !== null && (
        <div className="mt-4">
          <div className="h-px w-full bg-rule">
            <div
              className="h-px bg-accent transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="docket mt-2 text-ink-faint">{pct}% confidence</p>
        </div>
      )}
    </div>
  );
}

export default function SimpleLegalPage() {
  const [query, setQuery] = useState<LegalQuery>({
    content: '',
    priority: 3,
    requiresResearch: true,
    clientInfo: {
      name: 'Test Client',
      matterNumber: 'M-' + Date.now(),
    },
  });

  const [files, setFiles] = useState<File[]>([]);
  const [response, setResponse] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');

  const busy = loading || analyzing || uploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.content.trim()) {
      setError('Please describe the situation before submitting.');
      return;
    }

    setAnalyzing(true);
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const analysisRes = await fetch('/api/legal-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query.content }),
      });

      const analysisData = await analysisRes.json();

      if (!analysisRes.ok) {
        throw new Error(analysisData.error || 'Failed to analyze query');
      }

      setAnalyzing(false);

      const uploadedDocs = [];
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);

          const uploadRes = await fetch('/api/upload-doc', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) {
            throw new Error(uploadData.error || `Failed to upload ${file.name}`);
          }
          uploadedDocs.push(uploadData.document);
        }
        setUploading(false);
      }

      const enhancedQuery = {
        ...query,
        domain: analysisData.domain,
        jurisdiction: analysisData.jurisdiction,
        urgency: analysisData.urgency,
        documents: uploadedDocs.length > 0 ? uploadedDocs : undefined,
      };

      const res = await fetch('/api/legal-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedQuery),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process query');
      }

      const responseContent =
        data.response?.content || data.content || 'No analysis available';

      setResponse({
        content: responseContent,
        model: data.response?.modelUsed || 'gemini-4-hydrogen',
        processingTime: data.response?.processingTime || 0,
        tokenCount: data.response?.tokenCount || 0,
        detectedDomain: analysisData.domain,
        detectedJurisdiction: analysisData.jurisdiction,
        detectedUrgency: analysisData.urgency,
        confidence: analysisData.confidence,
        functionCalls: data.response?.functionCalls,
        caseLawResults: data.response?.caseLawResults,
      });
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setAnalyzing(false);
      setUploading(false);
    }
  };

  const stage = uploading
    ? 'Transmitting exhibits'
    : analyzing
      ? 'Reading the facts'
      : 'Drafting the memorandum';

  const stageNote = uploading
    ? 'Your documents are being lodged with the model.'
    : analyzing
      ? 'Settling the governing forum, the domain and the urgency of the matter.'
      : 'Assembling authority, grading exposure and composing the advice.';

  return (
    <div className="measure pb-4">
      {/* ── Head ──────────────────────────────────────────────── */}
      <header className="rise rise-1 pt-12 pb-10 lg:pt-16">
        <p className="section-mark">Statement of the matter</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4rem)] leading-[0.98] text-ink">
          Describe it plainly.
          <br />
          <span className="italic text-accent">We will classify it.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          No dropdowns to guess at. Set out the facts as you would to a
          colleague — the forum, the domain and the urgency are inferred before
          any advice is drafted.
        </p>
        <div
          className="rule-in mt-9 h-px w-full bg-rule-strong"
          style={{ animationDelay: '0.35s' }}
        />
      </header>

      {/* ── Petition ──────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="rise rise-2">
        <div className="sheet sheet-filed p-6 sm:p-9">
          <div className="grid gap-9 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
            {/* Statement */}
            <div>
              <label htmlFor="statement" className="label block">
                Statement of facts <span className="text-accent">*</span>
              </label>
              <textarea
                id="statement"
                value={query.content}
                onChange={(e) => setQuery({ ...query, content: e.target.value })}
                placeholder="My startup needs to draft a non-disclosure agreement for sharing proprietary algorithms with potential investors in California. We have investor meetings scheduled next week."
                className="field field-box mt-3"
                rows={9}
                required
              />

              <div className="mt-5">
                <p className="label">Or begin from a specimen</p>
                <div className="mt-3 flex flex-col gap-px border border-rule bg-rule">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setQuery({ ...query, content: p })}
                      className="group bg-sheet px-4 py-3 text-left text-[0.9rem] leading-snug text-ink-soft transition-colors hover:bg-inset hover:text-ink"
                    >
                      <span className="mr-2 text-accent">§</span>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Particulars */}
            <div className="flex flex-col gap-7 lg:border-l lg:border-rule lg:pl-12">
              <div>
                <p className="label label-accent">Particulars</p>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-faint">
                  Optional. Useful for your own record-keeping and billing.
                </p>
              </div>

              <div>
                <label htmlFor="client" className="label block">
                  Client
                </label>
                <input
                  id="client"
                  type="text"
                  value={query.clientInfo.name}
                  onChange={(e) =>
                    setQuery({
                      ...query,
                      clientInfo: { ...query.clientInfo, name: e.target.value },
                    })
                  }
                  className="field mt-2"
                  placeholder="Client or company name"
                />
              </div>

              <div>
                <label htmlFor="matter" className="label block">
                  Matter number
                </label>
                <input
                  id="matter"
                  type="text"
                  value={query.clientInfo.matterNumber}
                  onChange={(e) =>
                    setQuery({
                      ...query,
                      clientInfo: {
                        ...query.clientInfo,
                        matterNumber: e.target.value,
                      },
                    })
                  }
                  className="field mt-2 font-mono text-sm"
                  placeholder="M-000000"
                />
              </div>

              <div>
                <label htmlFor="exhibits" className="label block">
                  Exhibits
                </label>
                <input
                  id="exhibits"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="mt-3 block w-full text-sm text-ink-faint file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-rule-strong file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-[0.625rem] file:uppercase file:tracking-[0.16em] file:text-ink hover:file:border-ink"
                />
                {files.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 border-t border-rule pt-3">
                    {files.map((file, i) => (
                      <li
                        key={i}
                        className="docket flex items-baseline justify-between gap-3"
                      >
                        <span className="truncate text-ink">
                          <span className="mr-2 text-accent">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          {file.name}
                        </span>
                        <span className="shrink-0 text-ink-faint">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-8 border-l-2 border-accent bg-inset py-2.5 pl-4 text-sm text-accent"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="mt-9 flex flex-col gap-5 border-t border-rule pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="label max-w-sm leading-relaxed">
              Analysis is generated and must be verified. It is not legal advice.
            </p>
            <button type="submit" disabled={busy} className="btn btn-seal">
              {busy ? (
                <>
                  <span className="spin-seal h-3.5 w-3.5 rounded-full border border-seal-ink/40 border-t-seal-ink" />
                  {stage}
                </>
              ) : (
                'Submit for analysis'
              )}
            </button>
          </div>

          {busy && (
            <div className="mt-6 flex items-start gap-4 border-l-2 border-accent bg-inset px-5 py-4">
              <div>
                <p className="label label-accent">{stage}</p>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                  {stageNote}
                </p>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* ── Memorandum ────────────────────────────────────────── */}
      {response && (
        <section className="rise mt-20" aria-label="Legal analysis">
          {/* Caption block */}
          <div className="border-y-2 border-ink py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-mark">Memorandum of advice</p>
                <h2 className="mt-3 font-display text-4xl text-ink">
                  {query.clientInfo.name || 'Confidential Client'}
                </h2>
              </div>
              <p className="docket text-ink-faint">
                {query.clientInfo.matterNumber}
              </p>
            </div>
          </div>

          {/* Determinations */}
          <div className="mt-10">
            <p className="section-mark mb-5">Determinations</p>
            <div className="grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-3">
              <Determination
                label="Legal domain"
                value={response.detectedDomain}
                confidence={response.confidence?.domain}
              />
              <Determination
                label="Jurisdiction"
                value={response.detectedJurisdiction}
                confidence={response.confidence?.jurisdiction}
              />
              <Determination
                label="Urgency"
                value={response.detectedUrgency}
                confidence={response.confidence?.urgency}
              />
            </div>
          </div>

          {/* Authorities */}
          {response.functionCalls && response.functionCalls.length > 0 && (
            <div className="mt-14">
              <div className="mb-6 flex items-baseline justify-between border-b border-rule pb-4">
                <div>
                  <p className="section-mark">Table of authorities</p>
                  <h3 className="mt-3 font-display text-2xl text-ink">
                    Research undertaken
                  </h3>
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
                      <h4 className="flex items-baseline gap-3 font-display text-xl text-ink">
                        <span className="docket text-accent">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {tidy(fc.name)}
                      </h4>
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

                    {/* Search terms */}
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

                    {/* Cases */}
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
                                  <h5 className="font-display text-[1.05rem] italic leading-snug text-ink transition-colors group-hover:text-accent">
                                    {caseLaw.caseName}
                                  </h5>
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
            </div>
          )}

          {/* The advice */}
          <div className="mt-14">
            <p className="section-mark mb-6">The analysis</p>
            <div className="legal-prose" data-dropcap="true">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {response.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Colophon */}
          <dl className="mt-16 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
            {[
              { label: 'Model', value: response.model },
              {
                label: 'Drafting time',
                value: `${response.processingTime.toFixed(2)}s`,
              },
              {
                label: 'Tokens',
                value: response.tokenCount.toLocaleString(),
              },
              { label: 'Method', value: 'Inferred' },
            ].map((item) => (
              <div key={item.label} className="bg-sheet px-5 py-5">
                <dt className="label">{item.label}</dt>
                <dd className="docket mt-2 text-[0.8rem] text-ink">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
