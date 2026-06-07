import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/render';
import { AppShell } from './AppShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter:   () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('AppShell', () => {
  it('renders sidebar, topbar, and children', () => {
    render(
      <AppShell>
        <div data-testid="child">page body</div>
      </AppShell>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('page-title')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('hamburger toggles mobile sidebar via data-mobile-open', async () => {
    const user = userEvent.setup();
    render(<AppShell>x</AppShell>);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).not.toHaveAttribute('data-mobile-open');

    await user.click(screen.getByLabelText('Open menu'));
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
  });
});
