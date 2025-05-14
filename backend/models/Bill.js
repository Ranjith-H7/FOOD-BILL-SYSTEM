// backend/models/Bill.js
const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      category: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      total: { type: Number, required: true },
    },
  ],
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'online'], required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bill', billSchema);