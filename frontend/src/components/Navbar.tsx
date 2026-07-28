// components/Navbar.tsx — the masthead
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { href: '/dashboard', label: 'Chambers', index: '01' },
  { href: '/dashboard/legal', label: 'Docket', index: '02' },
  { href: '/legal', label: 'New Matter', index: '03' },
];

/** A notarial seal — concentric rules around the section sign. */
export function Seal({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle
        cx="20"
        cy="20"
        r="15.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="1.5 2.5"
      />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize="17"
        fontFamily="var(--font-caslon), Georgia, serif"
      >
        §
      </text>
    </svg>
  );
}

export default function Masthead() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('legalQueries');
    localStorage.removeItem('medicalQueries');
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-sm">
      <div className="measure flex h-16 items-center justify-between gap-6">
        {/* Wordmark */}
        <Link
          href={user ? '/dashboard' : '/login'}
          className="group flex shrink-0 items-center gap-3"
        >
          <Seal className="h-8 w-8 text-accent transition-transform duration-500 group-hover:rotate-180" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight text-ink">
              LawyerBot
            </span>
            <span className="label mt-1 hidden sm:block">Counsel, drafted</span>
          </span>
        </Link>

        {/* Docket navigation */}
        {user && (
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active}
                  className="link-draw group flex items-baseline gap-1.5 py-1 text-ink-soft transition-colors hover:text-ink data-[active=true]:text-ink"
                >
                  <span className="label text-[9px] opacity-60">{item.index}</span>
                  <span className="font-display text-[0.95rem]">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Counsel of record */}
        <div className="flex items-center gap-5">
          <ThemeToggle />
          {user && (
            <>
              <span
                className="hidden h-4 w-px bg-rule sm:block"
                aria-hidden="true"
              />
              <div className="hidden text-right sm:block">
                <p className="label leading-none">Counsel</p>
                <p className="docket mt-1 leading-none text-ink">{user.name}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="label transition-colors hover:text-accent"
              >
                Adjourn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Below md the docket nav moves to its own ruled row */}
      {user && (
        <nav className="border-t border-rule md:hidden">
          <div className="measure flex divide-x divide-rule">
            {NAV.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active}
                  className="flex-1 py-3 text-center font-display text-[0.9rem] text-ink-soft transition-colors data-[active=true]:text-accent"
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
