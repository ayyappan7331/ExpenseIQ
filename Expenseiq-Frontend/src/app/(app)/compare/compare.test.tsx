import { render, screen, waitFor } from '@/test/utils/render';
import ComparePage from './page';

describe('ComparePage', () => {
  it('renders the page header and month selectors', async () => {
    render(<ComparePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Compare Months' })).toBeInTheDocument();
      expect(screen.getByLabelText('First month')).toBeInTheDocument();
      expect(screen.getByLabelText('Second month')).toBeInTheDocument();
    });
  });

  it('renders comparison stats after data loads', async () => {
    render(<ComparePage />);
    await waitFor(() => {
      expect(screen.getByText('Income Change')).toBeInTheDocument();
      expect(screen.getByText('Expense Change')).toBeInTheDocument();
      expect(screen.getByText('Balance Change')).toBeInTheDocument();
    });
  });
});
