// Runs before each test file (per jest.config setupFiles).
// Gives mongodb-memory-server enough room to spin up on slow / first-run Windows boxes.
process.env.MONGOMS_INSTANCE_STARTUP_TIMEOUT = '120000';
process.env.MONGOMS_DOWNLOAD_MIRROR = process.env.MONGOMS_DOWNLOAD_MIRROR || 'https://fastdl.mongodb.org';
