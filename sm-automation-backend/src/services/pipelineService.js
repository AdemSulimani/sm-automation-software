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
const { sendMessage } = require('./outboundService');
const { getReply } = require('./aiService');
const { getOrCreateContactForChannelUser } = require('./contactService');

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
  const { channelId, senderId, messageText, mid } = normalizedMessage;
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
  await upsertConversationLastMessage(channelId, senderId);

  // Kur biznesi ka përgjigjur manual (botPaused), mos dërgo përgjigje automatike; çaktivizo pause që boti të përgjigjet te mesazhi i ardhshëm.
  if (conversation.botPaused) {
    await Conversation.findByIdAndUpdate(conversation._id, { $set: { botPaused: false } });
    return;
  }

  // Kur chatbot është OFF (status !== 'active'), mos dërgo përgjigje automatike – vetëm ruaj mesazhin (tashmë u ruajt) dhe përditëso konversacionin. Përgjigjet vetëm manual reply.
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
      await delayReply();
      await sendMessage(channel, senderId, message);
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
      await delayReply();
      await sendMessage(channel, senderId, message);
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
  await delayReply();
  await sendMessage(channel, senderId, { text: aiReply });
  await saveMessage(conversation._id, 'out', { text: aiReply });
  await upsertConversationLastMessage(channelId, senderId);
}

module.exports = {
  processIncomingMessage,
  getConversationContext,
  automationRuleMatches,
  keywordResponseMatches,
};
