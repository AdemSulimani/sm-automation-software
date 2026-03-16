const { Business } = require('../models');
const { scoreBusinessActivity } = require('./fraudService');

async function runFraudEvaluationBatch() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const businesses = await Business.find({
    updatedAt: { $gte: since },
  })
    .select('_id')
    .lean();

  if (!businesses.length) return;

  for (const biz of businesses) {
    try {
      await scoreBusinessActivity(biz._id);
    } catch (err) {
      console.warn('Fraud evaluation batch failed for business', {
        businessId: String(biz._id),
        error: err && err.message,
      });
    }
  }
}

function startFraudWorker() {
  const intervalMs = Number(process.env.FRAUD_WORKER_INTERVAL_MS || '900000'); // default 15 minuta
  console.log(`Fraud evaluation worker started with interval ${intervalMs}ms`);
  setInterval(() => {
    runFraudEvaluationBatch().catch((err) => {
      console.error('Error in fraud evaluation worker batch', err);
    });
  }, intervalMs);
}

module.exports = {
  startFraudWorker,
  runFraudEvaluationBatch,
};

