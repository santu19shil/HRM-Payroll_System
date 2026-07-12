const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getMyNotifications, getCounts, markCategoryRead, markAsRead, markAllAsRead } = require('../controllers/notificationController');

router.get('/', authenticate, getMyNotifications);
router.get('/counts', authenticate, getCounts);
router.put('/read-category', authenticate, markCategoryRead);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);

module.exports = router;