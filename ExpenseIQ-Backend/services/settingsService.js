const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const httpError = require('../utils/httpError');

// Atlas free tier (M0) cap
const FREE_TIER_LIMIT_BYTES = 512 * 1024 * 1024;

const get = async ({ profileId = 'default' } = {}) => {
  let settings = await Settings.findOne({ profileId });
  if (!settings) {
    settings = await Settings.create({ profileId });
  }
  return settings;
};

const update = (data) => {
  const { profileId = 'default' } = data || {};
  return Settings.findOneAndUpdate({ profileId }, data, { upsert: true, new: true });
};

const dbStats = async () => {
  const db = mongoose.connection.db;
  if (!db) throw httpError(503, 'DB not connected');
  const stats = await db.stats();
  const used = (stats.dataSize || 0) + (stats.indexSize || 0);
  return {
    dataSize: stats.dataSize || 0,
    indexSize: stats.indexSize || 0,
    storageSize: stats.storageSize || 0,
    usedBytes: used,
    limitBytes: FREE_TIER_LIMIT_BYTES,
    collections: stats.collections || 0,
    objects: stats.objects || 0,
    db: db.databaseName,
  };
};

module.exports = { get, update, dbStats };
