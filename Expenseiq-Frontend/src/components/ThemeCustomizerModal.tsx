'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Check, Trash2, RotateCcw, Wand2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { THEMES, type ThemeKey } from '@/lib/themes';
import type { CustomTheme, CustomThemeInput, SurfaceStyle } from '@/lib/customThemes';

// ── Color token definitions ────────────────────────────────────────────────
const COLOR_FIELDS: { key: keyof ColorValues; label: string; group: string; hint: string }[] = [
  { key: 'bg',      label: 'Background',     group: 'Surface', hint: 'Main page background' },
  { key: 'bg2',     label: 'Surface',        group: 'Surface', hint: 'Cards, inputs, sidebar' },
  { key: 'bg3',     label: 'Hover Surface',  group: 'Surface', hint: 'Hover states, fills' },
  { key: 'card',    label: 'Card',           group: 'Surface', hint: 'Card background' },
  { key: 'text',    label: 'Primary Text',   group: 'Text',    hint: 'Headings, primary content' },
  { key: 'text2',   label: 'Secondary Text', group: 'Text',    hint: 'Labels, subtext' },
  { key: 'text3',   label: 'Muted Text',     group: 'Text',    hint: 'Placeholders, metadata' },
  { key: 'accent',  label: 'Accent',         group: 'Brand',   hint: 'Buttons, links, highlights' },
  { key: 'accent2', label: 'Accent Alt',     group: 'Brand',   hint: 'Secondary accent' },
  { key: 'income',  label: 'Income',         group: 'Finance', hint: 'Income amounts, positive' },
  { key: 'expense', label: 'Expense',        group: 'Finance', hint: 'Expense amounts, negative' },
  { key: 'warning', label: 'Warning',        group: 'Finance', hint: 'Due dates, alerts' },
];

const GROUPS = ['Surface', 'Text', 'Brand', 'Finance'] as const;
type ColorValues = Omit<CustomThemeInput, 'label' | 'surfaceStyle'>;

// ── Surface style options ──────────────────────────────────────────────────
const SURFACE_STYLES: { value: SurfaceStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'flat',   label: 'Flat',   emoji: '▭', desc: 'Clean, no effects' },
  { value: 'glossy', label: 'Glossy', emoji: '✦', desc: 'Shine + deep shadow' },
  { value: 'frozen', label: 'Frozen', emoji: '❄', desc: 'Frosted glass blur' },
];

function buildFromTheme(t: typeof THEMES[ThemeKey]): ColorValues {
  return {
    bg: t.bg, bg2: t.bg2, bg3: t.bg3, card: t.card,
    text: t.text, text2: t.text2, text3: t.text3,
    accent: t.accent, accent2: t.accent2,
    income: t.income, expense: t.expense, warning: t.warning,
  };
}

function buildFromCustom(t: CustomTheme): ColorValues {
  return {
    bg: t.bg, bg2: t.bg2, bg3: t.bg3, card: t.card,
    text: t.text, text2: t.text2, text3: t.text3,
    accent: t.accent, accent2: t.accent2,
    income: t.income, expense: t.expense, warning: t.warning,
  };
}

// ── Live preview — reflects surfaceStyle visually ──────────────────────────
function MiniPreview({ colors, label, surfaceStyle }: {
  colors: ColorValues; label: string; surfaceStyle: SurfaceStyle;
}) {
  const isGlossy = surfaceStyle === 'glossy';
  const isFrozen = surfaceStyle === 'frozen';

  const cardBg = isFrozen
    ? `color-mix(in srgb, ${colors.card} 55%, transparent)`
    : colors.card;

  const cardShadow = isGlossy
    ? '0 4px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)'
    : isFrozen
    ? '0 4px 16px rgba(0,0,0,0.22)'
    : 'none';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: colors.bg, border: '1px solid rgba(128,128,128,0.15)' }}
    >
      {/* Topbar */}
      <div
        className="px-3 py-2 flex items-center justify-between relative"
        style={{
          background: isFrozen
            ? `color-mix(in srgb, ${colors.bg2} 60%, transparent)`
            : colors.bg2,
          borderBottom: '1px solid rgba(128,128,128,0.1)',
          backdropFilter: isFrozen ? 'blur(12px) saturate(1.4)' : undefined,
        }}
      >
        {isGlossy && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(135deg,rgba(255,255,255,0.10) 0%,transparent 60%)',
          }} />
        )}
        <span className="text-xs font-bold" style={{ color: colors.accent }}>ExpenseIQ</span>
        <span className="text-[10px]" style={{ color: colors.text2 }}>{label || 'My Theme'}</span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Balance card */}
        <div
          className="rounded-lg p-2.5 space-y-1 relative overflow-hidden"
          style={{
            background: cardBg,
            border: '1px solid rgba(128,128,128,0.1)',
            boxShadow: cardShadow,
            backdropFilter: isFrozen ? 'blur(16px) saturate(1.4)' : undefined,
          }}
        >
          {isGlossy && (
            <div aria-hidden style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
              background: 'linear-gradient(135deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.02) 50%,transparent 100%)',
            }} />
          )}
          <p className="text-[9px] uppercase tracking-wider" style={{ color: colors.text3 }}>Balance</p>
          <p className="text-sm font-bold" style={{ color: colors.income }}>+₹24,500</p>
        </div>

        {/* Transaction rows */}
        {[
          { cat: 'Salary',    amt: '+₹50,000', type: 'income' as const },
          { cat: 'Groceries', amt: '-₹1,250',  type: 'expense' as const },
          { cat: 'Due Soon',  amt: '⚠ 3d',     type: 'warning' as const },
        ].map((r) => (
          <div key={r.cat}
            className="flex items-center justify-between px-2 py-1.5 rounded-md relative overflow-hidden"
            style={{
              background: cardBg,
              backdropFilter: isFrozen ? 'blur(12px)' : undefined,
            }}
          >
            {isGlossy && (
              <div aria-hidden style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 60%)',
              }} />
            )}
            <span className="text-[10px]" style={{ color: colors.text }}>{r.cat}</span>
            <span className="text-[10px] font-semibold" style={{
              color: r.type === 'income' ? colors.income : r.type === 'expense' ? colors.expense : colors.warning,
            }}>{r.amt}</span>
          </div>
        ))}

        {/* Button */}
        <div className="rounded-lg px-2 py-1.5 text-center relative overflow-hidden"
          style={{ background: colors.accent }}>
          {isGlossy && (
            <div aria-hidden style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 60%)',
            }} />
          )}
          <span className="text-[10px] font-semibold text-white">Add Transaction</span>
        </div>
      </div>
    </div>
  );
}

// ── Color swatch picker ────────────────────────────────────────────────────
function ColorField({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (v: string) => void;
}) {
  const safeValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <div className="relative flex-shrink-0">
        <input type="color" value={safeValue} onChange={(e) => onChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" aria-label={label} />
        <div className="w-8 h-8 rounded-lg border-2 border-white/20 shadow-md cursor-pointer transition-transform hover:scale-110"
          style={{ background: value }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text leading-none">{label}</p>
        <p className="text-[10px] text-text-3 mt-0.5">{hint}</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
        className="w-[78px] px-2 py-1 text-[11px] font-mono bg-bg-2 border border-card-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-accent/50"
        maxLength={7}
      />
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  editTheme?: CustomTheme;
}

export function ThemeCustomizerModal({ open, onClose, editTheme }: Props) {
  const { createCustomTheme, editCustomTheme, removeCustomTheme, setTheme } = useTheme();

  const [name, setName] = useState('');
  const [baseKey, setBaseKey] = useState<ThemeKey>('dark');
  const [colors, setColors] = useState<ColorValues>(buildFromTheme(THEMES.dark));
  const [surfaceStyle, setSurfaceStyle] = useState<SurfaceStyle>('flat');
  const [activeGroup, setActiveGroup] = useState<typeof GROUPS[number]>('Surface');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync all state when modal opens or editTheme changes
  useEffect(() => {
    if (!open) return;
    if (editTheme) {
      setName(editTheme.label);
      setColors(buildFromCustom(editTheme));
      setSurfaceStyle(editTheme.surfaceStyle ?? 'flat');
    } else {
      setName('');
      setBaseKey('dark');
      setColors(buildFromTheme(THEMES.dark));
      setSurfaceStyle('flat');
    }
    setActiveGroup('Surface');
    setConfirmDelete(false);
    setSaved(false);
  }, [open, editTheme]);

  const setColor = useCallback((key: keyof ColorValues, val: string) => {
    setColors((prev) => ({ ...prev, [key]: val }));
  }, []);

  function handleBaseChange(key: ThemeKey) {
    setBaseKey(key);
    setColors(buildFromTheme(THEMES[key]));
  }

  function handleSave() {
    const trimmed = name.trim() || 'My Theme';
    const input: CustomThemeInput = { label: trimmed, surfaceStyle, ...colors };
    if (editTheme) {
      editCustomTheme(editTheme.key, input);
    } else {
      const created = createCustomTheme(input);
      setTheme(created.key);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  function handleDelete() {
    if (!editTheme) return;
    removeCustomTheme(editTheme.key);
    onClose();
  }

  if (!open) return null;

  const groupFields = COLOR_FIELDS.filter((f) => f.group === activeGroup);

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-4 py-16">
          <div
            className="relative w-full max-w-[820px] bg-card border border-card-border rounded-2xl shadow-[var(--shadow)] flex flex-col"
            style={{ maxHeight: 'calc(100vh - 8rem)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text">
                    {editTheme ? `Editing — ${editTheme.label}` : 'Create Custom Theme'}
                  </h2>
                  <p className="text-[11px] text-text-3">
                    {editTheme ? 'Modify colors and surface style' : 'Design your perfect color scheme'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-3 text-text-2 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* Left — editor */}
              <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-5">

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">
                    Theme Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Custom Theme"
                    maxLength={32}
                    className="w-full px-3 py-2.5 text-sm bg-bg-2 border border-card-border rounded-xl text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>

                {/* Surface Style — style only, no color change */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">
                    Surface Style
                  </label>
                  <p className="text-[11px] text-text-3 -mt-1">
                    Visual treatment applied on top of your colors — no colors are changed.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SURFACE_STYLES.map((s) => {
                      const active = surfaceStyle === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSurfaceStyle(s.value)}
                          className={[
                            'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-center transition-all duration-200 focus:outline-none',
                            active
                              ? 'border-accent bg-accent/10'
                              : 'border-card-border bg-bg-2 hover:border-accent/30 hover:bg-bg-3',
                          ].join(' ')}
                        >
                          {/* Style visual indicator */}
                          <div
                            className="w-10 h-7 rounded-lg relative overflow-hidden border border-white/10"
                            style={{ background: colors.card }}
                          >
                            {s.value === 'glossy' && (
                              <div aria-hidden style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(135deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.04) 50%,transparent 100%)',
                              }} />
                            )}
                            {s.value === 'frozen' && (
                              <div aria-hidden style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(135deg,rgba(200,230,255,0.25) 0%,rgba(180,220,255,0.10) 60%,transparent 100%)',
                                backdropFilter: 'blur(4px)',
                              }} />
                            )}
                            <div className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-full opacity-50"
                              style={{ background: colors.accent }} />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${active ? 'text-accent' : 'text-text'}`}>
                              {s.emoji} {s.label}
                            </p>
                            <p className="text-[10px] text-text-3">{s.desc}</p>
                          </div>
                          {active && (
                            <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Base theme starter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">
                      {editTheme ? 'Reset Colors From Base' : 'Start Colors From'}
                    </label>
                    <button type="button"
                      onClick={() => setColors(buildFromTheme(THEMES[baseKey]))}
                      className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 transition-colors">
                      <RotateCcw className="w-3 h-3" />
                      Apply base
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
                      const m = THEMES[k];
                      return (
                        <button key={k} type="button" onClick={() => handleBaseChange(k)}
                          className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all hover:scale-105 focus:outline-none"
                          style={{ background: m.bg, borderColor: baseKey === k ? m.accent : 'transparent' }}>
                          <div className="flex gap-0.5">
                            {[m.accent, m.income, m.expense].map((c, i) => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                            ))}
                          </div>
                          <span className="text-[7px] truncate w-full text-center" style={{ color: m.text2 }}>
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color group picker */}
                <div className="space-y-3">
                  <label className="text-[11px] font-semibold text-text-2 uppercase tracking-wider">Colors</label>
                  <div className="flex gap-1.5">
                    {GROUPS.map((g) => (
                      <button key={g} type="button" onClick={() => setActiveGroup(g)}
                        className={[
                          'flex-1 py-1.5 text-xs rounded-lg border transition-colors font-medium',
                          activeGroup === g
                            ? 'bg-accent text-white border-accent'
                            : 'bg-bg-2 text-text-2 border-card-border hover:bg-bg-3',
                        ].join(' ')}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2.5 bg-bg-2/50 rounded-xl p-3 border border-card-border">
                    {groupFields.map((f) => (
                      <ColorField
                        key={f.key}
                        label={f.label}
                        hint={f.hint}
                        value={colors[f.key]}
                        onChange={(v) => setColor(f.key, v)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — live preview */}
              <div className="w-[190px] flex-shrink-0 border-l border-card-border bg-bg-2/40 p-4 space-y-3 overflow-y-auto">
                <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Live Preview</p>
                <MiniPreview colors={colors} label={name} surfaceStyle={surfaceStyle} />
                <div className="grid grid-cols-6 gap-1">
                  {COLOR_FIELDS.map((f) => (
                    <div key={f.key} className="aspect-square rounded-md border border-white/10"
                      style={{ background: colors[f.key] }} title={f.label} />
                  ))}
                </div>
                <p className="text-[10px] text-text-3 leading-relaxed">
                  Surface style layered on your colors. Updates instantly.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-card-border flex-shrink-0">
              <div>
                {editTheme && !confirmDelete && (
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-expense px-3 py-1.5 rounded-lg hover:bg-expense/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                {confirmDelete && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-expense">Delete permanently?</span>
                    <button type="button" onClick={handleDelete}
                      className="text-xs text-expense font-semibold hover:underline">Yes</button>
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="text-xs text-text-2 hover:underline">Cancel</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm text-text-2 bg-bg-2 border border-card-border rounded-xl hover:bg-bg-3 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saved}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60"
                  style={{ background: colors.accent, boxShadow: `0 4px 16px -4px ${colors.accent}` }}>
                  {saved
                    ? <><Check className="w-4 h-4" /> Saved!</>
                    : <><Wand2 className="w-4 h-4" /> {editTheme ? 'Save Changes' : 'Create & Apply'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
