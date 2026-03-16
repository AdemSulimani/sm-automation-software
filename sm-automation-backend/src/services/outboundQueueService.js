/**
 * Shërbimi i queue për mesazhet outbound me rate limiting për çdo channel/page.
 *
 * Për thjeshtësi përdor MongoDB:
 * - Koleksioni OutboundJob për job-at pending.
 * - Numëron mesazhet e dërguara në 60 minutat e fundit për channelId.
 */

const { Channel, OutboundJob, Message } = require('../models');
const { sendMessage } = require('./outboundService');
const { evaluateBusinessRiskForChannel } = require('./riskService');
const { scoreChannelBehavior } = require('./fraudService');

// Limit bazë: 200 mesazhe në orë për channel/page (mund të bëhet konfig i ardhshëm)
const DEFAULT_RATE_LIMIT_PER_HOUR = Number(process.env.META_RATE_LIMIT_PER_HOUR || '200');
const MAX_JOB_ATTEMPTS = Number(process.env.OUTBOUND_MAX_ATTEMPTS || '5');

function isInvalidTokenError(err) {
  if (!err) return false;
  const code = err.code != null ? Number(err.code) : null;
  const msg = err && typeof err.message === 'string' ? err.message.toLowerCase() : '';
  // Meta invalid token codes / messages (p.sh. OAuthException, code 190)
  if (code === 190) return true;
  if (msg.includes('invalid oauth access token') || msg.includes('access token has expired')) return true;
  return false;
}

function classifyError(err) {
  const code = err && err.code != null ? Number(err.code) : null;
  const status = err && err.status != null ? Number(err.status) : null;
  const msg = err && typeof err.message === 'string' ? err.message.toLowerCase() : '';

  // Meta window error (24h) – permanent
  if (code === 10 || code === 131051 || (msg && msg.includes('outside the allowed window'))) {
    return 'permanent';
  }

  // Status 5xx ose mungesë statusi → konsiderohet i përkohshëm (network/timeout)
  if (!status || status >= 500) {
    return 'transient';
  }

  // 4xx të tjera (400–499) zakonisht janë gabime permanente (invalid payload, permission, etj.)
  if (status >= 400 && status < 500) {
    return 'permanent';
  }

  return 'transient';
}

/**
 * Bën enqueue të një mesazhi outbound për një channel/conversation.
 *
 * @param {object} params
 * @param {string|object} params.channelId
 * @param {string|object} params.conversationId
 * @param {string} params.recipientId
 * @param {object} params.payload - { text } | { attachment } | { template }
 */
async function enqueueOutboundMessage({ channelId, conversationId, recipientId, payload }) {
  await OutboundJob.create({
    channelId,
    conversationId,
    recipientId,
    direction: 'out',
    payload,
    status: 'pending',
    scheduledAt: new Date(),
    nextAttemptAt: new Date(),
  });
}

/**
 * Llogarit sa mesazhe janë dërguar në 60 minutat e fundit për një channel (përmes koleksionit Message).
 */
async function countMessagesLastHourForChannel(channelId) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await Message.countDocuments({
    channelId,
    direction: 'out',
    timestamp: { $gte: since },
  }).exec();
  return count;
}

/**
 * Përpunon një numër të kufizuar job-ash pending për çdo thirrje, duke respektuar rate limitin.
 */
async function processOutboundJobsBatch() {
  const now = new Date();
  // Marrim një numër të kufizuar job-ash pending të planifikuar deri tani
  const jobs = await OutboundJob.find({
    status: { $in: ['pending', 'rate_limited'] },
    nextAttemptAt: { $lte: now },
  })
    .sort({ scheduledAt: 1, createdAt: 1 })
    .limit(50)
    .lean()
    .exec();

  if (!jobs.length) return;

  const channelIds = [...new Set(jobs.map((j) => String(j.channelId)))];
  const channels = await Channel.find({ _id: { $in: channelIds } }).exec();
  const channelById = new Map(channels.map((c) => [String(c._id), c]));

  for (const job of jobs) {
    const channel = channelById.get(String(job.channelId));
    if (!channel) {
      await OutboundJob.findByIdAndUpdate(job._id, {
        $set: { status: 'failed_permanent', lastError: 'Channel not found' },
      }).exec();
      continue;
    }

    try {
      const sentCount = await countMessagesLastHourForChannel(channel._id);
      if (sentCount >= DEFAULT_RATE_LIMIT_PER_HOUR) {
        // Shëno si rate_limited dhe shtyje pak më vonë
        await OutboundJob.findByIdAndUpdate(job._id, {
          $set: {
            status: 'rate_limited',
            lastError: `Rate limit reached (${sentCount}/${DEFAULT_RATE_LIMIT_PER_HOUR} in last hour)`,
            nextAttemptAt: new Date(Date.now() + 10 * 60 * 1000), // provo pas 10 minutash
          },
        }).exec();
        console.warn('Outbound job rate limited', {
          jobId: String(job._id),
          channelId: String(job.channelId),
        });
        continue;
      }

      await OutboundJob.findByIdAndUpdate(job._id, {
        $set: { status: 'sending' },
        $inc: { attempts: 1 },
      }).exec();

      await sendMessage(channel, job.recipientId, job.payload, job.conversationId);

      await OutboundJob.findByIdAndUpdate(job._id, {
        $set: { status: 'sent', sentAt: new Date(), lastError: null },
      }).exec();
    } catch (err) {
      console.error('Outbound job failed', job._id, err);
      const errorType = classifyError(err);
      const message = err && typeof err.message === 'string' ? err.message : 'Unknown error';

      if (errorType === 'permanent' || (job.attempts || 0) + 1 >= MAX_JOB_ATTEMPTS) {
        if (isInvalidTokenError(err)) {
          await Channel.findByIdAndUpdate(job.channelId, {
            $set: {
              tokenStatus: 'invalid',
            },
          }).exec();
        }
        await OutboundJob.findByIdAndUpdate(job._id, {
          $set: { status: 'failed_permanent', lastError: message },
        }).exec();
        await evaluateBusinessRiskForChannel(job.channelId);
        // Vlerëso sjelljen e kanalit (fraud) kur kemi dështim permanent.
        scoreChannelBehavior(job.channelId).catch((fraudErr) => {
          console.warn('Fraud scoring on failed_permanent outbound job failed (non-blocking)', {
            jobId: String(job._id),
            channelId: String(job.channelId),
            error: fraudErr && fraudErr.message,
          });
        });
        console.warn('Outbound job marked as failed_permanent', {
          jobId: String(job._id),
          channelId: String(job.channelId),
          attempts: (job.attempts || 0) + 1,
          message,
        });
      } else {
        const attempt = (job.attempts || 0) + 1;
        const baseDelayMinutes = 1;
        const backoffMinutes = Math.min(baseDelayMinutes * 2 ** (attempt - 1), 60);
        const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await OutboundJob.findByIdAndUpdate(job._id, {
          $set: { status: 'pending', lastError: message, nextAttemptAt },
          $inc: { attempts: 1 },
        }).exec();
        console.warn('Outbound job scheduled for retry', {
          jobId: String(job._id),
          channelId: String(job.channelId),
          attempt,
          nextAttemptAt,
        });
      }
    }
  }
}

/**
 * Nis një loop të thjeshtë in-memory që çdo disa sekonda përpunon job-at pending.
 * Thirret nga server.js pasi DB të jetë lidhur.
 */
function startOutboundWorker() {
  const intervalMs = Number(process.env.OUTBOUND_WORKER_INTERVAL_MS || '5000');
  console.log(`Outbound worker started with interval ${intervalMs}ms`);
  setInterval(() => {
    processOutboundJobsBatch().catch((err) => {
      console.error('Error in outbound worker batch', err);
    });
  }, intervalMs);
}

module.exports = {
  enqueueOutboundMessage,
  startOutboundWorker,
  processOutboundJobsBatch,
};

