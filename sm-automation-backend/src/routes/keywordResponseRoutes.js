/**
 * Rrugët e API për KeywordResponse – CRUD i mbrojtur me JWT.
 * Lista kërkon channelId në query: GET /?channelId=...
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const { list, getOne, create, update, remove } = require('../controllers/keywordResponseController');

const router = express.Router();

router.use(protect);

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
