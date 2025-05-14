
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Chat_center');
    console.log('MongoDB connected ✅');
  } catch (error) {
    console.error('MongoDB connection failed ❌:', error);
    process.exit(1);
  }
};
connectDB();

// Razorpay instance
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_8GbTvyO0t2rPVW',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'vaN2LgGg3A4hAiII8bfwSbtA',
  });
} catch (error) {
  console.warn('Razorpay initialization failed:', error.message);
}

// Load models and routes safely
let Item, allItems, crudRoutes, authRoutes, BillData, verifyTokenAndAdmin, verifyTokenAndUser;
try {
  Item = require('./models/items.js');
  allItems = require('./Dataset.js');
  crudRoutes = require('./Dashboard/Crud.js');
  authRoutes = require('./middleware/auth.js');
  BillData = require('./displayTheBill.js');
  verifyTokenAndAdmin = require('./middleware/adminAuth.js');
  verifyTokenAndUser = require('./middleware/userAuth.js');
} catch (error) {
  console.error('Failed to load one or more modules:', error.message);
}

// Mount routes
app.use('/api/auth', authRoutes || ((req, res) => res.status(503).json({ error: 'Auth routes unavailable' })));
app.use('/dashboard', crudRoutes || ((req, res) => res.status(503).json({ error: 'CRUD routes unavailable' })));
app.use('/api/bill', BillData || ((req, res) => res.status(503).json({ error: 'Bill routes unavailable' })));

// Home route
app.get('/', (req, res) => {
  res.send('Server is running...');
});

// POST route to insert all data from Dataset.js
app.post('/api/insert-items', async (req, res) => {
  if (!Item) return res.status(503).json({ error: 'Item model unavailable' });
  try {
    const savedItems = await Item.insertMany(allItems);
    res.status(201).json(savedItems);
  } catch (error) {
    console.error('Failed to insert items:', error);
    res.status(500).json({ error: 'Item insertion failed' });
  }
});

// GET route to fetch items
app.get('/api/items', async (req, res) => {
  if (!Item) return res.status(503).json({ error: 'Item model unavailable' });
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Protected admin dashboard route
app.get('/api/admin/dashboard', verifyTokenAndAdmin || ((req, res) => res.status(503).json({ error: 'Admin auth unavailable' })), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard', user: req.user });
});

// Protected user dashboard route
app.get('/api/user/dashboard', verifyTokenAndUser || ((req, res) => res.status(503).json({ error: 'User auth unavailable' })), (req, res) => {
  res.json({ message: 'Welcome to User Dashboard', user: req.user });
});

// Razorpay: Create order
app.post('/create-order', async (req, res) => {
  if (!razorpay) return res.status(503).json({ error: 'Razorpay unavailable' });
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    console.error('Invalid amount:', amount);
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });
    console.log('Order created:', order);
    res.json({ order_id: order.id, amount: order.amount });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Razorpay: Fetch QR code
app.get('/fetch-qr', async (req, res) => {
  if (!razorpay) return res.status(503).json({ error: 'Razorpay unavailable' });
  const qrCodeId = 'qr_QTL1iEysHLqdTj'; // Replace with your actual QR code ID
  try {
    const qr = await razorpay.qrCode.fetch(qrCodeId);
    console.log('QR code fetched:', qr);
    if (qr.status === 'closed') {
      return res.status(400).json({ error: 'QR code is closed or expired' });
    }
    res.json({
      qr_id: qr.id,
      image_url: qr.image_url,
      amount: qr.fixed_amount ? qr.payment_amount / 100 : null,
    });
  } catch (error) {
    console.error('Error fetching QR code:', error.message);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

// Razorpay: Verify payment and get payment method
app.post('/verify-payment', async (req, res) => {
  if (!razorpay) return res.status(503).json({ error: 'Razorpay unavailable' });
  const { payment_id } = req.body;

  if (!payment_id) {
    console.error('Payment ID missing');
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  try {
    const payment = await razorpay.payments.fetch(payment_id);
    console.log('Payment fetched:', payment);
    res.json({ method: payment.method || 'unknown' });
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
