'use client';

// Pinned transactions backend readiness helpers — E4.4
//
// Defines the PinnedTransactionRef DTO and conversion utilities for the
// future migration from localStorage to backend Settings persistence.
//
// Current behavior is unchanged — these helpers are additive only.

/**
 * Future-ready DTO for a pinned transaction reference.
 * Currently pins are stored as plain string IDs in localStorage.
 * This shape allows the backend to store richer metadata if needed.
 */
export interface PinnedTransactionRef {
  transactionId: string;
  pinnedAt: string; // ISO timestamp
}

/**
 * Converts a plain transaction ID array (current localStorage format)
 * to the richer PinnedTransactionRef array (future backend format).
 */
export function pinnedIdsToRefs(ids: string[]): PinnedTransactionRef[] {
  const now = new Date().toISOString();
  return ids.map(transactionId => ({ transactionId, pinnedAt: now }));
}

/**
 * Extracts plain transaction IDs from PinnedTransactionRef array.
 * Use this when reading backend data back into the current localStorage shape.
 */
export function refsToIds(refs: PinnedTransactionRef[]): string[] {
  return refs.map(r => r.transactionId);
}
