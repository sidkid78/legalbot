// components/Colophon.tsx — the footer, set as a printer's colophon
export default function Colophon() {
  return (
    <footer className="mt-auto border-t border-rule pt-px">
      <div className="measure flex flex-col gap-6 py-8 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="label max-w-md leading-relaxed">
          Machine-generated analysis. Not legal advice, and no attorney–client
          relationship is formed. Verify every citation before filing.
        </p>
        <p className="docket text-ink-faint">
          Set in Libre Caslon &amp; Newsreader · MMXXVI
        </p>
      </div>
    </footer>
  );
}
