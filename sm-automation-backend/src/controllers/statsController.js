/**
 * Statistikat: admin (përmbledhje globale) dhe klient (mesazhe, kohë përgjigjeje, raport).
 */

const User = require('../models/User');
const Channel = require('../models/Channel');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Business = require('../models/Business');

/**
 * Kthen listën e channelIds që përdoruesi ka të drejtë të shohë (sipas userId ose businessId).
 */
async function getChannelIdsForUser(req) {
  if (req.user.role === 'admin' && req.query.userId) {
    const target = await User.findById(req.query.userId).select('businessId').lean();
    if (!target) return [];
    if (target.businessId) {
      const chs = await Channel.find({ businessId: target.businessId }).select('_id').lean();
      return chs.map((c) => c._id);
    }
    const chs = await Channel.find({ userId: req.query.userId }).select('_id').lean();
    return chs.map((c) => c._id);
  }
  if (req.user.businessId) {
    const chs = await Channel.find({ businessId: req.user.businessId }).select('_id').lean();
    return chs.map((c) => c._id);
  }
  const chs = await Channel.find({ userId: req.userId }).select('_id').lean();
  return chs.map((c) => c._id);
}

/**
 * GET /api/stats – vetëm admin: numri i përdoruesve dhe kanaleve.
 */
const getStats = async (req, res, next) => {
  try {
    const [usersCount, channelsCount] = await Promise.all([
      User.countDocuments(),
      Channel.countDocuments(),
    ]);
    res.json({ success: true, data: { usersCount, channelsCount } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/stats/overview – mesazhe hyrëse/dalëse, kohë përgjigjeje, mesazhe sipas ditëve, orar pune.
 * Query: from (ISO), to (ISO), channelId (opsional). Admin mund të dërgojë userId.
 */
const getOverview = async (req, res, next) => {
  try {
    const channelIds = await getChannelIdsForUser(req);
    if (channelIds.length === 0) {
      return res.json({
        success: true,
        data: {
          messagesIn: 0,
          messagesOut: 0,
          conversationsCount: 0,
          avgResponseTimeMinutes: null,
          messagesByDay: [],
          workHoursStart: null,
          workHoursEnd: null,
        },
      });
    }

    let filterChannelIds = channelIds;
    if (req.query.channelId && channelIds.some((id) => id.toString() === req.query.channelId)) {
      filterChannelIds = [req.query.channelId];
    }

    const toDate = req.query.to ? new Date(req.query.to) : new Date();
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFilter = { $gte: fromDate, $lte: toDate };

    const conversations = await Conversation.find({ channelId: { $in: filterChannelIds } })
      .select('_id')
      .lean();
    const conversationIds = conversations.map((c) => c._id);

    const [messagesIn, messagesOut, messagesForResponseTime, messagesByDayAggr, business] = await Promise.all([
      Message.countDocuments({
        conversationId: { $in: conversationIds },
        direction: 'in',
        timestamp: dateFilter,
      }),
      Message.countDocuments({
        conversationId: { $in: conversationIds },
        direction: 'out',
        timestamp: dateFilter,
      }),
      Message.find({
        conversationId: { $in: conversationIds },
        timestamp: dateFilter,
      })
        .select('conversationId direction timestamp')
        .sort({ conversationId: 1, timestamp: 1 })
        .lean(),
      Message.aggregate([
        { $match: { conversationId: { $in: conversationIds }, timestamp: dateFilter } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              direction: '$direction',
            },
            count: { $sum: 1 },
          },
        },
      ]),
      req.user.businessId
        ? Business.findById(req.user.businessId).select('workHoursStart workHoursEnd').lean()
        : Promise.resolve(null),
    ]);

    let avgResponseTimeMinutes = null;
    const byConv = new Map();
    for (const m of messagesForResponseTime) {
      const id = m.conversationId.toString();
      if (!byConv.has(id)) byConv.set(id, []);
      byConv.get(id).push({ direction: m.direction, timestamp: m.timestamp });
    }
    const responseTimes = [];
    for (const [, msgs] of byConv) {
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].direction !== 'in') continue;
        for (let j = i + 1; j < msgs.length; j++) {
          if (msgs[j].direction === 'out') {
            responseTimes.push((msgs[j].timestamp - msgs[i].timestamp) / (60 * 1000));
            break;
          }
        }
      }
    }
    if (responseTimes.length > 0) {
      avgResponseTimeMinutes = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    const byDayMap = new Map();
    for (const r of messagesByDayAggr) {
      const d = r._id.date;
      if (!byDayMap.has(d)) byDayMap.set(d, { date: d, in: 0, out: 0 });
      byDayMap.get(d)[r._id.direction] = r.count;
    }
    const messagesByDay = Array.from(byDayMap.entries())
      .map(([date, v]) => ({ date, in: v.in, out: v.out }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        messagesIn,
        messagesOut,
        conversationsCount: conversationIds.length,
        avgResponseTimeMinutes: avgResponseTimeMinutes !== null ? Math.round(avgResponseTimeMinutes * 10) / 10 : null,
        messagesByDay,
        workHoursStart: business?.workHoursStart ?? null,
        workHoursEnd: business?.workHoursEnd ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getOverview };
