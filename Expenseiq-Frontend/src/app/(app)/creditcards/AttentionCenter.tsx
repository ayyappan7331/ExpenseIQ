'use client';

import { useState } from 'react';
import { ChevronDown, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '@/components/charts';
import { Button } from '@/components/ui';
import { dateLabel } from '@/lib/utils/dates';
import type { CardStats, PaymentStatus } from './helpers';

interface AttentionCenterProps {
  cards: CardStats[];
  onRecordPayment: (cardName: string, paymentMethod: string) => void;
}

// Priority order for sorting attention items
const STATUS_PRIORITY: Record<PaymentStatus, number> = {
  overdue:        0,
  due_soon:       1,
  partially_paid: 2,
  upcoming:       3,
  paid:           4,
  no_payment_due: 5,
};

const STATUS_LABEL: Partial<Record<PaymentStatus, string>> = {
  overdue:        'Overdue',
  due_soon:       'Due Soon',
  partially_paid: 'Partially Paid',
};

// Border accent per status — uses existing theme tokens, no aggressive colors
const STATUS_RING: Partial<Record<PaymentStatus, string>> = {
  overdue:        'border-l-4 border-l-expense/50',
  due_soon:       'border-l-4 border-l-warning/50',
  partially_paid: 'border-l-4 border-l-card-border',
};

// Inactive threshold — cards unused for this many days with outstanding balance
const INACTIVE_DAYS = 60;

export function AttentionCenter({ cards, onRecordPayment }: AttentionCenterProps) {
  // Collapsed by default — expands on hover, pins open on click (same
  // pattern as Statement History and Card Spend Comparison on this screen)
  const [isPinned,  setIsPinned]  = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isHovered || isPinned;
  
  // Only cards with an actionable status (excludes upcoming / paid / no_payment_due / null)
  const actionable = cards
    .filter((c): c is CardStats & { paymentStatus: 'overdue' | 'due_soon' | 'partially_paid' } =>
      c.paymentStatus === 'overdue' ||
      c.paymentStatus === 'due_soon' ||
      c.paymentStatus === 'partially_paid'
    )
    .sort((a, b) => STATUS_PRIORITY[a.paymentStatus] - STATUS_PRIORITY[b.paymentStatus]);

  // Additional attention items
  // Cards already in the actionable list (overdue/due_soon/partially_paid) are
  // excluded from highUtilization to prevent the same card appearing twice.
  const actionableNames = new Set(actionable.map((c) => c.name));
  const highUtilizationCards = cards.filter(c => {
    if (!c.meta?.limit) return false;
    if (actionableNames.has(c.name)) return false; // already surfaced above — don't repeat
    const utilization = (c.outstandingBalance / c.meta.limit) * 100;
    return utilization >= 75;
  });
  
  const noPaymentMethodCards = cards.filter(c => !c.meta);
  const unconfiguredCards = cards.filter(c => c.meta && (!c.meta.billDate || (!c.meta.duePeriod && !c.meta.dueDate)));

  // Cards unused for 60+ days that still carry an outstanding balance.
  const nowMs = new Date().getTime();
  const inactiveCards = cards.filter(c => {
    if (!c.lastTxnDate || c.outstandingBalance <= 0) return false;
    if (!c.meta || !c.meta.billDate || (!c.meta.duePeriod && !c.meta.dueDate)) return false;
    const daysSince = Math.floor(
      (nowMs - new Date(c.lastTxnDate + 'T00:00:00').getTime()) / 86_400_000
    );
    return daysSince >= INACTIVE_DAYS;
  });

  // Nothing to surface
  if (
    actionable.length === 0 &&
    highUtilizationCards.length === 0 &&
    noPaymentMethodCards.length === 0 &&
    unconfiguredCards.length === 0 &&
    inactiveCards.length === 0
  ) return null;

  // Summary strip counts
  const overdueCt       = actionable.filter((c) => c.paymentStatus === 'overdue').length;
  const dueSoonCt       = actionable.filter((c) => c.paymentStatus === 'due_soon').length;
  const partiallyPaidCt = actionable.filter((c) => c.paymentStatus === 'partially_paid').length;
  const highUtilCt      = highUtilizationCards.length;
  const unconfiguredCt  = noPaymentMethodCards.length + unconfiguredCards.length;
  const inactiveCt      = inactiveCards.length;

  // Large enough to accommodate any realistic number of attention items (each ~72px).
  // Using a fixed generous ceiling (2000px) rather than a calculated estimate —
  // calculation-based approaches always risk clipping when rows wrap on narrow screens.
  // CSS transition works fine with a large ceiling; the perceived animation speed
  // is driven by the actual rendered height, not the ceiling value.
  const BODY_MAX_HEIGHT = 2000;

  const totalItems = actionable.length + highUtilizationCards.length + noPaymentMethodCards.length + unconfiguredCards.length + inactiveCards.length;

  return (
    <div
      className="bg-card border border-card-border rounded-xl overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Summary strip — always visible */}
      <div className="px-4 py-3 bg-bg-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold text-text uppercase tracking-wider">
                Attention Required
              </span>
              <span className="text-xs text-text-3 bg-bg-3 px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
              <span
                className={`text-[11px] text-text-3 ml-1 hidden sm:inline transition-opacity duration-300 ${
                  isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                Hover to expand
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {overdueCt > 0 && <span className="text-xs text-expense font-medium">Overdue: {overdueCt}</span>}
              {dueSoonCt > 0 && <span className="text-xs text-warning font-medium">Due Soon: {dueSoonCt}</span>}
              {partiallyPaidCt > 0 && <span className="text-xs text-text-2 font-medium">Partially Paid: {partiallyPaidCt}</span>}
              {highUtilCt > 0 && <span className="text-xs text-expense font-medium">High Utilization: {highUtilCt}</span>}
              {inactiveCt > 0 && <span className="text-xs text-text-3 font-medium">Inactive: {inactiveCt}</span>}
              {unconfiguredCt > 0 && <span className="text-xs text-text-3 font-medium">Setup Required: {unconfiguredCt}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPinned && (
              <button
                type="button"
                onClick={() => setIsPinned(false)}
                className="text-[11px] text-accent hover:text-accent/80 font-medium transition-colors px-2 py-0.5 rounded-lg hover:bg-accent/10"
              >
                Unpin
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-text-3 transition-transform duration-500 ease-in-out ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Body — always mounted, animated via max-height + opacity */}
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: isExpanded ? `${BODY_MAX_HEIGHT}px` : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
        onClick={() => setIsPinned(true)}
        role="region"
        aria-label="Attention items"
      >
        <div className="border-t border-card-border/60" />
        <div className="divide-y divide-card-border/50">
          {/* Payment-related items */}
          {actionable.map((card) => {
            const statusLabel = STATUS_LABEL[card.paymentStatus];
            const ringClass   = STATUS_RING[card.paymentStatus] ?? '';

            const dueLine =
              card.daysUntilDue !== null && card.daysUntilDue < 0
                ? `Overdue by ${Math.abs(card.daysUntilDue)} day${Math.abs(card.daysUntilDue) !== 1 ? 's' : ''}`
                : card.daysUntilDue === 0
                ? 'Due today'
                : card.daysUntilDue !== null
                ? `Due in ${card.daysUntilDue} day${card.daysUntilDue !== 1 ? 's' : ''}`
                : null;

            return (
              <div
                key={`payment-${card.name}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${ringClass}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text truncate">
                      {card.meta?.name ?? card.name}
                    </span>
                    {statusLabel && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        card.paymentStatus === 'overdue'
                          ? 'text-expense bg-expense/10'
                          : card.paymentStatus === 'due_soon'
                          ? 'text-warning bg-warning/10'
                          : 'text-text-2 bg-bg-3'
                      }`}>
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {dueLine && (
                      <span className={`text-xs ${
                        card.paymentStatus === 'overdue' ? 'text-expense font-medium' : 'text-text-3'
                      }`}>
                        {dueLine}
                        {card.nextDueDate ? ` · ${dateLabel(card.nextDueDate)}` : ''}
                      </span>
                    )}
                    <span className={`text-xs font-semibold ${
                      card.remainingDue > 0 ? 'text-expense' : 'text-income'
                    }`}>
                      {formatCurrency(card.remainingDue)} remaining
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onRecordPayment(card.name, card.name); }}
                >
                  Record Payment
                </Button>
              </div>
            );
          })}

          {/* High utilization items */}
          {highUtilizationCards.map((card) => {
            const utilization = card.meta?.limit ? (card.outstandingBalance / card.meta.limit) * 100 : 0;
            return (
              <div
                key={`util-${card.name}`}
                className="flex items-center justify-between gap-3 px-4 py-3 border-l-4 border-l-expense/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text truncate">{card.meta?.name ?? card.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-expense bg-expense/10">
                      High Utilization
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-expense font-medium">{utilization.toFixed(1)}% utilization</span>
                    <span className="text-xs text-text-3">{formatCurrency(card.outstandingBalance)} of {formatCurrency(card.meta!.limit!)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-expense" />
                  <span className="text-xs text-text-3">Monitor spending</span>
                </div>
              </div>
            );
          })}

          {/* Inactive cards */}
          {inactiveCards.map((card) => {
            const nowMsRow = new Date().getTime();
            const daysSince = Math.floor(
              (nowMsRow - new Date(card.lastTxnDate! + 'T00:00:00').getTime()) / 86_400_000
            );
            return (
              <div
                key={`inactive-${card.name}`}
                className="flex items-center justify-between gap-3 px-4 py-3 border-l-4 border-l-text-3/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text truncate">{card.meta?.name ?? card.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-text-3 bg-bg-3">Inactive</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-text-3">Last used {daysSince}d ago · {dateLabel(card.lastTxnDate!)}</span>
                    <span className="text-xs font-semibold text-expense">{formatCurrency(card.outstandingBalance)} outstanding</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-4 h-4 text-text-3" />
                  <span className="text-xs text-text-3">Review balance</span>
                </div>
              </div>
            );
          })}

          {/* Unconfigured cards */}
          {noPaymentMethodCards.map((card) => (
            <div key={`nomethod-${card.name}`} className="flex items-center justify-between gap-3 px-4 py-3 border-l-4 border-l-card-border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text truncate">{card.name}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-text-3 bg-bg-3">No Details</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-3">Configure card details to enable tracking</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>Configure</Button>
            </div>
          ))}

          {unconfiguredCards.map((card) => (
            <div key={`unconfig-${card.name}`} className="flex items-center justify-between gap-3 px-4 py-3 border-l-4 border-l-warning/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text truncate">{card.meta?.name ?? card.name}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-warning bg-warning/10">Incomplete Setup</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-3">
                    {!card.meta?.billDate && 'Missing bill date'}
                    {card.meta?.billDate && !card.meta?.duePeriod && !card.meta?.dueDate && 'Missing due date'}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>Complete Setup</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
