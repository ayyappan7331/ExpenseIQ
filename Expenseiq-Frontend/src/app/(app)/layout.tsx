'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getToken, isAuthEnabled } from '@/lib/api/token';

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Guard: only active when NEXT_PUBLIC_AUTH_ENABLED=true.
    // localStorage is not available on the server, so we check client-side only.
    if (isAuthEnabled() && !getToken()) {
      router.replace('/login');
    }
  }, [router]);

  return <AppShell>{children}</AppShell>;
}
