import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@/test/utils/render';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { THEME_STORAGE_KEY } from '@/lib/themes';

function ThemeShowcase() {
  const { theme } = useTheme();
  return <div data-testid="current">{theme}</div>;
}

describe('ThemeProvider + useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('exposes the default theme when nothing is set', () => {
    render(<ThemeShowcase />);
    expect(screen.getByTestId('current').textContent).toBe('dark');
  });

  it('useTheme outside <ThemeProvider> throws a helpful error', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/inside <ThemeProvider>/i);
  });

  it('setTheme flips data-theme on <html> and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.setTheme('ocean');
    });

    expect(result.current.theme).toBe('ocean');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('ocean');
  });

  it('picks up a pre-applied data-theme attribute from the init script', () => {
    document.documentElement.setAttribute('data-theme', 'forest');
    render(<ThemeShowcase />);
    expect(screen.getByTestId('current').textContent).toBe('forest');
  });

  it('passes through an unrecognised data-theme attribute (validation is in ThemeInitScript)', () => {
    // ThemeProvider reads the DOM attribute as-is via useSyncExternalStore.
    // Validation/sanitisation happens in the pre-hydration ThemeInitScript,
    // not in the React provider.
    document.documentElement.setAttribute('data-theme', 'not-a-real-theme');
    render(<ThemeShowcase />);
    expect(screen.getByTestId('current').textContent).toBe('not-a-real-theme');
  });
});
