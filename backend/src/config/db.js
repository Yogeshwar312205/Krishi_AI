const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishiflow';
    logger.info('Initiating MongoDB connection...');
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    logger.info(`MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`MongoDB Notice: ${error.message}`);
    logger.warn('Running with Mock In-Memory Store active alongside Mongoose Schemas for seamless demo functionality.');
    isConnected = false;
  }
};

const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };
