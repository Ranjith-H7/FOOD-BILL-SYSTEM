// models/userList.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: false, unique: true, sparse: true }, // Optional, unique if provided
  role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
  otp: { type: String, default: null },
});

module.exports = mongoose.model('User', userSchema);