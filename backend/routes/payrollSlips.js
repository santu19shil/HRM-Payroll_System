const express = require('express');
const { init, all, get } = require('../db/sqlite');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const { buildSlipPdfBuffer } = require('../utils/pdf');
const { decryptText } = require('../utils/credentials');

const router = express.Router();

async function ensureDb() {
  await init();
}

function toMonthKey({ month, year }) {
  const m = String(month).padStart(2, '0');
  return `${year}-${m}`;
}

async function getPayrollRun(companyId, runId) {
  return get(
    'SELECT * FROM payrollRuns WHERE companyId = ? AND runId = ?',
    [companyId, runId]
  );
}

router.get('/slips/summary', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;

  const runs = await all(
    'SELECT runId, monthKey, createdAt, lineItemsJson FROM payrollRuns WHERE companyId = ? ORDER BY createdAt DESC',
    [companyId]
  );

  const totalRuns = runs.length;
  const totalSlips = runs.reduce((a, r) => {
    try {
      const items = JSON.parse(r.lineItemsJson || '[]');
      return a + items.length;
    } catch {
      return a;
    }
  }, 0);

  res.json({ totalRuns, totalSlips, payrollRuns: runs.map((r) => ({ runId: r.runId, monthKey: r.monthKey, createdAt: r.createdAt })) });
});

// Admin download PDF for a single employee slip within a run
router.get(
  '/admin/payroll/slips/:runId/:employeeId/pdf',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HR']),
  async (req, res) => {
    await ensureDb();

    const companyId = req.user.companyId;
    const { runId, employeeId } = req.params;

    const runRow = await getPayrollRun(companyId, runId);
    if (!runRow) return res.status(404).json({ error: 'Payroll run not found' });

    const lineItems = JSON.parse(runRow.lineItemsJson || '[]');
    const item = lineItems.find((it) => String(it.employeeId) === String(employeeId));
    if (!item) return res.status(404).json({ error: 'Employee not found in this payroll run' });

    const companyRow = await get('SELECT name FROM companies WHERE id = ?', [companyId]);

    // Support both:
    // - New payroll runs (line item contains credential snapshot)
    // - Old payroll runs (no credential snapshot) -> fallback to users lookup by name
    let password = '';
    if (item.passwordEncrypted) {
      password = decryptText(item.passwordEncrypted);
    } else {
      const userRow = await get(
        'SELECT passwordEncrypted FROM users WHERE companyId = ? AND role = ? AND name = ?',
        [companyId, 'EMPLOYEE', item.employeeName]
      );
      password = userRow?.passwordEncrypted ? decryptText(userRow.passwordEncrypted) : '';
    }


    const pdfBuffer = await buildSlipPdfBuffer({

      companyName: companyRow?.name,
      monthKey: runRow.monthKey,
      createdAt: runRow.createdAt,
      employee: {
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        department: item.department,
        userId: userId || '',
        password
      },


      totals: {
        baseSalaryMonthly: item.baseSalaryMonthly,
        deductionsMonthly: item.deductionsMonthly,
        bonusesMonthly: item.bonusesMonthly,
        netSalary: item.netSalary
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-slip-${runRow.monthKey}-${item.employeeName}.pdf"`);
    res.send(pdfBuffer);
  }
);

// Admin JSON: employee credentials + payroll slip totals for month/year
// GET /api/admin/payroll/slips/employee?month=MM&year=YYYY&employeeId=EMP_ID
router.get(
  '/admin/payroll/slips/employee',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HR']),
  async (req, res) => {
    await ensureDb();

    const companyId = req.user.companyId;
    const { month, year, employeeId } = req.query || {};

    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) {
      return res.status(400).json({ error: 'month (1-12) and year are required' });
    }
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    const monthKey = toMonthKey({ month: m, year: y });

    const runRow = await get(
      'SELECT runId, monthKey, createdAt, lineItemsJson FROM payrollRuns WHERE companyId = ? AND monthKey = ?',
      [companyId, monthKey]
    );
    if (!runRow) {
      return res.status(404).json({ error: 'No payroll run found for requested month/year' });
    }

    const lineItems = JSON.parse(runRow.lineItemsJson || '[]');
    const item = lineItems.find((it) => String(it.employeeId) === String(employeeId));
    if (!item) {
      return res.status(404).json({ error: 'Employee not found in this payroll run' });
    }

    const companyRow = await get('SELECT name FROM companies WHERE id = ?', [companyId]);

    // Support both:
    // - New payroll runs (line item contains credential snapshot)
    // - Old payroll runs (no credential snapshot) -> fallback to users lookup by name
    let userId = item.userId || '';
    let password = '';

    if (item.passwordEncrypted) {
      password = decryptText(item.passwordEncrypted);
    } else {
      const userRow = await get(
        'SELECT id as userId, passwordEncrypted FROM users WHERE companyId = ? AND role = ? AND name = ?',
        [companyId, 'EMPLOYEE', item.employeeName]
      );
      userId = userRow?.userId || userId;
      password = userRow?.passwordEncrypted ? decryptText(userRow.passwordEncrypted) : '';
    }


    return res.json({
      companyName: companyRow?.name,
      monthKey: runRow.monthKey,
      runId: runRow.runId,
      createdAt: runRow.createdAt,
      employee: {
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        department: item.department,
        userId: userId || '',
        password

      },

      slip: {
        baseSalaryMonthly: item.baseSalaryMonthly,
        deductionsMonthly: item.deductionsMonthly,
        bonusesMonthly: item.bonusesMonthly,
        netSalary: item.netSalary
      }
    });
  }
);

module.exports = { router };

