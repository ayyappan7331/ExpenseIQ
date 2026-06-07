// Shared lifecycle hooks. Each test file calls setupTestDb() at top level
// so we don't depend on a Jest global-setup option that varies by version.

const db = require('./db');

function setupTestDb() {
  beforeAll(async () => {
    await db.connect();
  });
  afterEach(async () => {
    await db.clear();
  });
  afterAll(async () => {
    await db.disconnect();
  });
}

module.exports = { setupTestDb };
