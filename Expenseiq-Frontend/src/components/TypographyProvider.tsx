'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Source Sans 3', label: 'Source Sans Pro' },
  { value: 'Work Sans', label: 'Work Sans' },
  { value: 'Ubuntu', label: 'Ubuntu' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Noto Sans', label: 'Noto Sans' },
  { value: 'PT Sans', label: 'PT Sans' },
  { value: 'Fira Sans', label: 'Fira Sans' },
  { value: 'Cabin', label: 'Cabin' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
] as const;

export type FontFamily = typeof FONT_OPTIONS[number]['value'];

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string; px: number }[] = [
  { value: 'small', label: 'Small', px: 13 },
  { value: 'medium', label: 'Medium', px: 15 },
  { value: 'large', label: 'Large', px: 17 },
  { value: 'xlarge', label: 'Extra Large', px: 19 },
];

const FONT_FAMILY_KEY = 'expenseiq.fontFamily';
const FONT_SIZE_KEY = 'expenseiq.fontSize';
const DEFAULT_FONT: FontFamily = 'Inter';
const DEFAULT_SIZE: FontSize = 'medium';

function applyTypography(family: FontFamily, size: FontSize) {
  if (typeof document === 'undefined') return;
  const sizePx = FONT_SIZE_OPTIONS.find(s => s.value === size)?.px ?? 15;
  document.documentElement.style.setProperty('--font-ui', `'${family}', system-ui, sans-serif`);
  document.documentElement.style.setProperty('--font-size-base', `${sizePx}px`);
  // Apply font-size to root for rem scaling
  document.documentElement.style.fontSize = `${sizePx}px`;
}

interface TypographyContextValue {
  fontFamily: FontFamily;
  fontSize: FontSize;
  setFontFamily: (f: FontFamily) => void;
  setFontSize: (s: FontSize) => void;
}

const TypographyContext = createContext<TypographyContextValue | null>(null);

export function TypographyProvider({ children }: { children: ReactNode }) {
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(FONT_FAMILY_KEY) as FontFamily | null : null;
      return FONT_OPTIONS.some(f => f.value === stored) ? stored! : DEFAULT_FONT;
    } catch { return DEFAULT_FONT; }
  });
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(FONT_SIZE_KEY) as FontSize | null : null;
      return FONT_SIZE_OPTIONS.some(s => s.value === stored) ? stored! : DEFAULT_SIZE;
    } catch { return DEFAULT_SIZE; }
  });

  // Apply typography on mount and whenever values change
  useEffect(() => {
    applyTypography(fontFamily, fontSize);
  }, [fontFamily, fontSize]);

  const setFontFamily = useCallback((f: FontFamily) => {
    setFontFamilyState(f);
    try { localStorage.setItem(FONT_FAMILY_KEY, f); } catch { /* ignore */ }
    applyTypography(f, fontSize);
  }, [fontSize]);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    try { localStorage.setItem(FONT_SIZE_KEY, s); } catch { /* ignore */ }
    applyTypography(fontFamily, s);
  }, [fontFamily]);

  return (
    <TypographyContext.Provider value={{ fontFamily, fontSize, setFontFamily, setFontSize }}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypography(): TypographyContextValue {
  const ctx = useContext(TypographyContext);
  // Return safe defaults when used outside provider (e.g. in tests)
  if (!ctx) {
    return {
      fontFamily: DEFAULT_FONT,
      fontSize: DEFAULT_SIZE,
      setFontFamily: () => {},
      setFontSize: () => {},
    };
  }
  return ctx;
}
