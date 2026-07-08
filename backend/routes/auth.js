const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const { init, run, get, all } = require('../db/sqlite');
const { signAccessToken, signRefreshToken } = require('../middleware/auth');

const router = express.Router();

async function ensureDb() {
  await init();
}

// Password reset token helpers
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getCurrentCompanyId() {
  // Ensure there is exactly one “company” for this demo.
  // Use the companyId from the first row in companies, if it exists.
  const company = await get('SELECT * FROM companies ORDER BY createdAt DESC LIMIT 1', []);
  return company?.id;
}

async function createPasswordResetToken({ companyId, email }) {
  const token = nanoid(32);
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  const id = nanoid();

  await run(
    `INSERT INTO passwordResetTokens (id, companyId, email, tokenHash, expiresAt, usedAt, createdAt)
     VALUES (?,?,?,?,?,?,?)`,
    [id, companyId, email, tokenHash, expiresAt, null, new Date().toISOString()]
  );

  return { token, expiresAt };
}

// POST /api/auth/register (disabled in this version)
router.post('/register', async (req, res) => {
  return res.status(400).json({ error: 'Registration is disabled. Use /api/auth/login with admin or employee credentials.' });
});

// POST /api/auth/login
// body: { role, userId, password }
// role: ADMIN | EMPLOYEE
router.post('/login', async (req, res) => {
  try {
    await ensureDb();
    const { role, userId, password } = req.body || {};
    if (!role || !userId || !password) {
      return res.status(400).json({ error: 'role, userId, password are required' });
    }

    const companyId = await getCurrentCompanyId();

    // Fixed admin login
    if (String(role).toUpperCase() === 'ADMIN') {
      if (String(userId) !== 'santu2005' || String(password) !== 'santu@123') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // If no company exists yet, create one implicitly.
      let resolvedCompanyId = companyId;
      if (!resolvedCompanyId) {
        const createdAt = new Date().toISOString();
        resolvedCompanyId = nanoid();
        await run('INSERT INTO companies (id, name, createdAt) VALUES (?,?,?)', [resolvedCompanyId, 'Default Company', createdAt]);
      }

      const adminAccess = signAccessToken({ sub: 'admin:santu2005', companyId: resolvedCompanyId, role: 'SUPER_ADMIN', userId: 'santu2005' });
      const adminRefresh = signRefreshToken({ sub: 'admin:santu2005', companyId: resolvedCompanyId, role: 'SUPER_ADMIN', userId: 'santu2005' });
      return res.json({ accessToken: adminAccess, refreshToken: adminRefresh, role: 'SUPER_ADMIN', companyId: resolvedCompanyId });
    }

    // Employee login: userId/password stored in users table.
    const employeeRole = String(role).toUpperCase() === 'EMPLOYEE' ? 'EMPLOYEE' : role;
    const user = await get(
      'SELECT * FROM users WHERE companyId = ? AND id = ? AND role = ?',
      [companyId, String(userId), employeeRole]
    );

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role, userId: user.id });
    const refreshToken = signRefreshToken({ sub: user.id, companyId: user.companyId, role: user.role, userId: user.id });

    res.json({ accessToken, refreshToken, role: user.role, companyId: user.companyId });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Login failed' });
  }
});

// POST /api/auth/forgot-password
// body: { email }
// Single-step UX: user enters registered email and system generates a token,
// logs a reset link to server console (since there's no mailer), and accepts
// that link within the same page/flow via a new token input.
// For now, we keep backend as the token generator endpoint.
router.post('/forgot-password', async (req, res) => {
  try {
    await ensureDb();
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const user = await get(
      'SELECT * FROM users WHERE companyId = ? AND email = ?',
      [companyId, String(email)]
    );

    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const { token } = await createPasswordResetToken({ companyId, email: String(email) });

    // No mail service in this project: log the link instead.
    const link = `${req.protocol}://${req.get('host')}/reset-password?token=${encodeURIComponent(token)}`;
    console.log(`[PasswordReset] Reset link for ${email}: ${link}`);

    return res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Forgot password failed' });
  }
});

// POST /api/auth/reset-password
// body: { token, password }
router.post('/reset-password', async (req, res) => {
  try {
    await ensureDb();
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' });

    const companyId = await getCurrentCompanyId();
    if (!companyId) return res.status(400).json({ error: 'Invalid or expired token' });

    // Find candidate tokens for this company (optionally reduce search by date)
    const candidates = await all(
      `SELECT * FROM passwordResetTokens
       WHERE companyId = ? AND usedAt IS NULL AND expiresAt > ?`,
      [companyId, new Date().toISOString()]
    );

    let matched = null;
    for (const c of candidates || []) {
      const ok = await bcrypt.compare(String(token), c.tokenHash);
      if (ok) {
        matched = c;
        break;
      }
    }

    if (!matched) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Update user's password (users.id is generated by admin for employees)
    // We only have email + companyId in reset tokens.
    const user = await get('SELECT * FROM users WHERE companyId = ? AND email = ?', [
      companyId,
      matched.email
    ]);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    await run('UPDATE users SET passwordHash = ? WHERE id = ? AND companyId = ?', [
      passwordHash,
      user.id,
      companyId
    ]);

    await run('UPDATE passwordResetTokens SET usedAt = ? WHERE id = ? AND companyId = ?', [
      new Date().toISOString(),
      matched.id,
      companyId
    ]);

    return res.json({ message: 'Password updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Reset password failed' });
  }
});

module.exports = { router };

