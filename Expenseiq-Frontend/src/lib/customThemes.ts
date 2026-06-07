// Custom theme storage — user-created themes persisted to localStorage.
// Custom theme keys are prefixed with 'custom:' to avoid colliding with
// built-in ThemeKey values. Applied via a dynamic <style> tag injected
// into <head> by the ThemeProvider.

export const CUSTOM_THEMES_KEY = 'expenseiq.customThemes';

/** Visual surface treatment — applied on top of user-defined colors. */
export type SurfaceStyle = 'flat' | 'glossy' | 'frozen';

export interface CustomTheme {
  key: string;
  label: string;
  surfaceStyle?: SurfaceStyle;
  bg: string;
  bg2: string;
  bg3: string;
  card: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accent2: string;
  income: string;
  expense: string;
  warning: string;
  createdAt: number;
}

export type CustomThemeInput = Omit<CustomTheme, 'key' | 'createdAt'>;

export function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomTheme[];
  } catch {
    return [];
  }
}

export function saveCustomTheme(input: CustomThemeInput): CustomTheme {
  const themes = loadCustomThemes();
  const key = `custom:${Date.now()}`;
  const theme: CustomTheme = { ...input, key, createdAt: Date.now() };
  themes.unshift(theme);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  return theme;
}

export function updateCustomTheme(key: string, input: Partial<CustomThemeInput>): CustomTheme | null {
  const themes = loadCustomThemes();
  const idx = themes.findIndex((t) => t.key === key);
  if (idx === -1) return null;
  themes[idx] = { ...themes[idx], ...input };
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  return themes[idx];
}

export function deleteCustomTheme(key: string): void {
  const themes = loadCustomThemes().filter((t) => t.key !== key);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

export function customThemeToCSS(theme: CustomTheme): string {
  const s = theme.surfaceStyle ?? 'flat';

  // Glossy: cards get a subtle inset shine + stronger shadow
  const cardShadow =
    s === 'glossy' ? `0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)` :
    s === 'frozen' ? `0 8px 40px rgba(0,0,0,0.22)` :
    `0 8px 40px rgba(0,0,0,0.35)`;

  // Frozen: card bg gets transparency so backdrop shows through
  const cardBg =
    s === 'frozen'
      ? `color-mix(in srgb, ${theme.card} 55%, transparent)`
      : theme.card;

  const bg2 =
    s === 'frozen'
      ? `color-mix(in srgb, ${theme.bg2} 65%, transparent)`
      : theme.bg2;

  return `
:root[data-theme='${theme.key}'] {
  --bg: ${theme.bg};
  --bg-2: ${bg2};
  --bg-3: ${theme.bg3};
  --card: ${cardBg};
  --card-border: rgba(128,128,128,0.12);
  --text: ${theme.text};
  --text-2: ${theme.text2};
  --text-3: ${theme.text3};
  --accent: ${theme.accent};
  --accent-2: ${theme.accent2};
  --income: ${theme.income};
  --expense: ${theme.expense};
  --warning: ${theme.warning};
  --shadow: ${cardShadow};
  --custom-surface-style: '${s}';
}${s === 'glossy' ? `
:root[data-theme='${theme.key}'] .bg-card,
:root[data-theme='${theme.key}'] [class*='bg-card'] {
  position: relative;
}
:root[data-theme='${theme.key}'] .bg-card::before,
:root[data-theme='${theme.key}'] [class*='bg-card']::before {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, transparent 100%);
  z-index: 0;
}` : ''}${s === 'frozen' ? `
:root[data-theme='${theme.key}'] .bg-card,
:root[data-theme='${theme.key}'] [class*='bg-card'],
:root[data-theme='${theme.key}'] [class*='bg-bg-2'] {
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
}` : ''}`.trim();
}

export function applyCustomThemesCSS(themes: CustomTheme[]): void {
  if (typeof document === 'undefined') return;
  const id = 'expenseiq-custom-themes';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = themes.map(customThemeToCSS).join('\n\n');
}

export function isCustomThemeKey(key: string): boolean {
  return key.startsWith('custom:');
}
