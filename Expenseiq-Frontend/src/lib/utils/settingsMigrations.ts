// localStorage migration helpers — E4.3
//
// Migrates old unscoped keys (written before E4.2) to the new profile-scoped
// key format. Safe to run multiple times (idempotent).
//
// Call migrateUnscopedPersistence(profileId) once on app startup, e.g. in
// the root layout or AppShell component.

import { lsProfileKey } from '@/lib/utils/localStorage';

const MIGRATION_FLAG_KEY = 'expenseiq_ls_migration_v1';

// Old unscoped base keys (pre-E4.2)
const OLD_KEYS = {
  pins: 'expenseiq_pinned_transactions',
  favorites: 'expenseiq_favorite_transactions',
  templates: 'expenseiq_transaction_templates',
  density: 'expenseiq_table_density',
} as const;

/**
 * Migrates old unscoped localStorage keys to profile-scoped keys.
 * Idempotent — tracks completion via a migration flag key.
 * Does not overwrite existing scoped data to avoid data loss.
 */
export function migrateUnscopedPersistence(profileId: string): void {
  if (typeof window === 'undefined') return;

  // Check if already migrated for this profile
  const flagKey = lsProfileKey(MIGRATION_FLAG_KEY, profileId);
  if (localStorage.getItem(flagKey)) return;

  try {
    // Migrate array keys (pins, favorites, templates)
    migrateArrayKey(OLD_KEYS.pins, lsProfileKey(OLD_KEYS.pins, profileId));
    migrateArrayKey(OLD_KEYS.favorites, lsProfileKey(OLD_KEYS.favorites, profileId));
    migrateArrayKey(OLD_KEYS.templates, lsProfileKey(OLD_KEYS.templates, profileId));

    // Migrate scalar key (density)
    migrateScalarKey(OLD_KEYS.density, lsProfileKey(OLD_KEYS.density, profileId));

    // Mark migration complete for this profile
    localStorage.setItem(flagKey, '1');
  } catch {
    // Migration failure is non-fatal — app continues with empty scoped state
  }
}

/** Copies an array key to the scoped key if scoped key is empty. */
function migrateArrayKey(oldKey: string, newKey: string): void {
  const existing = localStorage.getItem(newKey);
  if (existing) return;
  const old = localStorage.getItem(oldKey);
  if (!old) return;
  localStorage.setItem(newKey, old);
  localStorage.removeItem(oldKey);
}

/** Copies a scalar key to the scoped key if scoped key is empty. */
function migrateScalarKey(oldKey: string, newKey: string): void {
  const existing = localStorage.getItem(newKey);
  if (existing) return;
  const old = localStorage.getItem(oldKey);
  if (!old) return;
  localStorage.setItem(newKey, old);
  localStorage.removeItem(oldKey);
}
