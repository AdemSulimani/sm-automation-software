/**
 * Modeli Feedback – feedback nga biznesi / përdoruesit mbi një mesazh të caktuar.
 * Një dokument për çdo (messageId, reviewerId), në mënyrë që disa persona të mund të vlerësojnë të njëjtin mesazh.
 */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    // Mesazhi i vlerësuar (lidhje direkte; conversation mund të nxirret nga mesazhi).
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    // Conversation për lehtësi filtrimi (denormalizim).
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    // Kanali dhe biznesi – për scope dhe raportim.
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    // Kush e ka dhënë feedback-un (nga modeli User).
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Typi i feedback-ut: like / dislike (ose më vonë "neutral").
    sentiment: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
    // Opsionale: vlerësim numerik 1–5 (për raportim më të hollësishëm).
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    // Kategoria kryesore e arsyes – për analizë dhe rregulla më vonë.
    reasonCategory: {
      type: String,
      enum: [
        'tone_too_informal',
        'tone_too_formal',
        'wrong_information',
        'did_not_answer_question',
        'too_long',
        'too_short',
        'other',
      ],
      required: true,
    },
    // Koment i lirë nga përdoruesi: "Nuk më pëlqeu ky mesazh sepse..."
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Një feedback për çdo (messageId, reviewerId).
feedbackSchema.index({ messageId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);

