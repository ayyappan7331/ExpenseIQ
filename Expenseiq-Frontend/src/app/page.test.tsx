import { describe, it, expect, vi } from 'vitest';
import RootPage from './page';

// Next's `redirect()` throws a NEXT_REDIRECT-tagged error that the
// framework catches at request time. In a unit test we just assert the
// throw + which target path was requested.

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    redirect: vi.fn((path: string) => {
      const err = new Error(`NEXT_REDIRECT;replace;${path};307`);
      throw err;
    }),
  };
});

describe('root /', () => {
  it('redirects to /dashboard', async () => {
    const { redirect } = await import('next/navigation');
    expect(() => RootPage()).toThrow(/dashboard/);
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
