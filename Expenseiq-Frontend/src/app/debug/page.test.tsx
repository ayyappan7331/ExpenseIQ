import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import DebugPage from './page';

describe('/debug page', () => {
  it('renders all four section headings', () => {
    render(<DebugPage />);
    expect(screen.getByRole('heading', { name: /API debug/i })).toBeInTheDocument();
    expect(screen.getByText('GET /api/health')).toBeInTheDocument();
    expect(screen.getByText('GET /api/version')).toBeInTheDocument();
    expect(screen.getByText('GET /api/profiles')).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/transactions/)).toBeInTheDocument();
  });

  it('renders MSW fixture data after the queries resolve', async () => {
    render(<DebugPage />);
    await waitFor(() => {
      // Health fixture: { status: 'ok', timestamp: ... }
      expect(screen.getByText(/"status": "ok"/)).toBeInTheDocument();
    });
    await waitFor(() => {
      // Profiles fixture contains Personal + Work
      expect(screen.getByText(/"name": "Personal"/)).toBeInTheDocument();
      expect(screen.getByText(/"name": "Work"/)).toBeInTheDocument();
    });
  });
});
