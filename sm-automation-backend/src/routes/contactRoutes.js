/**
 * Rrugët e API për Contact – CRUD i mbrojtur me JWT.
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const { list, getOne, create, update, remove } = require('../controllers/contactController');

const router = express.Router();

router.use(protect);

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
