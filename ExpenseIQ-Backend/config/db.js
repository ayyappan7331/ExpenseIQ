const dns = require('dns');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Force Google DNS to resolve MongoDB SRV records (ISP DNS blocks SRV queries)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async (retries = 5, delayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      logger.info({ host: conn.connection.host }, 'MongoDB connected');
      return;
    } catch (err) {
      logger.error({ err: err.message, attempt, retries }, 'MongoDB connection error');
      if (attempt < retries) {
        logger.info({ delayMs }, 'Retrying MongoDB connection...');
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        logger.error('All MongoDB connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
