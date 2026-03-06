/**
 * Modeli KeywordResponse: keyword → response për çdo channel.
 * keywords: array ose regex; responseText/responsePayload; caseSensitive opsional.
 */

const mongoose = require('mongoose');

const keywordResponseSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    keywords: {
      type: [String],
      required: true,
      default: [],
      // Fjalë kyçe për përputhje (ose përdoret keywordRegex nëse preferohet)
    },
    keywordRegex: {
      type: String,
      default: null,
      // Nëse vendoset, përdoret në vend të keywords për përputhje
    },
    responseText: {
      type: String,
      default: null,
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Për template / mesazh të strukturuar
    },
    caseSensitive: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

keywordResponseSchema.index({ channelId: 1 });

module.exports = mongoose.model('KeywordResponse', keywordResponseSchema);
