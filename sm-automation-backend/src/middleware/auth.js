/**
 * Middleware për mbrojtjen e rrugëve me JWT.
 * Verifikon token-in dhe vendos req.userId për përdorim në controllerë.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Nuk jeni të autentifikuar.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sm-automation-secret');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    req.userId = user._id;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token i pavlefshëm ose i skaduar.' });
    }
    next(err);
  }
};

/**
 * Kërkon që përdoruesi të jetë admin. Duhet përdorur pas protect.
 */
const requireAdmin = (req, res, next) => {
  const role = req.user?.role ?? 'client';
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Vetëm admin ka të drejtë.' });
  }
  next();
};

module.exports = { protect, requireAdmin };
