const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { createNotice, listNotices, myNotices } = require('../controllers/noticeController');

router.post('/', authenticate, upload.single('attachment'), createNotice);
router.get('/', authenticate, listNotices);
router.get('/my', authenticate, myNotices);

module.exports = router;
