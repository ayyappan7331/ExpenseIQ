// Browser-side MSW worker. Not wired into the app yet — Phase F2 will
// optionally enable this in development so the dev server can boot
// without the backend running. Kept here so the worker file lives
// alongside the handlers from day one.

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
