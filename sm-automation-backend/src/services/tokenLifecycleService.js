const { Channel } = require('../models');

/**
 * Monitoron token-at OAuth (p.sh. Meta long-lived) dhe vendos tokenStatus = 'needs_reconnect'
 * për kanalet që janë afër skadimit ose kanë kaluar afatin.
 *
 * Për thjeshtësi, nuk bëjmë refresh automatik (Meta long-lived tokens nuk kanë refresh klasik),
 * por nxisim përdoruesin të rilidhë kanalin përpara se të skadojë.
 */

async function markExpiringTokens() {
  const now = new Date();
  const thresholdDays = Number(process.env.TOKEN_EXPIRY_THRESHOLD_DAYS || '7');
  const thresholdDate = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);

  const channels = await Channel.find({
    platform: { $in: ['facebook', 'instagram', 'whatsapp'] },
    tokenStatus: 'valid',
    tokenExpiresAt: { $ne: null, $lte: thresholdDate },
  })
    .select('_id tokenExpiresAt status')
    .lean();

  if (!channels.length) return;

  const ids = channels.map((c) => c._id);
  await Channel.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        tokenStatus: 'needs_reconnect',
      },
    }
  ).exec();

  console.warn('Channels marked as needs_reconnect due to token expiry', {
    count: ids.length,
  });
}

function startTokenMonitor() {
  const intervalMs = Number(process.env.TOKEN_MONITOR_INTERVAL_MS || '3600000'); // default 1 orë
  console.log(`Token lifecycle monitor started with interval ${intervalMs}ms`);
  setInterval(() => {
    markExpiringTokens().catch((err) => {
      console.error('Error in token lifecycle monitor', err);
    });
  }, intervalMs);
}

module.exports = {
  startTokenMonitor,
  markExpiringTokens,
};

