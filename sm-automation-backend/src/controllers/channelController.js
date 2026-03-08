/**
 * Kontrolleri për Channel (Integration) – CRUD i mbrojtur me JWT.
 * Tokenat e aksesit enkriptohen në pushim nëse TOKEN_ENCRYPTION_KEY është vendosur.
 */

const Channel = require('../models/Channel');
const { encrypt } = require('../services/tokenEncryption');

/** Admin mund të aksesojë çdo channel; klienti channelet e veta ose të biznesit të tij. */
const ensureUserCanAccessChannel = async (req, channelId) => {
  const channel = await Channel.findOne({ _id: channelId });
  if (!channel) return null;
  if (req.user.role === 'admin') return channel;
  if (channel.userId && channel.userId.toString() === req.userId.toString()) return channel;
  if (channel.businessId && req.user.businessId && channel.businessId.toString() === req.user.businessId.toString()) return channel;
  return null;
};

/**
 * Listo channelet. Klienti: channelet e biznesit të tij (ose vetëm të vetat nëse nuk ka businessId); admin: filtron me userId.
 */
const list = async (req, res, next) => {
  try {
    const { userId } = req.query;
    let filter = {};
    if (req.user.role === 'admin' && userId) {
      const User = require('../models/User');
      const targetUser = await User.findById(userId).select('businessId').lean();
      if (targetUser && targetUser.businessId) {
        filter = { businessId: targetUser.businessId };
      } else {
        filter = { userId };
      }
    } else if (req.user.role === 'admin') {
      filter = {};
    } else if (req.user.businessId) {
      filter = { businessId: req.user.businessId };
    } else {
      filter = { userId: req.userId };
    }
    const channels = await Channel.find(filter)
      .sort({ createdAt: -1 })
      .select('-accessToken');
    res.json({ success: true, data: channels });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një channel sipas id; përdoruesi vetëm nëse i përket, admin për çdo channel.
 */
const getOne = async (req, res, next) => {
  try {
    const channel = await ensureUserCanAccessChannel(req, req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }
    const payload = channel.toObject();
    if (payload.accessToken) payload.accessToken = '***';
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

/**
 * Krijon një channel të ri për përdoruesin.
 */
const create = async (req, res, next) => {
  try {
    const {
      platform,
      platformPageId,
      viberBotId,
      accessToken,
      webhookVerifyToken,
      status,
      name,
      aiInstructions,
    } = req.body;
    const channel = await Channel.create({
      userId: req.userId,
      businessId: req.user.businessId || null,
      platform,
      platformPageId: platformPageId ?? null,
      viberBotId: viberBotId ?? null,
      accessToken: encrypt(accessToken),
      webhookVerifyToken: webhookVerifyToken ?? null,
      status: status || 'active',
      name: name ?? null,
      aiInstructions: aiInstructions ?? '',
    });
    const data = channel.toObject();
    data.accessToken = '***';
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Fushat e lejuara për përditësim të channel-it (jo userId, platform, platformPageId, viberBotId). */
const ALLOWED_CHANNEL_UPDATE_FIELDS = [
  'name',
  'status',
  'webhookVerifyToken',
  'accessToken',
  'aiInstructions',
];

/**
 * Përditëson një channel; përdoruesi vetëm nëse i përket, admin për çdo channel.
 */
const update = async (req, res, next) => {
  try {
    const canAccess = await ensureUserCanAccessChannel(req, req.params.id);
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }
    const updates = {};
    for (const key of ALLOWED_CHANNEL_UPDATE_FIELDS) {
      if (req.body[key] === undefined) continue;
      if (key === 'accessToken' && req.body[key] && req.body[key] !== '***') {
        updates[key] = encrypt(req.body[key]);
      } else {
        updates[key] = req.body[key];
      }
    }
    const channel = await Channel.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }
    const data = channel.toObject();
    if (data.accessToken) data.accessToken = '***';
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Fshin një channel; përdoruesi vetëm nëse i përket, admin për çdo channel.
 */
const remove = async (req, res, next) => {
  try {
    const canAccess = await ensureUserCanAccessChannel(req, req.params.id);
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }
    await Channel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Kanali u fshi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
