import { describe, it, expect, beforeEach } from 'vitest';
import {
  ACTIVE_PROFILE_KEY,
  DEFAULT_PROFILE_ID,
  getActiveProfileId,
  setActiveProfileId,
} from './profile';

describe('active profile helper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns "default" when nothing is set', () => {
    expect(getActiveProfileId()).toBe(DEFAULT_PROFILE_ID);
  });

  it('returns the stored value after setActiveProfileId', () => {
    setActiveProfileId('work');
    expect(getActiveProfileId()).toBe('work');
    expect(localStorage.getItem(ACTIVE_PROFILE_KEY)).toBe('work');
  });

  it('storage key matches the legacy SPA contract', () => {
    expect(ACTIVE_PROFILE_KEY).toBe('expenseiq_active_profile');
  });

  it('falls back to default when localStorage stores an empty string', () => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, '');
    expect(getActiveProfileId()).toBe(DEFAULT_PROFILE_ID);
  });
});
