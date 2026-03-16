/**
 * Modeli Message (opsional) për historik mesazhesh dhe kontekst AI.
 * conversationId, direction (in | out), content, timestamp.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    direction: {
      type: String,
      required: true,
      enum: ['in', 'out'],
    },
    // Kush e ka dërguar mesazhin (për feedback dhe analiza):
    // - 'customer'     -> mesazh hyrës nga klienti final
    // - 'human_agent'  -> mesazh dalës nga një agjent njerëzor në Inbox
    // - 'ai'           -> mesazh dalës i gjeneruar nga AI
    senderType: {
      type: String,
      enum: ['customer', 'human_agent', 'ai'],
      default: null,
      index: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      // Tekst i thjeshtë ose objekt (attachment, template)
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Opsional: ID nga platforma për deduplikim
    platformMessageId: {
      type: String,
      default: null,
      index: true,
    },
    // Fushat e sentiment-it për mesazhet (vetëm për tekstet inbound nga klienti).
    sentimentScore: {
      type: Number,
      default: null,
      min: -1,
      max: 1,
      index: true,
    },
    sentimentLabel: {
      type: String,
      enum: ['negative', 'neutral', 'positive', 'mixed'],
      default: null,
      index: true,
    },
    sentimentProvider: {
      type: String,
      default: null,
    },
    sentimentAnalyzedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
