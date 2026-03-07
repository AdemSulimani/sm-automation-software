/**
 * Kontrolleri për konversacionet dhe mesazhet – Inbox dhe manual reply.
 * Klienti sheh vetëm konversacionet e kanaleve të veta; admin mund të shohë të gjitha ose sipas userId.
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { sendMessage } = require('../services/outboundService');

/**
 * Përcakton nëse përdoruesi ka të drejtë të aksesojë një channel.
 * Admin mund të aksesojë çdo channel; klienti vetëm channelet e veta.
 */
async function canAccessChannel(channelId, req) {
  const channel = await Channel.findById(channelId).lean();
  if (!channel) return false;
  if (req.user.role === 'admin') return true;
  return channel.userId && channel.userId.toString() === req.userId.toString();
}

/**
 * Listo konversacionet. Query: channelId (opsional), userId (opsional, vetëm admin – filtron sipas kanaleve të atij përdoruesi).
 */
const listConversations = async (req, res, next) => {
  try {
    const { channelId, userId } = req.query;
    let channelIds;

    if (req.user.role === 'admin' && userId) {
      const channels = await Channel.find({ userId }).select('_id').lean();
      channelIds = channels.map((c) => c._id);
    } else if (req.user.role === 'admin') {
      const channels = await Channel.find({}).select('_id').lean();
      channelIds = channels.map((c) => c._id);
    } else {
      const channels = await Channel.find({ userId: req.userId }).select('_id').lean();
      channelIds = channels.map((c) => c._id);
    }

    if (channelIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const filter = { channelId: { $in: channelIds } };
    if (channelId) {
      const allowed = channelIds.some((id) => id.toString() === channelId);
      if (!allowed) {
        return res.json({ success: true, data: [] });
      }
      filter.channelId = channelId;
    }

    const conversations = await Conversation.find(filter)
      .populate('channelId', 'name platform')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një konversacion sipas id; kontrollon që channel i përket përdoruesit ose admin.
 */
const getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('channelId', 'name platform')
      .lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }
    const allowed = await canAccessChannel(conversation.channelId?._id ?? conversation.channelId, req);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr mesazhet e një konversacioni, në rend kronologjik.
 */
const getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }
    const allowed = await canAccessChannel(conversation.channelId, req);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }

    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ timestamp: 1 })
      .lean();

    res.json({ success: true, data: { conversation, messages } });
  } catch (err) {
    next(err);
  }
};

/**
 * Dërgon mesazh manual (manual reply): dërgon në platformë dhe ruan në Message (direction 'out').
 * Body: { text }
 */
const postMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }
    const allowed = await canAccessChannel(conversation.channelId, req);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }

    const channel = await Channel.findById(conversation.channelId).exec();
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }

    const messageText = typeof text === 'string' ? text.trim() : '';
    if (!messageText) {
      return res.status(400).json({ success: false, message: 'Teksti i mesazhit është i zbrazët.' });
    }

    await sendMessage(channel, conversation.platformUserId, { text: messageText });

    const newMessage = await Message.create({
      conversationId: conversation._id,
      direction: 'out',
      content: { text: messageText },
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      $set: { lastMessageAt: new Date(), botPaused: true },
    });

    const payload = newMessage.toObject ? newMessage.toObject() : newMessage;
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listConversations,
  getConversation,
  getMessages,
  postMessage,
};
