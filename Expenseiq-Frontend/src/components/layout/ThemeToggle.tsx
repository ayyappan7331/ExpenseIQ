'use client';

// Two-tone toggle: ON = Dark mode, OFF = Light mode.
// Remembers the last selected theme in each mode so switching back
// restores the user's preferred theme rather than the default.

import { useTheme } from '@/components/ThemeProvider';
import { LIGHT_THEMES, isThemeKey, type ThemeKey } from '@/lib/themes';

const LAST_LIGHT_KEY = 'expenseiq.lastLightTheme';
const LAST_DARK_KEY = 'expenseiq.lastDarkTheme';

function readStored(key: string, fallback: ThemeKey): ThemeKey {
  try {
    const v = localStorage.getItem(key);
    return isThemeKey(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: ThemeKey): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isLight = isThemeKey(theme) && (LIGHT_THEMES as readonly ThemeKey[]).includes(theme as ThemeKey);
  const isDark = !isLight;

  function handleToggle() {
    if (isLight) {
      if (isThemeKey(theme)) writeStored(LAST_LIGHT_KEY, theme as ThemeKey);
      setTheme(readStored(LAST_DARK_KEY, 'dark'));
    } else {
      if (isThemeKey(theme)) writeStored(LAST_DARK_KEY, theme as ThemeKey);
      setTheme(readStored(LAST_LIGHT_KEY, 'light'));
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      title={isDark ? 'Switch to light' : 'Switch to dark'}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-bg-3 hover:bg-card border border-card-border transition-colors"
    >
      <span aria-hidden="true" className="text-sm leading-none select-none">
        {isDark ? '🌙' : '☀️'}
      </span>
      {/* Track */}
      <span
        aria-hidden="true"
        className={[
          'relative inline-block w-8 h-4 rounded-full transition-colors duration-[250ms] ease-in-out',
          isDark ? 'bg-accent' : 'bg-bg',
        ].join(' ')}
      >
        {/* Thumb */}
        <span
          className={[
            'absolute top-0.5 w-3 h-3 rounded-full bg-text transition-all duration-[250ms] ease-in-out',
            isDark ? 'left-[18px]' : 'left-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
