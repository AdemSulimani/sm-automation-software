/**
 * Statistikat: admin (përmbledhje globale) dhe klient (mesazhe, kohë përgjigjeje, raport).
 */

const User = require('../models/User');
const Channel = require('../models/Channel');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Business = require('../models/Business');
const OutboundJob = require('../models/OutboundJob');
const { isSentimentEnabled } = require('../services/sentimentService');

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

    const [
      messagesIn,
      messagesOut,
      messagesForResponseTime,
      messagesByDayAggr,
      business,
      sentimentAggr,
      sentimentByDayAggr,
    ] = await Promise.all([
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
        ? Business.findById(req.user.businessId).select('workHoursStart workHoursEnd sentimentScore sentimentLevel sentimentFlags lastSentimentReviewAt').lean()
        : Promise.resolve(null),
      Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            direction: 'in',
            timestamp: dateFilter,
            sentimentScore: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$sentimentLabel',
            avgScore: { $avg: '$sentimentScore' },
            count: { $sum: 1 },
          },
        },
      ]),
      Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            direction: 'in',
            timestamp: dateFilter,
            sentimentScore: { $ne: null },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            },
            avgScore: { $avg: '$sentimentScore' },
            count: { $sum: 1 },
          },
        },
      ]),
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

    let sentimentAvgScore = null;
    const sentimentDistribution = {
      negative: 0,
      neutral: 0,
      positive: 0,
      mixed: 0,
    };

    if (Array.isArray(sentimentAggr) && sentimentAggr.length > 0) {
      let totalWeightedScore = 0;
      let totalCount = 0;
      for (const row of sentimentAggr) {
        const label = row._id || 'neutral';
        const count = row.count || 0;
        const avgScore = row.avgScore || 0;
        totalWeightedScore += avgScore * count;
        totalCount += count;
        if (label === 'negative' || label === 'neutral' || label === 'positive' || label === 'mixed') {
          sentimentDistribution[label] += count;
        }
      }
      if (totalCount > 0) {
        sentimentAvgScore = totalWeightedScore / totalCount;
      }
    }

    const sentimentByDay =
      Array.isArray(sentimentByDayAggr) && sentimentByDayAggr.length > 0
        ? sentimentByDayAggr
            .map((row) => ({
              date: row._id.date,
              avgScore: row.avgScore,
              count: row.count,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [];

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
        sentiment: {
          enabled: isSentimentEnabled(),
          avgScore: sentimentAvgScore,
          distribution: sentimentDistribution,
          byDay: sentimentByDay,
          business: business
            ? {
                score: business.sentimentScore ?? null,
                level: business.sentimentLevel ?? 'none',
                flags: Array.isArray(business.sentimentFlags) ? business.sentimentFlags : [],
                lastReviewAt: business.lastSentimentReviewAt ?? null,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/stats/rate-limit – statistika të thjeshta për rate limiting për channel-et e përdoruesit.
 * Kthen për çdo channel: sa mesazhe OUT në 60 min e fundit dhe sa job-e pending/rate_limited në queue.
 */
const getRateLimitStats = async (req, res, next) => {
  try {
    const channelIds = await getChannelIdsForUser(req);
    if (channelIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const channels = await Channel.find({ _id: { $in: channelIds } })
      .select('_id name platform')
      .lean();

    const messagesAggr = await Message.aggregate([
      {
        $match: {
          channelId: { $in: channelIds },
          direction: 'out',
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$channelId',
          count: { $sum: 1 },
        },
      },
    ]);

    const jobsAggr = await OutboundJob.aggregate([
      {
        $match: {
          channelId: { $in: channelIds },
          status: { $in: ['pending', 'rate_limited'] },
        },
      },
      {
        $group: {
          _id: { channelId: '$channelId', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    const sentByChannel = new Map();
    for (const m of messagesAggr) {
      sentByChannel.set(String(m._id), m.count);
    }

    const jobsByChannel = new Map();
    for (const j of jobsAggr) {
      const chId = String(j._id.channelId);
      const status = j._id.status;
      if (!jobsByChannel.has(chId)) {
        jobsByChannel.set(chId, { pending: 0, rate_limited: 0 });
      }
      if (status === 'pending') jobsByChannel.get(chId).pending += j.count;
      if (status === 'rate_limited') jobsByChannel.get(chId).rate_limited += j.count;
    }

    const data = channels.map((ch) => {
      const key = String(ch._id);
      const messagesLastHour = sentByChannel.get(key) || 0;
      const jobInfo = jobsByChannel.get(key) || { pending: 0, rate_limited: 0 };
      return {
        channelId: key,
        name: ch.name || null,
        platform: ch.platform,
        messagesOutLastHour: messagesLastHour,
        pendingJobs: jobInfo.pending,
        rateLimitedJobs: jobInfo.rate_limited,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getOverview, getRateLimitStats };
