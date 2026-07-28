// app/layout.tsx — the document shell
import type { Metadata } from 'next';
import { Libre_Caslon_Display, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

import AuthGate from '@/components/AuthGate';
import Masthead from '@/components/Navbar';
import PleadingMargin from '@/components/PleadingMargin';
import Colophon from '@/components/Colophon';
import Toasts from '@/components/Toasts';

const caslon = Libre_Caslon_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-caslon',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LawyerBot — Counsel, Drafted',
  description:
    'Jurisdiction-aware legal analysis, risk assessment and case-law research, set as a proper legal instrument.',
};

/**
 * Applies the reader's chosen stock before first paint so the page never
 * flashes the wrong one. Falls through to the OS preference when unset.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('lb-stock');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${caslon.variable} ${newsreader.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PleadingMargin />
        <div className="app-shell">
          <Masthead />
          <main className="flex-1">
            <AuthGate>{children}</AuthGate>
          </main>
          <Colophon />
        </div>
        <Toasts />
      </body>
    </html>
  );
}
