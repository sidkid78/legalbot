// components/AuthGate.tsx — client-side redirect rules, extracted from the layout
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const signedIn = !!localStorage.getItem('user');

    if (!signedIn && pathname !== '/login' && pathname !== '/') {
      router.push('/login');
    } else if (signedIn && (pathname === '/login' || pathname === '/')) {
      router.push('/dashboard');
    }

    setSettled(true);
  }, [pathname, router]);

  if (!settled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
        <div className="spin-seal h-9 w-9 rounded-full border border-rule border-t-accent" />
        <p className="label">Verifying credentials</p>
      </div>
    );
  }

  return <>{children}</>;
}
