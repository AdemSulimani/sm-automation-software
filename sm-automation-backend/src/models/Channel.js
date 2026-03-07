/**
 * Modeli Channel (Integration) për çdo rrjet që përdoruesi e lidh.
 * Lidhje User → Channel; ruajtja e tokenave për platformën (Meta, Viber).
 */

const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['viber', 'facebook', 'instagram', 'whatsapp'],
    },
    // Për Meta: Page ID; për Viber: Bot ID
    platformPageId: {
      type: String,
      default: null,
    },
    viberBotId: {
      type: String,
      default: null,
    },
    accessToken: {
      type: String,
      required: true,
    },
    // Për Meta webhook verification
    webhookVerifyToken: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    // Metadata opsional (emër faqeje, etj.)
    name: {
      type: String,
      trim: true,
      default: null,
    },
    // Override për AI: nëse plotësohet, përdoret në vend të User.companyInfo për këtë kanal
    aiInstructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Indeks për të gjetur channel nga platformë + identifikues
channelSchema.index({ platform: 1, platformPageId: 1 });
channelSchema.index({ platform: 1, viberBotId: 1 });

module.exports = mongoose.model('Channel', channelSchema);
