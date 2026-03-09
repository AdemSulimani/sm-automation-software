/**
 * Rrugët e API për konversacionet dhe mesazhet (Inbox, manual reply).
 * Të gjitha kërkojnë JWT; aksesi kufizohet sipas userId (klient) ose admin.
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
  listConversations,
  getConversation,
  getMessages,
  postMessage,
} = require('../controllers/conversationController');

const router = express.Router();

router.use(protect);

const manualReplyLimiter = createRateLimiter({
  windowMs: Number(process.env.MANUAL_REPLY_WINDOW_MS || '60000'), // 1 minutë
  max: Number(process.env.MANUAL_REPLY_MAX_REQUESTS || '30'),
  keyPrefix: 'manual-reply',
});

router.get('/', listConversations);
router.get('/:id', getConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', manualReplyLimiter, postMessage);

module.exports = router;
