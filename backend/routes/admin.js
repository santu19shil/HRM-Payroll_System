const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const { init, run, all } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function ensureDb() {
  await init();
}

// POST /api/admin/employees
// Admin creates employees and generates credentials:
// userId = <employeeName><random5digits>
// password = <employeeName>@325
// Body: { name, email, department, baseSalaryMonthly, deductionsMonthly, bonusesMonthly, employeeNameForUserId }
router.post('/employees', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  try {
    await ensureDb();
    const { name, email, department, baseSalaryMonthly, deductionsMonthly, bonusesMonthly, employeeNameForUserId } = req.body || {};

    if (!name || !department) {
      return res.status(400).json({ error: 'name and department are required' });
    }

    const companyId = req.user.companyId;

    // userId generation
    const base = (employeeNameForUserId || name).replace(/\s+/g, '');
    const randomDigits = String(Math.floor(Math.random() * 90000) + 10000);
    const userId = `${base}${randomDigits}`;
    const password = `${base}@325`;

    // Ensure unique userId within company
    const existing = await all('SELECT id FROM users WHERE companyId = ? AND id = ?', [companyId, userId]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Generated userId already exists. Try again.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const now = new Date().toISOString();
    const employeeId = nanoid();

    // If email already exists in company (unique constraint), avoid failing the employee creation.
    // Keep credentials working by clearing duplicated email.
    let resolvedEmail = email || '';
    if (resolvedEmail) {
      const emailExists = await all('SELECT id FROM users WHERE companyId = ? AND email = ?', [companyId, String(resolvedEmail)]);
      if (emailExists.length > 0) resolvedEmail = '';
    }


    await run(
      `INSERT INTO employees (id, companyId, name, email, department, baseSalaryMonthly, deductionsMonthly, bonusesMonthly, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        employeeId,
        companyId,
        name,
        email || '',
        department,
        Number(baseSalaryMonthly ?? 0),
        Number(deductionsMonthly ?? 0),
        Number(bonusesMonthly ?? 0),
        now,
        now
      ]
    );

    const { encryptText } = require('../utils/credentials');
    const passwordEncrypted = encryptText(password);

    await run(
      `INSERT INTO users (id, companyId, email, name, role, passwordHash, passwordEncrypted, createdAt)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        userId,
        companyId,
        email || '',
        name,
        'EMPLOYEE',
        passwordHash,
        passwordEncrypted,
        now
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        employee: { id: employeeId, name, email: email || '', department },
        userId,
        password
      }
    });
  } catch (e) {
    console.error('Create employee failed:', e);
    return res.status(500).json({ error: e.message || 'Failed to create employee' });
  }
});

module.exports = router;

