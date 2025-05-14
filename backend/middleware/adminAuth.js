// middleware/adminAuth.js
const jwt = require('jsonwebtoken');

const verifyTokenAndAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ranjith_324232');
    req.user = decoded;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access Denied: Admins only' });
    }

    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid Token', error: err.message });
  }
};

module.exports = verifyTokenAndAdmin;