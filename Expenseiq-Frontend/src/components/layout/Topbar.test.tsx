import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/render';
import { Topbar } from './Topbar';

const mockUsePathname = vi.fn<() => string | null>(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter:   () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('Topbar', () => {
  it('renders the page title derived from pathname', () => {
    mockUsePathname.mockReturnValueOnce('/transactions');
    render(<Topbar onMenuClick={() => {}} />);
    expect(screen.getByTestId('page-title').textContent).toBe('Transaction');
  });

  it('falls back to "ExpenseIQ" on an unknown path', () => {
    mockUsePathname.mockReturnValueOnce('/something');
    render(<Topbar onMenuClick={() => {}} />);
    expect(screen.getByTestId('page-title').textContent).toBe('ExpenseIQ');
  });

  it('renders month filter and theme toggle affordances', () => {
    render(<Topbar onMenuClick={() => {}} />);
    expect(screen.getByLabelText('Month filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('hamburger fires onMenuClick', async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();
    render(<Topbar onMenuClick={onMenuClick} />);
    await user.click(screen.getByLabelText('Open menu'));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
