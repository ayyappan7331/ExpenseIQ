import { render, screen } from '@/test/utils/render';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function ThrowingComponent(): never {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  // Suppress React's error boundary console.error in tests
  const originalError = console.error;
  beforeAll(() => { console.error = () => {}; });
  afterAll(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>Hello</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
