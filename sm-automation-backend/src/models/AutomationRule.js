/**
 * Modeli AutomationRule për rregullat e automatizuara për çdo channel.
 * Trigger: first_message, after_X_min, keyword_regex; responseType: text | template.
 * triggerSource: kufizon nga çfarë lloj eventi (dm, comment, button, any) mund të ndizet rregulli.
 */

const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    trigger: {
      type: String,
      required: true,
      enum: ['first_message', 'after_X_min', 'keyword_regex'],
    },
    // Burimi i eventit që lejohet ta ndezë rregullin: dm, comment, button, any.
    triggerSource: {
      type: String,
      enum: ['any', 'dm', 'comment', 'button'],
      default: 'any',
    },
    // Për after_X_min: vlera në minuta (opsional)
    triggerValue: {
      type: Number,
      default: null,
    },
    // Për keyword_regex: shprehje e rregullt (opsional)
    triggerRegex: {
      type: String,
      default: null,
    },
    responseType: {
      type: String,
      required: true,
      enum: ['text', 'template'],
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      // text: { text: "..." }; template: strukturë platformë (buttons, etc.)
    },
    priority: {
      type: Number,
      default: 0,
      // Më i lartë = kontrollohet më parë
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

automationRuleSchema.index({ channelId: 1, priority: -1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
