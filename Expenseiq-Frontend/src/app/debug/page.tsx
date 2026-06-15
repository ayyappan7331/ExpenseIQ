'use client';

// /debug — Phase F2 wiring smoke test. Exercises:
//   • useHealth + useVersion (no profile needed)
//   • useTransactions (with the active profile)
// Renders raw JSON + simple loading/error states. No UI components migrated
// here — this page exists to prove the API+query layer round-trips against
// the real backend on http://localhost:5000/api.

import { useTransactions, useHealth, useVersion, useSettings, useBudgets, useCreditCards } from '@/lib/hooks/queries';
import type { UseQueryResult } from '@tanstack/react-query';

function State<T>({ q, label }: { q: UseQueryResult<T>; label: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-3">{label}</h2>
        <span className="text-[11px] text-text-3">
          {q.isPending ? 'loading…' : q.isError ? 'error' : 'ok'}
        </span>
      </div>
      {q.isError ? (
        <pre className="p-3 rounded-lg bg-card border border-card-border text-xs text-expense overflow-auto">
          {String((q.error as Error)?.message ?? q.error)}
        </pre>
      ) : (
        <pre className="p-3 rounded-lg bg-card border border-card-border text-xs text-text overflow-auto max-h-64">
          {q.isPending ? '…' : JSON.stringify(q.data, null, 2)}
        </pre>
      )}
    </section>
  );
}

export default function DebugPage() {
  const health = useHealth();
  const version = useVersion();
  const transactions = useTransactions();

  return (
    <main className="min-h-dvh p-8 space-y-6 bg-bg text-text">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">API debug</h1>
        <p className="text-sm text-text-2">
          Phase F2 wiring smoke test. Hits the backend at{' '}
          <code className="px-1.5 py-0.5 rounded bg-bg-3">
            {process.env.NEXT_PUBLIC_API_BASE ?? '(unset)'}
          </code>
          . If the backend isn&apos;t running, each section will show an error.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <State q={health} label="GET /api/health" />
        <State q={version} label="GET /api/version" />
        <State q={transactions} label="GET /api/transactions?context=…" />
      </div>
    </main>
  );
}
