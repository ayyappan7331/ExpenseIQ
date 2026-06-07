import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, isThemeKey, LIGHT_THEMES, THEMES, THEME_KEYS } from './themes';

describe('themes registry', () => {
  it('exports exactly 28 themes', () => {
    expect(THEME_KEYS).toHaveLength(28);
  });

  it('includes all 8 original legacy SPA themes', () => {
    const originals = ['dark', 'forest', 'lavender', 'light', 'monokai', 'nord', 'ocean', 'sunset'];
    for (const k of originals) expect(THEME_KEYS).toContain(k);
  });

  it('every theme has the expected 13 fields', () => {
    const expected = [
      'label',
      'bg',
      'bg2',
      'bg3',
      'card',
      'text',
      'text2',
      'text3',
      'accent',
      'accent2',
      'income',
      'expense',
      'warning',
    ].sort();
    for (const key of THEME_KEYS) {
      const meta = THEMES[key];
      expect(Object.keys(meta).sort()).toEqual(expected);
    }
  });

  it('every colour is a valid hex string', () => {
    for (const key of THEME_KEYS) {
      const meta = THEMES[key];
      for (const [field, value] of Object.entries(meta)) {
        if (field === 'label') continue;
        expect(value, `${key}.${field}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('default theme is dark', () => {
    expect(DEFAULT_THEME).toBe('dark');
  });

  it('LIGHT_THEMES contains the light-looking themes', () => {
    // Expanded from original 2 to 10 light themes
    const expectedLights = ['light', 'lavender', 'rose', 'slate', 'mint', 'caramel', 'sakura', 'teal', 'glacier', 'paper'];
    for (const k of expectedLights) expect(LIGHT_THEMES).toContain(k);
    expect(LIGHT_THEMES.length).toBe(10);
  });

  describe('isThemeKey', () => {
    it('accepts every registered theme', () => {
      for (const key of THEME_KEYS) {
        expect(isThemeKey(key)).toBe(true);
      }
    });

    it('rejects unknown and non-string values', () => {
      expect(isThemeKey('nope')).toBe(false);
      expect(isThemeKey('')).toBe(false);
      expect(isThemeKey(null)).toBe(false);
      expect(isThemeKey(undefined)).toBe(false);
      expect(isThemeKey(42)).toBe(false);
    });
  });

  it('legacy parity: dark theme accent is #7c6ff7 (the brand purple)', () => {
    expect(THEMES.dark.accent).toBe('#7c6ff7');
    expect(THEMES.dark.bg).toBe('#0b0d14');
    expect(THEMES.light.bg).toBe('#f0f2f8');
  });
});
