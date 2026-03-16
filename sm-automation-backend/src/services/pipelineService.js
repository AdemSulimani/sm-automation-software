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
  Feedback,
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
 * Nxjerr udhëzime të shkurtra për AI bazuar në feedback-un e fundit për këtë biznes/channel.
 * Përdoret për të ndërtuar persona-n / preferencat pa pasur nevojë për ndryshim modeli.
 *
 * @param {object} channel - Dokumenti Channel (me businessId, userId)
 * @returns {Promise<string>} – tekst i shkurtër udhëzimesh (mund të jetë bosh nëse nuk ka feedback)
 */
async function getFeedbackGuidelinesForChannel(channel) {
  if (!channel) return '';

  const match = {
    channelId: channel._id,
  };
  if (channel.businessId) {
    match.businessId = channel.businessId;
  }

  if (channel.businessId) {
    const Business = require('../models/Business');
    const business = await Business.findById(channel.businessId).select('aiLearningFromFeedbackEnabled').lean();
    if (business && business.aiLearningFromFeedbackEnabled === false) {
      return '';
    }
  }

  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  match.createdAt = { $gte: fromDate, $lte: now };

  const aggr = await Feedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          reasonCategory: '$reasonCategory',
          sentiment: '$sentiment',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!aggr.length) return '';

  const dislikes = {};
  const likes = {};
  for (const row of aggr) {
    const key = row._id.reasonCategory || 'other';
    if (row._id.sentiment === 'dislike') {
      dislikes[key] = (dislikes[key] || 0) + row.count;
    } else if (row._id.sentiment === 'like') {
      likes[key] = (likes[key] || 0) + row.count;
    }
  }

  const parts = [];

  if (dislikes.too_long || likes.too_short) {
    parts.push(
      'Përgjigjet duhet të jenë të shkurtra dhe konkrete; shmang tekstet shumë të gjata dhe të mbushura me përsëritje.'
    );
  }
  if (dislikes.too_short || likes.too_long) {
    parts.push(
      'Sigurohu që përgjigjet të jenë mjaftueshëm të detajuara dhe të shpjegojnë hapat / opsionet kryesore.'
    );
  }
  if (dislikes.tone_too_informal) {
    parts.push('Përdor një ton më formal dhe profesional; shmang zhargonin dhe emoji-t e tepërt.');
  }
  if (dislikes.tone_too_formal) {
    parts.push('Përdor një ton më miqësor dhe të afërt, pa qenë tepër rigid.');
  }
  if (dislikes.wrong_information) {
    parts.push('Mos shpik informacione; nëse nuk je i sigurt, thuaj që nuk ke të dhëna të mjaftueshme.');
  }
  if (dislikes.did_not_answer_question) {
    parts.push('Gjithmonë adreson direkt pyetjen kryesore të klientit, pastaj shto detaje shtesë nëse është e nevojshme.');
  }

  if (!parts.length) {
    return '';
  }

  return (
    'Bazuar në feedback-un e fundit të këtij biznesi, ndiq këto udhëzime kur përgjigjesh klientëve:\n\n' +
    parts.map((p) => `- ${p}`).join('\n')
  );
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
    companyInfoText,
    await getFeedbackGuidelinesForChannel(channel)
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
