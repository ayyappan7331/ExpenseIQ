'use client';

import { useState, useCallback } from 'react';
import { lsGetOne, lsSetOne, lsProfileKey } from '@/lib/utils/localStorage';
import { getActiveProfileId } from '@/lib/api/profile';

/** 'grouped' = date-grouped view; 'flat' = plain sorted table */
export type ViewMode = 'grouped' | 'flat';

/** @deprecated Use ViewMode. Kept for type compatibility during migration. */
export type DensityMode = ViewMode;

const VIEW_MODE_BASE_KEY = 'expenseiq_view_mode';

function viewModeKey(): string {
  return lsProfileKey(VIEW_MODE_BASE_KEY, getActiveProfileId());
}

export type GroupPeriod = 'day' | 'week' | 'month' | 'quarter' | 'halfyear' | 'year';

const GROUP_PERIOD_KEY = 'expenseiq_group_period';
function groupPeriodKey(): string { return lsProfileKey(GROUP_PERIOD_KEY, getActiveProfileId()); }

export function useDensityMode() {
  const [mode, setModeState] = useState<ViewMode>(
    () => (lsGetOne<ViewMode>(viewModeKey()) ?? 'grouped')
  );
  const [groupPeriod, setGroupPeriodState] = useState<GroupPeriod>(
    () => (lsGetOne<GroupPeriod>(groupPeriodKey()) ?? 'day')
  );

  const setDensity = useCallback((next: ViewMode) => {
    setModeState(next); lsSetOne(viewModeKey(), next);
  }, []);

  const toggleDensity = useCallback(() => {
    setModeState(prev => {
      const next: ViewMode = prev === 'grouped' ? 'flat' : 'grouped';
      lsSetOne(viewModeKey(), next); return next;
    });
  }, []);

  const setGroupPeriod = useCallback((p: GroupPeriod) => {
    setGroupPeriodState(p); lsSetOne(groupPeriodKey(), p);
  }, []);

  return {
    density: mode, setDensity, toggleDensity,
    groupPeriod, setGroupPeriod,
    rowPadding: 'px-3 py-2.5', cellPadding: 'px-3 py-2.5',
  };
}
