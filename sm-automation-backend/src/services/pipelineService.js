/**
 * Pipeline i brendshëm: automation → keyword → AI → outbound.
 * processIncomingMessage(channelId, senderId, messageText, conversationContext)
 * përpunon mesazhin dhe dërgon përgjigjen përmes outbound service.
 */

const {
  Channel,
  AutomationRule,
  KeywordResponse,
  Conversation,
  User,
  Message,
} = require('../models');
const { enqueueOutboundMessage } = require('./outboundQueueService');
const { getReply } = require('./aiService');
const { getOrCreateContactForChannelUser } = require('./contactService');
const { canSendMessageWithin24h } = require('./messageWindowService');

/** Numri maksimal i mesazheve të fundit për kontekstin AI */
const RECENT_MESSAGES_LIMIT = 10;

/** Vonesë 1–3 sekonda para dërgesës së përgjigjes, që chatbot të duket më natyral. */
const REPLY_DELAY_MS_MIN = 1000;
const REPLY_DELAY_MS_MAX = 3000;

function delayReply() {
  const ms = Math.floor(Math.random() * (REPLY_DELAY_MS_MAX - REPLY_DELAY_MS_MIN + 1)) + REPLY_DELAY_MS_MIN;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * Gjen ose krijon konversacion dhe kthen dokumentin (për conversationId te Message).
 * Nuk përditëson lastMessageAt – bëhet në fund me upsertConversationLastMessage.
 */
async function getOrCreateConversation(channelId, senderId) {
  const platformUserId = String(senderId);
  let conversation = await Conversation.findOne({ channelId, platformUserId }).exec();
  if (!conversation) {
    conversation = await Conversation.create({ channelId, platformUserId });
  }
  return conversation;
}

/**
 * Ruaj mesazh në Message (in ose out) për historik dhe kontekst AI.
 */
async function saveMessage(conversationId, direction, content, platformMessageId = null) {
  const payload =
    typeof content === 'string' ? { text: content } : content && typeof content === 'object' ? content : { text: '' };
  await Message.create({
    conversationId,
    direction,
    content: payload,
    platformMessageId: platformMessageId || undefined,
  });
}

/**
 * Merr mesazhet e fundit të konversacionit për kontekst AI (format: { direction, content }), në rend kronologjik.
 */
async function getRecentMessagesForConversation(conversationId, limit = RECENT_MESSAGES_LIMIT) {
  const messages = await Message.find({ conversationId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()
    .exec();
  return messages.reverse().map((m) => ({
    direction: m.direction,
    content: m.content,
  }));
}

/**
 * Kontrollon nëse një rregull automation përputhet me kontekstin, mesazhin dhe llojin e trigger-it.
 *
 * @param {object} rule - Dokumenti AutomationRule
 * @param {object} ctx - { isFirstMessage, lastMessageAt, messageText, triggerType }
 * @returns {boolean}
 */
function automationRuleMatches(rule, ctx) {
  const { trigger, triggerValue, triggerRegex, triggerSource, active } = rule;
  if (!active) return false;

  const { isFirstMessage, lastMessageAt, messageText, triggerType } = ctx;
  const now = Date.now();

  const source = triggerSource || 'any';
  const incomingType = triggerType || 'dm';
  if (source !== 'any' && source !== incomingType) {
    return false;
  }

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
 * Nxjerr tekstin e informacioneve për AI për një channel: aiInstructions nëse ka, përndryshe companyInfo nga User.
 *
 * @param {object} channel - Dokumenti Channel (me userId, aiInstructions)
 * @returns {Promise<string>}
 */
async function getCompanyInfoForChannel(channel) {
  const channelInstructions =
    channel.aiInstructions && typeof channel.aiInstructions === 'string'
      ? channel.aiInstructions.trim()
      : '';
  if (channelInstructions) return channelInstructions;

  const user = await User.findById(channel.userId).select('companyInfo').lean().exec();
  const companyInfo =
    user && user.companyInfo && typeof user.companyInfo === 'string'
      ? user.companyInfo.trim()
      : '';
  return companyInfo;
}

/**
 * Përditëson (ose krijon) konversacionin pas përpunimit të mesazhit.
 * Nëse është mesazh INBOUND nga përdoruesi, përditëson edhe lastUserMessageAt.
 *
 * @param {object} channelId
 * @param {string|number} senderId
 * @param {{ isInbound?: boolean }} [options]
 */
async function upsertConversationLastMessage(channelId, senderId, options = {}) {
  const platformUserId = String(senderId);
  const isInbound = !!options.isInbound;
  const now = new Date();
  const setFields = { lastMessageAt: now };
  if (isInbound) {
    setFields.lastUserMessageAt = now;
  }
  await Conversation.findOneAndUpdate(
    { channelId, platformUserId },
    { $set: setFields },
    { upsert: true, new: true }
  ).exec();
}

/**
 * Pipeline i brendshëm: automation → keyword → AI. Të gjitha përgjigjet dërgohen përmes outbound.
 *
 * @param {object} normalizedMessage - { channelId, senderId, messageText, platform?, mid?, triggerType?, triggerMetadata? }
 */
async function processIncomingMessage(normalizedMessage) {
  const { channelId, senderId, messageText, mid, triggerType } = normalizedMessage;
  if (!channelId || senderId == null) return;

  const channel = await Channel.findById(channelId).exec();
  if (!channel) {
    console.warn('Pipeline: channel not found', String(channelId));
    return;
  }

  if (channel.tokenStatus && channel.tokenStatus !== 'valid') {
    console.warn('Pipeline: channel token invalid/needs reconnect, skipping automation', {
      channelId: String(channelId),
      tokenStatus: channel.tokenStatus,
    });
    return;
  }

  const convContext = await getConversationContext(channelId, senderId);
  const pipelineCtx = {
    isFirstMessage: convContext.isFirstMessage,
    lastMessageAt: convContext.lastMessageAt,
    messageText: messageText || '',
    triggerType: triggerType || 'dm',
  };

  // Konversacioni dhe historiku për Message (hapi 6)
  const conversation = await getOrCreateConversation(channelId, senderId);
  if (!conversation.contactId) {
    const contactId = await getOrCreateContactForChannelUser(
      channelId,
      senderId,
      channel.userId,
      channel.businessId || null
    );
    await Conversation.findByIdAndUpdate(conversation._id, { $set: { contactId } });
    conversation.contactId = contactId;
  }
  const recentMessagesList = await getRecentMessagesForConversation(conversation._id);
  await saveMessage(conversation._id, 'in', messageText || '', mid);
  await upsertConversationLastMessage(channelId, senderId, { isInbound: true });

  // Kur biznesi ka përgjigjur manual (botPaused), mos dërgo përgjigje automatike; çaktivizo pause që boti të përgjigjet te mesazhi i ardhshëm.
  if (conversation.botPaused) {
    await Conversation.findByIdAndUpdate(conversation._id, { $set: { botPaused: false } });
    return;
  }

  // Kur chatbot është OFF ose kanali është i kufizuar (status !== 'active'), mos dërgo përgjigje automatike.
  if (channel.status !== 'active') {
    return;
  }

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
      const windowCheck = canSendMessageWithin24h({ conversation, channel, direction: 'out' });
      if (!windowCheck.allowed) {
        console.warn('Automation reply blocked by 24h window', {
          conversationId: String(conversation._id),
          channelId: String(channel._id),
          reason: windowCheck.reason,
        });
        return;
      }
      await delayReply();
      await enqueueOutboundMessage({
        channelId,
        conversationId: conversation._id,
        recipientId: String(senderId),
        payload: message,
      });
      await saveMessage(conversation._id, 'out', message);
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
      const windowCheck = canSendMessageWithin24h({ conversation, channel, direction: 'out' });
      if (!windowCheck.allowed) {
        console.warn('Keyword reply blocked by 24h window', {
          conversationId: String(conversation._id),
          channelId: String(channel._id),
          reason: windowCheck.reason,
        });
        return;
      }
      await delayReply();
      await enqueueOutboundMessage({
        channelId,
        conversationId: conversation._id,
        recipientId: String(senderId),
        payload: message,
      });
      await saveMessage(conversation._id, 'out', message);
      await upsertConversationLastMessage(channelId, senderId);
      return;
    }
  }

  // 3) AI – lidhja e pipeline me rrjedhën companyInfo (hapi 5); historiku (hapi 6) në recentMessages
  const companyInfoText = await getCompanyInfoForChannel(channel);
  const conversationContext = {
    channelId,
    platformUserId: String(senderId),
    recentMessages: recentMessagesList,
  };
  const aiReply = await getReply(
    pipelineCtx.messageText,
    conversationContext,
    companyInfoText
  );
  const windowCheck = canSendMessageWithin24h({ conversation, channel, direction: 'out' });
  if (!windowCheck.allowed) {
    console.warn('AI reply blocked by 24h window', {
      conversationId: String(conversation._id),
      channelId: String(channel._id),
      reason: windowCheck.reason,
    });
    return;
  }
  await delayReply();
  await enqueueOutboundMessage({
    channelId,
    conversationId: conversation._id,
    recipientId: String(senderId),
    payload: { text: aiReply },
  });
  await saveMessage(conversation._id, 'out', { text: aiReply });
  await upsertConversationLastMessage(channelId, senderId);
}

module.exports = {
  processIncomingMessage,
  getConversationContext,
  automationRuleMatches,
  keywordResponseMatches,
};
