const express = require('express');
const { get, init } = require('../db/sqlite');
const { signAccessToken, signRefreshToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

async function ensureDb() {
  await init();
}

// POST /api/auth/refresh
// body: { refreshToken }
router.post('/refresh', async (req, res) => {
  try {
    await ensureDb();
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    const decoded = jwt.decode(refreshToken);
    if (!decoded || !decoded.sub) return res.status(401).json({ error: 'Invalid refresh token' });

    // Verify using secret via middleware module constants
    const { JWT_REFRESH_SECRET } = require('../middleware/auth');
    let verified;
    try {
      verified = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await get('SELECT id, companyId, role, email FROM users WHERE id = ?', [verified.sub]);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

    const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role, email: user.email });
    const newRefreshToken = signRefreshToken({ sub: user.id, companyId: user.companyId, role: user.role, email: user.email });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Refresh failed' });
  }
});

module.exports = { router };

