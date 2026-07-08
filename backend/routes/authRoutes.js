const express = require('express');
const router = express.Router();
const { login, refreshToken, changePassword, forgotPassword, getCurrentUser, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/change-password (requires auth)
router.post('/change-password', authenticate, changePassword);

// GET /api/auth/me (requires auth)
router.get('/me', authenticate, getCurrentUser);

// POST /api/auth/logout (requires auth)
router.post('/logout', authenticate, logout);

module.exports = router;