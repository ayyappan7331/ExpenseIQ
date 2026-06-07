'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import type { ViewMode, GroupPeriod } from './useDensityMode';

interface SmartSimpleSwitchProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  groupPeriod?: GroupPeriod;
  onGroupPeriodChange?: (p: GroupPeriod) => void;
}

const PERIOD_OPTIONS: { value: GroupPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'halfyear', label: 'Half-Year' },
  { value: 'year', label: 'Year' },
];

export function SmartSimpleSwitch({ value, onChange, groupPeriod = 'day', onGroupPeriodChange }: SmartSimpleSwitchProps) {
  const isGrouped = value !== 'flat';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-1">
      {/* Segmented switch */}
      <div
        role="group"
        aria-label="View mode"
        className="relative flex items-center bg-bg-2 border border-card-border rounded-lg p-0.5"
        style={{ minWidth: 130 }}
      >
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-md bg-card shadow-sm border border-card-border/60 transition-all duration-[250ms] ease-in-out"
          style={{ width: 'calc(50% - 2px)', left: isGrouped ? '2px' : 'calc(50%)' }}
        />
        <button
          type="button"
          role="radio"
          aria-checked={isGrouped}
          onClick={() => onChange('grouped')}
          className={['relative z-10 flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors duration-[250ms]',
            isGrouped ? 'text-text' : 'text-text-3 hover:text-text-2'].join(' ')}
        >
          Smart
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!isGrouped}
          onClick={() => onChange('flat')}
          className={['relative z-10 flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors duration-[250ms]',
            !isGrouped ? 'text-text' : 'text-text-3 hover:text-text-2'].join(' ')}
        >
          Simple
        </button>
      </div>

      {/* Grouping period menu — always visible; disabled/muted in Simple mode */}
      {onGroupPeriodChange && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => isGrouped && setMenuOpen(o => !o)}
            title={isGrouped ? 'Grouping period' : 'Switch to Smart mode to change grouping'}
            aria-label="Grouping period"
            disabled={!isGrouped}
            className={[
              'flex items-center justify-center w-8 h-8 border rounded-lg transition-colors',
              isGrouped
                ? 'text-text-2 border-card-border bg-bg-2 hover:bg-bg-3 cursor-pointer'
                : 'text-text-3/40 border-card-border/40 bg-bg-2/50 cursor-not-allowed',
            ].join(' ')}
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </button>

          {menuOpen && isGrouped && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-card-border rounded-lg shadow-lg py-1 min-w-[120px]">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onGroupPeriodChange(opt.value); setMenuOpen(false); }}
                  className={['w-full text-left px-3 py-1.5 text-xs hover:bg-bg-3 transition-colors',
                    groupPeriod === opt.value ? 'text-accent font-medium' : 'text-text-2'].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
