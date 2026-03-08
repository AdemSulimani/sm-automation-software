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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
