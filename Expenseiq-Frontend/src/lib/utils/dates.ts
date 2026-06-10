// Date helpers ported from the legacy SPA (line 2056-2086).
// All formats stay byte-identical to the legacy so a year of historical
// transactions keyed by YYYY-MM continue to filter correctly.

/** "2026-05" — UTC-agnostic, uses local clock just like the legacy. */
export function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

export function dateLabel(ds: string | null | undefined): string {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** Formats a HH:MM (24-hour) time string to 12-hour display, e.g. "10:45 PM". */
export function timeLabel(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}
export function last6Months(): string[] {
  const arr: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    arr.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return arr;
}

export type TransactionGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

/** Returns the display group label for a YYYY-MM-DD date string. */
export function dateGroup(ds: string): TransactionGroup {
  const now = new Date();
  // Use local timezone dates to avoid UTC mismatch
  const localDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = localDate(now);
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const yesterdayStr = localDate(yest);
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = localDate(weekAgo);

  if (ds === today) return 'Today';
  if (ds === yesterdayStr) return 'Yesterday';
  if (ds >= weekAgoStr) return 'This Week';
  return 'Earlier';
}

const GROUP_ORDER: TransactionGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];

/** Groups a pre-sorted transaction array into ordered group buckets. */
export function groupByDate<T extends { date: string }>(items: T[]): { label: TransactionGroup; items: T[] }[] {
  const map = new Map<TransactionGroup, T[]>();
  for (const item of items) {
    const label = dateGroup(item.date);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return GROUP_ORDER
    .filter(g => map.has(g))
    .map(label => ({ label, items: map.get(label)! }));
}

/** Groups items by a given period (week/month/quarter/halfyear/year). */
export function groupByPeriod<T extends { date: string }>(
  items: T[],
  period: 'week' | 'month' | 'quarter' | 'halfyear' | 'year'
): { label: string; items: T[] }[] {
  const getLabel = (ds: string): string => {
    const [y, m, d] = ds.split('-').map(Number);
    if (period === 'week') {
      // ISO week number
      const date = new Date(y, m - 1, d);
      const jan1 = new Date(y, 0, 1);
      const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `Week ${week}, ${y}`;
    }
    if (period === 'month') {
      return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    if (period === 'quarter') {
      return `Q${Math.ceil(m / 3)} ${y}`;
    }
    if (period === 'halfyear') {
      return `H${m <= 6 ? 1 : 2} ${y}`;
    }
    return String(y);
  };

  const map = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const label = getLabel(item.date);
    if (!map.has(label)) { map.set(label, []); order.push(label); }
    map.get(label)!.push(item);
  }
  // Return in the order first seen (items are pre-sorted desc, so newest group first)
  return order.map(label => ({ label, items: map.get(label)! }));
}
