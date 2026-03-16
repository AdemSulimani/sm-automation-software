/**
 * Rrugët e API për feedback-un mbi mesazhet.
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createFeedback,
  getFeedbackForConversation,
  updateFeedback,
  deleteFeedback,
  getFeedbackOverview,
  getFeedbackCoaching,
  getFeedbackStats,
} = require('../controllers/feedbackController');

const router = express.Router();

router.use(protect);

router.post('/', createFeedback);
router.get('/conversation/:conversationId', getFeedbackForConversation);
router.get('/overview', getFeedbackOverview);
router.get('/coaching', getFeedbackCoaching);
router.get('/stats', getFeedbackStats);
router.patch('/:id', updateFeedback);
router.delete('/:id', deleteFeedback);

module.exports = router;

