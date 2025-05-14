const User = require('../models/userList');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email and password are required',
      field: !email ? 'email' : 'password'
    });
  }

  try {
    // Find user by email only (as per your requirement)
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        field: 'email'
      });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        field: 'password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role 
      }, 
      process.env.JWT_SECRET || 'ranjith_324232', 
      { expiresIn: '1h' }
    );

    // Successful login response
    res.json({ 
      success: true,
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Internal server error'
     
    });
  }
};