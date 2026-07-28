// app/page.tsx — the entry register. Signed-in readers are routed to /dashboard.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface StoredQuery {
  id?: string;
  content?: string;
  status?: string;
  timestamp?: string;
}

interface Tally {
  total: number;
  pending: number;
  completed: number;
}

interface ActivityItem {
  id: string;
  action: string;
  timestamp: string;
  status: string;
}

const tally = (queries: StoredQuery[]): Tally => ({
  total: queries.length,
  pending: queries.filter((q) => q.status === 'pending').length,
  completed: queries.filter((q) => q.status === 'completed').length,
});

export default function HomePage() {
  const router = useRouter();
  const [legal, setLegal] = useState<Tally>({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));

      const legalQueries: StoredQuery[] = JSON.parse(
        localStorage.getItem('legalQueries') || '[]'
      );

      setLegal(tally(legalQueries));
      setActivity(
        legalQueries
          .filter((q) => q.timestamp)
          .sort(
            (a, b) =>
              new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
          )
          .slice(0, 5)
          .map((q, i) => ({
            id: q.id || String(i),
            action: q.content?.slice(0, 90) || 'Legal matter',
            timestamp: q.timestamp!,
            status: q.status || 'completed',
          }))
      );
    } catch (error) {
      console.error('Error reading local register:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
        <div className="spin-seal h-9 w-9 rounded-full border border-rule border-t-accent" />
        <p className="label">Opening the register</p>
      </div>
    );
  }

  return (
    <div className="measure pb-4">
      <header className="rise rise-1 pt-12 pb-10 lg:pt-16">
        <p className="section-mark">Register</p>
        <h1 className="mt-5 text-[clamp(2.4rem,6vw,4rem)] leading-[0.98] text-ink">
          Good day{user ? `, ${user.name.split(' ')[0]}` : ''}.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          A local view of matters held in this browser. The full docket lives in
          chambers.
        </p>
        <div
          className="rule-in mt-9 h-px w-full bg-rule-strong"
          style={{ animationDelay: '0.35s' }}
        />
      </header>

      <section className="rise rise-2 grid grid-cols-2 gap-px border-y border-rule bg-rule sm:grid-cols-3">
        {[
          { label: 'Matters held', value: legal.total, tone: 'text-ink' },
          { label: 'Disposed', value: legal.completed, tone: 'text-verdigris' },
          { label: 'Pending', value: legal.pending, tone: 'text-amber' },
        ].map((f) => (
          <div key={f.label} className="bg-paper px-5 py-7 sm:px-7">
            <p className="label">{f.label}</p>
            <p className={`numeral mt-3 text-[2.75rem] ${f.tone}`}>{f.value}</p>
          </div>
        ))}
      </section>

      <div className="rise rise-3 mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Recent */}
        <section>
          <div className="mb-5 flex items-baseline justify-between border-b border-rule pb-4">
            <h2 className="font-display text-2xl text-ink">Recent entries</h2>
            <Link
              href="/dashboard/legal"
              className="link-draw label hover:text-accent"
            >
              Full docket
            </Link>
          </div>

          {activity.length > 0 ? (
            <ol className="flex flex-col">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-6 border-b border-rule py-4"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[0.95rem] leading-snug text-ink">
                      {item.action}
                    </p>
                    <p className="docket mt-1.5 text-ink-faint">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="label shrink-0">{item.status}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="py-14 text-center">
              <p className="numeral text-5xl text-rule-strong">§</p>
              <p className="mt-5 text-[0.95rem] text-ink-faint">
                Nothing filed yet in this browser.
              </p>
            </div>
          )}
        </section>

        {/* Actions */}
        <section>
          <div className="mb-5 border-b border-rule pb-4">
            <h2 className="font-display text-2xl text-ink">Proceed</h2>
          </div>

          <div className="flex flex-col gap-px bg-rule">
            {[
              {
                href: '/legal',
                title: 'Put a question',
                body: 'Describe a situation and receive a memorandum.',
              },
              {
                href: '/dashboard/legal',
                title: 'Read the docket',
                body: 'Every matter, ordered by recency and marked by risk.',
              },
              {
                href: '/dashboard/legal/new',
                title: 'File formally',
                body: 'The long form, in four articles.',
              },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-baseline justify-between gap-6 bg-sheet px-5 py-5 transition-colors hover:bg-inset"
              >
                <div>
                  <h3 className="font-display text-lg text-ink transition-colors group-hover:text-accent">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-[0.9rem] text-ink-faint">{a.body}</p>
                </div>
                <span className="arrow-slide label shrink-0 group-hover:text-accent">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
