/**
 * Kontrolleri për AutomationRule – CRUD i mbrojtur me JWT.
 * Vetëm rregullat e channeleve që i përkasin përdoruesit.
 */

const Channel = require('../models/Channel');
const AutomationRule = require('../models/AutomationRule');

/** Admin mund të aksesojë çdo channel; klienti vetëm channelet e veta. */
const ensureUserCanAccessChannel = async (req, channelId) => {
  const channel = await Channel.findOne({ _id: channelId }).lean();
  if (!channel) return null;
  if (req.user.role === 'admin') return channel;
  return channel.userId && channel.userId.toString() === req.userId.toString() ? channel : null;
};

/**
 * Listo rregullat e automatizimit për një channel (channelId në query); verifikon pronësinë.
 */
const list = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    if (!channelId) {
      return res.status(400).json({ success: false, message: 'channelId në query është i detyrueshëm.' });
    }
    const channel = await ensureUserCanAccessChannel(req, channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet ose nuk ju përket.' });
    }
    const rules = await AutomationRule.find({ channelId }).sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një rregull sipas id; verifikon që kanali i tij i përket përdoruesit.
 */
const getOne = async (req, res, next) => {
  try {
    const rule = await AutomationRule.findById(req.params.id).populate('channelId');
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rregulli nuk u gjet.' });
    }
    const channel = await ensureUserCanAccessChannel(req, rule.channelId._id ?? rule.channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Rregulli nuk u gjet ose nuk ju përket.' });
    }
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

/**
 * Krijon një rregull të ri; channelId duhet të jetë i përdoruesit.
 */
const create = async (req, res, next) => {
  try {
    const { channelId, trigger, triggerValue, triggerRegex, responseType, responsePayload, priority, active } =
      req.body;
    if (!channelId) {
      return res.status(400).json({ success: false, message: 'channelId është i detyrueshëm.' });
    }
    const channel = await ensureUserCanAccessChannel(req, channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet ose nuk ju përket.' });
    }
    const rule = await AutomationRule.create({
      channelId,
      trigger,
      triggerValue: triggerValue ?? null,
      triggerRegex: triggerRegex ?? null,
      responseType,
      responsePayload,
      priority: priority ?? 0,
      active: active !== false,
    });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

/**
 * Përditëson një rregull; verifikon pronësinë e channelit.
 */
const update = async (req, res, next) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rregulli nuk u gjet.' });
    }
    const channel = await ensureUserCanAccessChannel(req, rule.channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Rregulli nuk ju përket.' });
    }
    const { trigger, triggerValue, triggerRegex, responseType, responsePayload, priority, active } = req.body;
    if (trigger !== undefined) rule.trigger = trigger;
    if (triggerValue !== undefined) rule.triggerValue = triggerValue;
    if (triggerRegex !== undefined) rule.triggerRegex = triggerRegex;
    if (responseType !== undefined) rule.responseType = responseType;
    if (responsePayload !== undefined) rule.responsePayload = responsePayload;
    if (priority !== undefined) rule.priority = priority;
    if (active !== undefined) rule.active = active;
    await rule.save();
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

/**
 * Fshin një rregull; verifikon pronësinë e channelit.
 */
const remove = async (req, res, next) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rregulli nuk u gjet.' });
    }
    const channel = await ensureUserCanAccessChannel(req, rule.channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Rregulli nuk ju përket.' });
    }
    await AutomationRule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Rregulli u fshi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
