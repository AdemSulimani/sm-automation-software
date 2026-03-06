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
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
