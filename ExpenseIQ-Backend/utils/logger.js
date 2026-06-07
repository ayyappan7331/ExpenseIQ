// Phase 8 structured logger.
//   - test:        silent (pino level "silent") so jest output stays clean
//   - development: pretty-printed via pino-pretty (colorized, time-formatted)
//   - other:       raw JSON to stdout (production-shaped, machine-parseable)
//
// LOG_LEVEL env var overrides the default level in any env.

const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';
const isDev = !isTest && process.env.NODE_ENV !== 'production';

const level = process.env.LOG_LEVEL || (isTest ? 'silent' : 'info');

// The dev branch is only exercised when running `npm run dev` — covering it
// in jest would require spawning a real pino transport worker, which is more
// trouble than the line is worth.
/* istanbul ignore next */
const devOptions = {
  level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
};

const logger = pino(isDev ? devOptions : { level });

module.exports = logger;
