/**
 * Kontrolleri për Feedback – CRUD mbi feedback-un për mesazhe.
 */

const { Feedback, Message, Conversation, Channel } = require('../models');
const { FEEDBACK_ALLOWED_ROLES } = require('../config/feedbackConfig');

/**
 * Kthen true nëse përdoruesi ka të drejtë të aksesojë këtë kombinim businessId/channelId.
 * Admin mund të aksesojë gjithçka; klientët vetëm biznesin/channet e tyre.
 */
async function canAccessBusinessForMessageContext({ channelId, businessId }, req) {
  if (req.user.role === 'admin') return true;
  if (businessId && req.user.businessId && businessId.toString() === req.user.businessId.toString()) return true;

  if (!channelId) return false;
  const channel = await Channel.findById(channelId).select('userId businessId').lean();
  if (!channel) return false;
  if (channel.userId && channel.userId.toString() === req.userId.toString()) return true;
  if (channel.businessId && req.user.businessId && channel.businessId.toString() === req.user.businessId.toString())
    return true;
  return false;
}

/**
 * POST /api/feedback
 * Body: { messageId, sentiment, rating?, reasonCategory, comment? }
 */
const createFeedback = async (req, res, next) => {
  try {
    const role = req.user?.role ?? 'client';
    if (!FEEDBACK_ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({ success: false, message: 'Nuk keni të drejtë të jepni feedback.' });
    }

    const { messageId, sentiment, rating, reasonCategory, comment } = req.body || {};
    if (!messageId || !sentiment || !reasonCategory) {
      return res
        .status(400)
        .json({ success: false, message: 'messageId, sentiment dhe reasonCategory janë të detyrueshme.' });
    }

    const message = await Message.findById(messageId).lean();
    if (!message) {
      return res.status(404).json({ success: false, message: 'Mesazhi nuk u gjet.' });
    }

    // Lejo feedback vetëm për mesazhe dalëse nga AI ose nga agjent njerëzor.
    if (message.direction !== 'out' || !['ai', 'human_agent'].includes(message.senderType || '')) {
      return res
        .status(400)
        .json({ success: false, message: 'Feedback lejohet vetëm për mesazhe dalëse nga AI ose agjentët.' });
    }

    const conversation = await Conversation.findById(message.conversationId).select('channelId').lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }

    const channel = await Channel.findById(conversation.channelId).select('businessId').lean();
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }

    const canAccess = await canAccessBusinessForMessageContext(
      { channelId: conversation.channelId, businessId: channel.businessId },
      req
    );
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Mesazhi nuk u gjet.' });
    }

    const Business = require('../models/Business');
    if (channel.businessId) {
      const business = await Business.findById(channel.businessId).select('feedbackEnabled').lean();
      if (business && business.feedbackEnabled === false) {
        return res.status(403).json({ success: false, message: 'Feedback është i çaktivizuar për këtë biznes.' });
      }
    }

    const truncatedComment =
      typeof comment === 'string' && comment.length > 1000 ? comment.slice(0, 1000) : comment ?? '';

    let numericRating = rating ?? null;
    if (numericRating !== null && numericRating !== undefined) {
      const n = Number(numericRating);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        return res.status(400).json({ success: false, message: 'Rating duhet të jetë numër midis 1 dhe 5.' });
      }
      numericRating = n;
    }

    const payload = {
      messageId: message._id,
      conversationId: message.conversationId,
      channelId: conversation.channelId,
      businessId: channel.businessId,
      reviewerId: req.userId,
      sentiment,
      rating: numericRating,
      reasonCategory,
      comment: truncatedComment,
    };

    const feedback = await Feedback.findOneAndUpdate(
      { messageId: message._id, reviewerId: req.userId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/feedback/conversation/:conversationId
 * Kthen të gjitha feedback-et e lidhura me mesazhet e një konversacioni (për biznesin e vet).
 */
const getFeedbackForConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).select('channelId').lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }
    const channel = await Channel.findById(conversation.channelId).select('businessId').lean();
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Kanali nuk u gjet.' });
    }

    const canAccess = await canAccessBusinessForMessageContext(
      { channelId: conversation.channelId, businessId: channel.businessId },
      req
    );
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Konversacioni nuk u gjet.' });
    }

    const Business = require('../models/Business');
    if (channel.businessId) {
      const business = await Business.findById(channel.businessId).select('feedbackEnabled').lean();
      if (business && business.feedbackEnabled === false) {
        return res.json({ success: true, data: [] });
      }
    }

    const filter = {
      conversationId,
      businessId: channel.businessId,
    };
    const feedbackList = await Feedback.find(filter).sort({ createdAt: 1 }).lean();

    res.json({ success: true, data: feedbackList });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/feedback/:id
 * Lejon rishikimin e feedback-ut nga vetë autori ose nga admin.
 */
const updateFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback nuk u gjet.' });
    }

    const isOwner = feedback.reviewerId.toString() === req.userId.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Nuk keni të drejtë të ndryshoni këtë feedback.' });
    }

    const { sentiment, rating, reasonCategory, comment } = req.body || {};

    if (sentiment !== undefined) feedback.sentiment = sentiment;
    if (reasonCategory !== undefined) feedback.reasonCategory = reasonCategory;
    if (comment !== undefined) {
      const val = typeof comment === 'string' && comment.length > 1000 ? comment.slice(0, 1000) : comment;
      feedback.comment = val ?? '';
    }
    if (rating !== undefined) {
      if (rating === null) {
        feedback.rating = null;
      } else {
        const n = Number(rating);
        if (!Number.isFinite(n) || n < 1 || n > 5) {
          return res.status(400).json({ success: false, message: 'Rating duhet të jetë numër midis 1 dhe 5.' });
        }
        feedback.rating = n;
      }
    }

    await feedback.save();
    const payload = feedback.toObject ? feedback.toObject() : feedback;
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/feedback/:id
 * Lejon fshirjen e feedback-ut nga vetë autori ose nga admin.
 */
const deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback nuk u gjet.' });
    }
    const isOwner = feedback.reviewerId.toString() === req.userId.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Nuk keni të drejtë të fshini këtë feedback.' });
    }
    await Feedback.findByIdAndDelete(feedback._id);
    res.json({ success: true, message: 'Feedback u fshi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFeedback,
  getFeedbackForConversation,
  updateFeedback,
  deleteFeedback,
  // exportohet më poshtë
};

/**
 * GET /api/feedback/overview
 * Përmbledhje e feedback-ut për biznesin aktual (ose për një klient specifik kur kërkohet nga admin).
 * Query: from (ISO, opsionale), to (ISO, opsionale), channelId (opsionale), minRating, sentiment (like/dislike), reasonCategory.
 */
const getFeedbackOverview = async (req, res, next) => {
  try {
    // Gjej kanalet që përdoruesi ka të drejtë t'i shohë, bazuar te logjika ekzistuese e statsController/getChannelIdsForUser.
    const User = require('../models/User');

    let channelFilter = {};
    if (req.user.role === 'admin' && req.query.userId) {
      const target = await User.findById(req.query.userId).select('businessId').lean();
      if (!target) {
        return res.json({ success: true, data: [] });
      }
      if (target.businessId) {
        channelFilter = { businessId: target.businessId };
      } else {
        channelFilter = { userId: req.query.userId };
      }
    } else if (req.user.businessId) {
      channelFilter = { businessId: req.user.businessId };
    } else {
      channelFilter = { userId: req.userId };
    }

    const channels = await Channel.find(channelFilter).select('_id businessId').lean();
    if (!channels.length) {
      return res.json({ success: true, data: [] });
    }
    const channelIds = channels.map((c) => c._id);
    const businessId = channels[0].businessId || req.user.businessId || null;

    if (businessId) {
      const Business = require('../models/Business');
      const business = await Business.findById(businessId).select('feedbackEnabled').lean();
      if (business && business.feedbackEnabled === false) {
        return res.json({ success: true, data: [] });
      }
    }

    const match = {
      channelId: { $in: channelIds },
    };

    if (businessId) {
      match.businessId = businessId;
    }

    const toDate = req.query.to ? new Date(req.query.to) : new Date();
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    match.createdAt = { $gte: fromDate, $lte: toDate };

    if (req.query.channelId && channelIds.some((id) => id.toString() === req.query.channelId)) {
      match.channelId = require('mongoose').Types.ObjectId.createFromHexString(req.query.channelId);
    }

    if (req.query.sentiment === 'like' || req.query.sentiment === 'dislike') {
      match.sentiment = req.query.sentiment;
    }

    if (typeof req.query.reasonCategory === 'string' && req.query.reasonCategory.trim()) {
      match.reasonCategory = req.query.reasonCategory.trim();
    }

    if (req.query.minRating) {
      const minRating = Number(req.query.minRating);
      if (Number.isFinite(minRating)) {
        match.rating = { $gte: minRating };
      }
    }

    const overview = await Feedback.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            conversationId: '$conversationId',
            messageId: '$messageId',
            channelId: '$channelId',
          },
          feedbackCount: { $sum: 1 },
          dislikes: {
            $sum: {
              $cond: [{ $eq: ['$sentiment', 'dislike'] }, 1, 0],
            },
          },
          likes: {
            $sum: {
              $cond: [{ $eq: ['$sentiment', 'like'] }, 1, 0],
            },
          },
          avgRating: { $avg: '$rating' },
          lastFeedbackAt: { $max: '$createdAt' },
        },
      },
      {
        $sort: {
          dislikes: -1,
          feedbackCount: -1,
          lastFeedbackAt: -1,
        },
      },
      {
        $limit: 100,
      },
    ]);

    const messageIds = overview.map((o) => o._id.messageId);
    const conversationIds = overview.map((o) => o._id.conversationId);

    const [messages, conversations] = await Promise.all([
      Message.find({ _id: { $in: messageIds } })
        .select('_id content timestamp conversationId senderType direction sentimentScore sentimentLabel sentimentProvider')
        .lean(),
      Conversation.find({ _id: { $in: conversationIds } })
        .populate('channelId', 'name platform')
        .select('_id platformUserId channelId')
        .lean(),
    ]);

    const messageById = new Map(messages.map((m) => [String(m._id), m]));
    const convById = new Map(conversations.map((c) => [String(c._id), c]));

    const result = overview.map((o) => {
      const mid = String(o._id.messageId);
      const cid = String(o._id.conversationId);
      const msg = messageById.get(mid);
      const conv = convById.get(cid);
      return {
        conversationId: cid,
        messageId: mid,
        feedbackCount: o.feedbackCount,
        dislikes: o.dislikes,
        likes: o.likes,
        avgRating: o.avgRating ?? null,
        lastFeedbackAt: o.lastFeedbackAt,
        message: msg
          ? {
              content: msg.content,
              timestamp: msg.timestamp,
              senderType: msg.senderType || null,
              direction: msg.direction,
              sentimentScore: msg.sentimentScore ?? null,
              sentimentLabel: msg.sentimentLabel || null,
              sentimentProvider: msg.sentimentProvider || null,
            }
          : null,
        conversation: conv
          ? {
              platformUserId: conv.platformUserId,
              channel: conv.channelId || null,
            }
          : null,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports.getFeedbackOverview = getFeedbackOverview;

/**
 * GET /api/feedback/coaching
 * Kthen një përmbledhje të shkurtër coaching për operatorët bazuar në feedback-un e 7 ditëve të fundit.
 * Përfshin:
 * - numrin e feedback-eve negative sipas kategorisë
 * - disa shembuj "good" (mesazhe të pëlqyera) dhe "bad" (mesazhe jo të pëlqyera).
 */
const getFeedbackCoaching = async (req, res, next) => {
  try {
    const User = require('../models/User');

    let channelFilter = {};
    if (req.user.role === 'admin' && req.query.userId) {
      const target = await User.findById(req.query.userId).select('businessId').lean();
      if (!target) {
        return res.json({ success: true, data: { summary: [], goodExamples: [], badExamples: [] } });
      }
      if (target.businessId) {
        channelFilter = { businessId: target.businessId };
      } else {
        channelFilter = { userId: req.query.userId };
      }
    } else if (req.user.businessId) {
      channelFilter = { businessId: req.user.businessId };
    } else {
      channelFilter = { userId: req.userId };
    }

    const channels = await Channel.find(channelFilter).select('_id businessId').lean();
    if (!channels.length) {
      return res.json({ success: true, data: { summary: [], goodExamples: [], badExamples: [] } });
    }
    const channelIds = channels.map((c) => c._id);
    const businessId = channels[0].businessId || req.user.businessId || null;

    if (businessId) {
      const Business = require('../models/Business');
      const business = await Business.findById(businessId).select('feedbackEnabled').lean();
      if (business && business.feedbackEnabled === false) {
        return res.json({ success: true, data: { summary: [], goodExamples: [], badExamples: [] } });
      }
    }

    const now = new Date();
    const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const matchBase = {
      channelId: { $in: channelIds },
      createdAt: { $gte: fromDate, $lte: now },
    };
    if (businessId) {
      matchBase.businessId = businessId;
    }

    // Përmbledhje sipas kategorisë për feedback-et negative.
    const summaryAggr = await Feedback.aggregate([
      {
        $match: {
          ...matchBase,
          sentiment: 'dislike',
        },
      },
      {
        $group: {
          _id: '$reasonCategory',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Shembuj "good" dhe "bad" për coaching.
    const [badItems, goodItems] = await Promise.all([
      Feedback.aggregate([
        {
          $match: {
            ...matchBase,
            sentiment: 'dislike',
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
      ]),
      Feedback.aggregate([
        {
          $match: {
            ...matchBase,
            sentiment: 'like',
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const messageIds = [
      ...new Set([
        ...badItems.map((b) => String(b.messageId)),
        ...goodItems.map((g) => String(g.messageId)),
      ]),
    ];
    const conversationIds = [
      ...new Set([
        ...badItems.map((b) => String(b.conversationId)),
        ...goodItems.map((g) => String(g.conversationId)),
      ]),
    ];

    const [messages, conversations] = await Promise.all([
      Message.find({ _id: { $in: messageIds } })
        .select('_id content senderType direction timestamp conversationId')
        .lean(),
      Conversation.find({ _id: { $in: conversationIds } })
        .select('_id platformUserId')
        .lean(),
    ]);

    const messageById = new Map(messages.map((m) => [String(m._id), m]));
    const convById = new Map(conversations.map((c) => [String(c._id), c]));

    function mapExample(item) {
      const mid = String(item.messageId);
      const cid = String(item.conversationId);
      const msg = messageById.get(mid);
      const conv = convById.get(cid);
      return {
        messageId: mid,
        conversationId: cid,
        reasonCategory: item.reasonCategory,
        sentiment: item.sentiment,
        comment: item.comment || '',
        createdAt: item.createdAt,
        message: msg
          ? {
              content: msg.content,
              senderType: msg.senderType || null,
              direction: msg.direction,
              timestamp: msg.timestamp,
            }
          : null,
        conversation: conv
          ? {
              platformUserId: conv.platformUserId,
            }
          : null,
      };
    }

    const data = {
      summary: summaryAggr.map((s) => ({
        reasonCategory: s._id,
        count: s.count,
      })),
      badExamples: badItems.map(mapExample),
      goodExamples: goodItems.map(mapExample),
    };

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports.getFeedbackCoaching = getFeedbackCoaching;

/**
 * GET /api/feedback/stats
 * Statistika të thjeshta për feedback-un për biznesin aktual:
 * - numri total i feedback-eve
 * - sa janë like/dislike
 * - raporti like vs dislike
 * - trend ditor për 30 ditët e fundit.
 */
const getFeedbackStats = async (req, res, next) => {
  try {
    const User = require('../models/User');

    let channelFilter = {};
    if (req.user.role === 'admin' && req.query.userId) {
      const target = await User.findById(req.query.userId).select('businessId').lean();
      if (!target) {
        return res.json({ success: true, data: { total: 0, likes: 0, dislikes: 0, ratio: null, byDay: [] } });
      }
      if (target.businessId) {
        channelFilter = { businessId: target.businessId };
      } else {
        channelFilter = { userId: req.query.userId };
      }
    } else if (req.user.businessId) {
      channelFilter = { businessId: req.user.businessId };
    } else {
      channelFilter = { userId: req.userId };
    }

    const channels = await Channel.find(channelFilter).select('_id businessId').lean();
    if (!channels.length) {
      return res.json({ success: true, data: { total: 0, likes: 0, dislikes: 0, ratio: null, byDay: [] } });
    }
    const channelIds = channels.map((c) => c._id);
    const businessId = channels[0].businessId || req.user.businessId || null;

    if (businessId) {
      const Business = require('../models/Business');
      const business = await Business.findById(businessId).select('feedbackEnabled').lean();
      if (business && business.feedbackEnabled === false) {
        return res.json({ success: true, data: { total: 0, likes: 0, dislikes: 0, ratio: null, byDay: [] } });
      }
    }

    const now = new Date();
    const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const match = {
      channelId: { $in: channelIds },
      createdAt: { $gte: fromDate, $lte: now },
    };
    if (businessId) {
      match.businessId = businessId;
    }

    const [overall, byDayRaw] = await Promise.all([
      Feedback.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$sentiment',
            count: { $sum: 1 },
          },
        },
      ]),
      Feedback.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              sentiment: '$sentiment',
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    let likes = 0;
    let dislikes = 0;
    for (const row of overall) {
      if (row._id === 'like') likes = row.count;
      if (row._id === 'dislike') dislikes = row.count;
    }
    const total = likes + dislikes;
    const ratio = total > 0 ? likes / total : null;

    const byDayMap = new Map();
    for (const row of byDayRaw) {
      const d = row._id.date;
      if (!byDayMap.has(d)) byDayMap.set(d, { date: d, likes: 0, dislikes: 0 });
      if (row._id.sentiment === 'like') byDayMap.get(d).likes = row.count;
      if (row._id.sentiment === 'dislike') byDayMap.get(d).dislikes = row.count;
    }

    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        total,
        likes,
        dislikes,
        ratio,
        byDay,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports.getFeedbackStats = getFeedbackStats;

