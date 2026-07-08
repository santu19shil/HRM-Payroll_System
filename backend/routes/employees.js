const express = require('express');
const { nanoid } = require('nanoid');

const { init, all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function ensureDb() {
  await init();
}

// GET /api/employees
router.get('/', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM employees WHERE companyId = ? ORDER BY createdAt DESC', [companyId]);
  res.json({ employees: rows });
});

// POST /api/employees
router.post('/', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const {
    name,
    email,
    department,
    baseSalaryMonthly,
    deductionsMonthly,
    bonusesMonthly
  } = req.body || {};

  if (!name || !department) {
    return res.status(400).json({ error: 'name and department are required' });
  }

  const companyId = req.user.companyId;
  const now = new Date().toISOString();

  const employee = {
    id: nanoid(),
    companyId,
    name,
    email: email || '',
    department,
    baseSalaryMonthly: Number(baseSalaryMonthly ?? 0),
    deductionsMonthly: Number(deductionsMonthly ?? 0),
    bonusesMonthly: Number(bonusesMonthly ?? 0),
    createdAt: now,
    updatedAt: now
  };

  await run(
    `INSERT INTO employees (id, companyId, name, email, department, baseSalaryMonthly, deductionsMonthly, bonusesMonthly, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      employee.id,
      employee.companyId,
      employee.name,
      employee.email,
      employee.department,
      employee.baseSalaryMonthly,
      employee.deductionsMonthly,
      employee.bonusesMonthly,
      employee.createdAt,
      employee.updatedAt
    ]
  );

  res.status(201).json({ employee });
});

// PUT /api/employees/:id
router.put('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const { id } = req.params;

  const {
    name,
    email,
    department,
    baseSalaryMonthly,
    deductionsMonthly,
    bonusesMonthly
  } = req.body || {};

  const companyId = req.user.companyId;

  const existing = await all('SELECT * FROM employees WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!existing || existing.length === 0) return res.status(404).json({ error: 'Employee not found' });

  const cur = existing[0];
  const updated = {
    ...cur,
    name: name ?? cur.name,
    email: email ?? cur.email,
    department: department ?? cur.department,
    baseSalaryMonthly: Number(baseSalaryMonthly ?? cur.baseSalaryMonthly),
    deductionsMonthly: Number(deductionsMonthly ?? cur.deductionsMonthly),
    bonusesMonthly: Number(bonusesMonthly ?? cur.bonusesMonthly),
    updatedAt: new Date().toISOString()
  };

  await run(
    `UPDATE employees
     SET name = ?, email = ?, department = ?, baseSalaryMonthly = ?, deductionsMonthly = ?, bonusesMonthly = ?, updatedAt = ?
     WHERE id = ? AND companyId = ?`,
    [
      updated.name,
      updated.email,
      updated.department,
      updated.baseSalaryMonthly,
      updated.deductionsMonthly,
      updated.bonusesMonthly,
      updated.updatedAt,
      updated.id,
      companyId
    ]
  );

  res.json({ employee: updated });
});

// DELETE /api/employees/:id
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const { id } = req.params;
  const companyId = req.user.companyId;

  const existing = await all('SELECT * FROM employees WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!existing || existing.length === 0) return res.status(404).json({ error: 'Employee not found' });

  // Also delete assigned employee credentials.
  // Admin user credentials are stored in `users` table with:
  //   - role = 'EMPLOYEE'
  //   - companyId = same company
  //   - name = employee.name (based on current payroll credential lookup logic)
  const empName = existing[0]?.name;
  if (empName) {
    await run(
      'DELETE FROM users WHERE companyId = ? AND role = ? AND name = ?',
      [companyId, 'EMPLOYEE', empName]
    );
  }

  await run('DELETE FROM employees WHERE id = ? AND companyId = ?', [id, companyId]);

  res.json({ removed: existing[0] });
});

module.exports = { router };





