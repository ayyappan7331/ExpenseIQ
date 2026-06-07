import { render, screen, waitFor } from '@/test/utils/render';
import { ProfileManager } from '@/components/layout/ProfileManager';

describe('ProfileManager', () => {
  it('renders profile list when open', async () => {
    render(<ProfileManager open={true} onClose={() => {}} />);
    await waitFor(() => {
      // MSW fixture has 'Personal' and 'Work' profiles
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  it('shows active badge for current profile', async () => {
    render(<ProfileManager open={true} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('renders nothing when closed', () => {
    render(<ProfileManager open={false} onClose={() => {}} />);
    expect(screen.queryByText('Profiles')).not.toBeInTheDocument();
  });

  it('shows Add Profile button', async () => {
    render(<ProfileManager open={true} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add profile/i })).toBeInTheDocument();
    });
  });
});
