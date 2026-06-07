import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/render';
import ThemesPage from './page';
import { THEME_KEYS } from '@/lib/themes';

// Mock Next.js router — ThemesPage uses useRouter for the back button
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/themes',
  useSearchParams: () => new URLSearchParams(),
}));

describe('/themes page', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders one card per registered theme', () => {
    render(<ThemesPage />);
    for (const key of THEME_KEYS) {
      expect(screen.getByTestId(`theme-card-${key}`)).toBeInTheDocument();
    }
    // 8 original + 20 new = 28 themes
    expect(THEME_KEYS).toHaveLength(28);
  });

  it('clicking a theme card flips the active theme', async () => {
    const user = userEvent.setup();
    render(<ThemesPage />);

    // dark is the default — the dark card should be aria-pressed initially
    expect(screen.getByTestId('theme-card-dark')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-card-sunset')).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByTestId('theme-card-sunset'));

    expect(screen.getByTestId('theme-card-sunset')).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('sunset');
  });

  it('clicking a new theme card applies the theme', async () => {
    const user = userEvent.setup();
    render(<ThemesPage />);

    await user.click(screen.getByTestId('theme-card-dracula'));
    expect(screen.getByTestId('theme-card-dracula')).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dracula');
  });
});
