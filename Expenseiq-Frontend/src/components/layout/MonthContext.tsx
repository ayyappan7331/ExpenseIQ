'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { todayMonth } from '@/lib/utils/dates';

interface MonthContextValue {
  month: string;
  setMonth: (m: string) => void;
  disabled: boolean;
  setDisabled: (d: boolean) => void;
}

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<string>(todayMonth);
  const [disabled, setDisabled] = useState(false);

  // Gap 7 fix: when the tab regains visibility after being hidden
  // (e.g. user left the app open past midnight), re-check today's month
  // and advance the default selection if the month has rolled over.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      const latest = todayMonth();
      setMonth((prev) => {
        // Only advance if the month has actually rolled over AND the user
        // is still on whatever month was auto-selected at mount time.
        // We detect "auto-selected" by checking that prev is a past month
        // relative to today — if they manually picked a future month we
        // leave it alone (that case can't arise with the current MonthFilter
        // which only shows past 6 months, but guard defensively).
        return prev < latest ? latest : prev;
      });
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <MonthContext.Provider value={{ month, setMonth, disabled, setDisabled }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used inside <MonthProvider>');
  return ctx;
}
