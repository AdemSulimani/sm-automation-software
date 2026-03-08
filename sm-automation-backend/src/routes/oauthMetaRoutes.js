/**
 * Rrugët për OAuth Meta: start (redirect), callback (redirect), selection (JSON), connect (krijon channel).
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const {
  start,
  callback,
  selection,
  createChannelFromOAuth,
} = require('../controllers/oauthMetaController');

const router = express.Router();

router.get('/start', start);
router.get('/callback', callback);
router.get('/selection', protect, selection);
router.post('/connect', protect, createChannelFromOAuth);

module.exports = router;
