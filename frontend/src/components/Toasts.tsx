// components/Toasts.tsx — notices, set on the same stock as the rest
'use client';

import { Toaster } from 'react-hot-toast';

export default function Toasts() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--c-sheet)',
          color: 'var(--c-ink)',
          border: '1px solid var(--c-rule-strong)',
          borderRadius: '2px',
          boxShadow: 'none',
          fontFamily: 'var(--font-plex-mono), monospace',
          fontSize: '0.6875rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0.85rem 1.1rem',
        },
        success: { iconTheme: { primary: 'var(--c-verdigris)', secondary: 'var(--c-sheet)' } },
        error: { iconTheme: { primary: 'var(--c-seal)', secondary: 'var(--c-sheet)' } },
      }}
    />
  );
}
