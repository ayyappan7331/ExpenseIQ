// Vitest global setup. Loaded once per test file via vitest.config.ts.
// - Adds Testing Library's jest-dom matchers (toBeInTheDocument, etc.).
// - Starts the MSW node server so any fetch() inside tests is intercepted.
// - Mocks Chart.js canvas context to prevent HTMLCanvasElement errors
// - Suppresses noisy jsdom navigation warnings

import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

// Mock HTMLCanvasElement.getContext to prevent Chart.js errors in tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

// Mock HTMLCanvasElement.toDataURL
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn(() => 'data:image/png;base64,'),
});

// Suppress jsdom navigation warnings and Chart.js canvas warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = String(args[0] ?? '');
  if (
    message.includes('Not implemented: navigation') ||
    message.includes('Not implemented: HTMLCanvasElement') ||
    message.includes('Failed to create chart')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Suppress Chart.js warn-level messages
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = String(args[0] ?? '');
  if (message.includes('Failed to create chart')) return;
  originalConsoleWarn(...args);
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
