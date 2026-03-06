/**
 * Kontrolleri i autentifikimit – logjika e biznesit për regjistrim dhe login.
 * Regjistron përdorues, bën login dhe kthen JWT.
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'sm-automation-secret', {
    expiresIn: '7d',
  });
};

/**
 * Regjistron një përdorues të ri.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ky email është i zënë.' });
    }
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login – verifikon kredencialet dhe kthen token.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email ose fjalëkalim i gabuar.' });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
