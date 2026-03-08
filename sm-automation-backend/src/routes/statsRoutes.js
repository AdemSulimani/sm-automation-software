const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { getStats, getOverview } = require('../controllers/statsController');

const router = express.Router();
router.use(protect);
router.get('/overview', getOverview);
router.get('/', requireAdmin, getStats);

module.exports = router;
