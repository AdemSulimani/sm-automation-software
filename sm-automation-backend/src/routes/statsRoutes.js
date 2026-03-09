const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { getStats, getOverview, getRateLimitStats } = require('../controllers/statsController');

const router = express.Router();
router.use(protect);
router.get('/overview', getOverview);
router.get('/rate-limit', getRateLimitStats);
router.get('/', requireAdmin, getStats);

module.exports = router;
