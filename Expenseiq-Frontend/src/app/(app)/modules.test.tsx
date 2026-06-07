import { vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import SubscriptionsPage from '@/app/(app)/subscriptions/page';
import DebtsPage from '@/app/(app)/debts/page';
import CreditCardsPage from '@/app/(app)/creditcards/page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/creditcards',
  useRouter:   () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe('SubscriptionsPage', () => {
  it('renders the page header and add button', async () => {
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Subscriptions' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });
  });

  it('renders stat cards', async () => {
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });
});

describe('DebtsPage', () => {
  it('renders the page header', async () => {
    render(<DebtsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Debts' })).toBeInTheDocument();
    });
  });

  it('renders lent/borrowed tabs', async () => {
    render(<DebtsPage />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /lent/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /borrowed/i })).toBeInTheDocument();
    });
  });
});

describe('CreditCardsPage', () => {
  it('renders the page header', async () => {
    render(<CreditCardsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Credit Cards' })).toBeInTheDocument();
    });
  });

  it('renders portfolio summary', async () => {
    render(<CreditCardsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
      expect(screen.getByText('Statement Due')).toBeInTheDocument();
      // 'Due Soon' appears as both a tile label and a PaymentStatusBadge
      expect(screen.getAllByText('Due Soon').length).toBeGreaterThan(0);
    });
  });

  it('renders detected credit card from payment methods', async () => {
    render(<CreditCardsPage />);
    await waitFor(() => {
      // Card name appears in the card grid (Attention Center is hidden when no actionable status)
      expect(screen.getAllByText('HDFC Credit Card').length).toBeGreaterThan(0);
    });
  });
});
