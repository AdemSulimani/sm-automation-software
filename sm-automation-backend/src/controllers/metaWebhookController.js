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
 * Normalizon një mesazh nga payload-i Meta në format të brendshëm.
 * @returns { { channelId, senderId, messageText, platform, mid? } | null } ose null nëse nuk është mesazh i përpunueshëm
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
 * Parsjon payload-in e POST nga Meta dhe nxjerr mesazhet e normalizuar.
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
        const normalized = normalizeMessengerOrInstagramMessage(entry, channel, messaging);
        if (normalized) results.push(normalized);
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
        const normalized = normalizeMessengerOrInstagramMessage(entry, channel, messaging);
        if (normalized) results.push(normalized);
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
