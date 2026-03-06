/**
 * Rrugët për webhook-et Meta: GET (verifikim) dhe POST (mesazhe).
 * Montohen në /api/webhooks/meta.
 */

const express = require('express');
const { verifyMetaWebhook, handleMetaWebhookPost } = require('../controllers/metaWebhookController');

const router = express.Router();

router.get('/', verifyMetaWebhook);
router.post('/', handleMetaWebhookPost);

module.exports = router;
