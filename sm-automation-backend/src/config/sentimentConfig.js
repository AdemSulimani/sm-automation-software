/**
 * Konfigurim dhe utilitete për sentiment-in e klientëve.
 *
 * Kjo skedë implementon “hapin 1 – qartësimi i sjelljes” nga plani:
 * - Formati i pikëzimit (score)
 * - Label-et kryesore
 * - Nivelet e agregimit (message, conversation, contact, business)
 */

// Shkalla bazë: [-1, 1] ku:
// -1  = maksimalisht negativ
//  0  = neutral
//  1  = maksimalisht pozitiv
const SENTIMENT_SCORE_RANGE = {
  min: -1,
  max: 1,
};

// Në shumë raporte është më miqësore një shkallë [0, 100].
// Kjo është vetëm një projekcion i [min, max] në [0, 100].
function toSentimentScorePct(score) {
  if (score == null || Number.isNaN(score)) return null;

  const clamped = Math.max(SENTIMENT_SCORE_RANGE.min, Math.min(SENTIMENT_SCORE_RANGE.max, score));
  return Math.round(((clamped - SENTIMENT_SCORE_RANGE.min) / (SENTIMENT_SCORE_RANGE.max - SENTIMENT_SCORE_RANGE.min)) * 100);
}

// Label-et kryesore për sentiment.
const SENTIMENT_LABELS = ['negative', 'neutral', 'positive', 'mixed'];

// Pragjet e paracaktuara (mund të bëhen të konfiguruara më vonë).
const SENTIMENT_LABEL_THRESHOLDS = {
  // <= -0.25 -> negative
  negativeMax: -0.25,
  // [-0.1, 0.1] -> “neutral core”
  neutralMin: -0.1,
  neutralMax: 0.1,
  // >= 0.25 -> positive
  positiveMin: 0.25,
};

/**
 * Derivon label-in e sentiment-it nga score numerik.
 *
 * @param {number | null} score - vlera në shkallën [-1, 1]
 * @param {Object} [options]
 * @param {boolean} [options.enableMixed=true] - nëse të përdoret label-i "mixed"
 * @returns {'negative' | 'neutral' | 'positive' | 'mixed' | null}
 */
function getSentimentLabel(score, options = {}) {
  if (score == null || Number.isNaN(score)) return null;

  const { enableMixed = true } = options;
  const { negativeMax, neutralMin, neutralMax, positiveMin } = SENTIMENT_LABEL_THRESHOLDS;

  if (score <= negativeMax) {
    return 'negative';
  }

  if (score >= positiveMin) {
    return 'positive';
  }

  // Zonë e mesit – mund të jetë neutral ose mixed.
  if (score >= neutralMin && score <= neutralMax) {
    return 'neutral';
  }

  // Nëse mixed është çaktivizuar, gjithçka tjetër në këtë brez trajtohet si neutral.
  if (!enableMixed) {
    return 'neutral';
  }

  return 'mixed';
}

// Strategjitë e agregimit sipas entitetit.
// Këto kodifikojnë në mënyrë eksplicite nivelet e target-it:
// - message        -> pa agregim (score / label per mesazh)
// - conversation   -> mesatare e mesazheve inbound në një bisedë
// - contact        -> mesatare e conversation-level scores për kontaktin
// - business       -> mesatare e contact-level scores për biznesin
const SENTIMENT_AGGREGATION_STRATEGY = {
  message: 'none',
  conversation: 'mean_of_messages_inbound',
  contact: 'mean_of_conversations',
  business: 'mean_of_contacts',
};

// Konfigurim global për sentiment-in – pika qendrore për opsione runtime.
// Aktivizimi/deaktivizimi bëhet përmes flag-ut SENTIMENT_ENABLED dhe NODE_ENV.
// - Në mjedise jo-production sentiment është i aktivizuar by default.
// - Në production duhet të ndizet shprehimisht me SENTIMENT_ENABLED=true.
const SENTIMENT_ENABLED =
  process.env.SENTIMENT_ENABLED != null
    ? process.env.SENTIMENT_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production';

const SENTIMENT_CONFIG = {
  enabled: SENTIMENT_ENABLED,
  scoreRange: SENTIMENT_SCORE_RANGE,
  labelThresholds: SENTIMENT_LABEL_THRESHOLDS,
  aggregationStrategy: SENTIMENT_AGGREGATION_STRATEGY,
  includeMixedLabel: true,
};

module.exports = {
  SENTIMENT_SCORE_RANGE,
  SENTIMENT_LABELS,
  SENTIMENT_LABEL_THRESHOLDS,
  SENTIMENT_AGGREGATION_STRATEGY,
  SENTIMENT_CONFIG,
  SENTIMENT_ENABLED,
  toSentimentScorePct,
  getSentimentLabel,
};

