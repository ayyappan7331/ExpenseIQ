'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

// One QueryClient per browser tab. Created lazily inside useState so
// React doesn't tear down the cache on hot reloads.
//
// Defaults are tuned for a personal-finance dashboard: 30s staleTime so
// pages don't re-fetch on every tab switch, 5min gcTime to keep cached
// data around across navigations, retry once on flaky localhost network.

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
