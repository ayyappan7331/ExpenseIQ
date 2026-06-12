'use client';

import { useEffect, useState } from 'react';
import { Check, Palette, Plus, Pencil } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useTypography, FONT_OPTIONS, FONT_SIZE_OPTIONS, type FontFamily, type FontSize } from '@/components/TypographyProvider';
import { THEME_KEYS, LIGHT_THEMES, type ThemeKey } from '@/lib/themes';
import { ThemeCustomizerModal } from '@/components/ThemeCustomizerModal';
import type { CustomTheme, SurfaceStyle } from '@/lib/customThemes';
import { api } from '@/lib/api/client';
import { getActiveProfileId } from '@/lib/api/profile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/hooks/queries/keys';

const GFONTS_URL =
  'https://fonts.googleapis.com/css2?family=' +
  FONT_OPTIONS.map((f) => f.value.replace(/ /g, '+') + ':wght@400;500;600;700').join('&family=') +
  '&display=swap';

const SURFACE_STYLE_KEY = 'expenseiq.surfaceStyle';

const SURFACE_STYLES: { value: SurfaceStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'flat',   label: 'Flat',   emoji: '▭', desc: 'Clean, no effects' },
  { value: 'glossy', label: 'Glossy', emoji: '✦', desc: 'Glassmorphism surfaces' },
  { value: 'frozen', label: 'Frozen', emoji: '❄', desc: 'Frosted glass blur' },
];

function applySurfaceStyle(s: SurfaceStyle) {
  document.documentElement.setAttribute('data-surface', s);
  try { localStorage.setItem(SURFACE_STYLE_KEY, s); } catch { /* ignore */ }
}

export default function ThemesPage() {
  const { theme, setTheme, themes, customThemes } = useTheme();
  const { fontFamily, fontSize, setFontFamily, setFontSize } = useTypography();

  const [surfaceStyle, setSurfaceStyleState] = useState<SurfaceStyle>(() => {
    try {
      const s = localStorage.getItem(SURFACE_STYLE_KEY) as SurfaceStyle | null;
      return s && ['flat', 'glossy', 'frozen'].includes(s) ? s : 'flat';
    } catch { return 'flat'; }
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | undefined>();

  const [syncTheme, setSyncThemeState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('expenseiq.syncTheme') === '1';
  });

  const qc = useQueryClient();

  const { mutate: updateSettings } = useMutation({
    mutationFn: (t: string) => api.updateSettings({ theme: t, profileId: getActiveProfileId() }),
    onMutate: async (newTheme) => {
      await qc.cancelQueries({ queryKey: queryKeys.settings.all });
      const queryKey = queryKeys.settings.one(getActiveProfileId());
      const previousSettings: any = qc.getQueryData(queryKey);
      
      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, theme: newTheme };
      });
      
      return { previousSettings };
    },
    onError: (err, newTheme, context) => {
      if (context?.previousSettings) {
        qc.setQueryData(queryKeys.settings.one(getActiveProfileId()), context.previousSettings);
        setTheme(context.previousSettings.theme);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
    }
  });

  function toggleSyncTheme() {
    const next = !syncTheme;
    setSyncThemeState(next);
    if (next) {
      localStorage.setItem('expenseiq.syncTheme', '1');
      updateSettings(theme);
    } else {
      localStorage.removeItem('expenseiq.syncTheme');
    }
  }

  function handleSetTheme(t: string) {
    setTheme(t);
    if (syncTheme) updateSettings(t);
  }

  function setSurface(s: SurfaceStyle) {
    setSurfaceStyleState(s);
    applySurfaceStyle(s);
  }

  useEffect(() => {
    if (document.getElementById('gfonts-appearance')) return;
    const link = document.createElement('link');
    link.id = 'gfonts-appearance';
    link.rel = 'stylesheet';
    link.href = GFONTS_URL;
    document.head.appendChild(link);
  }, []);

  const darkThemes = THEME_KEYS.filter((k) => !LIGHT_THEMES.includes(k));
  const lightThemes = THEME_KEYS.filter((k) => LIGHT_THEMES.includes(k));

  function ThemeGroup({ keys, label }: { keys: ThemeKey[]; label: string }) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.12em]">{label}</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 gap-2">
          {keys.map((key) => {
            const meta = themes[key];
            const active = key === theme;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                data-testid={`theme-card-${key}`}
                onClick={() => handleSetTheme(key as ThemeKey)}
                className="theme-card group relative overflow-hidden rounded-xl border-2 p-0 focus:outline-none"
                style={{
                  borderColor: active ? meta.accent : 'transparent',
                  boxShadow: active ? `0 0 0 1px ${meta.accent}, 0 4px 16px -4px ${meta.accent}66` : 'none',
                  '--tc-accent': meta.accent,
                } as React.CSSProperties}
              >
                <div className="p-2 space-y-1.5" style={{ background: meta.bg }}>
                  <div className="h-1.5 w-3/4 rounded-full opacity-40" style={{ background: meta.text }} />
                  <div className="flex gap-1">
                    {[meta.accent, meta.accent2, meta.income, meta.expense].map((c, i) => (
                      <span key={i} className="inline-block w-2 h-2 rounded-full transition-transform duration-300 group-hover:scale-125"
                        style={{ background: c }} />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-full rounded opacity-20" style={{ background: meta.text }} />
                    <div className="h-1 w-2/3 rounded opacity-15" style={{ background: meta.text }} />
                  </div>
                </div>
                <div className="px-2 py-1.5 border-t" style={{ background: meta.card, borderColor: `${meta.accent}22` }}>
                  <div className="text-[10px] font-semibold leading-tight truncate" style={{ color: meta.text }}>{meta.label}</div>
                </div>
                {active && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: meta.accent }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .theme-card {
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.2s ease;
          will-change: transform;
        }
        .theme-card:hover { transform: translateY(-4px) scale(1.05); }
        .theme-card:active { transform: scale(0.96); transition-duration: 0.08s; }
        .font-card { will-change: transform; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.2s ease; }
        .font-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px -6px rgba(0,0,0,0.2); }
        .font-card:active { transform: scale(0.97); transition-duration: 0.08s; }
        .font-underline { transform: scaleX(0); transform-origin: left; transition: transform 0.35s cubic-bezier(0.65,0,0.35,1); }
        .font-card[data-active] .font-underline { transform: scaleX(1); }
        .size-btn { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease; }
        .size-btn:hover { transform: translateY(-2px); }
        .size-btn:active { transform: scale(0.95); transition-duration: 0.08s; }
        .surface-card { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.2s ease; }
        .surface-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px -6px rgba(0,0,0,0.22); }
        .surface-card:active { transform: scale(0.96); transition-duration: 0.08s; }
      `}</style>

      <div className="space-y-8">

        {/* ── Surface Style ─────────────────────────────────────────── */}
        <section className="space-y-4 bg-card border border-card-border rounded-2xl p-5">
          <div>
            <h2 className="text-sm font-semibold text-text">Surface Style</h2>
            <p className="text-xs text-text-3 mt-0.5">Visual treatment applied globally on top of any theme color</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SURFACE_STYLES.map((s) => {
              const active = surfaceStyle === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSurface(s.value)}
                  className={[
                    'surface-card relative flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left focus:outline-none',
                    active ? 'border-accent bg-accent/8' : 'border-card-border bg-bg-2 hover:border-accent/30',
                  ].join(' ')}
                >
                  {/* Compact visual mockup */}
                  <div className="w-14 h-10 rounded-lg overflow-hidden relative flex-shrink-0 border border-card-border/50"
                    style={{ background: 'var(--bg)' }}>
                    {s.value === 'frozen' && (
                      <div aria-hidden className="absolute inset-0"
                        style={{ background: 'linear-gradient(135deg,rgba(180,220,255,0.20) 0%,rgba(140,200,255,0.08) 60%,transparent 100%)' }} />
                    )}
                    {s.value === 'glossy' && (
                      <div aria-hidden className="absolute inset-0"
                        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.03) 50%,transparent 100%)' }} />
                    )}
                    <div className="absolute inset-x-1.5 top-1 bottom-1 rounded-md overflow-hidden"
                      style={{
                        background: s.value === 'frozen' ? 'color-mix(in srgb, var(--card) 55%, transparent)' : 'var(--card)',
                        border: '1px solid rgba(128,128,128,0.12)',
                        boxShadow: s.value === 'glossy'
                          ? '0 2px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)'
                          : s.value === 'frozen' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        backdropFilter: s.value === 'frozen' ? 'blur(12px) saturate(1.5)' : undefined,
                        position: 'relative',
                      }}>
                      {s.value === 'glossy' && (
                        <div aria-hidden className="absolute inset-0 pointer-events-none"
                          style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.02) 50%,transparent 100%)' }} />
                      )}
                      <div className="px-1.5 py-1 space-y-0.5">
                        <div className="h-1 w-3/5 rounded-full opacity-70" style={{ background: 'var(--accent)' }} />
                        <div className="h-0.5 w-full rounded-full opacity-25" style={{ background: 'var(--text)' }} />
                        <div className="h-0.5 w-4/5 rounded-full opacity-18" style={{ background: 'var(--text)' }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-none ${active ? 'text-accent' : 'text-text'}`}>
                      {s.emoji} {s.label}
                    </p>
                    <p className="text-[10px] text-text-3 mt-0.5 leading-snug">{s.desc}</p>
                  </div>

                  {active && (
                    <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Color Theme ────────────────────────────────────────────── */}
        <section className="space-y-5 bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-text">Color Theme</h2>
            <span className="text-[11px] text-text-3">{THEME_KEYS.length} themes</span>
          </div>
          <ThemeGroup keys={darkThemes} label="Dark & Vibrant" />
          <ThemeGroup keys={lightThemes} label="Light & Clean" />

          {/* Sync Toggle */}
          <div className="pt-4 border-t border-card-border mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">Profile Theme Sync</p>
              <p className="text-xs text-text-3 mt-0.5 max-w-sm">Automatically restore your selected theme when logging into new devices.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={syncTheme}
              onClick={toggleSyncTheme}
              className={[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
                syncTheme ? 'bg-accent' : 'bg-bg-3'
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  syncTheme ? 'translate-x-5' : 'translate-x-0'
                ].join(' ')}
              />
            </button>
          </div>
        </section>

        {/* ── My Themes ──────────────────────────────────────────────── */}
        <section className="space-y-4 bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-text">My Themes</h2>
              <span className="text-[11px] text-text-3">{customThemes.length} custom</span>
            </div>
            <button type="button"
              onClick={() => { setEditingTheme(undefined); setCustomizerOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"
              style={{ boxShadow: '0 4px 14px -4px var(--accent)' }}>
              <Plus className="w-3.5 h-3.5" />
              Create Theme
            </button>
          </div>

          {customThemes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 border-2 border-dashed border-card-border rounded-xl">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-2">No custom themes yet</p>
                <p className="text-xs text-text-3 mt-0.5">Create your own theme with custom colors</p>
              </div>
              <button type="button"
                onClick={() => { setEditingTheme(undefined); setCustomizerOpen(true); }}
                className="px-4 py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-colors">
                Create your first theme
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {customThemes.map((ct) => {
                const active = theme === ct.key;
                return (
                  <div key={ct.key}
                    className="theme-card relative group rounded-xl border-2 overflow-hidden cursor-pointer"
                    style={{
                      borderColor: active ? ct.accent : 'transparent',
                      boxShadow: active ? `0 0 0 1px ${ct.accent}, 0 4px 16px -4px ${ct.accent}66` : 'none',
                      '--tc-accent': ct.accent,
                    } as React.CSSProperties}
                    onClick={() => handleSetTheme(ct.key)}
                  >
                    <div className="p-2 space-y-1.5" style={{ background: ct.bg }}>
                      <div className="h-1.5 w-3/4 rounded-full opacity-40" style={{ background: ct.text }} />
                      <div className="flex gap-1">
                        {[ct.accent, ct.accent2, ct.income, ct.expense].map((c, i) => (
                          <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />
                        ))}
                      </div>
                      <div className="h-1 w-full opacity-20 rounded" style={{ background: ct.text }} />
                    </div>
                    <div className="px-2 py-1.5 flex items-center justify-between border-t"
                      style={{ background: ct.card, borderColor: `${ct.accent}22` }}>
                      <span className="text-[10px] font-semibold truncate" style={{ color: ct.text }}>{ct.label}</span>
                      {active && (
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: ct.accent }}>
                          <Check className="w-2 h-2 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingTheme(ct); setCustomizerOpen(true); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Edit theme">
                      <Pencil className="w-3 h-3 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Typography ─────────────────────────────────────────────── */}
        <section className="space-y-5 bg-card border border-card-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text">Typography</h2>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.12em]">Font Family</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {FONT_OPTIONS.map((f) => {
                const active = fontFamily === f.value;
                return (
                  <button key={f.value} type="button"
                    onClick={() => setFontFamily(f.value as FontFamily)}
                    data-active={active || undefined}
                    className={[
                      'font-card relative flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-2xl border-2 text-left focus:outline-none focus:ring-2 focus:ring-accent/40 overflow-hidden',
                      active ? 'border-accent bg-accent/10' : 'border-card-border bg-bg-2 hover:bg-bg-3 hover:border-accent/30',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-[17px] font-semibold text-text leading-none"
                      style={{ fontFamily: `'${f.value}', system-ui, sans-serif` }}>
                      {f.label}
                    </span>
                    <span className="text-[12px] text-text-3 leading-snug"
                      style={{ fontFamily: `'${f.value}', system-ui, sans-serif` }}>
                      Aa Bb Cc 1 2 3
                    </span>
                    <span className="font-underline absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.12em]">Font Size</p>
            <div className="flex gap-2.5">
              {FONT_SIZE_OPTIONS.map((s) => {
                const active = fontSize === s.value;
                return (
                  <button key={s.value} type="button"
                    data-active={active || undefined}
                    onClick={() => setFontSize(s.value as FontSize)}
                    className={[
                      'size-btn flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl border-2 focus:outline-none',
                      active ? 'bg-accent border-accent text-white font-semibold' : 'bg-bg-2 border-card-border text-text-2 hover:bg-bg-3 hover:border-accent/30',
                    ].join(' ')}
                    style={{ boxShadow: active ? '0 4px 14px -4px var(--accent)' : 'none' }}
                  >
                    <span style={{ fontSize: `${Math.max(10, s.px - 4)}px` }}>Aa</span>
                    <span className="text-[10px] font-medium tracking-wide">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

      </div>

      <ThemeCustomizerModal
        open={customizerOpen}
        onClose={() => { setCustomizerOpen(false); setEditingTheme(undefined); }}
        editTheme={editingTheme}
      />
    </>
  );
}
