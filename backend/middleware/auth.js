const express = require('express');
const router = express.Router();
const register = require('../LoginSystem/register');
const login = require('../LoginSystem/login');
const forgotPassword = require('../LoginSystem/forgotPassword');
const otp = require('../LoginSystem/Otp');

router.post('/register', register.register);
router.post('/login', login.login);
router.post('/forgot-password', forgotPassword.sendOtp);
router.post('/verify-otp', otp.verifyOtpAndReset);

module.exports = router;
