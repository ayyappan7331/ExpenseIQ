// Phase 8 — deep health check + version endpoint.

const mongoose = require('mongoose');
const { execSync } = require('child_process');
const pkg = require('../package.json');

let cachedGitSha;
const resolveGitSha = () => {
  if (cachedGitSha !== undefined) return cachedGitSha;
  if (process.env.GIT_SHA) {
    cachedGitSha = process.env.GIT_SHA;
    return cachedGitSha;
  }
  try {
    cachedGitSha = execSync('git rev-parse HEAD', {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (_e) {
    cachedGitSha = 'unknown';
  }
  return cachedGitSha;
};

// /api/health — happy-path response body is byte-identical to Phase 0
// (200 { status: 'ok', timestamp }). The new bit is the Mongo ping: when
// the DB is unreachable we return 503 { status: 'down', timestamp }.
exports.health = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('db unavailable');
    await db.admin().ping();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (_err) {
    res.status(503).json({ status: 'down', timestamp: new Date().toISOString() });
  }
};

exports.version = (req, res) => {
  res.json({
    version: pkg.version,
    gitSha: resolveGitSha(),
    nodeEnv: process.env.NODE_ENV || 'development',
  });
};
