/**
 * Kontrolleri për Channel (Integration) – CRUD i mbrojtur me JWT.
 * Të gjitha operacionet janë të fushëzuara nga userId (vetëm channelet e përdoruesit).
 */

const Channel = require('../models/Channel');

/** Admin mund të aksesojë çdo channel; klienti vetëm channelet e veta. */
const ensureUserCanAccessChannel = async (req, channelId) => {
  const channel = await Channel.findOne({ _id: channelId });
  if (!channel) return null;
  if (req.user.role === 'admin') return channel;
  return channel.userId && channel.userId.toString() === req.userId.toString() ? channel : null;
};

/**
 * Listo channelet. Klienti: vetëm të vetat; admin: mund të filtrojë me userId (channelet e atij klienti).
 */
const list = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const filterUserId =
      req.user.role === 'admin' && userId ? userId : req.userId.toString();
    const channels = await Channel.find({ userId: filterUserId })
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
      platform,
      platformPageId: platformPageId ?? null,
      viberBotId: viberBotId ?? null,
      accessToken,
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
      if (req.body[key] !== undefined) updates[key] = req.body[key];
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
