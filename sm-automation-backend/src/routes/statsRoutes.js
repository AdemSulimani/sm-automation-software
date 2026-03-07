const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { getStats } = require('../controllers/statsController');

const router = express.Router();
router.use(protect);
router.use(requireAdmin);
router.get('/', getStats);

module.exports = router;
