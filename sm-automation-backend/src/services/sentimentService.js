const { Message, Conversation, Contact, Business } = require('../models');
const { SENTIMENT_CONFIG, getSentimentLabel } = require('../config/sentimentConfig');

const DEFAULT_PROVIDER = 'groq-chat';
const SENTIMENT_LOG_METRICS = process.env.SENTIMENT_LOG_METRICS === 'true';

function getSentimentProviderName() {
  return process.env.SENTIMENT_PROVIDER || DEFAULT_PROVIDER;
}

function isSentimentEnabled() {
  return SENTIMENT_CONFIG.enabled !== false;
}

function extractTextFromMessageContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    if (Array.isArray(content.parts)) {
      return content.parts.filter((p) => typeof p === 'string').join(' ').trim();
    }
  }
  return '';
}

async function callSentimentProvider({ text, language, channelId, businessId }) {
  const apiKey = process.env.SENTIMENT_API_KEY;
  const url = (process.env.SENTIMENT_API_URL || '').trim();

  if (!apiKey || !url) {
    if (SENTIMENT_LOG_METRICS) {
      console.log('Sentiment provider skipped – missing SENTIMENT_API_URL or SENTIMENT_API_KEY');
    }
    return { score: null, label: null, provider: getSentimentProviderName(), raw: null };
  }

  const payload = {
    text,
    language: language || null,
    channelId: channelId ? String(channelId) : null,
    businessId: businessId ? String(businessId) : null,
  };

  let res;
  const startedAt = Date.now();
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (SENTIMENT_LOG_METRICS) {
      console.log('Sentiment provider network failure', {
        provider: getSentimentProviderName(),
        durationMs: Date.now() - startedAt,
        error: err && err.message,
      });
    }
    console.error('Sentiment provider network error:', err.message);
    return { score: null, label: null, provider: getSentimentProviderName(), raw: { error: err.message } };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.error?.message || data.message)) || `HTTP ${res.status}`;
    if (SENTIMENT_LOG_METRICS) {
      console.log('Sentiment provider HTTP error', {
        provider: getSentimentProviderName(),
        status: res.status,
        durationMs: Date.now() - startedAt,
        message,
      });
    }
    console.error('Sentiment provider error:', message);
    return { score: null, label: null, provider: getSentimentProviderName(), raw: data };
  }

  let score = null;
  if (typeof data.score === 'number') {
    score = data.score;
  } else if (typeof data.sentimentScore === 'number') {
    score = data.sentimentScore;
  }

  if (score != null && !Number.isNaN(score)) {
    const { min, max } = SENTIMENT_CONFIG.scoreRange || { min: -1, max: 1 };
    if (typeof min === 'number' && typeof max === 'number' && min < max) {
      if (score < min) score = min;
      if (score > max) score = max;
    }
  } else {
    score = null;
  }

  let label = null;
  if (typeof data.label === 'string') {
    label = data.label;
  } else if (typeof data.sentimentLabel === 'string') {
    label = data.sentimentLabel;
  } else if (score != null) {
    label = getSentimentLabel(score, { enableMixed: SENTIMENT_CONFIG.includeMixedLabel !== false });
  }

  const provider = data.provider || getSentimentProviderName();

  const result = {
    score,
    label,
    provider,
    raw: data,
  };

  if (SENTIMENT_LOG_METRICS) {
    console.log('Sentiment provider call success', {
      provider,
      durationMs: Date.now() - startedAt,
      hasScore: result.score != null,
      label: result.label || null,
    });
  }

  return result;
}

async function analyzeMessageSentiment({ text, language, channelId, businessId }) {
  if (!isSentimentEnabled()) {
    return { score: null, label: null, provider: null, raw: null };
  }

  const cleanText = (text || '').trim();
  if (!cleanText) {
    return { score: null, label: null, provider: null, raw: null };
  }

  return callSentimentProvider({ text: cleanText, language, channelId, businessId });
}

async function updateMessageSentiment(message, { channelId, businessId } = {}) {
  if (!isSentimentEnabled()) return null;
  if (!message) return null;

  if (message.sentimentAnalyzedAt || message.sentimentScore != null) {
    return {
      sentimentScore: message.sentimentScore,
      sentimentLabel: message.sentimentLabel,
      sentimentProvider: message.sentimentProvider,
      sentimentAnalyzedAt: message.sentimentAnalyzedAt,
    };
  }

  if (message.direction !== 'in' || message.senderType !== 'customer') {
    return null;
  }

  const text = extractTextFromMessageContent(message.content);
  if (!text.trim()) {
    return null;
  }

  const result = await analyzeMessageSentiment({
    text,
    language: message.language || null,
    channelId: channelId || message.channelId || null,
    businessId: businessId || null,
  });

  const now = new Date();
  const update = {
    sentimentScore: result.score,
    sentimentLabel: result.label,
    sentimentProvider: result.provider,
    sentimentAnalyzedAt: now,
  };

  await Message.updateOne(
    { _id: message._id, sentimentAnalyzedAt: { $exists: false } },
    {
      $set: {
        sentimentScore: update.sentimentScore,
        sentimentLabel: update.sentimentLabel,
        sentimentProvider: update.sentimentProvider,
        sentimentAnalyzedAt: update.sentimentAnalyzedAt,
      },
    }
  ).exec();

  return update;
}

async function recalculateConversationSentiment(conversationId) {
  if (!isSentimentEnabled()) return null;
  if (!conversationId) return null;

  const messages = await Message.find({
    conversationId,
    direction: 'in',
    senderType: 'customer',
    sentimentScore: { $ne: null },
  })
    .select('sentimentScore')
    .lean();

  if (!messages.length) {
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        sentimentScore: null,
        sentimentLabel: null,
        lastSentimentAt: null,
        sentimentMessageCount: 0,
      },
    }).exec();

    return {
      sentimentScore: null,
      sentimentLabel: null,
      sentimentMessageCount: 0,
    };
  }

  const sentimentMessageCount = messages.length;
  const sum = messages.reduce((acc, m) => acc + (m.sentimentScore || 0), 0);
  const sentimentScore = sum / sentimentMessageCount;
  const sentimentLabel = getSentimentLabel(sentimentScore, { enableMixed: SENTIMENT_CONFIG.includeMixedLabel !== false });

  const now = new Date();

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      sentimentScore,
      sentimentLabel,
      lastSentimentAt: now,
      sentimentMessageCount,
    },
  }).exec();

  return {
    sentimentScore,
    sentimentLabel,
    sentimentMessageCount,
  };
}

async function recalculateContactSentiment(contactId) {
  if (!isSentimentEnabled()) return null;
  if (!contactId) return null;

  const conversations = await Conversation.find({
    contactId,
    sentimentScore: { $ne: null },
  })
    .select('sentimentScore sentimentMessageCount')
    .lean();

  if (!conversations.length) {
    const update = {
      sentimentScore: null,
      sentimentLabel: null,
      sentimentAnalyzedAt: null,
      sentimentMessageCount: 0,
    };

    await Contact.findByIdAndUpdate(contactId, {
      $set: update,
    }).exec();

    return update;
  }

  let totalWeightedScore = 0;
  let totalMessages = 0;

  for (const conv of conversations) {
    const count = conv.sentimentMessageCount || 0;
    const score = conv.sentimentScore || 0;
    totalWeightedScore += score * count;
    totalMessages += count;
  }

  if (!totalMessages) {
    const update = {
      sentimentScore: null,
      sentimentLabel: null,
      sentimentAnalyzedAt: null,
      sentimentMessageCount: 0,
    };

    await Contact.findByIdAndUpdate(contactId, {
      $set: update,
    }).exec();

    return update;
  }

  const sentimentScore = totalWeightedScore / totalMessages;
  const sentimentLabel = getSentimentLabel(sentimentScore, { enableMixed: SENTIMENT_CONFIG.includeMixedLabel !== false });
  const now = new Date();

  const update = {
    sentimentScore,
    sentimentLabel,
    sentimentAnalyzedAt: now,
    sentimentMessageCount: totalMessages,
  };

  await Contact.findByIdAndUpdate(contactId, {
    $set: update,
  }).exec();

  return update;
}

async function recalculateBusinessSentiment(businessId) {
  if (!isSentimentEnabled()) return null;
  if (!businessId) return null;

  const contacts = await Contact.find({
    businessId,
    sentimentScore: { $ne: null },
  })
    .select('sentimentScore sentimentMessageCount')
    .lean();

  if (!contacts.length) {
    const update = {
      sentimentScore: null,
      sentimentLevel: 'none',
      sentimentFlags: [],
      lastSentimentReviewAt: null,
    };

    await Business.findByIdAndUpdate(businessId, {
      $set: update,
    }).exec();

    return update;
  }

  let totalWeightedScore = 0;
  let totalMessages = 0;

  for (const c of contacts) {
    const count = c.sentimentMessageCount || 0;
    const score = c.sentimentScore || 0;
    totalWeightedScore += score * count;
    totalMessages += count;
  }

  if (!totalMessages) {
    const update = {
      sentimentScore: null,
      sentimentLevel: 'none',
      sentimentFlags: [],
      lastSentimentReviewAt: null,
    };

    await Business.findByIdAndUpdate(businessId, {
      $set: update,
    }).exec();

    return update;
  }

  const sentimentScore = totalWeightedScore / totalMessages;
  const label = getSentimentLabel(sentimentScore, { enableMixed: SENTIMENT_CONFIG.includeMixedLabel !== false }) || 'none';
  const now = new Date();

  const flags = [];
  if (label === 'negative') {
    flags.push('overall_negative_sentiment');
  }

  const update = {
    sentimentScore,
    sentimentLevel: label,
    sentimentFlags: flags,
    lastSentimentReviewAt: now,
  };

  await Business.findByIdAndUpdate(businessId, {
    $set: update,
  }).exec();

  return update;
}

module.exports = {
  isSentimentEnabled,
  analyzeMessageSentiment,
  updateMessageSentiment,
  recalculateConversationSentiment,
  recalculateContactSentiment,
  recalculateBusinessSentiment,
};

