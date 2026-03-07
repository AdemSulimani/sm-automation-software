/**
 * Kontrolleri për Channel (Integration) – CRUD i mbrojtur me JWT.
 * Të gjitha operacionet janë të fushëzuara nga userId (vetëm channelet e përdoruesit).
 */

const Channel = require('../models/Channel');

/**
 * Listo të gjithë channelet e përdoruesit.
 */
const list = async (req, res, next) => {
  try {
    const channels = await Channel.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-accessToken'); // Mos kthe token në listë
    res.json({ success: true, data: channels });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një channel sipas id; vetëm nëse i përket përdoruesit.
 */
const getOne = async (req, res, next) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }
    // Opsional: mund të mos ekspozosh accessToken në GET (ose vetëm ****)
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
 * Përditëson një channel; vetëm nëse i përket përdoruesit. Përditëson vetëm fushat e lejuara.
 */
const update = async (req, res, next) => {
  try {
    const updates = {};
    for (const key of ALLOWED_CHANNEL_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const channel = await Channel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    );
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
 * Fshin një channel; vetëm nëse i përket përdoruesit.
 */
const remove = async (req, res, next) => {
  try {
    const channel = await Channel.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }
    res.json({ success: true, message: 'Kanali u fshi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
