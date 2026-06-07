'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { getActiveProfileId } from '@/lib/api/profile';
import { queryKeys } from '@/lib/hooks/queries/keys';
import { useSettings } from '@/lib/hooks/queries/useSettings';
import { NAV_ITEMS } from '@/components/layout/nav';
import type { Settings } from '@/lib/types/api';

/**
 * Reads and persists sidebar nav item order.
 * Stored in Settings.navOrder (array of href strings) on the backend.
 * Falls back to the canonical NAV_ITEMS order when no preference is saved.
 */
export function useNavOrder() {
  const profileId = getActiveProfileId();
  const { data: settings } = useSettings({ profileId });
  const qc = useQueryClient();
  const key = queryKeys.settings.one(profileId);

  // Apply saved order on top of canonical items so new items added to NAV_ITEMS
  // always appear (appended at the end) even if navOrder is stale.
  const orderedItems = useCallback(() => {
    const saved = settings?.navOrder;
    if (!saved || saved.length === 0) return [...NAV_ITEMS];
    const byHref = new Map(NAV_ITEMS.map((n) => [n.href, n]));
    const ordered = saved.flatMap((href) => {
      const item = byHref.get(href);
      return item ? [item] : [];
    });
    // Append any new items not yet in saved order
    const savedSet = new Set(saved);
    for (const item of NAV_ITEMS) {
      if (!savedSet.has(item.href)) ordered.push(item);
    }
    return ordered;
  }, [settings?.navOrder]);

  const mutation = useMutation({
    mutationFn: (navOrder: string[]) =>
      settingsApi.update({ profileId, navOrder }),
    onMutate: async (navOrder) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Settings>(key);
      qc.setQueryData<Settings>(key, (old) => ({ ...old, profileId, navOrder }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: Settings } | undefined)?.previous;
      if (prev) qc.setQueryData(key, prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });

  return {
    orderedItems: orderedItems(),
    saveOrder: (hrefs: string[]) => mutation.mutate(hrefs),
  };
}
