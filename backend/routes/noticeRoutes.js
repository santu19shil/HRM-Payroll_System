const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { createNotice, listNotices, myNotices, deleteNotice } = require('../controllers/noticeController');

const { authorizeHR } = require('../middleware/authMiddleware');

router.post('/', authenticate, upload.single('attachment'), createNotice);
router.get('/', authenticate, listNotices);
router.get('/my', authenticate, myNotices);
router.delete('/:id', authenticate, authorizeHR, deleteNotice);

module.exports = router;
