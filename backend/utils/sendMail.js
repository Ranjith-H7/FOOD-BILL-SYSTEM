// utils/sendMail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendMail = async (to, subject, text) => {
  try {
    // Use environment variables with fallback to provided credentials
    const emailUser = process.env.EMAIL_USER || 'ranjith.ram390@gmail.com';
    const emailPass = process.env.EMAIL_PASS || 'jpwgqxnrijqxmkgx';

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not configured');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"TasteTab" <${emailUser}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', to, 'Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    throw new Error('Failed to send email: ' + error.message);
  }
};

module.exports = sendMail;