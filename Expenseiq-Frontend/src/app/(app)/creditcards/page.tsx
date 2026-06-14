'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, ChevronRight, ChevronDown, ChevronLeft, Archive, RotateCcw, Download, BarChart2 } from 'lucide-react';
import { useCreditCards, useTransactions, useArchivedCreditCards } from '@/lib/hooks/queries';
import { getActiveProfileId } from '@/lib/api/profile';
import { dateLabel, monthLabel, todayMonth } from '@/lib/utils/dates';
import { Button, SectionCard, Modal, Input, ConfirmDialog, EmptyState, PageError } from '@/components/ui';
import { Drawer } from '@/components/ui/Drawer';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency, CategoryDoughnut, ChartLegend, categoryColor, SparklineChart, BarChart } from '@/components/charts';
import type { DoughnutSegment, LegendItem, BarDataset } from '@/components/charts';
import { last6Months } from '@/lib/utils/dates';
import { statementsToCSV, downloadCSV } from '@/lib/utils/csv';
import { usePaymentMethods } from '@/lib/hooks/usePaymentMethods';
import type { CreditCard } from '@/lib/types/api';
import { useDeleteCreditCard, useRecordPayment, useArchiveCreditCard, useRestoreCreditCard } from './mutations';
import { buildCardMethodMap, computeCardStats, computeUtilization, daysUntil, computeMonthlyStatements, groupStatementsByYear } from './helpers';
import type { PaymentStatus } from './helpers';
import { AttentionCenter } from './AttentionCenter';
import { ConfigureCardsModal } from './ConfigureCardsModal';
import { api } from '@/lib/api/client';
import { useMonth } from '@/components/layout/MonthContext';

/** Maps PaymentStatus to display label, color classes, and background. */
const STATUS_CONFIG: Record<PaymentStatus, { label: string; text: string; bg: string }> = {
  paid:            { label: 'Paid',           text: 'text-income',  bg: 'bg-income/15' },
  partially_paid:  { label: 'Partial',        text: 'text-warning', bg: 'bg-warning/15' },
  due_soon:        { label: 'Due Soon',       text: 'text-warning', bg: 'bg-warning/15' },
  upcoming:        { label: 'Upcoming',       text: 'text-text-2',  bg: 'bg-bg-3' },
  overdue:         { label: 'Overdue',        text: 'text-expense', bg: 'bg-expense/15' },
  no_payment_due:  { label: 'No Payment Due', text: 'text-text-3',  bg: 'bg-bg-3' },
};

function PaymentStatusBadge({ status }: { status: PaymentStatus | null }) {
  if (!status) return null;
  const { label, text, bg } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${text} ${bg}`}>
      {label}
    </span>
  );
}

export default function CreditCardsPage() {
  const router = useRouter();
  const profileId = getActiveProfileId();
  void profileId; // used by ConfigureCardsModal internally
  const { month: currentMonth, setDisabled, setMonth } = useMonth();
  const currentYear = currentMonth.slice(0, 4);

  // Disable the month dropdown while on this screen — credit cards are a
  // real-time view, not a monthly report.
  useEffect(() => {
    setDisabled(true);
    return () => setDisabled(false);
  }, [setDisabled]);

  // Statement history accordion — per-card: pinned + hovered state
  // pinned = user clicked the card header row to lock it open
  const [pinnedStatements, setPinnedStatements] = useState<Set<string>>(new Set());
  const [hoveredStatement, setHoveredStatement] = useState<string | null>(null);
  function isCardExpanded(name: string) {
    return pinnedStatements.has(name) || hoveredStatement === name;
  }
  function toggleStatementPin(name: string) {
    setPinnedStatements(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  }

  // Year accordion — per-card per-year: pinned + hovered state
  const [pinnedYears, setPinnedYears] = useState<Map<string, Set<number>>>(new Map());
  const [hoveredYear, setHoveredYear] = useState<{ card: string; year: number } | null>(null);
  function isYearExpanded(cardName: string, year: number) {
    const pinned = pinnedYears.get(cardName)?.has(year) ?? false;
    const hovered = hoveredYear?.card === cardName && hoveredYear.year === year;
    return pinned || hovered;
  }
  function toggleYearPin(cardName: string, year: number) {
    setPinnedYears(prev => {
      const next = new Map(prev);
      const years = new Set(next.get(cardName) ?? []);
      if (years.has(year)) { years.delete(year); } else { years.add(year); }
      next.set(cardName, years);
      return next;
    });
  }

  // Configuration is handled by ConfigureCardsModal

  const { paymentMethods } = usePaymentMethods();
  const { data: metaCards, isLoading: metaLoading } = useCreditCards();
  const { data: archivedCards } = useArchivedCreditCards();
  // IMPORTANT: fetched without a month filter intentionally.
  // outstandingBalance = lifetimeExpenses − lifetimeCredits — it requires ALL
  // transactions ever recorded for the card, not just the current month.
  // Do NOT add a month filter here without also rewriting computeCardStats.
  const { data: allTxns, isLoading: txnsLoading, isError: txnsError } = useTransactions({});

  const [configureOpen, setConfigureOpen] = useState(false);
  const [deleteCard, setDeleteCard] = useState<CreditCard | undefined>();
  // Issue 1 fix: store only the payment method name (string identifier).
  // The live CardStats is derived from cardStats on every render,
  // so the drawer always reflects the latest transaction data.
  const [detailCardName, setDetailCardName] = useState<string | undefined>();
  const [drawerVisibleCount, setDrawerVisibleCount] = useState(50);

  const del = useDeleteCreditCard();
  const archive = useArchiveCreditCard();
  const restore = useRestoreCreditCard();
  const recordPayment = useRecordPayment();

  // Build the card→method map using explicit links + regex fallback
  const cardMethodMap = useMemo(
    () => buildCardMethodMap(paymentMethods, metaCards ?? []),
    [paymentMethods, metaCards]
  );

  // Helper function to compute card stats for any specific month
  const computeCardStatsForMonth = useMemo(() => {
    return (cardName: string, targetMonth: string) => {
      const targetYear = targetMonth.slice(0, 4);
      const cardMethodMapForCard = new Map([[cardName, cardMethodMap.get(cardName)]]);
      const cardStatsForMonth = computeCardStats(cardMethodMapForCard, allTxns ?? [], targetMonth, targetYear);
      return cardStatsForMonth[0] || null;
    };
  }, [cardMethodMap, allTxns]);

  // Per-card month offset for the card grid month navigator (0 = current month)
  const [cardMonthOffset, setCardMonthOffset] = useState<Map<string, number>>(new Map());
  function getCardMonth(cardName: string): string {
    const offset = cardMonthOffset.get(cardName) ?? 0;
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function shiftCardMonth(cardName: string, delta: number) {
    setCardMonthOffset(prev => {
      const next = new Map(prev);
      const cur = next.get(cardName) ?? 0;
      // Don't allow future months beyond current
      const newOffset = Math.min(0, cur + delta);
      next.set(cardName, newOffset);
      return next;
    });
  }

  // Archived section toggle
  const [showArchived, setShowArchived] = useState(false);

  // Card Spend Comparison accordion state
  // pinned = user clicked the chart area, keeps it open even when mouse leaves
  const [comparisonPinned, setComparisonPinned] = useState(false);
  const [comparisonHovered, setComparisonHovered] = useState(false);
  const comparisonExpanded = comparisonHovered || comparisonPinned;

  // Payment modal state
  const [paymentCard, setPaymentCard] = useState<{ name: string; paymentMethod: string } | undefined>();
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payNotes, setPayNotes] = useState('');

  function openPayment(cardName: string, paymentMethod: string, prefillAmount?: number) {
    setPaymentCard({ name: cardName, paymentMethod });
    // Pre-fill with remaining due when available so the user doesn't have to
    // look it up — they can still edit it before submitting.
    setPayAmount(prefillAmount && prefillAmount > 0 ? String(prefillAmount) : '');
    setPayDate(currentMonth + '-' + String(new Date().getDate()).padStart(2, '0'));
    setPayNotes('');
  }

  function closePayment() {
    setPaymentCard(undefined);
  }

  function handlePaymentSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!paymentCard || !payAmount) return;
    recordPayment.mutate(
      { paymentMethod: paymentCard.paymentMethod, amount: Number(payAmount), date: payDate, notes: payNotes },
      {
        onSuccess: () => {
          closePayment();
          // Sync the global month context to today so that when the user
          // navigates to Transactions they see the month the payment landed in.
          setMonth(todayMonth());
        },
      }
    );
  }

  // Form state removed — handled by ConfigureCardsModal

  // ── Phase 3: silent client-side migration ──────────────────────────────
  // For existing cards without linkedPaymentMethod, attempt to match by name.
  // Dependency is the sorted list of unmigrated card IDs — the effect only
  // re-runs when the actual set of unlinked cards changes, not on every
  // paymentMethod add/remove that happens to share the same array length.
  const unmigratedIds = useMemo(
    () => (metaCards ?? []).filter(c => !c.linkedPaymentMethod).map(c => c.id).sort().join(','),
    [metaCards]
  );

  useEffect(() => {
    if (!metaCards || paymentMethods.length === 0) return;
    const unmigrated = metaCards.filter((c) => !c.linkedPaymentMethod);
    if (unmigrated.length === 0) return;

    for (const card of unmigrated) {
      const match = paymentMethods.find(
        (m) => m.toLowerCase() === card.name.toLowerCase()
      );
      if (match) {
        // Fire-and-forget: best-effort migration, no toast on success/failure
        api.updateCreditCard(card.id, { linkedPaymentMethod: match }).catch(() => {/* silent */});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unmigratedIds, paymentMethods.length]);

  const cardStats = useMemo(
    () => computeCardStats(cardMethodMap, allTxns ?? [], currentMonth, currentYear),
    [cardMethodMap, allTxns, currentMonth, currentYear]
  );

  // ── Cross-card spend comparison data (memoised — used in the standalone section) ──
  const comparisonData = useMemo(() => {
    if (cardStats.length < 2) return null;
    const months6 = last6Months().reverse();
    const monthLabels = months6.map(mo =>
      new Date(mo + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    );
    const datasets: BarDataset[] = cardStats.map((card, i) => ({
      label: card.meta?.name ?? card.name,
      color: categoryColor(i),
      data: months6.map(mo =>
        (allTxns ?? [])
          .filter(t =>
            t.paymentMethod?.toLowerCase() === card.name.toLowerCase() &&
            t.type === 'expense' &&
            t.date.startsWith(mo)
          )
          .reduce((s, t) => s + t.amount, 0)
      ),
    }));
    const hasAnySpend = datasets.some(ds => ds.data.some(v => v > 0));
    if (!hasAnySpend) return null;
    return { monthLabels, datasets };
  }, [cardStats, allTxns]);

  // ── Portfolio aggregates (Phase 11) ────────────────────────────────────────────────────
  const totalOutstanding = useMemo(
    () => cardStats.reduce((s, c) => s + c.outstandingBalance, 0),
    [cardStats]
  );
  const totalStatementDue = useMemo(
    () => cardStats.reduce((s, c) => s + c.remainingDue, 0),
    [cardStats]
  );
  const totalCreditLimit = useMemo(
    () => cardStats.reduce((s, c) => s + (c.meta?.limit ?? 0), 0),
    [cardStats]
  );
  const portfolioUtilization = totalCreditLimit > 0
    ? (totalOutstanding / totalCreditLimit) * 100
    : null;
  const cardsDueSoon = useMemo(
    () => cardStats.filter((c) => c.paymentStatus === 'due_soon').length,
    [cardStats]
  );
  const cardsOverdue = useMemo(
    () => cardStats.filter((c) => c.paymentStatus === 'overdue').length,
    [cardStats]
  );
  // Derive live CardStats from the current cardStats array — always up to date
  const detailCard = detailCardName
    ? cardStats.find((c) => c.name === detailCardName)
    : undefined;

const isLoading = metaLoading || txnsLoading;
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard className="h-[300px]" />
      </div>
    );
  }

  if (txnsError) {
    return (
      <PageError
        message="Failed to load transaction data. Credit card balances and spend figures cannot be calculated without it."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Attention Center — supersedes the old Upcoming Payments list */}
      <AttentionCenter cards={cardStats} onRecordPayment={(name, method) => {
        const card = cardStats.find(c => c.name === name);
        openPayment(name, method, card?.remainingDue);
      }} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-text">Credit Cards</h2>
          <p className="text-xs text-text-3">
            Tracked automatically from your payment methods
          </p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setConfigureOpen(true)}>
          Configure Cards
        </Button>
      </div>

      {/* Portfolio Summary */}
      {cardStats.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-text-3 uppercase tracking-wider">Total Outstanding</p>
              <p className={`text-sm font-bold mt-0.5 ${
                totalOutstanding > 0 ? 'text-expense' : 'text-income'
              }`}>{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-text-3 uppercase tracking-wider">Statement Due</p>
              <p className={`text-sm font-bold mt-0.5 ${
                totalStatementDue > 0 ? 'text-expense' : 'text-income'
              }`}>{formatCurrency(totalStatementDue)}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-text-3 uppercase tracking-wider">Credit Limit</p>
              <p className="text-sm font-bold mt-0.5 text-text">
                {totalCreditLimit > 0 ? formatCurrency(totalCreditLimit) : <span className="text-text-3 font-normal text-xs">Not set</span>}
              </p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-text-3 uppercase tracking-wider">Portfolio Util.</p>
              <p className={`text-sm font-bold mt-0.5 ${
                portfolioUtilization === null ? 'text-text-3'
                  : portfolioUtilization >= 75 ? 'text-expense'
                  : portfolioUtilization >= 30 ? 'text-warning'
                  : 'text-income'
              }`}>
                {portfolioUtilization === null
                  ? <span className="font-normal text-xs">No limit</span>
                  : `${portfolioUtilization.toFixed(1)}%`}
              </p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-text-3 uppercase tracking-wider">Due Soon</p>
              <p className={`text-sm font-bold mt-0.5 ${
                cardsDueSoon > 0 ? 'text-warning' : 'text-text-3'
              }`}>{cardsDueSoon}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3">
              <p className="text-[10px] text-text-3 uppercase tracking-wider">Overdue</p>
              <p className={`text-sm font-bold mt-0.5 ${
                cardsOverdue > 0 ? 'text-expense' : 'text-text-3'
              }`}>{cardsOverdue}</p>
            </div>
          </div>
        </div>
      )}

      {/* Card list */}
      {cardStats.length === 0 ? (
        <EmptyState
          emoji="💳"
          message="No credit cards found. Add a payment method or use 'Add Card Details' to link one."
        />
      ) : (
        <div className={`grid gap-4 ${
          cardStats.length === 1 ? 'grid-cols-1' :
          cardStats.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {cardStats.map((card) => {
            const accentColor = card.meta?.color ?? '#7c6ff7';
            const offset = cardMonthOffset.get(card.name) ?? 0;
            const cardMo = getCardMonth(card.name);
            
            // Use month-specific stats when navigating historical months
            const displayCard = offset === 0 ? card : computeCardStatsForMonth(card.name, cardMo);
            
            // Fallback to original card if computation fails
            const activeCard = displayCard || card;
            
            return (
              <SectionCard
                key={card.name}
                title={card.meta?.name ?? card.name}
                actions={
                  card.meta ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setDetailCardName(card.name); setDrawerVisibleCount(50); }}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openPayment(card.name, card.name, card.remainingDue)}>Pay</Button>
                      <Button variant="icon" size="sm" onClick={() => setDeleteCard(card.meta)} aria-label="Archive card"
                        title="Archive card — hides it but keeps all transaction history">
                        <Archive className="w-3.5 h-3.5 text-text-3 hover:text-warning" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setDetailCardName(card.name); setDrawerVisibleCount(50); }}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setConfigureOpen(true)}
                        title="Set bill date, due period, credit limit and card color to unlock full tracking"
                      >
                        ⚙ Configure
                      </Button>
                    </div>
                  )
                }
              >
                <div className="space-y-3">
                  <div className="w-full h-1 rounded-full" style={{ backgroundColor: accentColor }} />

                  {/* Empty-state guidance — shown when the card has no transactions yet */}
                  {activeCard.lifetimeSpend === 0 && activeCard.outstandingBalance === (card.meta?.openingBalance ?? 0) && (
                    <div className="rounded-lg border border-card-border/60 bg-bg-2 px-3 py-3 space-y-1.5">
                      <p className="text-xs font-medium text-text-2">No transactions yet</p>
                      <p className="text-[11px] text-text-3 leading-relaxed">
                        Add transactions using{' '}
                        <span className="font-semibold text-text">
                          {card.meta?.linkedPaymentMethod ?? card.name}
                        </span>{' '}
                        as the payment method to start tracking spend, outstanding balance, and statements.
                      </p>
                    </div>
                  )}

                  {/* Month navigator — browse historical monthly spend with full stats */}
                  {(() => {
                    const moLabel = new Date(cardMo + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

                    return (
                      <div className="bg-bg-2 rounded-lg p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => shiftCardMonth(card.name, -1)}
                            className="p-0.5 text-text-3 hover:text-text transition-colors" aria-label="Previous month">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-center">
                            <p className="text-[10px] text-text-3">{moLabel}</p>
                            <p className={`text-sm font-semibold ${activeCard.monthlySpend > 0 ? 'text-expense' : 'text-text-3'}`}>
                              {formatCurrency(activeCard.monthlySpend)}
                            </p>
                          </div>
                          <button type="button" onClick={() => shiftCardMonth(card.name, 1)}
                            disabled={offset >= 0}
                            className="p-0.5 text-text-3 hover:text-text transition-colors disabled:opacity-30" aria-label="Next month">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Show current month label if browsing historical data */}
                  {offset !== 0 && (
                    <div className="bg-bg-3 rounded-lg px-2 py-1 text-center">
                      <p className="text-[9px] text-text-3 uppercase tracking-wider">Viewing Historical Data</p>
                      <p className="text-[10px] text-accent font-medium">{new Date(cardMo + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}

                  {activeCard.paymentStatus && (
                    <div className="flex items-center justify-between">
                      <PaymentStatusBadge status={activeCard.paymentStatus} />
                      {activeCard.daysUntilDue !== null && activeCard.paymentStatus !== 'paid' && activeCard.paymentStatus !== 'no_payment_due' && (
                        <span className={`text-[10px] ${
                          activeCard.daysUntilDue < 0 ? 'text-expense font-medium' :
                          activeCard.daysUntilDue <= 7 ? 'text-warning' : 'text-text-3'
                        }`}>
                          {activeCard.daysUntilDue < 0
                            ? `${Math.abs(activeCard.daysUntilDue)}d overdue`
                            : `${activeCard.daysUntilDue}d left`}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="col-span-2">
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">Outstanding</p>
                      <p className={`text-base font-bold ${
                        activeCard.outstandingBalance > 0 ? 'text-expense' : 'text-income'
                      }`}>
                        {formatCurrency(activeCard.outstandingBalance)}
                      </p>
                    </div>
                    {activeCard.cycleEnd && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-text-3 uppercase tracking-wider">Statement</p>
                        <p className="text-sm font-semibold text-text">
                          {formatCurrency(activeCard.statementBalance)}
                          <span className="text-[10px] text-text-3 font-normal ml-1">
                            (closed {dateLabel(activeCard.cycleEnd)})
                          </span>
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">{offset === 0 ? monthLabel(currentMonth) : 'Month'}</p>
                      <p className="text-sm font-semibold text-expense">{formatCurrency(activeCard.monthlySpend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">This Year</p>
                      <p className="text-sm font-semibold text-text">{formatCurrency(activeCard.yearlySpend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">Lifetime</p>
                      <p className="text-sm font-medium text-text-2">{formatCurrency(activeCard.lifetimeSpend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">Purchases</p>
                      <p className="text-sm font-medium text-text-2">{activeCard.txnCount}</p>
                    </div>
                    {activeCard.lifetimeCashback > 0 && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-text-3 uppercase tracking-wider">Cashback Earned</p>
                        <p className="text-sm font-semibold text-income">
                          {formatCurrency(activeCard.lifetimeCashback)}
                          {activeCard.lifetimeSpend > 0 && (
                            <span className="text-[10px] text-text-3 font-normal ml-1">
                              ({((activeCard.lifetimeCashback / activeCard.lifetimeSpend) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {activeCard.lastTxnDate && (
                    <p className="text-[11px] text-text-3">Last used: {dateLabel(activeCard.lastTxnDate)}</p>
                  )}

                  {activeCard.meta && (() => {
                    const util = computeUtilization(activeCard.outstandingBalance, activeCard.meta.limit);
                    const bandColor = {
                      healthy: 'bg-income',
                      moderate: 'bg-warning',
                      high: 'bg-expense',
                      critical: 'bg-expense',
                    } as const;
                    const bandText = {
                      healthy: 'text-income',
                      moderate: 'text-warning',
                      high: 'text-expense',
                      critical: 'text-expense',
                    } as const;
                    return (
                      <div className="pt-1 border-t border-card-border/50 space-y-1.5">
                        {/* Bill / due info */}
                        {offset === 0 && activeCard.meta.billDate && (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[11px] text-text-3">
                              <Calendar className="w-3 h-3" />
                              Bill in {daysUntil(activeCard.meta.billDate)} {daysUntil(activeCard.meta.billDate) === 1 ? 'day' : 'days'}
                            </span>
                            {activeCard.nextDueDate && dateLabel(activeCard.nextDueDate) && (
                              <span className={`flex items-center gap-1 text-[11px] font-medium ${
                                activeCard.paymentStatus === 'paid' || activeCard.paymentStatus === 'no_payment_due'
                                  ? 'text-text-3'
                                  : activeCard.daysUntilDue !== null && activeCard.daysUntilDue < 0
                                  ? 'text-expense'
                                  : 'text-warning'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                Due {dateLabel(activeCard.nextDueDate)}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Monthly interest estimate — only when rate configured and balance > 0 */}
                        {activeCard.meta.interestRateAnnual && activeCard.outstandingBalance > 0 && (() => {
                          const monthlyInterest = Math.round(
                            activeCard.outstandingBalance * (activeCard.meta.interestRateAnnual / 12 / 100)
                          );
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-text-3">
                                Est. monthly interest ({activeCard.meta.interestRateAnnual}% APR)
                              </span>
                              <span className="text-[11px] font-semibold text-expense">
                                {formatCurrency(monthlyInterest)}/mo
                              </span>
                            </div>
                          );
                        })()}
                        {/* Utilization */}
                        {util ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-text-3 uppercase tracking-wider">Utilization</span>
                              <span className={`text-[11px] font-semibold ${bandText[util.band]}`}>
                                {util.pct > 100 ? `${Math.round(util.pct)}%+` : `${Math.round(util.pct)}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-bg-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${bandColor[util.band]}`}
                                style={{ width: `${util.barPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-text-3">
                              <span>{formatCurrency(activeCard.outstandingBalance)}</span>
                              <span>of {formatCurrency(activeCard.meta.limit!)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-text-3">Limit not configured</p>
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    // 6-month spend sparkline — oldest→newest so trend reads left-to-right
                    const months6 = last6Months().reverse(); // ['2025-12',...,'2026-05']
                    const nameLowerSpark = card.name.toLowerCase();
                    const spendSeries = months6.map(mo =>
                      (allTxns ?? [])
                        .filter(t =>
                          t.paymentMethod?.toLowerCase() === nameLowerSpark &&
                          t.type === 'expense' &&
                          t.date.startsWith(mo)
                        )
                        .reduce((s, t) => s + t.amount, 0)
                    );
                    // Only render if at least 1 month has spend
                    const nonZeroMonths = spendSeries.filter(v => v > 0).length;
                    if (nonZeroMonths < 1) return null;

                    const firstLabel = new Date(months6[0] + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short' });
                    const lastLabel  = new Date(months6[5] + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short' });

                    return (
                      <div className="pt-2 border-t border-card-border/30 space-y-1">
                        <p className="text-[9px] text-text-3 uppercase tracking-wider">6-Month Trend</p>
                        <SparklineChart
                          data={spendSeries}
                          color={accentColor}
                          height="36px"
                          width="100%"
                        />
                        <div className="flex justify-between text-[9px] text-text-3">
                          <span>{firstLabel}</span>
                          <span>{lastLabel}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* Card Spend Comparison — hover to expand (smooth), click chart to pin open */}
      {comparisonData && (
        <div
          className="bg-card border border-card-border rounded-xl overflow-hidden"
          onMouseEnter={() => setComparisonHovered(true)}
          onMouseLeave={() => setComparisonHovered(false)}
        >
          {/* Summary strip — always visible */}
          <div className="px-4 py-3 bg-bg-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-text-3" />
                <span className="text-xs font-semibold text-text uppercase tracking-wider">
                  Card Spend Comparison
                </span>
                <span className="text-xs text-text-3 bg-bg-3 px-2 py-0.5 rounded-full">
                  Last 6 months
                </span>
                <span
                  className={`text-[11px] text-text-3 ml-2 hidden sm:inline transition-opacity duration-300 ${
                    comparisonExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  Hover to preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                {comparisonPinned && (
                  <button
                    type="button"
                    onClick={() => setComparisonPinned(false)}
                    className="text-[11px] text-accent hover:text-accent/80 font-medium transition-colors px-2 py-0.5 rounded-lg hover:bg-accent/10"
                  >
                    Unpin
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-text-3 transition-transform duration-500 ease-in-out ${
                    comparisonExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Chart body — always mounted, animated via max-height + opacity */}
          <div
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{
              maxHeight: comparisonExpanded ? '320px' : '0px',
              opacity: comparisonExpanded ? 1 : 0,
            }}
          >
            {/* separator fades in with content */}
            <div className="border-t border-card-border/60" />
            <div
              className="p-4 cursor-pointer"
              onClick={() => setComparisonPinned(true)}
              title={comparisonPinned ? '' : 'Click to keep chart open'}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setComparisonPinned(true); }}
              aria-label="Card spend comparison chart. Click to pin open."
            >
              <BarChart
                labels={comparisonData.monthLabels}
                datasets={comparisonData.datasets}
                height="220px"
                aria-label="Cross-card monthly spend comparison"
              />
              {!comparisonPinned && (
                <p className="text-[10px] text-text-3 text-center mt-2 transition-opacity duration-300">
                  Click chart to keep it open
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archived Cards */}
      {(archivedCards ?? []).length > 0 && (
        <div className="border border-card-border/50 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowArchived(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg-2 hover:bg-bg-3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-text-3" />
              <span className="text-sm font-medium text-text-2">Archived Cards</span>
              <span className="text-[11px] text-text-3">{(archivedCards ?? []).length} card{(archivedCards ?? []).length !== 1 ? 's' : ''}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-3 transition-transform duration-200 ${showArchived ? 'rotate-180' : ''}`} />
          </button>
          {showArchived && (
            <div className="divide-y divide-card-border/40">
              {(archivedCards ?? []).map(card => (
                <div key={card.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color ?? '#7c6ff7' }} />
                    <div>
                      <p className="text-sm font-medium text-text-2">{card.name}</p>
                      <p className="text-[11px] text-text-3">Bill: {card.billDate}th · Due: {card.dueDate}th{card.limit ? ` · Limit: ${formatCurrency(card.limit)}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => restore.mutate(card.id)}
                      title="Restore card"
                    >
                      Restore
                    </Button>
                    <Button variant="icon" size="sm"
                      onClick={() => del.mutate(card.id)}
                      aria-label="Permanently delete"
                      title="Permanently delete — cannot be undone"
                    >
                      <span className="text-expense text-xs">✕</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Statements — hover to expand per card, hover to expand per year */}
      {cardStats.some(c => c.meta?.billDate && (c.meta?.duePeriod || c.meta?.dueDate)) && (
        <SectionCard title="Statement History">
          <div className="space-y-3">
            {cardStats.filter(c => c.meta?.billDate && (c.meta?.duePeriod || c.meta?.dueDate)).map(card => {
              const nameLower = card.name.toLowerCase();
              const cardTxns = (allTxns ?? []).filter(
                t => t.paymentMethod?.toLowerCase() === nameLower
              );
              const allStatements = computeMonthlyStatements(
                card.meta!.billDate,
                card.meta!.duePeriod,
                cardTxns,
                card.meta!.dueDate
              );
              // allStatements[0] is the live current cycle — already shown on the card grid.
              // Slice it off for the history view to avoid duplication. CSV export
              // (below) still includes all statements so nothing is lost.
              const historicalStatements = allStatements.slice(1);
              const yearGroups = groupStatementsByYear(historicalStatements);
              const cardExpanded = isCardExpanded(card.name);
              const cardPinned   = pinnedStatements.has(card.name);
              const accentColor  = card.meta?.color ?? '#7c6ff7';
              // Generous ceiling so multi-year expanded history never clips.
              // Same approach as AttentionCenter — actual rendered height drives
              // the visual, not the ceiling value.
              const cardBodyMaxH = 2000;

              return (
                <div
                  key={card.name}
                  className="border border-card-border rounded-xl overflow-hidden"
                  onMouseEnter={() => setHoveredStatement(card.name)}
                  onMouseLeave={() => setHoveredStatement(null)}
                >
                  {/* Card header — always visible */}
                  <div className="w-full flex items-center gap-2.5 px-4 py-3 bg-bg-2 text-left">
                    {/* Clickable title area — toggles pin */}
                    <button
                      type="button"
                      onClick={() => toggleStatementPin(card.name)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                      <span className="text-sm font-semibold text-text">{card.meta?.name ?? card.name}</span>
                      <span className="text-[11px] text-text-3">
                        Bill: {card.meta!.billDate}th
                        {card.meta!.duePeriod ? ` · Due: ${card.meta!.duePeriod}d after` : ''}
                      </span>
                      <span className="text-[11px] text-text-3 ml-auto">{yearGroups.length} year{yearGroups.length !== 1 ? 's' : ''}</span>
                    </button>
                    {allStatements.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const csv = statementsToCSV(allStatements);
                          const safeName = (card.meta?.name ?? card.name).replace(/[^a-z0-9]/gi, '_');
                          downloadCSV(csv, `${safeName}_statements.csv`);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-3 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors flex-shrink-0"
                        title="Export statement history as CSV"
                        aria-label="Export statement history as CSV"
                      >
                        <Download className="w-3 h-3" />
                        CSV
                      </button>
                    )}
                    {cardPinned && (
                      <button
                        type="button"
                        onClick={() => toggleStatementPin(card.name)}
                        className="text-[11px] text-accent hover:text-accent/80 font-medium transition-colors px-2 py-0.5 rounded-lg hover:bg-accent/10 flex-shrink-0"
                      >
                        Unpin
                      </button>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-text-3 transition-transform duration-500 ease-in-out flex-shrink-0 ${
                        cardExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {/* Card body — always mounted, animated */}
                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{
                      maxHeight: cardExpanded ? `${cardBodyMaxH}px` : '0px',
                      opacity: cardExpanded ? 1 : 0,
                    }}
                    onClick={() => toggleStatementPin(card.name)}
                    role="region"
                    aria-label={`Statement history for ${card.meta?.name ?? card.name}`}
                  >
                    <div className="border-t border-card-border/60" />
                    <div className="divide-y divide-card-border/40">
                      {yearGroups.length === 0 ? (
                        <p className="px-4 py-4 text-xs text-text-3 text-center">No statement history yet</p>
                      ) : (
                        yearGroups.map(({ year, statements }) => {
                          const yearExp     = isYearExpanded(card.name, year);
                          const yearPinned  = pinnedYears.get(card.name)?.has(year) ?? false;
                          const yearTotal   = statements.reduce((s, st) => s + st.purchases, 0);
                          const yearPaid    = statements.filter(s => s.status === 'paid' || s.status === 'no_payment_due').length;
                          // Each row ~44px + column header 30px
                          const yearBodyMaxH = statements.length * 44 + 30;

                          return (
                            <div key={year}
                              onMouseEnter={(e) => { e.stopPropagation(); setHoveredYear({ card: card.name, year }); }}
                              onMouseLeave={(e) => { e.stopPropagation(); setHoveredYear(null); }}
                            >
                              {/* Year row — click toggles pin */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleYearPin(card.name, year); }}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-2/60 hover:bg-bg-3 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 text-text-3 transition-transform duration-500 ease-in-out ${
                                      yearExp ? 'rotate-90' : ''
                                    }`}
                                  />
                                  <span className="text-xs font-semibold text-text-2">{year}</span>
                                  <span className="text-[11px] text-text-3">{statements.length} statement{statements.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px]">
                                  {yearPinned && (
                                    <span className="text-[10px] text-accent font-medium">Pinned</span>
                                  )}
                                  <span className="text-text-3">{yearPaid}/{statements.length} paid</span>
                                  <span className="text-expense font-medium">{formatCurrency(yearTotal)}</span>
                                </div>
                              </button>

                              {/* Year body — always mounted, animated */}
                              <div
                                className="overflow-hidden transition-all duration-500 ease-in-out"
                                style={{
                                  maxHeight: yearExp ? `${yearBodyMaxH}px` : '0px',
                                  opacity: yearExp ? 1 : 0,
                                }}
                              >
                                <div className="divide-y divide-card-border/30">
                                  {/* Column headers */}
                                  <div className="grid grid-cols-6 gap-2 px-6 py-1.5 bg-bg-2/30">
                                    {['Month', 'Cycle', 'Due Date', 'Purchases', 'Paid', 'Status'].map(h => (
                                      <p key={h} className="text-[9px] font-semibold text-text-3 uppercase tracking-wider">{h}</p>
                                    ))}
                                  </div>
                                  {statements.map((s, i) => (
                                    <div key={i} className="grid grid-cols-6 gap-2 px-6 py-2.5 hover:bg-bg-3/40 transition-colors">
                                      <p className="text-xs font-medium text-text">{s.monthLabel}</p>
                                      <p className="text-[11px] text-text-3">{dateLabel(s.cycleStart)} → {dateLabel(s.cycleEnd)}</p>
                                      <p className="text-[11px] text-text-2">{dateLabel(s.dueDate)}</p>
                                      <p className="text-xs font-medium text-expense">{formatCurrency(s.purchases)}</p>
                                      <p className="text-xs font-medium text-income">{formatCurrency(s.paymentsAfterCycle)}</p>
                                      <div>
                                        {s.status ? (
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                                            s.status === 'paid' ? 'bg-income/15 text-income' :
                                            s.status === 'no_payment_due' ? 'bg-bg-3 text-text-3' :
                                            s.status === 'overdue' ? 'bg-expense/15 text-expense' :
                                            'bg-warning/15 text-warning'
                                          }`}>
                                            {s.status === 'no_payment_due' ? 'No Due' :
                                             s.status === 'partially_paid' ? 'Partial' :
                                             s.status === 'due_soon' ? 'Due Soon' :
                                             s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                          </span>
                                        ) : <span className="text-[10px] text-text-3">—</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Configure Cards Modal */}
      <ConfigureCardsModal
        open={configureOpen}
        onClose={() => setConfigureOpen(false)}
        cards={cardStats}
      />

      <ConfirmDialog
        open={!!deleteCard}
        onClose={() => setDeleteCard(undefined)}
        onConfirm={() => {
          if (deleteCard) archive.mutate(deleteCard.id, { onSuccess: () => setDeleteCard(undefined) });
        }}
        message={`Archive "${deleteCard?.name}"? The card will be hidden but all transaction history is preserved. You can restore it anytime.`}
        confirmLabel="Archive"
        loading={archive.isPending}
      />

      {/* Record Payment modal */}
      <Modal
        open={!!paymentCard}
        onClose={closePayment}
        title={`Record Payment — ${paymentCard?.name ?? ''}`}
        size="sm"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <Input
            label="Amount (₹)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder="0"
            min="1"
            step="any"
            required
            autoFocus
          />
          <Input
            label="Date"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            required
          />
          <Input
            label="Notes (optional)"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="e.g. Full payment, Minimum due..."
          />
          {/* Remaining-due hint — shows when a pre-filled amount exists */}
          {(() => {
            const card = cardStats.find(c => c.name === paymentCard?.name);
            const remaining = card?.remainingDue ?? 0;
            const minPct = card?.meta?.minimumPaymentPct;
            const minDue = minPct && card
              ? Math.max(200, card.outstandingBalance * (minPct / 100))
              : null;
            return (
              <>
                {remaining > 0 && Number(payAmount) !== remaining && (
                  <div className="flex items-center justify-between rounded-lg bg-bg-2 border border-card-border px-3 py-2">
                    <span className="text-[11px] text-text-3">
                      Remaining due: <span className="font-semibold text-expense">{formatCurrency(remaining)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(remaining))}
                      className="text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      Use this amount
                    </button>
                  </div>
                )}
                {minDue !== null && Number(payAmount) !== minDue && (
                  <div className="flex items-center justify-between rounded-lg bg-bg-2 border border-card-border px-3 py-2">
                    <span className="text-[11px] text-text-3">
                      Min. due ({minPct}%): <span className="font-semibold text-warning">{formatCurrency(minDue)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round(minDue)))}
                      className="text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      Use this amount
                    </button>
                  </div>
                )}
              </>
            );
          })()}
          <p className="text-[11px] text-text-3">
            This records an income transaction on <span className="font-medium text-text-2">{paymentCard?.paymentMethod}</span> and reduces the outstanding balance.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={closePayment}>Cancel</Button>
            <Button type="submit" loading={recordPayment.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Card Details Drawer */}
      {detailCardName && (() => {
        // detailCard is derived live from cardStats — always up to date
        if (!detailCard) return null; // card removed while drawer was open

        const nameLower = detailCard.name.toLowerCase();
        // All transactions for this card, newest first
        const cardTxns = (allTxns ?? [])
          .filter((t) => t.paymentMethod?.toLowerCase() === nameLower)
          .sort((a, b) => b.date.localeCompare(a.date));
        const totalPurchases = cardTxns
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);
        const totalPayments = cardTxns
          .filter((t) => t.type === 'income')
          .reduce((s, t) => s + t.amount, 0);
        const util = computeUtilization(detailCard.outstandingBalance, detailCard.meta?.limit);
        const bandColor = { healthy: 'bg-income', moderate: 'bg-warning', high: 'bg-expense', critical: 'bg-expense' } as const;
        const bandText = { healthy: 'text-income', moderate: 'text-warning', high: 'text-expense', critical: 'text-expense' } as const;
        const accentColor = detailCard.meta?.color ?? '#7c6ff7';
        const visibleTxns = cardTxns.slice(0, drawerVisibleCount);
        const hasMore = cardTxns.length > drawerVisibleCount;

        return (
          <Drawer
            open
            onClose={() => setDetailCardName(undefined)}
            title={detailCard.meta?.name ?? detailCard.name}
          >
            <div className="space-y-5">
              {/* Color accent */}
              <div className="w-full h-1 rounded-full" style={{ backgroundColor: accentColor }} />

              {/* Outstanding + utilization */}
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-wider">Outstanding Balance</p>
                  <p className={`text-2xl font-bold ${
                    detailCard.outstandingBalance > 0 ? 'text-expense' : 'text-income'
                  }`}>
                    {formatCurrency(detailCard.outstandingBalance)}
                  </p>
                </div>
                {util ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-3 uppercase tracking-wider">Utilization</span>
                      <span className={`text-xs font-semibold ${bandText[util.band]}`}>
                        {util.pct > 100 ? `${Math.round(util.pct)}%+` : `${Math.round(util.pct)}%`}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-bg-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${bandColor[util.band]}`}
                        style={{ width: `${util.barPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-3">
                      <span>{formatCurrency(detailCard.outstandingBalance)}</span>
                      <span>of {formatCurrency(detailCard.meta!.limit!)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-text-3">Credit limit not configured</p>
                )}
              </div>

              {/* Category breakdown — derived from expense transactions on this card */}
              {(() => {
                const expenseTxns = cardTxns.filter((t) => t.type === 'expense');
                if (expenseTxns.length === 0) return null;

                // Group by category, sum amounts
                const catMap = expenseTxns.reduce<Record<string, number>>((acc, t) => {
                  const cat = t.category || 'Uncategorized';
                  acc[cat] = (acc[cat] ?? 0) + t.amount;
                  return acc;
                }, {});

                // Sort descending, keep top 6, roll rest into "Other"
                const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
                const TOP_N = 6;
                const top = sorted.slice(0, TOP_N);
                const otherTotal = sorted.slice(TOP_N).reduce((s, [, v]) => s + v, 0);
                if (otherTotal > 0) top.push(['Other', otherTotal]);

                const segments: DoughnutSegment[] = top.map(([label, value], i) => ({
                  label,
                  value,
                  color: categoryColor(i),
                }));

                const legendItems: LegendItem[] = top.map(([label, value], i) => ({
                  color: categoryColor(i),
                  label,
                  value: formatCurrency(value),
                }));

                const total = expenseTxns.reduce((s, t) => s + t.amount, 0);

                return (
                  <div className="space-y-3 pt-1 border-t border-card-border/50">
                    <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Spend by Category</p>
                    <CategoryDoughnut
                      segments={segments}
                      height="180px"
                      centerLabel="Total"
                      centerValue={formatCurrency(total)}
                      aria-label={`Category breakdown for ${detailCard.meta?.name ?? detailCard.name}`}
                    />
                    <ChartLegend items={legendItems} />
                  </div>
                );
              })()}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-card-border/50">
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-wider">{monthLabel(currentMonth)}</p>
                  <p className="text-sm font-semibold text-expense">{formatCurrency(detailCard.monthlySpend)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-wider">This Year</p>
                  <p className="text-sm font-semibold text-text">{formatCurrency(detailCard.yearlySpend)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-wider">Lifetime Spend</p>
                  <p className="text-sm font-medium text-text-2">{formatCurrency(detailCard.lifetimeSpend)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-wider">Transactions</p>
                  <p className="text-sm font-medium text-text-2">{detailCard.txnCount}</p>
                </div>
              </div>

              {/* Cashback Summary */}
              {detailCard.lifetimeCashback > 0 && (
                <div className="space-y-2 pt-1 border-t border-card-border/50">
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Cashback Earned</p>
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-bg-2 border border-card-border">
                    <div className="text-center">
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">{monthLabel(currentMonth)}</p>
                      <p className="text-xs font-semibold text-income">{formatCurrency(detailCard.monthlyCashback)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">This Year</p>
                      <p className="text-xs font-semibold text-income">{formatCurrency(detailCard.yearlyCashback)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-text-3 uppercase tracking-wider">Lifetime</p>
                      <p className="text-xs font-semibold text-income">{formatCurrency(detailCard.lifetimeCashback)}</p>
                    </div>
                  </div>
                  {detailCard.lifetimeSpend > 0 && (
                    <p className="text-[11px] text-text-3">
                      Effective rate: {((detailCard.lifetimeCashback / detailCard.lifetimeSpend) * 100).toFixed(2)}% of lifetime spend
                    </p>
                  )}
                </div>
              )}

              {/* Lifetime summary + Billing Cycle — merged to avoid the two look-alike
                  3-column grids that previously appeared back-to-back */}
              <div className="space-y-2 pt-1 border-t border-card-border/50">
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Spend Summary</p>

                {/* Lifetime row */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-bg-2 border border-card-border">
                  <div className="text-center">
                    <p className="text-[10px] text-text-3 uppercase tracking-wider">Lifetime Spend</p>
                    <p className="text-xs font-semibold text-expense">{formatCurrency(totalPurchases)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-text-3 uppercase tracking-wider">Total Paid</p>
                    <p className="text-xs font-semibold text-income">{formatCurrency(totalPayments)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-text-3 uppercase tracking-wider">Outstanding</p>
                    <p className={`text-xs font-semibold ${
                      detailCard.outstandingBalance > 0 ? 'text-expense' : 'text-income'
                    }`}>{formatCurrency(detailCard.outstandingBalance)}</p>
                  </div>
                </div>

                {/* Current billing cycle */}
                {detailCard.cycleStart && detailCard.cycleEnd && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Current Cycle</p>
                      <span className="text-[11px] text-text-3">
                        {dateLabel(detailCard.cycleStart)} → {dateLabel(detailCard.cycleEnd)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-bg-2 border border-card-border">
                      <div className="text-center">
                        <p className="text-[10px] text-text-3 uppercase tracking-wider">Purchases</p>
                        <p className="text-xs font-semibold text-expense">{formatCurrency(detailCard.cyclePurchases)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-3 uppercase tracking-wider">Payments</p>
                        <p className="text-xs font-semibold text-income">{formatCurrency(detailCard.cyclePayments)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-3 uppercase tracking-wider">Statement</p>
                        <p className={`text-xs font-semibold ${
                          detailCard.statementBalance > 0 ? 'text-expense' : 'text-income'
                        }`}>{formatCurrency(detailCard.statementBalance)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Status */}
              {detailCard.paymentStatus && (
                <div className="space-y-2 pt-1 border-t border-card-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">Payment Status</p>
                    <PaymentStatusBadge status={detailCard.paymentStatus} />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-3">Statement Balance</span>
                      <span className="font-medium text-text">{formatCurrency(detailCard.statementBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-3">Payments Applied</span>
                      <span className="font-medium text-income">-{formatCurrency(detailCard.paymentsAfterCycle)}</span>
                    </div>
                    <div className="flex justify-between border-t border-card-border/50 pt-1">
                      <span className="text-text-3">Remaining Due</span>
                      <span className={`font-semibold ${
                        detailCard.remainingDue > 0 ? 'text-expense' : 'text-income'
                      }`}>{formatCurrency(detailCard.remainingDue)}</span>
                    </div>
                    {detailCard.meta?.minimumPaymentPct && (() => {
                      const minDue = Math.max(
                        200,
                        detailCard.outstandingBalance * (detailCard.meta.minimumPaymentPct / 100)
                      );
                      return (
                        <div className="flex justify-between">
                          <span className="text-text-3">Min. Payment ({detailCard.meta.minimumPaymentPct}%)</span>
                          <span className="font-medium text-warning">{formatCurrency(Math.round(minDue))}</span>
                        </div>
                      );
                    })()}
                    {detailCard.meta?.interestRateAnnual && detailCard.outstandingBalance > 0 && (() => {
                      const monthlyInterest = Math.round(
                        detailCard.outstandingBalance * (detailCard.meta.interestRateAnnual / 12 / 100)
                      );
                      return (
                        <div className="flex justify-between">
                          <span className="text-text-3">Est. Interest/Month ({detailCard.meta.interestRateAnnual}% APR)</span>
                          <span className="font-medium text-expense">{formatCurrency(monthlyInterest)}</span>
                        </div>
                      );
                    })()}
                    {detailCard.nextDueDate && (
                      <div className="flex justify-between">
                        <span className="text-text-3">Due Date</span>
                        <span className={`font-medium ${
                          detailCard.daysUntilDue !== null && detailCard.daysUntilDue < 0
                            ? 'text-expense'
                            : detailCard.daysUntilDue !== null && detailCard.daysUntilDue <= 7
                            ? 'text-warning'
                            : 'text-text'
                        }`}>
                          {dateLabel(detailCard.nextDueDate)}
                          {detailCard.daysUntilDue !== null && (
                            <span className="text-text-3 font-normal ml-1">
                              ({detailCard.daysUntilDue < 0
                                ? `${Math.abs(detailCard.daysUntilDue)}d overdue`
                                : detailCard.daysUntilDue === 0
                                ? 'today'
                                : `${detailCard.daysUntilDue}d`})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction list */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">
                  All Transactions ({cardTxns.length})
                </p>
                {cardTxns.length === 0 ? (
                  <p className="text-xs text-text-3 py-4 text-center">No transactions yet</p>
                ) : (
                  <div className="space-y-1">
                    {visibleTxns.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg-2 border border-card-border/50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text truncate">
                            {t.category || t.source || (
                              t.type === 'income'
                                ? (t.subtype === 'cashback' ? 'Cashback'
                                  : t.subtype === 'refund' ? 'Refund'
                                  : t.subtype === 'reimbursement' ? 'Reimbursement'
                                  : 'Payment')
                                : 'Purchase'
                            )}
                          </p>
                          <p className="text-[10px] text-text-3">
                            {dateLabel(t.date)}{t.notes ? ` · ${t.notes.split('\n')[0]}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold flex-shrink-0 ${
                          t.type === 'income' ? 'text-income' : 'text-expense'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setDrawerVisibleCount((n) => n + 50)}
                        className="w-full py-2 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        Show more ({cardTxns.length - drawerVisibleCount} remaining)
                      </button>
                    )}
                    {/* Deep link to Transactions page filtered to this card */}
                    <button
                      type="button"
                      onClick={() => {
                        // Set month to All so the full card history is visible
                        setMonth('');
                        router.push(
                          `/transactions?paymentMethod=${encodeURIComponent(detailCard.name)}`
                        );
                        setDetailCardName(undefined);
                      }}
                      className="w-full py-2.5 text-xs font-medium text-accent hover:text-accent/80 border-t border-card-border/40 transition-colors flex items-center justify-center gap-1.5"
                    >
                      View all in Transactions
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Drawer>
        );
      })()}
    </div>
  );
}
