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
      data: { id: user._id, name: user.name, email: user.email, role: user.role || 'client' },
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
      data: { id: user._id, name: user.name, email: user.email, role: user.role || 'client' },
      token,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Kthen profilin e përdoruesit të loguar (pa fjalëkalim); përfshin companyInfo.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    const data = user.toObject ? user.toObject() : user;
    data.role = data.role || 'client';
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Përditëson profilin e përdoruesit të loguar (emër, companyInfo).
 */
const updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'companyInfo'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateMe };
