const express = require('express');
const router = express.Router();
const Item = require('../models/items');
const verifyTokenAndAdmin = require('../middleware/adminAuth');

// GET all items
router.get('/items', verifyTokenAndAdmin, async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// POST a new item
router.post('/items', verifyTokenAndAdmin, async (req, res) => {
  try {
    const { name, category, price, imageUrl, openTime, closeTime } = req.body;
    const newItem = new Item({ name, category, price, imageUrl, openTime, closeTime });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add item' });
  }
});

// PUT (update) an item
router.put('/items/:id', verifyTokenAndAdmin, async (req, res) => {
  try {
    const { name, category, price, imageUrl, openTime, closeTime } = req.body;
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { name, category, price, imageUrl, openTime, closeTime },
      { new: true }
    );
    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });
    res.json(updatedItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update item' });
  }
});

// DELETE an item
router.delete('/items/:id', verifyTokenAndAdmin, async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;