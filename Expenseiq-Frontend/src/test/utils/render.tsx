// Custom Testing Library render. Phase F1 wrapped everything in
// <ThemeProvider>; Phase F2 adds a fresh <QueryClientProvider> per render
// so each test gets an isolated cache.
//
// We deliberately do NOT do `export * from '@testing-library/react'` —
// Vite's barrel resolution shadows our custom `render` with RTL's plain
// one. Explicit named re-exports avoid the conflict.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { MonthProvider } from '@/components/layout/MonthContext';

function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const client = makeTestClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MonthProvider>
          <ToastProvider>{children}</ToastProvider>
        </MonthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
  return { ...rtlRender(ui, { wrapper: Wrapper, ...options }), queryClient: client };
}

export {
  act,
  cleanup,
  configure,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
