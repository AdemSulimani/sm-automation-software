const mongoose = require('mongoose');

/**
 * Queue e thjeshtë për mesazhet outbound drejt platformave (Meta, Viber, etj.).
 * Kjo lejon që dërgimi të bëhet nga një worker me rate limiting, në vend që të bëhet direkt në request.
 */

const outboundJobSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
    },
    // Aktualisht direction është gjithmonë 'out', por e mbajmë si fushë për të ardhmen.
    direction: {
      type: String,
      enum: ['out'],
      default: 'out',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed', 'failed_permanent', 'rate_limited'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    // Koha kur u planifikua fillimisht
    scheduledAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    // Koha e tentativës së radhës; worker lexon vetëm job-at me nextAttemptAt <= now
    nextAttemptAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

outboundJobSchema.index({ channelId: 1, status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model('OutboundJob', outboundJobSchema);

