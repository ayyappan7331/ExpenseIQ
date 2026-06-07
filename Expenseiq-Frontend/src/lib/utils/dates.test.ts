import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { last6Months, monthLabel, pad, prevMonth, todayMonth, dateGroup } from './dates';

describe('date helpers', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15)); // 2026-05-15 local
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('pad zero-pads single digits', () => {
    expect(pad(1)).toBe('01');
    expect(pad(12)).toBe('12');
  });

  it('todayMonth returns YYYY-MM for the pinned date', () => {
    expect(todayMonth()).toBe('2026-05');
  });

  it('prevMonth handles same-year and year-wrap', () => {
    expect(prevMonth('2026-05')).toBe('2026-04');
    expect(prevMonth('2026-01')).toBe('2025-12');
  });

  it('monthLabel produces a Mon YYYY label', () => {
    expect(monthLabel('2026-05')).toMatch(/May.*2026/);
  });

  it('last6Months returns 6 entries with current month first', () => {
    const months = last6Months();
    expect(months).toHaveLength(6);
    expect(months[0]).toBe('2026-05');
    expect(months[5]).toBe('2025-12');
  });

  // Regression test: Today filter must use local timezone, not UTC
  it('dateGroup returns Today for the local date (regression: UTC vs local)', () => {
    // Fake time is 2026-05-15 local — dateGroup must return Today for that date
    expect(dateGroup('2026-05-15')).toBe('Today');
    expect(dateGroup('2026-05-14')).toBe('Yesterday');
    expect(dateGroup('2026-05-10')).toBe('This Week');
    expect(dateGroup('2026-04-01')).toBe('Earlier');
  });
});

describe('date helpers', () => {
  beforeAll(() => {
    // Pin "today" to 2026-05-15 (Friday) so calendar-based outputs are
    // deterministic regardless of when CI runs.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('pad zero-pads single digits', () => {
    expect(pad(1)).toBe('01');
    expect(pad(12)).toBe('12');
  });

  it('todayMonth returns YYYY-MM for the pinned date', () => {
    expect(todayMonth()).toBe('2026-05');
  });

  it('prevMonth handles same-year and year-wrap', () => {
    expect(prevMonth('2026-05')).toBe('2026-04');
    expect(prevMonth('2026-01')).toBe('2025-12');
  });

  it('monthLabel produces a Mon YYYY label', () => {
    expect(monthLabel('2026-05')).toMatch(/May.*2026/);
  });

  it('last6Months returns 6 entries with current month first', () => {
    const months = last6Months();
    expect(months).toHaveLength(6);
    expect(months[0]).toBe('2026-05');
    expect(months[5]).toBe('2025-12');
  });
});
