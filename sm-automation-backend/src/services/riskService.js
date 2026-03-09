const { Channel, OutboundJob, Business } = require('../models');

const BUSINESS_MAX_MESSAGES_PER_HOUR = Number(process.env.BUSINESS_MAX_MESSAGES_PER_HOUR || '500');
const BUSINESS_SPAM_ERROR_RATE_THRESHOLD = Number(process.env.BUSINESS_SPAM_ERROR_RATE_THRESHOLD || '0.2');

function isSpamOrBlockErrorMessage(message) {
  if (!message || typeof message !== 'string') return false;
  const msg = message.toLowerCase();
  return msg.includes('spam') || msg.includes('blocked') || msg.includes('policy') || msg.includes('violation');
}

/**
 * Vlerëson rrezikun për një biznes bazuar në mesazhet e fundit dhe gabimet spam/blocked.
 * Nëse kalon pragjet, mund të vendosë messagingLimited për Business ose të ndryshojë status-in e channel-it.
 */
async function evaluateBusinessRiskForChannel(channelId) {
  const channel = await Channel.findById(channelId).select('businessId status').lean();
  if (!channel || !channel.businessId) return;

  const businessId = channel.businessId;
  const since = new Date(Date.now() - 60 * 60 * 1000);

  const channels = await Channel.find({ businessId }).select('_id').lean();
  const channelIds = channels.map((c) => c._id);

  const jobs = await OutboundJob.find({
    channelId: { $in: channelIds },
    createdAt: { $gte: since },
  })
    .select('status lastError')
    .lean();

  if (!jobs.length) return;

  const total = jobs.length;
  const spamErrors = jobs.filter(
    (j) => j.status === 'failed_permanent' && isSpamOrBlockErrorMessage(j.lastError || '')
  ).length;

  const spamErrorRate = spamErrors / total;

  if (total >= BUSINESS_MAX_MESSAGES_PER_HOUR || spamErrorRate >= BUSINESS_SPAM_ERROR_RATE_THRESHOLD) {
    await Business.findByIdAndUpdate(businessId, {
      $set: {
        messagingLimited: true,
        messagingLimitReason:
          'Aktivitet i dyshimtë mesazhesh (volum i lartë ose gabime të shumta spam/blocked nga Meta).',
      },
    }).exec();

    await Channel.updateMany(
      { businessId },
      {
        $set: { status: 'throttled' },
      }
    ).exec();

    console.warn('Business messaging limited due to risk thresholds', {
      businessId: String(businessId),
      totalJobsLastHour: total,
      spamErrorsLastHour: spamErrors,
      spamErrorRate,
    });
  }
}

module.exports = {
  evaluateBusinessRiskForChannel,
};

