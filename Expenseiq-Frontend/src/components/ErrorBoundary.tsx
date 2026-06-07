'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-expense mb-4" />
          <h2 className="text-lg font-semibold text-text mb-2">Something went wrong</h2>
          <p className="text-sm text-text-2 mb-6 max-w-md">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: undefined }); window.location.reload(); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 p-4 bg-bg-2 border border-card-border rounded-xl text-xs text-text-3 max-w-lg overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
