/**
 * Kontrolleri i autentifikimit – logjika e biznesit për regjistrim dhe login.
 * Regjistron përdorues, bën login dhe kthen JWT.
 */

const User = require('../models/User');
const Business = require('../models/Business');
const Channel = require('../models/Channel');
const Contact = require('../models/Contact');
const ContactIdentity = require('../models/ContactIdentity');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AutomationRule = require('../models/AutomationRule');
const KeywordResponse = require('../models/KeywordResponse');
const OAuthMetaSession = require('../models/OAuthMetaSession');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'sm-automation-secret', {
    expiresIn: '7d',
  });
};

/**
 * Regjistron një përdorues të ri dhe krijon një biznes për të.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ky email është i zënë.' });
    }
    const business = await Business.create({ name: (name && name.trim()) ? `${name.trim()} – Biznes` : 'Biznesi im' });
    const user = await User.create({ name, email, password, businessId: business._id });
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
 * Përditëson profilin e përdoruesit të loguar (emër, email, companyInfo, fjalëkalim).
 * Për ndryshim fjalëkalimi: currentPassword, newPassword (min 6 karaktere).
 */
const updateMe = async (req, res, next) => {
  try {
    const { name, email, companyInfo, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    if (name !== undefined) user.name = name;
    if (companyInfo !== undefined) user.companyInfo = companyInfo;
    if (email !== undefined) {
      if (email && email.trim()) {
        const existing = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: req.userId } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Ky email është i zënë.' });
        }
        user.email = email.trim().toLowerCase();
      }
    }
    if (newPassword !== undefined && newPassword !== null && String(newPassword).trim()) {
      const pwd = String(newPassword).trim();
      if (pwd.length < 6) {
        return res.status(400).json({ success: false, message: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
      }
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ success: false, message: 'Fjalëkalimi aktual është i gabuar.' });
      }
      user.password = pwd;
    }
    await user.save();
    const data = user.toObject ? user.toObject() : user;
    delete data.password;
    data.role = data.role || 'client';
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me/export – eksport i të dhënave të përdoruesit (GDPR portabilitet).
 * Kthen JSON me profilin, kanale (pa tokena), kontakte, biseda dhe mesazhe.
 */
const exportMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    const channelIds = await Channel.find({
      $or: [{ userId: req.userId }, { businessId: user.businessId }],
    })
      .select('_id')
      .lean();
    const cids = channelIds.map((c) => c._id);
    const [channels, contacts, conversations, rules, keywordResponses] = await Promise.all([
      Channel.find({ _id: { $in: cids } }).select('-accessToken').lean(),
      Contact.find({ $or: [{ userId: req.userId }, { businessId: user.businessId }] }).lean(),
      Conversation.find({ channelId: { $in: cids } }).lean(),
      AutomationRule.find({ channelId: { $in: cids } }).lean(),
      KeywordResponse.find({ channelId: { $in: cids } }).lean(),
    ]);
    const convIds = conversations.map((c) => c._id);
    const messagesList = convIds.length ? await Message.find({ conversationId: { $in: convIds } }).lean() : [];
    const data = {
      exportedAt: new Date().toISOString(),
      user: { name: user.name, email: user.email, role: user.role || 'client', companyInfo: user.companyInfo },
      channels,
      contacts,
      conversations,
      messages: messagesList,
      automationRules: rules,
      keywordResponses,
    };
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/auth/me – fshirje e llogarisë dhe të dhënave (GDPR “e drejta për të u harruar”).
 * Body: { password } për konfirmim.
 */
const deleteMe = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    if (!password || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: 'Fjalëkalimi është i gabuar. Vendosni fjalëkalimin për të konfirmuar fshirjen.' });
    }
    const channelIds = (await Channel.find({ $or: [{ userId: req.userId }, { businessId: user.businessId }] }).select('_id').lean()).map((c) => c._id);
    const conversationIds = (await Conversation.find({ channelId: { $in: channelIds } }).select('_id').lean()).map((c) => c._id);
    await Promise.all([
      Message.deleteMany({ conversationId: { $in: conversationIds } }),
      Conversation.deleteMany({ channelId: { $in: channelIds } }),
      ContactIdentity.deleteMany({ contactId: { $in: (await Contact.find({ $or: [{ userId: req.userId }, { businessId: user.businessId }] }).select('_id').lean()).map((x) => x._id) } }),
      Contact.deleteMany({ $or: [{ userId: req.userId }, { businessId: user.businessId }] }),
      AutomationRule.deleteMany({ channelId: { $in: channelIds } }),
      KeywordResponse.deleteMany({ channelId: { $in: channelIds } }),
      Channel.deleteMany({ _id: { $in: channelIds } }),
      OAuthMetaSession.deleteMany({ userId: req.userId }),
    ]);
    const otherUsersWithBusiness = await User.countDocuments({ businessId: user.businessId, _id: { $ne: req.userId } });
    if (user.businessId && otherUsersWithBusiness === 0) {
      await Business.findByIdAndDelete(user.businessId);
    }
    await User.findByIdAndDelete(req.userId);
    res.json({ success: true, message: 'Llogaria dhe të dhënat u fshin.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateMe, exportMe, deleteMe };
