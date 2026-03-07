/**
 * Rrugët e API për admin: lista e përdoruesve (klientëve), “hyj si klient”, etj.
 * Të gjitha kërkojnë JWT + role admin.
 */

const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { listUsers, getUser, updateUser } = require('../controllers/userController');

const router = express.Router();

router.use(protect);
router.use(requireAdmin);

router.get('/', listUsers);
router.get('/:id', getUser);
router.patch('/:id', updateUser);

module.exports = router;
