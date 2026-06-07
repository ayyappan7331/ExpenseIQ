import { vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import TransactionsPage from './page';

vi.mock('next/navigation', () => ({
  usePathname:    () => '/transactions',
  useRouter:      () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('TransactionsPage', () => {
  it('renders the page header', async () => {
    render(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Financial Activity' })).toBeInTheDocument();
    });
  });

  it('renders filter chips (All, Income, Expense)', async () => {
    render(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Income' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expense' })).toBeInTheDocument();
    });
  });

  it('renders transaction data from MSW fixtures', async () => {
    render(<TransactionsPage />);
    await waitFor(() => {
      // Fixture has a Food expense
      const foodElements = screen.getAllByText('Food');
      expect(foodElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('search input filters transactions', async () => {
    render(<TransactionsPage />);
    await waitFor(() => screen.getByLabelText('Search transactions'));
    const search = screen.getByLabelText('Search transactions');
    await userEvent.type(search, 'Food');
    await waitFor(() => {
      const foodElements = screen.getAllByText('Food');
      expect(foodElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
