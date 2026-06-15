'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { Check, Pencil, X } from 'lucide-react';
import { useUpdateCreditCard, useCreateCreditCard } from './mutations';
import type { CardStats } from './helpers';
import type { NewCreditCard } from '@/lib/types/api';
const PRESET_COLORS = [
  '#7c6ff7', // purple (default)
  '#38bdf8', // sky
  '#34d399', // emerald
  '#f472b6', // pink
  '#fb923c', // orange
  '#f92672', // red
  '#a6e22e', // lime
  '#fbbf24', // amber
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const isPreset = PRESET_COLORS.includes(value);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-text-3 uppercase tracking-wider">Card Color</label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); setShowCustom(false); }}
            className="w-6 h-6 rounded-full border-2 transition-all duration-150 flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: c,
              borderColor: value === c ? 'white' : 'transparent',
              boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
            }}
            aria-label={c}
          >
            {value === c && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>
        ))}
        {/* Custom swatch */}
        <button
          type="button"
          onClick={() => setShowCustom(v => !v)}
          className="w-6 h-6 rounded-full border-2 border-dashed border-card-border flex items-center justify-center text-text-3 hover:border-accent hover:text-accent transition-colors flex-shrink-0"
          title="Custom color"
          style={!isPreset ? { backgroundColor: value, borderColor: 'white', boxShadow: `0 0 0 2px ${value}` } : {}}
        >
          {!isPreset ? <Check className="w-3 h-3 text-white" strokeWidth={3} /> : <span className="text-[10px] font-bold">+</span>}
        </button>
        {showCustom && (
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-card-border"
            />
            <input
              type="text"
              value={value}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
              className="w-20 px-2 py-1 text-xs bg-bg-2 border border-card-border rounded-lg text-text font-mono focus:outline-none focus:ring-1 focus:ring-accent/40"
              placeholder="#7c6ff7"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface CardRowProps {
  card: CardStats;
  onSaved: () => void;
}

function CardRow({ card, onSaved }: CardRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(card.meta?.name ?? card.name);
  const [billDate, setBillDate] = useState(card.meta?.billDate ? String(card.meta.billDate) : '');
  const [duePeriod, setDuePeriod] = useState(card.meta?.duePeriod ? String(card.meta.duePeriod) : '');
  const [limit, setLimit] = useState(card.meta?.limit ? String(card.meta.limit) : '');
  const [minPayPct, setMinPayPct] = useState(card.meta?.minimumPaymentPct ? String(card.meta.minimumPaymentPct) : '');
  const [interestRate, setInterestRate] = useState(card.meta?.interestRateAnnual ? String(card.meta.interestRateAnnual) : '');
  const [openingBalance, setOpeningBalance] = useState(card.meta?.openingBalance ? String(card.meta.openingBalance) : '');
  const [color, setColor] = useState(card.meta?.color ?? '#7c6ff7');

  const update = useUpdateCreditCard();
  const create = useCreateCreditCard();
  const context = 'Personal';

  function openEdit() {
    setName(card.meta?.name ?? card.name);
    setBillDate(card.meta?.billDate ? String(card.meta.billDate) : '');
    setDuePeriod(card.meta?.duePeriod ? String(card.meta.duePeriod) : '');
    setLimit(card.meta?.limit ? String(card.meta.limit) : '');
    setMinPayPct(card.meta?.minimumPaymentPct ? String(card.meta.minimumPaymentPct) : '');
    setInterestRate(card.meta?.interestRateAnnual ? String(card.meta.interestRateAnnual) : '');
    setOpeningBalance(card.meta?.openingBalance ? String(card.meta.openingBalance) : '');
    setColor(card.meta?.color ?? '#7c6ff7');
    setEditing(true);
  }

  function handleSave() {
    if (!billDate || !duePeriod) return;
    const payload: Partial<NewCreditCard> = {
      name: name || card.name,
      billDate: Number(billDate),
      duePeriod: Number(duePeriod),
      limit: limit ? Number(limit) : undefined,
      minimumPaymentPct: minPayPct ? Number(minPayPct) : undefined,
      interestRateAnnual: interestRate ? Number(interestRate) : undefined,
      openingBalance: openingBalance ? Number(openingBalance) : 0,
      color,
      linkedPaymentMethod: card.name,
    };

    if (card.meta) {
      update.mutate(
        { id: card.meta.id, data: payload },
        { onSuccess: () => { setEditing(false); onSaved(); } }
      );
    } else {
      create.mutate(
        { ...payload, context, name: name || card.name, billDate: Number(billDate), duePeriod: Number(duePeriod) } as NewCreditCard,
        { onSuccess: () => { setEditing(false); onSaved(); } }
      );
    }
  }

  const accentColor = card.meta?.color ?? '#7c6ff7';
  const isPending = update.isPending || create.isPending;

  return (
    <div className="border border-card-border rounded-xl overflow-hidden">
      {/* Card summary row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{card.meta?.name ?? card.name}</p>
          {card.meta?.billDate ? (
            <p className="text-[11px] text-text-3">
              Bill: {card.meta.billDate}th · Due: {card.meta.duePeriod ?? '?'} days after
              {card.meta.limit ? ` · Limit: ₹${card.meta.limit.toLocaleString()}` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-warning">Not configured — click Edit to set up</p>
          )}
        </div>
        <button
          type="button"
          onClick={editing ? () => setEditing(false) : openEdit}
          className={`p-1.5 rounded-lg transition-colors ${editing ? 'text-accent bg-accent/10' : 'text-text-3 hover:text-text hover:bg-bg-3'}`}
          aria-label={editing ? 'Cancel edit' : 'Edit card'}
        >
          {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </button>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="px-4 py-4 bg-accent/5 border-t border-card-border/50 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Card Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={card.name}
              />
            </div>
            <Input
              label="Bill Date (day of month)"
              type="number"
              value={billDate}
              onChange={e => setBillDate(e.target.value)}
              placeholder="e.g. 19"
              min="1"
              max="31"
            />
            <Input
              label="Due Period (days after statement)"
              type="number"
              value={duePeriod}
              onChange={e => setDuePeriod(e.target.value)}
              placeholder="e.g. 20"
              min="1"
              max="60"
            />
            <div className="col-span-2">
              <Input
                label="Credit Limit (₹) — optional"
                type="number"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder="e.g. 100000"
                min="0"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Min. Payment % — optional (e.g. 5 for 5%)"
                type="number"
                value={minPayPct}
                onChange={e => setMinPayPct(e.target.value)}
                placeholder="e.g. 5"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-[10px] text-text-3 mt-1">
                Min. due = max(₹200, outstanding × %). Used as a payment hint.
              </p>
            </div>
            <div className="col-span-2">
              <Input
                label="Annual Interest Rate % — optional (e.g. 36 for 36% APR)"
                type="number"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
                placeholder="e.g. 36"
                min="0"
                max="120"
                step="0.1"
              />
              <p className="text-[10px] text-text-3 mt-1">
                Monthly interest = outstanding × rate ÷ 12. Shown as an alert when balance is unpaid.
              </p>
            </div>
            <div className="col-span-2">
              <Input
                label="Opening Balance (₹) — optional"
                type="number"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                placeholder="e.g. 15000"
                min="0"
              />
              <p className="text-[10px] text-text-3 mt-1">
                Amount already owed on this card before you started tracking in ExpenseIQ. Leave 0 if you started fresh.
              </p>
            </div>
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!billDate || !duePeriod || isPending}
              loading={isPending}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  cards: CardStats[];
}

export function ConfigureCardsModal({ open, onClose, cards }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Configure Cards" size="md">
      <div className="space-y-3">
        <p className="text-xs text-text-3">
          Set bill date, due period, and credit limit for each card to unlock payment tracking, utilization alerts, and full statement history.
        </p>
        {cards.length === 0 ? (
          <p className="text-sm text-text-3 text-center py-6">
            No credit cards detected yet. Add transactions using a credit card payment method to see cards here.
          </p>
        ) : (
          cards.map(card => (
            <CardRow key={card.name} card={card} onSaved={onClose} />
          ))
        )}
      </div>
    </Modal>
  );
}
