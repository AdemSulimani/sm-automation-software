/**
 * ContactIdentity – lidh një Contact me një identitet në një kanal (platformUserId).
 * Një kontakt mund të ketë disa identitete (p.sh. i njëjti person në Instagram dhe Facebook).
 */

const mongoose = require('mongoose');

const contactIdentitySchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    platformUserId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

contactIdentitySchema.index({ channelId: 1, platformUserId: 1 }, { unique: true });

module.exports = mongoose.model('ContactIdentity', contactIdentitySchema);
