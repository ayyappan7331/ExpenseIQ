import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/render';
import { Sidebar } from './Sidebar';
import { NAV_ITEMS } from './nav';

const mockUsePathname = vi.fn<() => string | null>(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Sidebar', () => {
  it('renders all 9 legacy nav items as links', () => {
    render(<Sidebar mobileOpen={false} onCloseMobile={() => {}} />);
    for (const item of NAV_ITEMS) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.href);
    }
  });

  it('marks the current path with data-active', () => {
    mockUsePathname.mockReturnValueOnce('/transactions');
    render(<Sidebar mobileOpen={false} onCloseMobile={() => {}} />);
    expect(screen.getByTestId('nav-transactions')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('nav-dashboard')).not.toHaveAttribute('data-active');
  });

  it('matches nested routes (e.g. /transactions/abc keeps Transactions active)', () => {
    mockUsePathname.mockReturnValueOnce('/transactions/abc');
    render(<Sidebar mobileOpen={false} onCloseMobile={() => {}} />);
    expect(screen.getByTestId('nav-transactions')).toHaveAttribute('data-active', 'true');
  });

  it('exposes mobile-open state via data attribute', () => {
    const { rerender } = render(<Sidebar mobileOpen={false} onCloseMobile={() => {}} />);
    expect(screen.getByTestId('sidebar')).not.toHaveAttribute('data-mobile-open');

    rerender(<Sidebar mobileOpen={true} onCloseMobile={() => {}} />);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-mobile-open', 'true');
  });

  it('clicking a nav link fires onCloseMobile (so mobile sidebar shuts on navigate)', async () => {
    const onCloseMobile = vi.fn();
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();
    render(<Sidebar mobileOpen={true} onCloseMobile={onCloseMobile} />);
    await user.click(screen.getByTestId('nav-goals'));
    expect(onCloseMobile).toHaveBeenCalled();
  });
});
