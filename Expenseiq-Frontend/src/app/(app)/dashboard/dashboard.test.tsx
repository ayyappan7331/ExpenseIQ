import { vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import DashboardPage from './page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter:   () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe('DashboardPage', () => {
  it('renders stat cards after data loads', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Income')).toBeInTheDocument();
      expect(screen.getByText('Expense')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  it('renders section cards for widgets', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Spending Trend')).toBeInTheDocument();
      expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
      expect(screen.getByText('Savings Goal')).toBeInTheDocument();
    });
  });
});
