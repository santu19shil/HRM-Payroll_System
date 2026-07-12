const express = require('express');

// IMPORTANT: MySQL-only auth routes.
// This file intentionally avoids the legacy SQLite-based implementation.
// The actual controller logic lives in:
//   - backend/controllers/authController.js
// Routes are mounted in backend/server.js via './routes/auth'.

const authRoutes = require('./authRoutes');

const router = express.Router();
router.use(authRoutes);

module.exports = router;

