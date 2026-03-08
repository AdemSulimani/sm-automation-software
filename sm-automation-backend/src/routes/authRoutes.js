/**
 * Rrugët e API për autentifikim: /register, /login, /me (profili i përdoruesit të loguar).
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const { register, login, getMe, updateMe, exportMe, deleteMe } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.get('/me/export', protect, exportMe);
router.delete('/me', protect, deleteMe);

module.exports = router;
