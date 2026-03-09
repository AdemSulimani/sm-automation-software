/**
 * Kontrolleri për webhook-et Meta (Facebook Messenger, Instagram, WhatsApp).
 * GET: verifikim i URL-it të webhook (hub.verify_token, hub.challenge).
 * POST: merr eventet, parsjon payload-in, normalizon dhe thërret pipeline-in.
 */

const { Channel } = require('../models');

/** Tokeni i verifikimit për Meta – duhet të përputhet me atë në Meta Developer Console */
const getVerifyToken = () => process.env.META_WEBHOOK_VERIFY_TOKEN || '';

/**
 * GET /api/webhooks/meta
 * Meta dërgon: hub.mode, hub.verify_token, hub.challenge.
 * Nëse verify_token përputhet, përgjigjemi me hub.challenge (tekst).
 */
async function verifyMetaWebhook(req, res, next) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode !== 'subscribe') {
      return res.status(400).send('Bad request: hub.mode must be subscribe');
    }
    if (!challenge) {
      return res.status(400).send('Bad request: hub.challenge missing');
    }

    const expectedToken = getVerifyToken();
    if (!expectedToken || token !== expectedToken) {
      return res.status(403).send('Forbidden: verify token mismatch');
    }

    res.status(200).send(challenge);
  } catch (err) {
    next(err);
  }
}

/**
 * Normalizon një mesazh DM nga payload-i Meta në format të brendshëm.
 * @returns { { channelId, senderId, messageText, platform, mid?, triggerType } | null } ose null nëse nuk është mesazh i përpunueshëm
 */
function normalizeMessengerOrInstagramMessage(entry, channel, messaging) {
  const message = messaging.message;
  if (!message) return null;
  if (message.is_echo) return null;
  const text = message.text || (message.attachments && message.attachments.length) ? '[attachment]' : '';
  return {
    channelId: channel._id,
    senderId: messaging.sender.id,
    messageText: text || '',
    platform: channel.platform,
    mid: message.mid,
    triggerType: 'dm',
  };
}

/**
 * Normalizon një klikim butoni / postback në Messenger/Instagram si trigger "button".
 * @returns { { channelId, senderId, messageText, platform, triggerType, triggerMetadata } | null }
 */
function normalizeMessengerPostback(entry, channel, messaging) {
  const postback = messaging.postback;
  if (!postback) return null;
  const senderId = messaging.sender && messaging.sender.id;
  if (!senderId) return null;
  const title = typeof postback.title === 'string' ? postback.title : '';
  const payloadText = typeof postback.payload === 'string' ? postback.payload : '';
  const text = title || payloadText;
  if (!text) return null;
  return {
    channelId: channel._id,
    senderId,
    messageText: text,
    platform: channel.platform,
    triggerType: 'button',
    triggerMetadata: {
      type: 'postback',
      title,
      payload: payloadText,
    },
  };
}

/**
 * Normalizon mesazhin nga WhatsApp Cloud API (entry.changes[].value.messages).
 */
function normalizeWhatsAppMessage(changeValue, channel, messageObj) {
  const from = messageObj.from;
  const textObj = messageObj.text;
  const messageText = textObj && typeof textObj.body === 'string' ? textObj.body : '';
  return {
    channelId: channel._id,
    senderId: from,
    messageText,
    platform: 'whatsapp',
    mid: messageObj.id,
    triggerType: 'dm',
  };
}

/**
 * Gjen Channel nga platformë dhe platform page/phone id.
 */
async function findChannelByPlatformId(platform, pageOrPhoneId) {
  if (!pageOrPhoneId) return null;
  const channel = await Channel.findOne({
    platform,
    platformPageId: String(pageOrPhoneId),
    status: 'active',
  }).exec();
  return channel;
}

/**
 * Normalizon një event komentimi (comment) në një trigger "comment".
 * Për typet konkrete të fushave (comment_id, post_id, etj.) lexohet nga change.value nëse ekzistojnë.
 */
function normalizeCommentTrigger(platform, channel, change) {
  const value = change && change.value ? change.value : {};
  const from = value.from || value.sender || {};
  const senderId = from.id || from.sender_id;
  const messageText =
    typeof value.message === 'string'
      ? value.message
      : typeof value.text === 'string'
        ? value.text
        : '';
  if (!senderId || !messageText) return null;
  const commentId = value.comment_id || value.id || null;
  const postId = value.post_id || value.post || value.media_id || null;
  return {
    channelId: channel._id,
    senderId: String(senderId),
    messageText,
    platform,
    triggerType: 'comment',
    triggerMetadata: {
      commentId,
      postId,
      field: change.field,
    },
  };
}

/**
 * Parsjon payload-in e POST nga Meta dhe nxjerr eventet e normalizuar (DM, comments, story/button triggers).
 * Mbështet: object=page (Messenger), object=instagram, object=whatsapp_business_account.
 */
async function parseMetaPayload(body) {
  const results = [];
  const object = body.object;

  if (object === 'page') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const pageId = entry.id;
      const channel = await findChannelByPlatformId('facebook', pageId);
      if (!channel) continue;
      const messagingList = entry.messaging || [];
      for (const messaging of messagingList) {
        if (messaging.message) {
          const normalized = normalizeMessengerOrInstagramMessage(entry, channel, messaging);
          if (normalized) results.push(normalized);
        } else if (messaging.postback) {
          const normalizedButton = normalizeMessengerPostback(entry, channel, messaging);
          if (normalizedButton) results.push(normalizedButton);
        }
      }

      const changes = entry.changes || [];
      for (const change of changes) {
        if (!change || !change.field) continue;
        if (change.field === 'comments' || change.field === 'feed') {
          const normalizedComment = normalizeCommentTrigger('facebook', channel, change);
          if (normalizedComment) results.push(normalizedComment);
        }
      }
    }
    return results;
  }

  if (object === 'instagram') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const igId = entry.id;
      const channel = await findChannelByPlatformId('instagram', igId);
      if (!channel) continue;
      const messagingList = entry.messaging || [];
      for (const messaging of messagingList) {
        if (messaging.message) {
          const normalized = normalizeMessengerOrInstagramMessage(entry, channel, messaging);
          if (normalized) results.push(normalized);
        } else if (messaging.postback) {
          const normalizedButton = normalizeMessengerPostback(entry, channel, messaging);
          if (normalizedButton) results.push(normalizedButton);
        }
      }

      const changes = entry.changes || [];
      for (const change of changes) {
        if (!change || !change.field) continue;
        if (change.field === 'comments' || change.field === 'mentions' || change.field === 'story_insights') {
          const normalizedComment = normalizeCommentTrigger('instagram', channel, change);
          if (normalizedComment) results.push(normalizedComment);
        }
      }
    }
    return results;
  }

  if (object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        if (!value) continue;
        const phoneNumberId = value.metadata && value.metadata.phone_number_id;
        const channel = await findChannelByPlatformId('whatsapp', phoneNumberId);
        if (!channel) continue;
        const messages = value.messages || [];
        for (const msg of messages) {
          const normalized = normalizeWhatsAppMessage(value, channel, msg);
          if (normalized) results.push(normalized);
        }
      }
    }
    return results;
  }

  return results;
}

/**
 * POST /api/webhooks/meta
 * Merr eventet nga Meta; për çdo "message" (jo delivery, read, etj.) thërret pipeline-in.
 */
async function handleMetaWebhookPost(req, res, next) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    if (body.object && req.query['hub.mode'] === 'subscribe') {
      return res.status(400).send('Use GET for webhook verification');
    }

    const normalizedMessages = await parseMetaPayload(body);

    for (const msg of normalizedMessages) {
      try {
        await processIncomingMessage(msg);
      } catch (pipeErr) {
        console.error('Pipeline error for message:', msg?.mid, pipeErr);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}

const { processIncomingMessage } = require('../services/pipelineService');

module.exports = {
  verifyMetaWebhook,
  handleMetaWebhookPost,
  processIncomingMessage,
};
