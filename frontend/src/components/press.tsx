// components/press.tsx — shared typographic furniture. Server-safe, no hooks.
import { RiskLevel, LegalUrgency } from '@/lib/legal/types';

/* -------------------------------------------------------------------------
   Page head — eyebrow, display title, lede, optional action, closing rule
   ------------------------------------------------------------------------- */

export function PageHead({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="rise rise-1 pt-12 pb-10 lg:pt-16">
      <p className="section-mark">{eyebrow}</p>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="max-w-3xl text-[clamp(2.4rem,6vw,4rem)] leading-[0.98] text-ink">
          {title}
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {lede && (
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {lede}
        </p>
      )}

      <div
        className="rule-in mt-9 h-px w-full bg-rule-strong"
        style={{ animationDelay: '0.35s' }}
      />
    </header>
  );
}

/* -------------------------------------------------------------------------
   Figure — a statistic set as a ledger entry, not a card
   ------------------------------------------------------------------------- */

export function Figure({
  label,
  value,
  note,
  tone = 'text-ink',
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  tone?: string;
}) {
  return (
    <div className="bg-paper px-5 py-7 sm:px-7">
      <p className="label">{label}</p>
      <p className={`numeral mt-3 text-[2.75rem] ${tone}`}>{value}</p>
      {note && <p className="mt-2 text-sm text-ink-faint">{note}</p>}
    </div>
  );
}

/**
 * A row of figures divided by hairlines — reads like the summary band at the
 * head of a court report. The 1px gap over a rule-coloured bed draws the
 * dividers, so no child needs border classes of its own.
 */
export function FigureRow({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 3 | 4;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-px border-y border-rule bg-rule ${
        cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
      }`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Marks
   ------------------------------------------------------------------------- */

export function riskTone(risk?: RiskLevel | string | null): string {
  switch (risk) {
    case RiskLevel.CRITICAL:
      return 'risk-critical';
    case RiskLevel.HIGH:
      return 'risk-high';
    case RiskLevel.MODERATE:
      return 'risk-moderate';
    case RiskLevel.LOW:
    case RiskLevel.MINIMAL:
      return 'risk-low';
    default:
      return 'risk-none';
  }
}

export function urgencyTone(urgency?: LegalUrgency | string | null): string {
  switch (urgency) {
    case LegalUrgency.EMERGENCY:
      return 'risk-critical';
    case LegalUrgency.URGENT:
      return 'risk-high';
    case LegalUrgency.HIGH:
      return 'risk-moderate';
    case LegalUrgency.MEDIUM:
      return 'risk-low';
    default:
      return 'risk-none';
  }
}

export function Mark({
  children,
  tone = 'risk-none',
  className = '',
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return <span className={`mark ${tone} ${className}`}>{children}</span>;
}

/* -------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */

export function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d
    .toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
    .toUpperCase();
}

export function titleCase(value?: string) {
  if (!value) return 'Unspecified';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
