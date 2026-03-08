/**
 * Sesion i përkohshëm për OAuth Meta (Facebook/Instagram).
 * stateId: për verifikim në callback; key: për frontend të marrë listën dhe të krijojë channel.
 */

const mongoose = require('mongoose');

const oauthMetaSessionSchema = new mongoose.Schema(
  {
    stateId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, default: null },
    pages: [
      {
        id: String,
        name: String,
        accessToken: String,
      },
    ],
    instagram: [
      {
        id: String,
        username: String,
        pageId: String,
        pageName: String,
        accessToken: String,
      },
    ],
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

oauthMetaSessionSchema.index({ key: 1 });
module.exports = mongoose.model('OAuthMetaSession', oauthMetaSessionSchema);
