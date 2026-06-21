// Pure calculation helpers for the Credit Cards module.
// Transactions are the sole source of truth for spend data.
//
// Card detection priority:
//   1. CreditCard.linkedPaymentMethod — explicit, set by the user
//   2. Regex fallback — /credit\s*card/i on payment method names, for cards
//      that existed before linkedPaymentMethod was introduced

import type { Transaction, CreditCard } from '@/lib/types/api';
import { pad } from '@/lib/utils/dates';

/** Regex fallback for cards that predate the linkedPaymentMethod field. */
const CREDIT_CARD_REGEX = /credit\s*card/i;

/**
 * Derives the set of active credit card payment method names.
 *
 * For cards with linkedPaymentMethod set, that value is used directly.
 * For payment methods with no matching card record, the regex fallback
 * detects them so they still appear (migration path).
 *
 * Returns a Map<paymentMethodName, CreditCard | undefined> so callers
 * know which cards have metadata and which are regex-detected only.
 */
export function buildCardMethodMap(
  paymentMethods: string[],
  cards: CreditCard[]
): Map<string, CreditCard | undefined> {
  const result = new Map<string, CreditCard | undefined>();

  // 1. Explicit links — highest priority
  for (const card of cards) {
    const linked = card.linkedPaymentMethod;
    if (linked) {
      result.set(linked, card);
    }
  }

  // 2. Regex fallback for payment methods not yet explicitly linked
  for (const method of paymentMethods) {
    if (!result.has(method) && CREDIT_CARD_REGEX.test(method)) {
      // Check if any card's name matches this method (legacy join)
      const matchedCard = cards.find(
        (c) => !c.linkedPaymentMethod && c.name.toLowerCase() === method.toLowerCase()
      );
      result.set(method, matchedCard);
    }
  }

  return result;
}

export type PaymentStatus =
  | 'paid'
  | 'partially_paid'
  | 'due_soon'
  | 'upcoming'
  | 'overdue'
  | 'no_payment_due';

export interface CardStats {
  /** Payment method name — the canonical identifier for transaction matching. */
  name: string;
  /** CreditCard metadata record, if present. */
  meta?: CreditCard;
  monthlySpend: number;
  yearlySpend: number;
  lifetimeSpend: number;
  txnCount: number;
  lastTxnDate: string | null;
  /**
   * Outstanding balance = lifetime expenses on this card minus lifetime income
   * (payments / refunds) on this card.
   * Floored at 0 — a negative result means the card has a net credit.
   */
  outstandingBalance: number;
  /** Billing cycle fields — null when billDate / dueDate are not configured. */
  cycleStart: string | null;
  cycleEnd: string | null;
  /** Net spend (expenses − payments) within the closed billing cycle. Floored at 0. */
  statementBalance: number;
  cyclePurchases: number;
  cyclePayments: number;
  /** YYYY-MM-DD of the next payment due date, or null if dueDate not configured. */
  nextDueDate: string | null;
  /** Income transactions recorded after cycleEnd (post-statement payments). */
  paymentsAfterCycle: number;
  /** max(0, statementBalance − paymentsAfterCycle). */
  remainingDue: number;
  /** Days from today to nextDueDate. Negative = overdue. Null = no cycle. */
  daysUntilDue: number | null;
  /** Payment status derived from statementBalance, payments, and due date. */
  paymentStatus: PaymentStatus | null;
  /** Cashback earned (income with subtype='cashback' only). */
  monthlyCashback: number;
  yearlyCashback: number;
  lifetimeCashback: number;
}

export interface BillingCycle {
  cycleStart: string;  // YYYY-MM-DD (inclusive)
  cycleEnd: string;    // YYYY-MM-DD (inclusive)
  nextDueDate: string; // YYYY-MM-DD
}

/**
 * Returns the last day of a given month.
 * month0 is 0-indexed (0 = January, 11 = December).
 * new Date(year, month0 + 1, 0) is the standard JS idiom for last-day-of-month.
 */
function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * Clamps a day-of-month to the actual last day of the given month.
 * Prevents overflow: billDate=31 in February becomes 28 (or 29 in leap years).
 */
function clampDay(year: number, month0: number, day: number): number {
  return Math.min(day, lastDayOfMonth(year, month0));
}

/**
 * Computes the most recently closed billing cycle boundaries and next due date.
 *
 * Uses duePeriod (days after statement) as the primary source.
 * Falls back to legacy dueDate (day-of-month) if duePeriod is absent.
 */
export function computeBillingCycle(
  billDate: number | undefined,
  duePeriodOrLegacyDueDate: number | undefined,
  today: Date = new Date(),
  isLegacyDueDate = false
): BillingCycle | null {
  if (!billDate || !duePeriodOrLegacyDueDate) return null;

  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  let cycleEndYear: number;
  let cycleEndMonth: number;

  const clampedBillThisMonth = clampDay(todayYear, todayMonth, billDate);
  if (todayDay >= clampedBillThisMonth) {
    cycleEndYear = todayYear;
    cycleEndMonth = todayMonth;
  } else {
    const d = new Date(todayYear, todayMonth - 1, 1);
    cycleEndYear = d.getFullYear();
    cycleEndMonth = d.getMonth();
  }

  const cycleEndDay = clampDay(cycleEndYear, cycleEndMonth, billDate);
  const cycleEndDate = new Date(cycleEndYear, cycleEndMonth, cycleEndDay);
  const cycleEnd = `${cycleEndDate.getFullYear()}-${pad(cycleEndDate.getMonth() + 1)}-${pad(cycleEndDate.getDate())}`;

  const prevMonth0 = cycleEndMonth - 1;
  const prevYear = prevMonth0 < 0 ? cycleEndYear - 1 : cycleEndYear;
  const prevMonth0Norm = ((prevMonth0 % 12) + 12) % 12;
  const prevBillDay = clampDay(prevYear, prevMonth0Norm, billDate);
  const cycleStartDate = new Date(prevYear, prevMonth0Norm, prevBillDay + 1);
  const cycleStart = `${cycleStartDate.getFullYear()}-${pad(cycleStartDate.getMonth() + 1)}-${pad(cycleStartDate.getDate())}`;

  // Compute nextDueDate
  let dueDateObj: Date;
  if (isLegacyDueDate) {
    // Legacy: dueDate is a day-of-month number
    const dueDay = duePeriodOrLegacyDueDate;
    const dueDaySameMonth = clampDay(cycleEndYear, cycleEndMonth, dueDay);
    dueDateObj = new Date(cycleEndYear, cycleEndMonth, dueDaySameMonth);
    if (dueDateObj <= cycleEndDate) {
      const nextMonth0 = cycleEndMonth + 1;
      const nextYear = nextMonth0 > 11 ? cycleEndYear + 1 : cycleEndYear;
      const nextMonth0Norm = nextMonth0 % 12;
      dueDateObj = new Date(nextYear, nextMonth0Norm, clampDay(nextYear, nextMonth0Norm, dueDay));
    }
  } else {
    // New: duePeriod is days after cycleEnd
    dueDateObj = new Date(cycleEndDate);
    dueDateObj.setDate(dueDateObj.getDate() + duePeriodOrLegacyDueDate);
  }
  const nextDueDate = `${dueDateObj.getFullYear()}-${pad(dueDateObj.getMonth() + 1)}-${pad(dueDateObj.getDate())}`;

  return { cycleStart, cycleEnd, nextDueDate };
}

/**
 * Computes payment status for a card statement.
 *
 * Precedence (highest to lowest):
 *   1. No cycle configured → null
 *   2. statementBalance === 0 → no_payment_due
 *   3. remainingDue === 0 → paid
 *   4. today > nextDueDate → overdue
 *   5. daysUntilDue <= 7 → due_soon   (imminent — within a week)
 *   6. paymentsAfterCycle > 0 → partially_paid
 *   7. daysUntilDue > 7, no payments → upcoming  (payment needed, not yet urgent)
 */
export function computePaymentStatus(
  statementBalance: number,
  remainingDue: number,
  paymentsAfterCycle: number,
  daysUntilDue: number | null
): PaymentStatus | null {
  if (daysUntilDue === null) return null;
  if (statementBalance === 0) return 'no_payment_due';
  if (remainingDue === 0) return 'paid';
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'due_soon';
  if (paymentsAfterCycle > 0) return 'partially_paid';
  return 'upcoming';
}

/**
 * Given the end of the CURRENT billing cycle, computes the due date for the
 * NEXT (upcoming) billing cycle.  Used when the current cycle is already
 * paid so we show a forward-looking due date instead of a past one.
 */
export function computeNextCycleDueDate(
  currentCycleEnd: string,   // YYYY-MM-DD
  billDate: number,
  duePeriod: number | undefined,
  legacyDueDate?: number
): string | null {
  if (!billDate || (!duePeriod && !legacyDueDate)) return null;

  // Next cycle end = billDate of the calendar month AFTER currentCycleEnd
  const [y, m] = currentCycleEnd.split('-').map(Number); // m is 1-indexed
  const nextMonth0 = m % 12;                              // 0-indexed next month
  const nextYear   = nextMonth0 === 0 ? y + 1 : y;
  const nextCycleEndDay  = clampDay(nextYear, nextMonth0, billDate);
  const nextCycleEndDate = new Date(nextYear, nextMonth0, nextCycleEndDay);

  if (duePeriod) {
    const dueDateObj = new Date(nextCycleEndDate);
    dueDateObj.setDate(dueDateObj.getDate() + duePeriod);
    return `${dueDateObj.getFullYear()}-${pad(dueDateObj.getMonth() + 1)}-${pad(dueDateObj.getDate())}`;
  }

  // Legacy: legacyDueDate is a day-of-month number
  const dueDay = legacyDueDate!;
  const dueDayClamped = clampDay(nextYear, nextMonth0, dueDay);
  let dueDateObj = new Date(nextYear, nextMonth0, dueDayClamped);
  if (dueDateObj <= nextCycleEndDate) {
    const m2 = nextMonth0 + 1;
    const y2 = m2 > 11 ? nextYear + 1 : nextYear;
    dueDateObj  = new Date(y2, m2 % 12, clampDay(y2, m2 % 12, dueDay));
  }
  return `${dueDateObj.getFullYear()}-${pad(dueDateObj.getMonth() + 1)}-${pad(dueDateObj.getDate())}`;
}

/**
 * Computes spend statistics for each detected credit card.
 * Uses the payment method name as the exact join key against transactions.
 *
 * Subtype-aware classification (Phase 9):
 *
 * Card credits (reduce outstanding and statement balance):
 *   income + subtype \u2208 {payment, refund, cashback, reimbursement}
 *   income + subtype === undefined  (backward compat: pre-Phase-8 transactions)
 *
 * Bill payments only (drive payment status PAID/PARTIALLY_PAID/OVERDUE):
 *   income + subtype === 'payment'
 *   income + subtype === undefined  (backward compat)
 *
 * Excluded from all card calculations:
 *   income + subtype === 'transfer_in'  (not a card credit)
 */
export function computeCardStats(
  cardMethodMap: Map<string, CreditCard | undefined>,
  allTxns: Transaction[],
  currentMonth: string,
  currentYear: string
): CardStats[] {
  return Array.from(cardMethodMap.entries()).map(([methodName, meta]) => {
    const nameLower = methodName.toLowerCase();
    const cardTxns = allTxns.filter(
      (t) => t.paymentMethod?.toLowerCase() === nameLower
    );

    const expenseTxns = cardTxns.filter((t) => t.type === 'expense');

    // Card credits: income that reduces what is owed on the card.
    // Excludes transfer_in (not a card credit).
    // undefined subtype = pre-Phase-8 transaction, treated as card credit (backward compat).
    const cardCreditTxns = cardTxns.filter(
      (t) => t.type === 'income' && t.subtype !== 'transfer_in'
    );

    // Bill payments: income that counts toward paying the statement.
    // Only subtype='payment' or undefined (backward compat).
    const billPaymentTxns = cardTxns.filter(
      (t) => t.type === 'income' && (t.subtype === 'payment' || t.subtype === undefined)
    );

    // Calendar-month spend — used as fallback when no billDate is configured.
    const calendarMonthlySpend = expenseTxns
      .filter((t) => t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);

    const yearlySpend = expenseTxns
      .filter((t) => t.date.startsWith(currentYear))
      .reduce((s, t) => s + t.amount, 0);

    const lifetimeSpend = expenseTxns.reduce((s, t) => s + t.amount, 0);
    const lifetimeCredits = cardCreditTxns.reduce((s, t) => s + t.amount, 0);

    // Cashback: only income with subtype='cashback'
    const cashbackTxns = cardTxns.filter(
      (t) => t.type === 'income' && t.subtype === 'cashback'
    );
    const monthlyCashback = cashbackTxns
      .filter((t) => t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);
    const yearlyCashback = cashbackTxns
      .filter((t) => t.date.startsWith(currentYear))
      .reduce((s, t) => s + t.amount, 0);
    const lifetimeCashback = cashbackTxns.reduce((s, t) => s + t.amount, 0);

    // Floor at 0: a net credit (overpaid) shows as zero outstanding.
    // openingBalance accounts for pre-app card debt the user entered when
    // configuring the card. Defaults to 0 so existing cards are unaffected.
    const openingBalance = meta?.openingBalance ?? 0;
    const outstandingBalance = Math.max(0, openingBalance + lifetimeSpend - lifetimeCredits);

    const dates = expenseTxns.map((t) => t.date).sort();
    const lastTxnDate = dates.length > 0 ? dates[dates.length - 1] : null;

    // Billing cycle — prefer duePeriod, fall back to legacy dueDate.
    // Use a reference date derived from currentMonth so that historical month
    // navigation produces the correct billing cycle, not always today's cycle.
    const hasDuePeriod = !!meta?.duePeriod;
    const duePeriodValue = meta?.duePeriod ?? meta?.dueDate;
    const [refYear, refMonth] = currentMonth.split('-').map(Number);
    const now = new Date();
    const isCurrentMonth = refYear === now.getFullYear() && refMonth === (now.getMonth() + 1);
    const cycleRefDate = isCurrentMonth ? now : new Date(refYear, refMonth, 0); // last day of month for historical
    const cycle = computeBillingCycle(meta?.billDate, duePeriodValue, cycleRefDate, !hasDuePeriod);
    let cycleStart: string | null = null;
    let cycleEnd: string | null = null;
    let nextDueDate: string | null = null;
    let cyclePurchases = 0;
    let cyclePayments = 0;
    let statementBalance = 0;

    if (cycle) {
      cycleStart = cycle.cycleStart;
      cycleEnd = cycle.cycleEnd;
      nextDueDate = cycle.nextDueDate;

      cyclePurchases = expenseTxns
        .filter((t) => t.date >= cycleStart! && t.date <= cycleEnd!)
        .reduce((s, t) => s + t.amount, 0);

      // cycleCredits: all card credits within the cycle
      const cycleCredits = cardCreditTxns
        .filter((t) => t.date >= cycleStart! && t.date <= cycleEnd!)
        .reduce((s, t) => s + t.amount, 0);

      // cyclePayments (displayed field): only bill payments within the cycle
      cyclePayments = billPaymentTxns
        .filter((t) => t.date >= cycleStart! && t.date <= cycleEnd!)
        .reduce((s, t) => s + t.amount, 0);

      // statementBalance is exactly the outstanding balance as of cycleEnd
      const expensesUpToCycleEnd = expenseTxns
        .filter((t) => t.date <= cycleEnd!)
        .reduce((s, t) => s + t.amount, 0);
      const creditsUpToCycleEnd = cardCreditTxns
        .filter((t) => t.date <= cycleEnd!)
        .reduce((s, t) => s + t.amount, 0);
      
      statementBalance = Math.max(0, openingBalance + expensesUpToCycleEnd - creditsUpToCycleEnd);
    }

    // Payment status
    let paymentsAfterCycle = 0;
    let remainingDue = 0;
    let daysUntilDue: number | null = null;
    let paymentStatus: PaymentStatus | null = null;

    if (cycleEnd && nextDueDate) {
      // paymentsAfterCycle: only bill payments after the statement date
      // (refunds/cashback after cycle end do not count as paying the bill)
      paymentsAfterCycle = billPaymentTxns
        .filter((t) => t.date > cycleEnd!)
        .reduce((s, t) => s + t.amount, 0);
      
      // remainingDue cannot exceed the current total outstanding balance (e.g. if refunds occurred)
      remainingDue = Math.max(0, Math.min(outstandingBalance, statementBalance - paymentsAfterCycle));

      // Days until due: compare today's local date string to nextDueDate
      const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      })();
      const msPerDay = 1000 * 60 * 60 * 24;
      const todayMidnight = new Date(todayStr + 'T00:00:00');
      const dueMidnight = new Date(nextDueDate + 'T00:00:00');
      daysUntilDue = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / msPerDay);

      paymentStatus = computePaymentStatus(
        statementBalance,
        remainingDue,
        paymentsAfterCycle,
        daysUntilDue
      );
    }

    // ── Advance nextDueDate for paid/no_payment_due cards ──────────────────
    // When the current cycle is already settled, show the NEXT cycle's due
    // date so users always see a forward-looking date, not a past one.
    if (
      (paymentStatus === 'paid' || paymentStatus === 'no_payment_due') &&
      cycleEnd && meta?.billDate
    ) {
      const advanced = computeNextCycleDueDate(
        cycleEnd,
        meta.billDate,
        hasDuePeriod ? meta.duePeriod : undefined,
        !hasDuePeriod ? meta.dueDate  : undefined
      );
      if (advanced) {
        nextDueDate = advanced;
        // Recompute daysUntilDue against the new forward-looking date
        const todayStr2 = (() => {
          const d = new Date();
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        })();
        const msPerDay2 = 1000 * 60 * 60 * 24;
        daysUntilDue = Math.round(
          (new Date(advanced + 'T00:00:00').getTime() - new Date(todayStr2 + 'T00:00:00').getTime()) / msPerDay2
        );
      }
    }

    // monthlySpend: use billing cycle purchases when available, else calendar month
    const monthlySpend = cycle ? cyclePurchases : calendarMonthlySpend;

    return {
      name: methodName,
      meta,
      monthlySpend,
      yearlySpend,
      lifetimeSpend,
      txnCount: expenseTxns.length,
      lastTxnDate,
      outstandingBalance,
      cycleStart,
      cycleEnd,
      statementBalance,
      cyclePurchases,
      cyclePayments,
      nextDueDate,
      paymentsAfterCycle,
      remainingDue,
      daysUntilDue,
      paymentStatus,
      monthlyCashback,
      yearlyCashback,
      lifetimeCashback,
    };
  });
}

/** One historical billing cycle statement for a card. */
export interface MonthlyStatement {
  /** Full label e.g. "May 2026" */
  label: string;
  /** Short month name e.g. "May" */
  monthLabel: string;
  /** Calendar year of cycleEnd */
  year: number;
  cycleStart: string;   // YYYY-MM-DD
  cycleEnd: string;     // YYYY-MM-DD
  dueDate: string;      // YYYY-MM-DD
  purchases: number;
  credits: number;
  statementBalance: number;
  paymentsAfterCycle: number;
  remainingDue: number;
  status: PaymentStatus | null;
}

/**
 * Generates ALL billing cycle statements for a card, back to the first transaction.
 * Works backwards from today one cycle at a time.
 * Only available when billDate and dueDate are configured.
 */
export function computeMonthlyStatements(
  billDate: number | undefined,
  duePeriod: number | undefined,
  cardTxns: Transaction[],
  legacyDueDate?: number
): MonthlyStatement[] {
  if (!billDate || (!duePeriod && !legacyDueDate)) return [];
  const isLegacy = !duePeriod && !!legacyDueDate;
  const duePeriodValue = duePeriod ?? legacyDueDate!;

  // Determine how far back to go: earliest transaction date, or 2 years max
  const allDates = cardTxns.map(t => t.date).sort();
  const earliest = allDates[0];
  const maxCycles = earliest
    ? Math.ceil((new Date().getTime() - new Date(earliest + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24 * 28)) + 2
    : 24;

  const openingBalance = cardTxns.length > 0 && cardTxns[0].paymentMethod ? 0 : 0; // we don't have meta.openingBalance easily here, assume 0 or derive from total. Actually, computeMonthlyStatements doesn't have openingBalance. Let's pass openingBalance.
  // Wait, I can derive the total outstanding balance today to cap remainingDue
  const totalExpenses = cardTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalCredits = cardTxns.filter(t => t.type === 'income' && t.subtype !== 'transfer_in').reduce((s, t) => s + t.amount, 0);
  // outstandingBalance today (assuming openingBalance = 0 since we don't have it passed, but that's fine for statements)
  const currentOutstandingBalance = Math.max(0, totalExpenses - totalCredits);

  const statements: MonthlyStatement[] = [];
  let ref = new Date();
  // Upper bound for paymentsAfterCycle attribution.
  // The most recent cycle has no upper bound (payments up to today are valid).
  // Each older cycle's upper bound is the close date of the next-newer cycle,
  // so payments don't bleed across statement periods.
  let prevCycleEnd = '9999-12-31';

  for (let i = 0; i < maxCycles; i++) {
    const cycle = computeBillingCycle(billDate, duePeriodValue, ref, isLegacy);
    if (!cycle) break;

    const { cycleStart, cycleEnd, nextDueDate } = cycle;

    // Stop if we've gone past the earliest transaction
    if (earliest && cycleEnd < earliest) break;

    // Avoid duplicate cycles
    if (statements.some((s) => s.cycleEnd === cycleEnd)) break;

    const expenseTxns = cardTxns.filter((t) => t.type === 'expense');
    const cardCreditTxns = cardTxns.filter(
      (t) => t.type === 'income' && t.subtype !== 'transfer_in'
    );
    const billPaymentTxns = cardTxns.filter(
      (t) => t.type === 'income' && (t.subtype === 'payment' || t.subtype === undefined)
    );

    const purchases = expenseTxns
      .filter((t) => t.date >= cycleStart && t.date <= cycleEnd)
      .reduce((s, t) => s + t.amount, 0);

    const credits = cardCreditTxns
      .filter((t) => t.date >= cycleStart && t.date <= cycleEnd)
      .reduce((s, t) => s + t.amount, 0);

    const expensesUpToCycleEnd = expenseTxns
      .filter((t) => t.date <= cycleEnd)
      .reduce((s, t) => s + t.amount, 0);
    const creditsUpToCycleEnd = cardCreditTxns
      .filter((t) => t.date <= cycleEnd)
      .reduce((s, t) => s + t.amount, 0);

    const statementBalance = Math.max(0, expensesUpToCycleEnd - creditsUpToCycleEnd);

    // Payments after cycle are ALL future payments. This correctly attributes
    // late payments to past statements chronologically.
    const paymentsAfterCycle = billPaymentTxns
      .filter((t) => t.date > cycleEnd)
      .reduce((s, t) => s + t.amount, 0);

    // remainingDue capped at current total outstanding balance (for refunds)
    const remainingDue = Math.max(0, Math.min(currentOutstandingBalance, statementBalance - paymentsAfterCycle));

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilDue = Math.round(
      (new Date(nextDueDate + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / msPerDay
    );

    const status = computePaymentStatus(statementBalance, remainingDue, paymentsAfterCycle, daysUntilDue);

    const [cy, cm] = cycleEnd.split('-').map(Number);
    const label = new Date(cy, cm - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const monthLabel = new Date(cy, cm - 1, 1).toLocaleDateString('en-IN', { month: 'long' });

    statements.push({ label, monthLabel, year: cy, cycleStart, cycleEnd, dueDate: nextDueDate, purchases, credits, statementBalance, paymentsAfterCycle, remainingDue, status });

    // Step back one cycle
    ref = new Date(cycleStart + 'T00:00:00');
    ref.setDate(ref.getDate() - 1);
  }

  return statements;
}

/** Groups statements by year, descending. Only years with transactions are included. */
export function groupStatementsByYear(
  statements: MonthlyStatement[]
): { year: number; statements: MonthlyStatement[] }[] {
  const map = new Map<number, MonthlyStatement[]>();
  for (const s of statements) {
    if (!map.has(s.year)) map.set(s.year, []);
    map.get(s.year)!.push(s);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, stmts]) => ({ year, statements: stmts }));
}

/** Days until the next occurrence of a day-of-month (1–31). */
export function daysUntil(dayOfMonth: number): number {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (target <= today) target.setMonth(target.getMonth() + 1);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export type UtilizationBand = 'healthy' | 'moderate' | 'high' | 'critical';

export interface UtilizationResult {
  /** Raw percentage, may exceed 100 when outstanding > limit. */
  pct: number;
  /** Clamped to [0, 100] for progress bar rendering. */
  barPct: number;
  band: UtilizationBand;
}

/**
 * Computes credit utilization from outstanding balance and credit limit.
 * Returns null when no limit is configured.
 *
 * Bands:
 *   0–30%   healthy
 *   30–50%  moderate
 *   50–75%  high
 *   75%+    critical
 */
export function computeUtilization(
  outstandingBalance: number,
  limit: number | undefined
): UtilizationResult | null {
  if (!limit || limit <= 0) return null;
  const pct = (outstandingBalance / limit) * 100;
  const barPct = Math.min(100, pct);
  let band: UtilizationBand;
  if (pct < 30) band = 'healthy';
  else if (pct < 50) band = 'moderate';
  else if (pct < 75) band = 'high';
  else band = 'critical';
  return { pct, barPct, band };
}
