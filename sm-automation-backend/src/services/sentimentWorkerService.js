const { Message, Conversation, Contact } = require('../models');
const {
  isSentimentEnabled,
  updateMessageSentiment,
  recalculateConversationSentiment,
  recalculateContactSentiment,
  recalculateBusinessSentiment,
} = require('./sentimentService');

async function findMessagesNeedingSentiment(limit = 50) {
  if (!isSentimentEnabled()) return [];

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  return Message.find({
    direction: 'in',
    senderType: 'customer',
    sentimentAnalyzedAt: null,
    createdAt: { $gte: fifteenMinutesAgo },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean()
    .exec();
}

async function processMessageForSentiment(rawMessage) {
  if (!rawMessage) return { scored: false, skipped: true };

  const conversation = await Conversation.findById(rawMessage.conversationId)
    .select('channelId contactId')
    .lean();
  if (!conversation) return { scored: false, skipped: true };

  const contact =
    conversation.contactId &&
    (await Contact.findById(conversation.contactId).select('businessId').lean());

  const businessId = contact && contact.businessId ? contact.businessId : null;

  const sentiment = await updateMessageSentiment(
    {
      _id: rawMessage._id,
      content: rawMessage.content,
      direction: rawMessage.direction,
      senderType: rawMessage.senderType,
      language: rawMessage.language || null,
      channelId: conversation.channelId,
    },
    { channelId: conversation.channelId, businessId }
  );

  if (!sentiment || sentiment.sentimentScore == null) {
    return { scored: false, skipped: true };
  }

  await recalculateConversationSentiment(rawMessage.conversationId);

  if (conversation.contactId) {
    await recalculateContactSentiment(conversation.contactId);
  }

  if (businessId) {
    await recalculateBusinessSentiment(businessId);
  }

  return { scored: true, skipped: false };
}

async function runSentimentBatch() {
  if (!isSentimentEnabled()) return;

  const messages = await findMessagesNeedingSentiment();
  if (!messages.length) return;

  const batchSize = messages.length;
  let processed = 0;
  let scored = 0;
  let skipped = 0;
  let failed = 0;

  for (const msg of messages) {
    try {
      const result = await processMessageForSentiment(msg);
      processed += 1;
      if (result && result.scored) {
        scored += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      failed += 1;
      console.warn('Sentiment batch failed for message', {
        messageId: String(msg._id),
        error: err && err.message,
      });
    }
  }

  console.log('Sentiment worker batch summary', {
    batchSize,
    processed,
    scored,
    skipped,
    failed,
  });
}

function startSentimentWorker() {
  if (!isSentimentEnabled()) {
    console.log('Sentiment worker not started – sentiment disabled in config');
    return;
  }

  if (process.env.SENTIMENT_WORKER_ENABLED === 'false') {
    console.log('Sentiment worker not started – SENTIMENT_WORKER_ENABLED=false');
    return;
  }

  const intervalMs = Number(process.env.SENTIMENT_WORKER_INTERVAL_MS || '60000'); // default 1 minutë
  console.log(`Sentiment worker started with interval ${intervalMs}ms`);
  setInterval(() => {
    runSentimentBatch().catch((err) => {
      console.error('Error in sentiment worker batch', err);
    });
  }, intervalMs);
}

module.exports = {
  startSentimentWorker,
  runSentimentBatch,
};

