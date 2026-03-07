/**
 * Rrugët e API për konversacionet dhe mesazhet (Inbox, manual reply).
 * Të gjitha kërkojnë JWT; aksesi kufizohet sipas userId (klient) ose admin.
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const {
  listConversations,
  getConversation,
  getMessages,
  postMessage,
} = require('../controllers/conversationController');

const router = express.Router();

router.use(protect);

router.get('/', listConversations);
router.get('/:id', getConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);

module.exports = router;
