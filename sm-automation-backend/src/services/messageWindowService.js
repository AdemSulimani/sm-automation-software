/**
 * Rregulli 24-orësh për dërgimin e mesazheve në platformat Meta (Facebook, Instagram, WhatsApp).
 * Ky modul centralizon logjikën për të parë nëse lejohet dërgimi i një mesazhi outbound.
 */

const META_PLATFORMS = ['facebook', 'instagram', 'whatsapp'];

/**
 * Kontrollon nëse lejohet dërgimi i një mesazhi outbound brenda dritares 24-orëshe.
 *
 * @param {object} params
 * @param {object} params.conversation - Dokumenti Conversation (ose objekt i ngjashëm lean)
 * @param {object} params.channel - Dokumenti Channel (me fushën platform)
 * @param {string} [params.direction='out'] - Drejtimi i mesazhit; aktualisht përdoret vetëm 'out'
 * @param {Date} [params.now=new Date()] - Koha aktuale (injektueshme për testim)
 * @returns {{ allowed: boolean, reason: string | null }}
 */
function canSendMessageWithin24h({ conversation, channel, direction = 'out', now = new Date() }) {
  if (!conversation || !channel || direction !== 'out') {
    return { allowed: true, reason: null };
  }

  const platform = channel.platform;
  if (!platform || !META_PLATFORMS.includes(String(platform))) {
    // Rregulli 24-orësh aplikohet vetëm për platformat Meta
    return { allowed: true, reason: null };
  }

  const lastUserMessageAt = conversation.lastUserMessageAt || null;
  if (!lastUserMessageAt) {
    // Nëse s'kemi ende mesazh inbound, lejo dërgimin
    return { allowed: true, reason: null };
  }

  const lastUserTs = new Date(lastUserMessageAt).getTime();
  if (Number.isNaN(lastUserTs)) {
    return { allowed: true, reason: null };
  }

  const elapsedMs = now.getTime() - lastUserTs;
  const WINDOW_MS = 24 * 60 * 60 * 1000;

  if (elapsedMs <= WINDOW_MS) {
    return { allowed: true, reason: null };
  }

  return { allowed: false, reason: 'outside_24h_window' };
}

module.exports = {
  canSendMessageWithin24h,
};

