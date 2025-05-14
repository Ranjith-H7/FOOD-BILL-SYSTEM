// server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./DbConnection/Db.js');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const Item = require('./models/items.js');
const allItems = require('./Dataset.js');
const PORT = process.env.PORT || 5001;
const crudRoutes = require('./Dashboard/Crud.js');
const authRoutes = require('./middleware/auth.js'); // Updated to use auth.js
const BillData = require('./displayTheBill.js');
const verifyTokenAndAdmin = require('./middleware/adminAuth.js');
const verifyTokenAndUser = require('./middleware/userAuth.js');

// Load environment variables
require('dotenv').config();

// Mount routes
app.use('/api/auth', authRoutes); // Authentication routes (login, register, etc.)
app.use('/dashboard', crudRoutes); // Existing CRUD routes
app.use('/api/bill', BillData); // Existing bill routes

// Connect to DB
connectDB();

// Home route
app.get('/', (req, res) => {
  res.send('Server is running...');
});

// POST route to insert all data from Dataset.js
app.post('/api/insert-items', async (req, res) => {
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
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Protected admin dashboard route
app.get('/api/admin/dashboard', verifyTokenAndAdmin, (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard', user: req.user });
});

// Protected user dashboard route
app.get('/api/user/dashboard', verifyTokenAndUser, (req, res) => {
  res.json({ message: 'Welcome to User Dashboard', user: req.user });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});