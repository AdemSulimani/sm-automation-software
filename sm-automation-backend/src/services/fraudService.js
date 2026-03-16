const { Business, User, Channel, OutboundJob, Feedback, AutomationRule } = require('../models');

const FRAUD_MAX_SCORE = 100;

const FRAUD_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

function mapScoreToLevel(score) {
  if (score >= 80) return FRAUD_LEVELS.HIGH;
  if (score >= 50) return FRAUD_LEVELS.MEDIUM;
  if (score >= 20) return FRAUD_LEVELS.LOW;
  return FRAUD_LEVELS.NONE;
}

function clampScore(score) {
  if (Number.isNaN(score) || !Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > FRAUD_MAX_SCORE) return FRAUD_MAX_SCORE;
  return score;
}

async function scoreBusinessActivity(businessId) {
  const flags = [];
  let score = 0;

  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);
  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const channels = await Channel.find({ businessId }).select('_id').lean();
  const channelIds = channels.map((c) => c._id);

  if (channelIds.length) {
    const outboundJobsLastHour = await OutboundJob.find({
      channelId: { $in: channelIds },
      createdAt: { $gte: sinceHour },
    })
      .select('status lastError')
      .lean();

    const totalJobs = outboundJobsLastHour.length;
    const failedPermanent = outboundJobsLastHour.filter((j) => j.status === 'failed_permanent');

    if (totalJobs > 0) {
      const failedRate = failedPermanent.length / totalJobs;
      if (failedRate >= 0.3) {
        flags.push('high_permanent_failure_rate_last_hour');
        score += 20;
      } else if (failedRate >= 0.15) {
        flags.push('elevated_permanent_failure_rate_last_hour');
        score += 10;
      }
    }
  }

  let feedbackLastDay = [];
  try {
    feedbackLastDay = await Feedback.find({
      createdAt: { $gte: sinceDay },
      businessId,
    })
      .select('sentiment')
      .lean();
  } catch {
    feedbackLastDay = [];
  }

  if (feedbackLastDay.length) {
    const negative = feedbackLastDay.filter((f) => f.sentiment === 'dislike').length;
    const negativeRate = negative / feedbackLastDay.length;
    if (negativeRate >= 0.5 && feedbackLastDay.length >= 5) {
      flags.push('high_negative_feedback_rate_last_day');
      score += 20;
    } else if (negativeRate >= 0.3 && feedbackLastDay.length >= 5) {
      flags.push('elevated_negative_feedback_rate_last_day');
      score += 10;
    }
  }

  const sinceRules = new Date(Date.now() - 60 * 60 * 1000);
  let recentRules = [];
  try {
    recentRules = await AutomationRule.find({
      businessId,
      createdAt: { $gte: sinceRules },
    })
      .select('trigger')
      .lean();
  } catch {
    recentRules = [];
  }

  if (recentRules.length >= 10) {
    flags.push('many_automation_rules_created_last_hour');
    score += 15;
  } else if (recentRules.length >= 5) {
    flags.push('several_automation_rules_created_last_hour');
    score += 8;
  }

  score = clampScore(score);
  const level = mapScoreToLevel(score);

  await Business.findByIdAndUpdate(businessId, {
    $set: {
      fraudScore: score,
      fraudLevel: level,
      fraudFlags: flags,
      lastFraudReviewAt: new Date(),
    },
  }).exec();

  return { score, level, flags };
}

async function scoreUserActivity(userId, { failedLoginIncrement = 0 } = {}) {
  const user = await User.findById(userId).select('fraudScore fraudLevel fraudFlags suspiciousActivityAt').lean();
  if (!user) return null;

  let score = user.fraudScore || 0;
  const flags = Array.isArray(user.fraudFlags) ? [...user.fraudFlags] : [];

  if (failedLoginIncrement > 0) {
    score += failedLoginIncrement;
    flags.push('failed_login_attempts');
  }

  score = clampScore(score);
  const level = mapScoreToLevel(score);

  await User.findByIdAndUpdate(userId, {
    $set: {
      fraudScore: score,
      fraudLevel: level,
      fraudFlags: flags,
      suspiciousActivityAt: level === FRAUD_LEVELS.NONE ? user.suspiciousActivityAt || null : new Date(),
    },
  }).exec();

  return { score, level, flags };
}

async function scoreChannelBehavior(channelId) {
  const channel = await Channel.findById(channelId).select('_id businessId fraudFlags status').lean();
  if (!channel) return null;

  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);

  const jobs = await OutboundJob.find({
    channelId,
    createdAt: { $gte: sinceHour },
  })
    .select('status lastError')
    .lean();

  const flags = [];
  let score = 0;

  if (jobs.length) {
    const failedPermanent = jobs.filter((j) => j.status === 'failed_permanent');
    const failedRate = failedPermanent.length / jobs.length;
    if (failedRate >= 0.3) {
      flags.push('channel_high_permanent_failure_rate_last_hour');
      score += 25;
    } else if (failedRate >= 0.15) {
      flags.push('channel_elevated_permanent_failure_rate_last_hour');
      score += 12;
    }
  }

  score = clampScore(score);
  const level = mapScoreToLevel(score);

  const updates = {
    fraudFlags: flags,
  };

  if (level === FRAUD_LEVELS.HIGH && channel.status !== 'suspended') {
    updates.status = 'suspended';
  } else if (level === FRAUD_LEVELS.MEDIUM && channel.status === 'active') {
    updates.status = 'throttled';
  }

  await Channel.findByIdAndUpdate(channelId, { $set: updates }).exec();

  if (channel.businessId) {
    await scoreBusinessActivity(channel.businessId);
  }

  return { score, level, flags };
}

function getEnforcementForFraudLevel(level) {
  if (level === FRAUD_LEVELS.HIGH) {
    return {
      allowSensitiveActions: false,
      allowOutboundMessages: false,
      allowNewAutomationRules: false,
      allowNewChannels: false,
      enforcementLevel: 'hard',
    };
  }

  if (level === FRAUD_LEVELS.MEDIUM) {
    return {
      allowSensitiveActions: true,
      allowOutboundMessages: true,
      allowNewAutomationRules: true,
      allowNewChannels: true,
      enforcementLevel: 'soft',
    };
  }

  if (level === FRAUD_LEVELS.LOW) {
    return {
      allowSensitiveActions: true,
      allowOutboundMessages: true,
      allowNewAutomationRules: true,
      allowNewChannels: true,
      enforcementLevel: 'monitor',
    };
  }

  return {
    allowSensitiveActions: true,
    allowOutboundMessages: true,
    allowNewAutomationRules: true,
    allowNewChannels: true,
    enforcementLevel: 'none',
  };
}

module.exports = {
  FRAUD_LEVELS,
  mapScoreToLevel,
  scoreBusinessActivity,
  scoreUserActivity,
  scoreChannelBehavior,
  getEnforcementForFraudLevel,
};

