/**
 * Kontrolleri për KeywordResponse – CRUD i mbrojtur me JWT.
 * Vetëm përgjigjet e channeleve që i përkasin përdoruesit.
 */

const Channel = require('../models/Channel');
const KeywordResponse = require('../models/KeywordResponse');

const ensureUserOwnsChannel = async (userId, channelId) => {
  const channel = await Channel.findOne({ _id: channelId, userId });
  return channel;
};

/**
 * Listo përgjigjet me keyword për një channel (channelId në query); verifikon pronësinë.
 */
const list = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    if (!channelId) {
      return res.status(400).json({ success: false, message: 'channelId në query është i detyrueshëm.' });
    }
    const channel = await ensureUserOwnsChannel(req.userId, channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet ose nuk ju përket.' });
    }
    const responses = await KeywordResponse.find({ channelId }).sort({ createdAt: -1 });
    res.json({ success: true, data: responses });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një përgjigje keyword sipas id; verifikon që kanali i saj i përket përdoruesit.
 */
const getOne = async (req, res, next) => {
  try {
    const doc = await KeywordResponse.findById(req.params.id).populate('channelId');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Përgjigja nuk u gjet.' });
    }
    const channel = await ensureUserOwnsChannel(req.userId, doc.channelId._id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Përgjigja nuk ju përket.' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * Krijon një përgjigje keyword; channelId duhet të jetë i përdoruesit.
 */
const create = async (req, res, next) => {
  try {
    const { channelId, keywords, keywordRegex, responseText, responsePayload, caseSensitive, active } =
      req.body;
    if (!channelId) {
      return res.status(400).json({ success: false, message: 'channelId është i detyrueshëm.' });
    }
    const channel = await ensureUserOwnsChannel(req.userId, channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet ose nuk ju përket.' });
    }
    const doc = await KeywordResponse.create({
      channelId,
      keywords: keywords ?? [],
      keywordRegex: keywordRegex ?? null,
      responseText: responseText ?? null,
      responsePayload: responsePayload ?? null,
      caseSensitive: caseSensitive ?? false,
      active: active !== false,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * Përditëson një përgjigje keyword; verifikon pronësinë e channelit.
 */
const update = async (req, res, next) => {
  try {
    const doc = await KeywordResponse.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Përgjigja nuk u gjet.' });
    }
    const channel = await ensureUserOwnsChannel(req.userId, doc.channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Përgjigja nuk ju përket.' });
    }
    const { keywords, keywordRegex, responseText, responsePayload, caseSensitive, active } = req.body;
    if (keywords !== undefined) doc.keywords = keywords;
    if (keywordRegex !== undefined) doc.keywordRegex = keywordRegex;
    if (responseText !== undefined) doc.responseText = responseText;
    if (responsePayload !== undefined) doc.responsePayload = responsePayload;
    if (caseSensitive !== undefined) doc.caseSensitive = caseSensitive;
    if (active !== undefined) doc.active = active;
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * Fshin një përgjigje keyword; verifikon pronësinë e channelit.
 */
const remove = async (req, res, next) => {
  try {
    const doc = await KeywordResponse.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Përgjigja nuk u gjet.' });
    }
    const channel = await ensureUserOwnsChannel(req.userId, doc.channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Përgjigja nuk ju përket.' });
    }
    await KeywordResponse.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Përgjigja u fshi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
