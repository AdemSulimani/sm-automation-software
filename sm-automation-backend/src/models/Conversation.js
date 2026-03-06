/**
 * Modeli Conversation (opsional) për CRM dhe kontekst.
 * Një konversacion për çdo platformConversationId / platformUserId në një channel.
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    platformConversationId: {
      type: String,
      default: null,
      index: true,
    },
    platformUserId: {
      type: String,
      required: true,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Emër, profil, etj. nga platforma
    },
  },
  { timestamps: true }
);

conversationSchema.index({ channelId: 1, platformUserId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
