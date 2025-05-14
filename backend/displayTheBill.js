// backend/displayTheBill.js
const express = require('express');
const router = express.Router();
const Bill = require('./models/Bill');
const verifyTokenAndAdmin = require('./middleware/adminAuth');
const verifyTokenAndUser = require('./middleware/userAuth');

// GET all bills (admin only)
router.get('/bills', verifyTokenAndAdmin, async (req, res) => {
  try {
    const bills = await Bill.find();
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// POST a new bill (user or admin)
router.post('/bills', verifyTokenAndUser, async (req, res) => {
  try {
    const { items, grandTotal, paymentMethod, status } = req.body;
    const newBill = new Bill({
      items,
      grandTotal,
      paymentMethod,
      status,
    });
    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (error) {
    res.status(400).json({ error: 'Failed to save bill' });
  }
});

module.exports = router;