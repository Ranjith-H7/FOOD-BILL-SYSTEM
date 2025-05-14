// backend/models/items.js
const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true },
});

module.exports = mongoose.model('Item', itemSchema);