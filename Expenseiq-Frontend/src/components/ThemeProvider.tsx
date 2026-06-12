'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME,
  isThemeKey,
  THEMES,
  THEME_STORAGE_KEY,
  type ThemeKey,
} from '@/lib/themes';
import {
  loadCustomThemes,
  saveCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  applyCustomThemesCSS,
  isCustomThemeKey,
  type CustomTheme,
  type CustomThemeInput,
} from '@/lib/customThemes';

interface ThemeContextValue {
  theme: ThemeKey | string;
  setTheme: (theme: ThemeKey | string) => void;
  themes: typeof THEMES;
  // Custom theme management
  customThemes: CustomTheme[];
  createCustomTheme: (input: CustomThemeInput) => CustomTheme;
  editCustomTheme: (key: string, input: Partial<CustomThemeInput>) => void;
  removeCustomTheme: (key: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Tiny pub-sub for the DOM data-theme attribute.
const listeners = new Set<() => void>();
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function notify(): void {
  listeners.forEach((cb) => cb());
}

function getClientSnapshot(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return stored;
  }
  return document.documentElement.getAttribute('data-theme') ?? DEFAULT_THEME;
}
function getServerSnapshot(): string {
  return DEFAULT_THEME;
}

function applyTheme(key: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', key);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  // Load custom themes on mount and inject their CSS
  useEffect(() => {
    const loaded = loadCustomThemes();
    setCustomThemes(loaded);
    applyCustomThemesCSS(loaded);
  }, []);

  const setTheme = useCallback((next: string) => {
    applyTheme(next);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* ignore */ }
    notify();
  }, []);

  const createCustomTheme = useCallback((input: CustomThemeInput): CustomTheme => {
    const created = saveCustomTheme(input);
    setCustomThemes((prev) => {
      const next = [created, ...prev];
      applyCustomThemesCSS(next);
      return next;
    });
    return created;
  }, []);

  const editCustomTheme = useCallback((key: string, input: Partial<CustomThemeInput>): void => {
    const updated = updateCustomTheme(key, input);
    if (!updated) return;
    setCustomThemes((prev) => {
      const next = prev.map((t) => (t.key === key ? updated : t));
      applyCustomThemesCSS(next);
      // Re-apply if this is the active theme so colors update live
      if (document.documentElement.getAttribute('data-theme') === key) {
        applyTheme(key);
        notify();
      }
      return next;
    });
  }, []);

  const removeCustomTheme = useCallback((key: string): void => {
    deleteCustomTheme(key);
    setCustomThemes((prev) => {
      const next = prev.filter((t) => t.key !== key);
      applyCustomThemesCSS(next);
      return next;
    });
    // If currently active, fall back to default
    if (document.documentElement.getAttribute('data-theme') === key) {
      setTheme(DEFAULT_THEME);
    }
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      themes: THEMES,
      customThemes,
      createCustomTheme,
      editCustomTheme,
      removeCustomTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export { isCustomThemeKey };
