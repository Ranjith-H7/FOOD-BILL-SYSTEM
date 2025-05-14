// LoginSystem/register.js
const User = require('../models/userList');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  const { username, email, phone, password, confirmPassword, role } = req.body;

  // Basic validation
  if (!username || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({
      error: 'Username, email, password, confirmPassword, and role are required',
      field: !username
        ? 'username'
        : !email
        ? 'email'
        : !password
        ? 'password'
        : !confirmPassword
        ? 'confirmPassword'
        : 'role',
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match', field: 'confirmPassword' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"', field: 'role' });
  }

  // Validate phone if provided
  if (phone && !/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone must be a valid 10-digit number', field: 'phone' });
  }

  try {
    // Check for existing user
    const userExists = await User.findOne({
      $or: [{ username }, { email }, ...(phone ? [{ phone }] : [])],
    });

    if (userExists) {
      let errorField = '';
      if (userExists.username === username) errorField = 'username';
      else if (userExists.email === email) errorField = 'email';
      else if (userExists.phone === phone) errorField = 'phone';
      return res.status(400).json({
        error: `${errorField.charAt(0).toUpperCase() + errorField.slice(1)} already exists`,
        field: errorField,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      phone: phone || null,
      password: hashedPassword,
      role,
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};