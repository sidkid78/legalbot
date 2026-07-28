// app/dashboard/legal/page.tsx — the docket
import Link from 'next/link';
import { RiskLevel } from '@/lib/legal/types';
import { LegalQuery, LegalResponse } from '@/lib/legal/types';
import { db } from '@/lib/database/json-db-manager';
import {
  PageHead,
  Figure,
  FigureRow,
  Mark,
  riskTone,
  urgencyTone,
  formatDate,
  titleCase,
} from '@/components/press';

function DocketRow({
  query,
  response,
  index,
}: {
  query: LegalQuery;
  response?: LegalResponse | null;
  index: number;
}) {
  const tone = response ? riskTone(response.riskLevel) : 'risk-none';

  return (
    <Link
      href={`/dashboard/legal/${query.id}`}
      className={`bind ${tone} group block bg-sheet transition-colors duration-200 hover:bg-inset`}
    >
      <article className="grid gap-4 px-5 py-6 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-6 sm:px-7">
        {/* Docket number */}
        <span className="docket text-ink-faint tabular-nums">
          {String(index).padStart(3, '0')}
        </span>

        {/* Matter */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Mark tone={urgencyTone(query.urgency)}>{query.urgency}</Mark>
            <span className="label">{titleCase(query.domain)}</span>
            <span className="label text-ink-faint">·</span>
            <span className="label">{titleCase(query.jurisdiction)}</span>
          </div>

          <p className="mt-3 line-clamp-2 text-[1.05rem] leading-snug text-ink transition-colors group-hover:text-accent">
            {query.content}
          </p>

          <p className="docket mt-3 text-ink-faint">
            {formatDate(query.timestamp)}
            {query.clientInfo?.matterNumber
              ? ` · ${query.clientInfo.matterNumber}`
              : ''}
          </p>
        </div>

        {/* Disposition */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
          {response ? (
            <Mark tone={tone}>{String(response.riskLevel)} risk</Mark>
          ) : (
            <span className="label ink-pulse flex items-center gap-2 text-amber">
              <span className="spin-seal inline-block h-3 w-3 rounded-full border border-amber/40 border-t-amber" />
              Pending
            </span>
          )}
          <span className="arrow-slide label hidden text-ink-faint group-hover:text-accent sm:block">
            &rarr;
          </span>
        </div>
      </article>
    </Link>
  );
}

export default async function LegalDashboardPage() {
  const allQueries = db.getLegalQueriesByUser('default-user', 100);
  const recentQueries = allQueries.slice(0, 10);

  const totalQueries = allQueries.length;
  const totalResponses = allQueries.filter((q) => q.status === 'completed').length;
  const pendingQueries = allQueries.filter((q) => q.status === 'pending').length;

  const highRiskCases = allQueries.filter((q) => {
    if (q.status !== 'completed') return false;
    const response = db.getLegalResponse(q.id || '');
    return (
      response &&
      (response.riskLevel === RiskLevel.CRITICAL ||
        response.riskLevel === RiskLevel.HIGH)
    );
  });

  const queriesWithResponses = recentQueries.map((query) => ({
    ...query,
    response:
      query.status === 'completed' ? db.getLegalResponse(query.id || '') : null,
  }));

  return (
    <div className="measure pb-4">
      <PageHead
        eyebrow="Register of matters"
        title={
          <>
            The <span className="italic text-accent">docket</span>
          </>
        }
        lede="Every matter put to the machine, newest first, bound at the left edge by its assessed exposure."
        action={
          <Link href="/legal" className="btn btn-seal">
            Open a matter
          </Link>
        }
      />

      <section className="rise rise-2" aria-label="Docket summary">
        <FigureRow>
          <Figure label="Total matters" value={totalQueries} />
          <Figure
            label="Disposed"
            value={totalResponses}
            note={
              totalQueries > 0
                ? `${Math.round((totalResponses / totalQueries) * 100)}% complete`
                : 'None yet'
            }
            tone="text-verdigris"
          />
          <Figure
            label="In progress"
            value={pendingQueries}
            note="Awaiting analysis"
            tone="text-amber"
          />
          <Figure
            label="High exposure"
            value={highRiskCases.length}
            note="Requires attention"
            tone={highRiskCases.length > 0 ? 'text-accent' : 'text-ink'}
          />
        </FigureRow>
      </section>

      {/* Docket table */}
      <section className="rise rise-3 mt-16">
        <div className="mb-6 flex items-baseline justify-between border-b border-rule pb-4">
          <h2 className="font-display text-2xl text-ink">Recent entries</h2>
          <span className="label">
            {queriesWithResponses.length} shown of {totalQueries}
          </span>
        </div>

        {queriesWithResponses.length > 0 ? (
          <div className="flex flex-col gap-px border border-rule bg-rule">
            {queriesWithResponses.map((item, i) => (
              <DocketRow
                key={item.id}
                query={item}
                response={item.response}
                index={i + 1}
              />
            ))}
          </div>
        ) : (
          <div className="sheet flex flex-col items-center px-6 py-20 text-center">
            <p className="numeral text-6xl text-rule-strong">§</p>
            <h3 className="mt-6 font-display text-2xl text-ink">
              The docket is clear
            </h3>
            <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-ink-faint">
              Nothing has been filed yet. Describe a situation in plain words and
              the first memorandum will appear here.
            </p>
            <Link href="/legal" className="btn btn-seal mt-8">
              File the first matter
            </Link>
          </div>
        )}
      </section>

      {/* Closing figures */}
      {queriesWithResponses.length > 0 && (
        <section className="rise rise-4 mt-16" aria-label="Register statistics">
          <p className="section-mark mb-6">Register statistics</p>
          <FigureRow cols={3}>
            <Figure
              label="Disposition rate"
              value={
                totalQueries > 0
                  ? `${Math.round((totalResponses / totalQueries) * 100)}%`
                  : '—'
              }
              note="Matters carried to a memorandum"
              tone="text-verdigris"
            />
            <Figure
              label="Flagged for review"
              value={highRiskCases.length}
              note="Critical or high exposure"
              tone="text-accent"
            />
            <Figure
              label="Median turnaround"
              value="2.3s"
              note="Question to memorandum"
            />
          </FigureRow>
        </section>
      )}
    </div>
  );
}
