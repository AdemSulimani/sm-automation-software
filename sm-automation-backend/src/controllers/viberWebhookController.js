/**
 * Kontrolleri për webhook-in Viber.
 * POST: merr eventet nga Viber, parsjon payload-in, normalizon në format të brendshëm
 * (channelId, senderId, messageText) dhe thërret pipeline-in e njëjtë si Meta.
 */

const { Channel } = require('../models');
const { processIncomingMessage } = require('../services/pipelineService');

/**
 * Gjen Channel për Viber nga viberBotId (nëse në payload) ose i vetmi kanal aktiv Viber.
 */
async function findViberChannel(body) {
  const botId = body.receiver || body.context?.bot_id || null;
  const query = { platform: 'viber', status: 'active' };
  if (botId) query.viberBotId = String(botId);
  const channel = await Channel.findOne(query).exec();
  return channel;
}

/**
 * Normalizon një mesazh nga payload-i Viber në format të brendshëm.
 * @param {object} channel - Dokumenti Channel (Mongoose)
 * @param {object} body - Body e webhook-it Viber (sender, message, message_token)
 * @returns { { channelId, senderId, messageText, platform, mid } | null }
 */
function normalizeViberMessage(channel, body) {
  const sender = body.sender;
  const message = body.message;
  if (!sender || !sender.id) return null;
  if (!message) return null;

  let messageText = '';
  if (message.type === 'text' && typeof message.text === 'string') {
    messageText = message.text;
  } else if (message.type) {
    messageText = '[attachment]';
  }

  return {
    channelId: channel._id,
    senderId: sender.id,
    messageText,
    platform: 'viber',
    mid: body.message_token,
  };
}

/**
 * Parsjon payload-in e POST nga Viber dhe kthen mesazhet e normalizuar.
 * Viber dërgon event: "message" | "conversation_started" | "delivered" | "seen" | etj.
 * Përpunojmë vetëm event === "message".
 */
async function parseViberPayload(body) {
  const results = [];
  const event = body.event;

  if (event !== 'message') {
    return results;
  }

  const channel = await findViberChannel(body);
  if (!channel) return results;

  const normalized = normalizeViberMessage(channel, body);
  if (normalized) results.push(normalized);

  return results;
}

/**
 * POST /api/webhooks/viber
 * Merr eventet nga Viber; për çdo "message" thërret pipeline-in e brendshëm.
 */
async function handleViberWebhookPost(req, res, next) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const normalizedMessages = await parseViberPayload(body);

    for (const msg of normalizedMessages) {
      try {
        await processIncomingMessage(msg);
      } catch (pipeErr) {
        console.error('Pipeline error for Viber message:', msg?.mid, pipeErr);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleViberWebhookPost,
};
