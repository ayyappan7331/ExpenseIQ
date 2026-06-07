'use client';

import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

/**
 * Renders a subtle top banner when the browser is offline.
 * Disappears automatically when connectivity is restored.
 */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/90 text-white text-xs font-medium backdrop-blur-sm"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span>You are offline. Changes will sync when connection is restored.</span>
    </div>
  );
}
