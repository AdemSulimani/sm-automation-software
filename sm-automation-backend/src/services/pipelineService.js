/**
 * Pipeline i brendshëm: automation → keyword → AI → outbound.
 * processIncomingMessage(channelId, senderId, messageText, conversationContext)
 * përpunon mesazhin dhe dërgon përgjigjen përmes outbound service.
 */

const { Channel, AutomationRule, KeywordResponse, Conversation } = require('../models');
const { sendMessage } = require('./outboundService');
const { getReply } = require('./aiService');

/**
 * Gjen ose krijon konversacion për channelId + platformUserId dhe kthen kontekst.
 *
 * @param {object} channelId - ObjectId i channel-it
 * @param {string} senderId - ID i dërgesësit në platformë
 * @returns {Promise<{ conversation: object|null, lastMessageAt: Date|null, isFirstMessage: boolean }>}
 */
async function getConversationContext(channelId, senderId) {
  const platformUserId = String(senderId);
  const conversation = await Conversation.findOne({
    channelId,
    platformUserId,
  }).exec();

  const isFirstMessage = !conversation;
  const lastMessageAt = conversation?.lastMessageAt || null;

  return { conversation, lastMessageAt, isFirstMessage };
}

/**
 * Kontrollon nëse një rregull automation përputhet me kontekstin dhe mesazhin.
 *
 * @param {object} rule - Dokumenti AutomationRule
 * @param {object} ctx - { isFirstMessage, lastMessageAt, messageText }
 * @returns {boolean}
 */
function automationRuleMatches(rule, ctx) {
  const { trigger, triggerValue, triggerRegex, active } = rule;
  if (!active) return false;

  const { isFirstMessage, lastMessageAt, messageText } = ctx;
  const now = Date.now();

  switch (trigger) {
    case 'first_message':
      return isFirstMessage;

    case 'after_X_min': {
      const minutes = triggerValue != null ? Number(triggerValue) : 0;
      if (minutes <= 0 || !lastMessageAt) return false;
      const elapsedMs = now - new Date(lastMessageAt).getTime();
      return elapsedMs >= minutes * 60 * 1000;
    }

    case 'keyword_regex': {
      if (!triggerRegex || typeof messageText !== 'string') return false;
      try {
        const re = new RegExp(triggerRegex);
        return re.test(messageText);
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Ndërton objektin mesazh për outbound nga responseType dhe responsePayload.
 */
function buildResponsePayload(responseType, responsePayload) {
  if (!responsePayload || typeof responsePayload !== 'object') {
    return { text: '' };
  }
  if (responseType === 'text') {
    const text =
      responsePayload.text ??
      responsePayload.body ??
      (typeof responsePayload === 'string' ? responsePayload : '');
    return { text: String(text) };
  }
  if (responseType === 'template') {
    return responsePayload.template != null
      ? { template: responsePayload.template }
      : { template: responsePayload };
  }
  return { text: '' };
}

/**
 * Kontrollon nëse mesazhi përputhet me një keyword response (keywords array ose keywordRegex).
 */
function keywordResponseMatches(kwResp, messageText) {
  if (!kwResp.active) return false;
  if (typeof messageText !== 'string') return false;

  if (kwResp.keywordRegex) {
    try {
      return new RegExp(kwResp.keywordRegex).test(messageText);
    } catch {
      return false;
    }
  }

  const keywords = Array.isArray(kwResp.keywords) ? kwResp.keywords : [];
  const sensitive = !!kwResp.caseSensitive;
  const text = sensitive ? messageText : messageText.toLowerCase();

  return keywords.some((k) => {
    if (typeof k !== 'string') return false;
    const needle = sensitive ? k : k.toLowerCase();
    return text.includes(needle);
  });
}

/**
 * Përditëson (ose krijon) konversacionin pas përpunimit të mesazhit.
 */
async function upsertConversationLastMessage(channelId, senderId) {
  const platformUserId = String(senderId);
  await Conversation.findOneAndUpdate(
    { channelId, platformUserId },
    { $set: { lastMessageAt: new Date() } },
    { upsert: true, new: true }
  ).exec();
}

/**
 * Pipeline i brendshëm: automation → keyword → AI. Të gjitha përgjigjet dërgohen përmes outbound.
 *
 * @param {object} normalizedMessage - { channelId, senderId, messageText, platform?, mid? }
 */
async function processIncomingMessage(normalizedMessage) {
  const { channelId, senderId, messageText } = normalizedMessage;
  if (!channelId || senderId == null) return;

  const channel = await Channel.findById(channelId).exec();
  if (!channel) {
    console.warn('Pipeline: channel not found', String(channelId));
    return;
  }

  const convContext = await getConversationContext(channelId, senderId);
  const pipelineCtx = {
    isFirstMessage: convContext.isFirstMessage,
    lastMessageAt: convContext.lastMessageAt,
    messageText: messageText || '',
  };

  // 1) Automation rules (sipas priority, më i lartë më parë)
  const automationRules = await AutomationRule.find({
    channelId,
    active: true,
  })
    .sort({ priority: -1 })
    .lean()
    .exec();

  for (const rule of automationRules) {
    if (automationRuleMatches(rule, pipelineCtx)) {
      const message = buildResponsePayload(rule.responseType, rule.responsePayload);
      await sendMessage(channel, senderId, message);
      await upsertConversationLastMessage(channelId, senderId);
      return;
    }
  }

  // 2) Keyword responses
  const keywordResponses = await KeywordResponse.find({
    channelId,
    active: true,
  })
    .lean()
    .exec();

  for (const kw of keywordResponses) {
    if (keywordResponseMatches(kw, pipelineCtx.messageText)) {
      const message = kw.responseText != null && kw.responseText !== ''
        ? { text: kw.responseText }
        : (kw.responsePayload && typeof kw.responsePayload === 'object'
          ? (kw.responsePayload.text != null ? { text: kw.responsePayload.text } : kw.responsePayload)
          : { text: '' });
      await sendMessage(channel, senderId, message);
      await upsertConversationLastMessage(channelId, senderId);
      return;
    }
  }

  // 3) AI
  const conversationContext = {
    channelId,
    platformUserId: String(senderId),
    recentMessages: [], // mund të mbushësh nga Message.find për kontekst më të pas
  };
  const aiReply = await getReply(pipelineCtx.messageText, conversationContext);
  await sendMessage(channel, senderId, { text: aiReply });
  await upsertConversationLastMessage(channelId, senderId);
}

module.exports = {
  processIncomingMessage,
  getConversationContext,
  automationRuleMatches,
  keywordResponseMatches,
};
