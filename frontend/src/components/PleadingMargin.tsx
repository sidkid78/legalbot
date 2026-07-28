// components/PleadingMargin.tsx
// The double vertical rule and numbered lines of court pleading paper.
// Purely decorative — hidden from assistive tech, invisible to the pointer.

const LINES = Array.from({ length: 46 }, (_, i) => i + 1);

export default function PleadingMargin() {
  return (
    <div className="pleading-margin" aria-hidden="true">
      <ol>
        {LINES.map((n) => (
          <li key={n}>{String(n).padStart(2, '0')}</li>
        ))}
      </ol>
    </div>
  );
}
