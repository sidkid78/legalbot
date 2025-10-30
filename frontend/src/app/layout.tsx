// app/layout.tsx - Updated to handle simple auth
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const userLoggedIn = !!userData;
    
    setIsAuthenticated(userLoggedIn);
    
    // Redirect logic
    if (!userLoggedIn && pathname !== '/login' && pathname !== '/') {
      router.push('/login');
    } else if (userLoggedIn && (pathname === '/login' || pathname === '/')) {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  // Show loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <html lang="en">
        <body>
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}