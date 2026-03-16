/**
 * Modeli Contact – një kontakt (person) i lidhur me biznesin (userId).
 * Emër, email, telefon, shënime. Lidhet me konversacione nëpër ContactIdentity.
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Fushat e sentiment-it në nivel kontakti (agregim nga konversacionet).
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
    sentimentAnalyzedAt: {
      type: Date,
      default: null,
      index: true,
    },
    sentimentMessageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);
