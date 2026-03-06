/**
 * Rrugët për webhook-in Viber: POST (mesazhe).
 * Montohen në /api/webhooks/viber.
 */

const express = require('express');
const { handleViberWebhookPost } = require('../controllers/viberWebhookController');

const router = express.Router();

router.post('/', handleViberWebhookPost);

module.exports = router;
