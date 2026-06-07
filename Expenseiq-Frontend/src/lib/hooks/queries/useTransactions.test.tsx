import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTransactions } from '@/lib/hooks/queries/useTransactions';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return QueryWrapper;
}

describe('useTransactions', () => {
  it('returns the fixture list keyed by the active profile', async () => {
    const { result } = renderHook(() => useTransactions({ profileId: 'default' }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    for (const t of result.current.data!) {
      expect(t.id).toBeDefined();
      expect(t.profileId).toBe('default');
    }
  });

  it('keys differ between profiles (separate cache entries)', async () => {
    const { result, rerender } = renderHook(
      ({ profileId }: { profileId: string }) => useTransactions({ profileId }),
      { wrapper: wrapper(), initialProps: { profileId: 'default' } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data;
    rerender({ profileId: 'work' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Same fixture but distinct cache entries; the data array is reference-fresh.
    expect(result.current.data).toBeDefined();
    expect(first).not.toBe(result.current.data);
  });
});
