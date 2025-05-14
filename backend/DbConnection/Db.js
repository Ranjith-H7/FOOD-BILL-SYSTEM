// DbConnection/Db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Chat_center');
    console.log('MongoDB connected ✅');
  } catch (error) {
    console.error('MongoDB connection failed ❌:', error);
    process.exit(1);
  }
};

module.exports = connectDB;