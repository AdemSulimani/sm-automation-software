/**
 * Modeli Business – një biznes/kompani që mund të ketë disa përdorues.
 * Emër, logo (URL). Përdoruesit e një biznesi shohin të njëjtat kanale dhe kontakte.
 */

const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Biznesi im',
    },
    logo: {
      type: String,
      trim: true,
      default: null,
      // URL e logos (p.sh. nga një CDN ose upload)
    },
    // Orar pune për raportim (opsional). Format "HH:mm" (24h).
    workHoursStart: { type: String, trim: true, default: null },
    workHoursEnd: { type: String, trim: true, default: null },
    // Nëse është true, kufizohen mesazhet outbound (p.sh. dyshim për spam).
    messagingLimited: {
      type: Boolean,
      default: false,
      index: true,
    },
    messagingLimitReason: {
      type: String,
      default: null,
    },
    // Konfigurim për feedback-un dhe mësimin nga AI për këtë biznes.
    feedbackEnabled: {
      type: Boolean,
      default: true,
    },
    aiLearningFromFeedbackEnabled: {
      type: Boolean,
      default: true,
    },
    // Sa ditë mbahen të dhënat e feedback-ut për këtë biznes (mund të përdoret më vonë për pastrim).
    feedbackRetentionDays: {
      type: Number,
      default: 365,
      min: 30,
      max: 3650,
    },
    // Vlerësim i rrezikut/fraud-it për biznesin.
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    fraudLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none',
      index: true,
    },
    fraudFlags: {
      type: [String],
      default: [],
    },
    lastFraudReviewAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
