'use client';

import { ApiError } from '@/lib/api/errors';

/**
 * Converts an API error into a user-friendly message.
 * Used by page-level error states to avoid exposing raw HTTP status codes.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return 'Invalid request. Please check your input.';
      case 401: return 'Session expired. Please refresh the page.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested data was not found.';
      case 429: return 'Too many requests. Please wait a moment and try again.';
      case 503: return 'Service temporarily unavailable. Please try again shortly.';
      default:
        // Use the backend error message if available and not a raw status line
        if (error.body?.error && !error.body.error.match(/^\d{3}/)) {
          return error.body.error;
        }
        if (error.status >= 500) return 'Server error. Please try again shortly.';
        return fallback;
    }
  }
  // Network error (fetch failed, no response)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Cannot reach the server. Check your connection.';
  }
  return fallback;
}
