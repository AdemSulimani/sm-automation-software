/**
 * Rrugët e API për autentifikim: /register, /login.
 * Përdor authController për logjikën dhe validate për validim (nëse përdor Joi).
 */

const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;
