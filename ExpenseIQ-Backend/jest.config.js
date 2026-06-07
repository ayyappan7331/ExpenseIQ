module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.{js,ts}'],
  testTimeout: 60000,
  setupFiles: ['<rootDir>/tests/jest.env.js'],
  verbose: true,
  clearMocks: true,

  // Phase 10 — let jest understand .ts files alongside .js. Only .ts/.tsx
  // is transformed; .js stays on Node's default loader.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],

  // Coverage (Phase 9). Run via `npm run test:coverage`.
  collectCoverageFrom: [
    'controllers/**/*.{js,ts}',
    'services/**/*.{js,ts}',
    'middleware/**/*.{js,ts}',
    'models/**/*.{js,ts}',
    'routes/**/*.{js,ts}',
    'validators/**/*.{js,ts}',
    'utils/**/*.{js,ts}',
    '!utils/api-client.js', // browser code, not part of the server
    '!utils/seed.js', // standalone CLI; not exercised by jest
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Per-folder thresholds take items OUT of the global bucket. With services/
  // and controllers/ called out separately, the "global" bucket here is
  // middleware + models + routes + validators + utils — where helper-fn
  // branch coverage is inherently lower (defensive fallbacks, env-specific
  // paths, etc.). Numbers are tuned to current measured coverage minus a
  // small buffer to prevent silent regressions.
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 60,
      functions: 80,
      lines: 80,
    },
    './services/': {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
    './controllers/': {
      statements: 95,
      branches: 70,
      functions: 95,
      lines: 95,
    },
  },
};
