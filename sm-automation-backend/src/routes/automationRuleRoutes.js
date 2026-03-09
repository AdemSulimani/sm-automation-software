/**
 * Rrugët e API për AutomationRule – CRUD i mbrojtur me JWT.
 * Lista kërkon channelId në query: GET /?channelId=...
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { list, getOne, create, update, remove } = require('../controllers/automationRuleController');

const router = express.Router();

router.use(protect);

const rulesWriteLimiter = createRateLimiter({
  windowMs: Number(process.env.RULES_WRITE_WINDOW_MS || '60000'),
  max: Number(process.env.RULES_WRITE_MAX_REQUESTS || '60'),
  keyPrefix: 'automation-rules-write',
});

router.get('/', list);
router.get('/:id', getOne);
router.post('/', rulesWriteLimiter, create);
router.put('/:id', rulesWriteLimiter, update);
router.delete('/:id', rulesWriteLimiter, remove);

module.exports = router;
