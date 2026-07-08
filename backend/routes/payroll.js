const express = require('express');
const { nanoid } = require('nanoid');

const { init, all, get, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function ensureDb() {
  await init();
}

function toMonthKey({ month, year }) {
  const m = String(month).padStart(2, '0');
  return `${year}-${m}`;
}

function calcNet({ baseSalaryMonthly, deductionsMonthly, bonusesMonthly }) {
  const base = Number(baseSalaryMonthly ?? 0);
  const deductions = Number(deductionsMonthly ?? 0);
  const bonuses = Number(bonusesMonthly ?? 0);
  const net = base + bonuses - deductions;
  return { base, deductions, bonuses, net };
}

// POST /api/payroll/run
// body: { month, year }
router.post('/run', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const { month, year } = req.body || {};

  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) {
    return res.status(400).json({ error: 'month (1-12) and year are required' });
  }

  const companyId = req.user.companyId;
  const runId = nanoid();
  const monthKey = toMonthKey({ month: m, year: y });

  const existing = await get(
    'SELECT runId FROM payrollRuns WHERE companyId = ? AND monthKey = ?',
    [companyId, monthKey]
  );
  if (existing) {
    return res.status(409).json({ error: `Payroll already ran for ${monthKey}` });
  }

  const employees = await all('SELECT * FROM employees WHERE companyId = ?', [companyId]);

  // Build lineItems with deterministic employee credential mapping.
  // We store users.id (userId) + passwordEncrypted into each slip snapshot.
  // That removes fragile runtime name/id matching when rendering slips.
  const users = await all(
    'SELECT id as userId, name, passwordEncrypted FROM users WHERE companyId = ? AND role = ?',
    [companyId, 'EMPLOYEE']
  );
  const userByEmployeeName = new Map((users || []).map((u) => [u.name, u]));

  const lineItems = employees.map((emp) => {
    const c = calcNet(emp);
    const user = userByEmployeeName.get(emp.name);
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      // credential snapshot for later slip rendering/pdf
      userId: user?.userId || '',
      passwordEncrypted: user?.passwordEncrypted || '',
      baseSalaryMonthly: c.base,
      deductionsMonthly: c.deductions,
      bonusesMonthly: c.bonuses,
      netSalary: c.net
    };
  });


  const totals = lineItems.reduce(
    (acc, it) => {
      acc.base += it.baseSalaryMonthly;
      acc.deductions += it.deductionsMonthly;
      acc.bonuses += it.bonusesMonthly;
      acc.net += it.netSalary;
      return acc;
    },
    { base: 0, deductions: 0, bonuses: 0, net: 0 }
  );

  const now = new Date().toISOString();
  const payrollRun = {
    runId,
    monthKey,
    month: m,
    year: y,
    status: 'PENDING',
    createdAt: now,
    lineItems,
    totals
  };

  await run(
    `INSERT INTO payrollRuns (runId, companyId, monthKey, month, year, status, createdAt, approvedAt, processedAt, lineItemsJson, totalsJson)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      payrollRun.runId,
      companyId,
      payrollRun.monthKey,
      payrollRun.month,
      payrollRun.year,
      payrollRun.status,
      payrollRun.createdAt,
      null,
      null,
      JSON.stringify(payrollRun.lineItems),
      JSON.stringify(payrollRun.totals)
    ]
  );

  res.status(201).json({ payrollRun });
});

// GET /api/payroll/runs
router.get('/runs', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;

  const rows = await all(
    'SELECT * FROM payrollRuns WHERE companyId = ? ORDER BY createdAt DESC',
    [companyId]
  );

  const payrollRuns = rows.map((r) => ({
    runId: r.runId,
    companyId: r.companyId,
    monthKey: r.monthKey,
    month: r.month,
    year: r.year,
    status: r.status,
    createdAt: r.createdAt,
    approvedAt: r.approvedAt,
    processedAt: r.processedAt,
    lineItems: JSON.parse(r.lineItemsJson),
    totals: JSON.parse(r.totalsJson)
  }));

  res.json({ payrollRuns });
});

module.exports = { router };


