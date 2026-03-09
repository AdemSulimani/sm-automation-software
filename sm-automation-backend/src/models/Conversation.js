/**
 * Modeli Conversation – një konversacion për çdo çift (channel_id, channel_user_id).
 * Identiteti i konversacionit është channelId + platformUserId: i njëjti person (platformUserId)
 * mund të ekzistojë në kanale të ndryshme, dhe çdo kanal ka konversacionin e vet me atë përdorues.
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    platformUserId: {
      type: String,
      required: true,
      index: true,
    },
    platformConversationId: {
      type: String,
      default: null,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    // Koha e fundit kur ka shkruar përdoruesi (mesazh INBOUND nga klienti)
    lastUserMessageAt: {
      type: Date,
      default: null,
    },
    // Nëse platforma ka kthyer gabim që conversation është jashtë dritares së mesazheve (p.sh. Meta 24h)
    messagingWindowExpired: {
      type: Boolean,
      default: false,
    },
    // Kur është marrë për herë të fundit ky gabim
    lastWindowErrorAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Emër, profil, etj. nga platforma
    },
    // Kur biznesi përgjigjet manual nga Inbox, boti ndalet që të mos ndërhyjë (nuk dërgon përgjigje automatike)
    botPaused: {
      type: Boolean,
      default: false,
    },
    // Kontakti i lidhur (një person mund të ketë konversacione në kanale të ndryshme)
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Një konversacion për çdo (channel, përdorues platforme) – i njëjti user në kanale të ndryshme = konversacione të ndara
conversationSchema.index({ channelId: 1, platformUserId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
