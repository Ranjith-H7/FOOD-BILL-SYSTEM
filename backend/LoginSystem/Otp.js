// LoginSystem/Otp.js
const User = require('../models/userList');
const bcrypt = require('bcrypt');

exports.verifyOtpAndReset = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    console.log('Received verify-otp request:', { email, otp });

    // Validate inputs
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: 'Email, OTP, and new password are required',
        field: !email ? 'email' : !otp ? 'otp' : 'newPassword',
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be 8+ characters with 1 uppercase, 1 number, 1 special character',
        field: 'newPassword',
      });
    }

    const user = await User.findOne({ email });
    console.log('User found:', user ? user.email : 'No user');
    if (!user) {
      return res.status(404).json({ error: 'Email not found', field: 'email' });
    }

    console.log('Stored OTP:', user.otp, 'Provided OTP:', otp);
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP', field: 'otp' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null; // Clear OTP after use
    await user.save();
    console.log('Password updated for user:', email);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('verifyOtpAndReset error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};