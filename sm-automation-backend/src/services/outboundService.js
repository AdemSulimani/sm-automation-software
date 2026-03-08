/**
 * Shërbimi outbound: dërgon mesazhe përmes Meta Graph API (Messenger, Instagram, WhatsApp)
 * dhe Viber REST API. Wrapper i vetëm sendMessage(channel, recipientId, message).
 * Përdor getPlainAccessToken për të marrë tokenin e dekriptuar nëse është i ruajtur i enkriptuar.
 */

const { getPlainAccessToken } = require('./tokenEncryption');
const META_GRAPH_BASE = 'https://graph.facebook.com';
const META_API_VERSION = 'v21.0';
const VIBER_API_BASE = 'https://chatapi.viber.com/pa';

/**
 * Dërgon mesazh përmes Meta Graph API për Facebook Messenger ose Instagram.
 * Përdor /me/messages me Page Access Token.
 */
async function sendMetaMessengerOrInstagram(channel, recipientId, payload) {
  const token = getPlainAccessToken(channel) || channel.accessToken;
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`;
  const body = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: buildMetaMessagePayload(payload),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Meta API error: ${res.status}`);
    err.code = data.error?.code;
    err.status = res.status;
    throw err;
  }
  if (data.error) {
    const err = new Error(data.error.message || 'Meta API returned error');
    err.code = data.error.code;
    throw err;
  }
  return data;
}

/**
 * Dërgon mesazh përmes WhatsApp Cloud API.
 * Endpoint: /{phone_number_id}/messages; "to" është numri i telefonit (recipientId).
 */
async function sendMetaWhatsApp(channel, recipientId, payload) {
  const pageId = channel.platformPageId;
  if (!pageId) {
    throw new Error('Channel missing platformPageId (phone_number_id) for WhatsApp');
  }
  const token = getPlainAccessToken(channel) || channel.accessToken;
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/${pageId}/messages`;
  const body = buildWhatsAppBody(recipientId, payload);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `WhatsApp API error: ${res.status}`);
    err.code = data.error?.code;
    err.status = res.status;
    throw err;
  }
  if (data.error) {
    const err = new Error(data.error.message || 'WhatsApp API returned error');
    err.code = data.error.code;
    throw err;
  }
  return data;
}

/**
 * Ndërton objektin "message" për Messenger/Instagram ose fushat e duhura për WhatsApp.
 * payload: { text } | { attachment } | template (objekt template).
 */
function buildMetaMessagePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { text: { body: '' } };
  }
  if (typeof payload.text === 'string') {
    return { text: { body: payload.text } };
  }
  if (payload.attachment) {
    return { attachment: payload.attachment };
  }
  if (payload.template) {
    return { attachment: { type: 'template', payload: payload.template } };
  }
  return { text: { body: '' } };
}

/**
 * Ndërton body për WhatsApp Cloud API (messaging_product, to, type, text/template/...).
 */
function buildWhatsAppBody(recipientId, payload) {
  const to = String(recipientId).replace(/\D/g, '');
  if (payload && typeof payload.text === 'string') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: payload.text },
    };
  }
  if (payload && payload.attachment) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: payload.attachment.type || 'image',
      [payload.attachment.type || 'image']: payload.attachment.payload,
    };
  }
  if (payload && payload.template) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: payload.template,
    };
  }
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: '' },
  };
}

/**
 * Dërgon mesazh përmes Viber REST API.
 * Endpoint: POST https://chatapi.viber.com/pa/send_message
 * Header: X-Viber-Auth-Token; body: receiver, type, text, sender (name e detyruar).
 */
async function sendViberMessage(channel, recipientId, payload) {
  const url = `${VIBER_API_BASE}/send_message`;
  const senderName = (channel.name && channel.name.slice(0, 28)) || 'Bot';
  const token = getPlainAccessToken(channel) || channel.accessToken;
  let type = 'text';
  let body = { text: '' };

  if (payload && typeof payload === 'object') {
    if (typeof payload.text === 'string') {
      type = 'text';
      body = { text: payload.text };
    } else if (payload.attachment) {
      type = payload.attachment.type || 'picture';
      body = payload.attachment.payload || {};
    } else if (payload.template) {
      type = 'rich_media';
      body = payload.template;
    }
  }

  const requestBody = {
    receiver: String(recipientId),
    type,
    sender: { name: senderName },
    ...body,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Viber-Auth-Token': token,
    },
    body: JSON.stringify(requestBody),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.status_message || `Viber API error: ${res.status}`);
    err.code = data.status;
    err.status = res.status;
    throw err;
  }
  if (data.status !== 0) {
    const err = new Error(data.status_message || `Viber API error: ${data.status}`);
    err.code = data.status;
    throw err;
  }
  return data;
}

/**
 * Dërgon mesazh në platformën e duhur sipas channel.platform.
 *
 * @param {object} channel - Dokumenti Channel (ose objekt me platform, accessToken, platformPageId, viberBotId, name)
 * @param {string} recipientId - ID i marrësit (PSID për Messenger/IG, numër telefoni për WhatsApp, Viber user id për Viber)
 * @param {object} message - { text } | { attachment } | { template }
 * @returns {Promise<object>} Përgjigja e API-së së platformës
 */
async function sendMessage(channel, recipientId, message) {
  if (!channel || !channel.platform) {
    throw new Error('outboundService.sendMessage: channel and channel.platform required');
  }
  if (recipientId == null || recipientId === '') {
    throw new Error('outboundService.sendMessage: recipientId required');
  }

  const platform = String(channel.platform).toLowerCase();
  const payload = message && typeof message === 'object' ? message : { text: '' };

  switch (platform) {
    case 'facebook':
      return sendMetaMessengerOrInstagram(channel, recipientId, payload);
    case 'instagram':
      return sendMetaMessengerOrInstagram(channel, recipientId, payload);
    case 'whatsapp':
      return sendMetaWhatsApp(channel, recipientId, payload);
    case 'viber':
      return sendViberMessage(channel, recipientId, payload);
    default:
      throw new Error(`outboundService.sendMessage: unsupported platform "${platform}"`);
  }
}

module.exports = {
  sendMessage,
  sendMetaMessengerOrInstagram,
  sendMetaWhatsApp,
  sendViberMessage,
};
