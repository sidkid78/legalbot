// app/dashboard/page.tsx
import Link from 'next/link';
import { db } from '@/lib/database/json-db-manager';
import { PageHead, Figure, FigureRow } from '@/components/press';

function Entry({
  index,
  title,
  body,
  href,
  cta,
}: {
  index: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="sheet sheet-link group flex flex-col p-7 sm:p-8"
    >
      <span className="label label-accent">{index}</span>
      <h3 className="mt-4 font-display text-2xl text-ink">{title}</h3>
      <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-faint">
        {body}
      </p>
      <span className="label mt-7 flex items-center gap-2 text-ink group-hover:text-accent">
        {cta}
        <span className="arrow-slide inline-block">&rarr;</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const stats = db.getStats() || { queries: 0, responses: 0, users: 0 };
  const totalQueries = stats.queries || 0;
  const totalResponses = stats.responses || 0;
  const pendingQueries = Math.max(totalQueries - totalResponses, 0);

  const userQueries = db.getLegalQueriesByUser('default-user', 100) || [];
  const totalLegalQueries = userQueries.length || 0;
  const pendingLegalQueries =
    userQueries.filter((q) => q.status === 'pending').length || 0;

  const disposed =
    totalQueries > 0 ? Math.round((totalResponses / totalQueries) * 100) : 0;

  return (
    <div className="measure pb-4">
      <PageHead
        eyebrow="Chambers"
        title={
          <>
            The desk, as you
            <br />
            <span className="italic text-accent">left it.</span>
          </>
        }
        lede="Every matter you have put to the machine, with its posture, its exposure and its authority — kept in one register."
        action={
          <Link href="/legal" className="btn btn-seal">
            Open a matter
          </Link>
        }
      />

      {/* Summary band */}
      <section className="rise rise-2" aria-label="Register summary">
        <FigureRow>
          <Figure label="Matters filed" value={totalQueries} />
          <Figure
            label="Disposed"
            value={totalResponses}
            note={`${disposed}% of the register`}
            tone="text-verdigris"
          />
          <Figure
            label="Pending"
            value={pendingQueries}
            note="Awaiting analysis"
            tone="text-amber"
          />
          <Figure
            label="On your docket"
            value={totalLegalQueries}
            note={
              pendingLegalQueries > 0
                ? `${pendingLegalQueries} in progress`
                : 'All current'
            }
          />
        </FigureRow>
      </section>

      {/* Standing instruction */}
      <section className="rise rise-3 mt-16 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="section-mark">Standing instruction</p>
          <h2 className="mt-4 font-display text-3xl leading-tight text-ink">
            Describe the situation in plain words. The forum, the domain and the
            urgency are inferred.
          </h2>
        </div>
        <div className="lg:pt-11">
          <p className="text-lg leading-relaxed text-ink-soft">
            You do not have to classify your own matter. Gemini reads the facts,
            settles on a governing jurisdiction, pulls supporting authority from
            CourtListener, and grades the exposure before drafting a word of
            advice.
          </p>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-ink-faint">
            Corporate · Litigation · Intellectual property · Employment · Real
            estate · Tax · Contracts · Regulatory · Family
          </p>
        </div>
      </section>

      {/* Entries */}
      <section className="rise rise-4 mt-16">
        <div className="mb-6 flex items-baseline justify-between border-b border-rule pb-4">
          <h2 className="font-display text-2xl text-ink">Proceed</h2>
          <span className="label">Three ways in</span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Entry
            index="01"
            title="Put a question"
            body="Describe a situation in ordinary language and receive a memorandum with authority, exposure and next steps."
            href="/legal"
            cta="Draft a query"
          />
          <Entry
            index="02"
            title="Read the docket"
            body="Every matter you have filed, ordered by recency, marked by risk and jurisdiction."
            href="/dashboard/legal"
            cta="Open the docket"
          />
          <Entry
            index="03"
            title="File formally"
            body="The long form — domain, forum, urgency, client, matter number, deadline and related cases."
            href="/dashboard/legal/new"
            cta="Full instrument"
          />
        </div>
      </section>
    </div>
  );
}
