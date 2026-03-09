/**
 * Kontrolleri për konversacionet dhe mesazhet – Inbox dhe manual reply.
 * Klienti sheh vetëm konversacionet e kanaleve të veta; admin mund të shohë të gjitha ose sipas userId.
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Business = require('../models/Business');
const { enqueueOutboundMessage } = require('../services/outboundQueueService');
const { canSendMessageWithin24h } = require('../services/messageWindowService');

/**
 * Përcakton nëse përdoruesi ka të drejtë të aksesojë një channel.
 * Admin mund të aksesojë çdo channel; klienti channelet e veta ose të biznesit.
 */
async function canAccessChannel(channelId, req) {
  const channel = await Channel.findById(channelId).lean();
  if (!channel) return false;
  if (req.user.role === 'admin') return true;
  if (channel.userId && channel.userId.toString() === req.userId.toString()) return true;
  if (channel.businessId && req.user.businessId && channel.businessId.toString() === req.user.businessId.toString()) return true;
  return false;
}

/**
 * Listo konversacionet. Query: channelId (opsional), userId (opsional, vetëm admin – filtron sipas kanaleve të atij përdoruesi).
 */
const listConversations = async (req, res, next) => {
  try {
    const { channelId, userId } = req.query;
    let channelIds;

    if (req.user.role === 'admin' && userId) {
      const User = require('../models/User');
      const targetUser = await User.findById(userId).select('businessId').lean();
      const adminFilter = targetUser && targetUser.businessId ? { businessId: targetUser.businessId } : { userId };
      const channels = await Channel.find(adminFilter).select('_id').lean();
      channelIds = channels.map((c) => c._id);
    } else if (req.user.role === 'admin') {
      const channels = await Channel.find({}).select('_id').lean();
      channelIds = channels.map((c) => c._id);
    } else if (req.user.businessId) {
      const channels = await Channel.find({ businessId: req.user.businessId }).select('_id').lean();
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
      .populate('contactId', 'name email phone')
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

    if (channel.status && channel.status !== 'active') {
      return res.status(400).json({
        success: false,
        code: 'channel_limited',
        message:
          'Ky kanal është i kufizuar për dërgim mesazhesh për shkak të dyshimit për spam ose shkelje të politikave. Ju lutemi kontaktoni suportin.',
      });
    }

    if (channel.businessId) {
      const business = await Business.findById(channel.businessId).select('messagingLimited').lean();
      if (business && business.messagingLimited) {
        return res.status(400).json({
          success: false,
          code: 'business_limited',
          message:
            'Ky biznes është përkohësisht i kufizuar për dërgim mesazhesh për shkak të aktivitetit të dyshimtë. Ju lutemi kontaktoni suportin.',
        });
      }
    }

    if (channel.tokenStatus && channel.tokenStatus !== 'valid') {
      return res.status(400).json({
        success: false,
        code: 'channel_needs_reconnect',
        message: 'Tokeni për këtë kanal ka skaduar ose është i pavlefshëm. Ju lutemi rilidhni kanalin përmes Meta OAuth.',
      });
    }

    const messageText = typeof text === 'string' ? text.trim() : '';
    if (!messageText) {
      return res.status(400).json({ success: false, message: 'Teksti i mesazhit është i zbrazët.' });
    }

    const windowCheck = canSendMessageWithin24h({ conversation, channel, direction: 'out' });
    if (!windowCheck.allowed || conversation.messagingWindowExpired) {
      return res.status(400).json({
        success: false,
        code: 'outside_24h_window',
        message: 'Nuk mund të dërgosh mesazh sepse kanë kaluar 24 orë pa aktivitet nga klienti.',
      });
    }

    await enqueueOutboundMessage({
      channelId: conversation.channelId,
      conversationId: conversation._id,
      recipientId: conversation.platformUserId,
      payload: { text: messageText },
    });

    const newMessage = await Message.create({
      conversationId: conversation._id,
      direction: 'out',
      content: { text: messageText },
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      $set: { lastMessageAt: new Date(), botPaused: true },
    });

    const payload = newMessage.toObject ? newMessage.toObject() : newMessage;
    res.status(201).json({
      success: true,
      data: payload,
      message: 'Mesazhi u pranuar dhe do të dërgohet përmes queue (mund të ketë vonesë nëse jemi afër limitit të Meta-s).',
    });
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
