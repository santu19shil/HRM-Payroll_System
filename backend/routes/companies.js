const express = require('express');
const { init, all } = require('../db/sqlite');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/companies/me
router.get('/me', requireAuth, async (req, res) => {
  await init();
  const companyId = req.user.companyId;
  const rows = await all('SELECT id, name, createdAt FROM companies WHERE id = ?', [companyId]);
  res.json({ company: rows[0] || null });
});

module.exports = { router };

