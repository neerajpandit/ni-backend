const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'campussphere';

  if (!uri) {
    logger.error('MONGODB_URI is not defined in environment');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { dbName });
    logger.info(`MongoDB connected — database: ${dbName}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`, err);
    throw err;
  }
}

module.exports = { connectDatabase };
