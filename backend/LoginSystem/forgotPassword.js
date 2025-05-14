// LoginSystem/forgotPassword.js
const User = require('../models/userList');
const sendMail = require('../utils/sendMail');

exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    console.log('Received forgot-password request:', { email });

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Valid email is required', field: 'email' });
    }

    // Find user
    const user = await User.findOne({ email });
    console.log('User found:', user ? user.email : 'No user');
    if (!user) {
      return res.status(404).json({ error: 'Email not found', field: 'email' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);

    // Save OTP
    user.otp = otp;
    await user.save();
    console.log('OTP saved to user:', user.otp);

    // Send OTP email
    try {
      await sendMail(email, 'TasteTab OTP for Password Reset', `Your OTP is: ${otp}`);
      console.log('OTP email sent to:', email);
      res.json({ message: 'OTP sent to email' });
    } catch (mailError) {
      console.error('Email sending failed:', mailError);
      return res.status(500).json({
        error: 'Failed to send OTP email. Please try again later.',
        field: 'email',
        details: mailError.message,
      });
    }
  } catch (err) {
    console.error('sendOtp error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
    });
  }
};