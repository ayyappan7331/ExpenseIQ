// Manages an isolated in-memory MongoDB for tests.
// This NEVER touches the MONGO_URI in .env — mongodb-memory-server
// downloads/runs a private mongod binary in a temp directory.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

async function disconnect() {
  // Be defensive: if connect() failed mid-way, dropDatabase would buffer-timeout.
  if (mongoose.connection.readyState === 1) {
    try { await mongoose.connection.dropDatabase(); } catch (_) { /* ignore */ }
  }
  try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
  if (mongod) {
    try { await mongod.stop(); } catch (_) { /* ignore */ }
    mongod = null;
  }
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
}

module.exports = { connect, disconnect, clear };
