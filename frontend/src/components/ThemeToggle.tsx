// components/ThemeToggle.tsx — switch stock: Paper (light) / Chambers (dark)
'use client';

import { useEffect, useState } from 'react';

type Stock = 'light' | 'dark';

export default function ThemeToggle() {
  const [stock, setStock] = useState<Stock | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lb-stock') as Stock | null;
    if (stored === 'light' || stored === 'dark') {
      setStock(stored);
      return;
    }
    setStock(
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
  }, []);

  const toggle = () => {
    const next: Stock = stock === 'dark' ? 'light' : 'dark';
    setStock(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lb-stock', next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="label transition-colors hover:text-ink"
      aria-label={`Switch to ${stock === 'dark' ? 'Paper' : 'Chambers'} stock`}
      title="Switch stock"
    >
      {/* Reserve the width of the longer word so the masthead never reflows. */}
      <span className="inline-block min-w-[4.5rem] text-right">
        {stock === null ? ' ' : stock === 'dark' ? 'Chambers' : 'Paper'}
      </span>
    </button>
  );
}
