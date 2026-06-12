'use client';

// Composes Sidebar + Topbar + main. Mobile sidebar state lives here so
// both Topbar (hamburger) and Sidebar (backdrop click) can flip it.

import { useState, useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ProfileManager } from './ProfileManager';
import { migrateUnscopedPersistence } from '@/lib/utils/settingsMigrations';
import { getActiveProfileId } from '@/lib/api/profile';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { MonthProvider } from './MonthContext';
import { useSettings } from '@/lib/hooks/queries/useSettings';
import { useTheme } from '@/components/ThemeProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: settings } = useSettings();
  const { theme, setTheme } = useTheme();

  // Run localStorage migration once on mount — idempotent, non-blocking
  useEffect(() => {
    migrateUnscopedPersistence(getActiveProfileId());
  }, []);

  // Profile Theme Sync
  useEffect(() => {
    if (!settings?.theme) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('expenseiq.syncTheme') === '1') {
      if (theme !== settings.theme) {
        setTheme(settings.theme);
      }
    }
  }, [settings?.theme, setTheme, theme]);

  return (
    <MonthProvider>
      <div className="min-h-dvh">
        <OfflineBanner />
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        {/* Mobile-only backdrop while the slide-in sidebar is open. */}
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
        )}

        <div className="md:ml-[72px] min-h-dvh flex flex-col">
          <Topbar onMenuClick={() => setMobileOpen(true)} onProfileClick={() => setProfileOpen(true)} />
          <div className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
            {children}
          </div>
        </div>
      </div>

      {/* ProfileManager rendered at root level — outside sticky header stacking context */}
      <ProfileManager open={profileOpen} onClose={() => setProfileOpen(false)} />
    </MonthProvider>
  );
}
