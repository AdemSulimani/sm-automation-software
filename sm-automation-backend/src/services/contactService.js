/**
 * Shërbimi për Contact: gjen ose krijon kontakt për një (channelId, platformUserId).
 * Kontakti i përket pronarit të kanalit (channelOwnerUserId).
 */

const Contact = require('../models/Contact');
const ContactIdentity = require('../models/ContactIdentity');

/**
 * Gjen ose krijon një Contact për (channelId, platformUserId). Pronari i kontaktit është channelOwnerUserId.
 * Kthen contactId. businessId opsional (për të lidhur kontaktin me biznesin).
 *
 * @param {string} channelId - ObjectId i channel-it
 * @param {string} platformUserId - ID i përdoruesit në platformë
 * @param {string} channelOwnerUserId - ObjectId i përdoruesit që zotëron kanalin
 * @param {string|null} [businessId] - ObjectId i biznesit (opsional)
 * @returns {Promise<string>} contactId
 */
async function getOrCreateContactForChannelUser(channelId, platformUserId, channelOwnerUserId, businessId = null) {
  const pid = String(platformUserId);
  let identity = await ContactIdentity.findOne({ channelId, platformUserId: pid })
    .populate('contactId')
    .lean()
    .exec();
  if (identity && identity.contactId) {
    return identity.contactId._id.toString();
  }
  try {
    const contact = await Contact.create({
      userId: channelOwnerUserId,
      businessId: businessId || null,
      name: `Kontakt ${pid.slice(0, 8)}`,
      email: null,
      phone: null,
      notes: '',
    });
    await ContactIdentity.create({
      contactId: contact._id,
      channelId,
      platformUserId: pid,
    });
    return contact._id.toString();
  } catch (err) {
    if (err.code === 11000) {
      const existing = await ContactIdentity.findOne({ channelId, platformUserId: pid }).lean();
      if (existing) return existing.contactId.toString();
    }
    throw err;
  }
}

module.exports = {
  getOrCreateContactForChannelUser,
};
