const express = require('express');
const { nanoid } = require('nanoid');
const PDFDocument = require('pdfkit');

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

function calcNet({ baseSalaryMonthly, deductionsMonthly, bonusesMonthly, taxPercentage }) {
  const base = Number(baseSalaryMonthly ?? 0);
  const deductions = Number(deductionsMonthly ?? 0);
  const bonuses = Number(bonusesMonthly ?? 0);
  const taxRate = Number(taxPercentage ?? 0);
  const taxAmount = base * (taxRate / 100);
  const net = base + bonuses - deductions - taxAmount;
  return { base, deductions, bonuses, taxRate, taxAmount, net };
}

// GET /api/payroll/employees - List employees with salary info
router.get('/employees', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;
  const rows = await all(
    `SELECT e.id, e.employee_id, e.name, e.email, e.department, e.designationId,
            e.baseSalaryMonthly, e.deductionsMonthly, e.bonusesMonthly, e.taxPercentage
     FROM employees e
     WHERE e.companyId = ?
     ORDER BY e.name ASC`,
    [companyId]
  );
  res.json({ success: true, data: rows });
});

// PUT /api/payroll/employees/:id/salary - Update employee salary components
router.put('/employees/:id/salary', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const { id } = req.params;
  const { baseSalaryMonthly, deductionsMonthly, bonusesMonthly, taxPercentage } = req.body || {};

  const existing = await get('SELECT id FROM employees WHERE id = ? AND companyId = ?', [id, req.user.companyId]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  await run(
    `UPDATE employees SET baseSalaryMonthly = COALESCE(?, baseSalaryMonthly),
                         deductionsMonthly = COALESCE(?, deductionsMonthly),
                         bonusesMonthly = COALESCE(?, bonusesMonthly),
                         taxPercentage = COALESCE(?, taxPercentage),
                         updatedAt = ?
     WHERE id = ? AND companyId = ?`,
    [baseSalaryMonthly != null ? Number(baseSalaryMonthly) : null,
     deductionsMonthly != null ? Number(deductionsMonthly) : null,
     bonusesMonthly != null ? Number(bonusesMonthly) : null,
     taxPercentage != null ? Number(taxPercentage) : null,
     new Date().toISOString(), id, req.user.companyId]
  );

  const updated = await get('SELECT * FROM employees WHERE id = ? AND companyId = ?', [id, req.user.companyId]);
  res.json({ success: true, data: updated });
});

// POST /api/payroll/generate - Generate payslips for selected employees
router.post('/generate', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const { month, year, employeeIds } = req.body || {};

  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) {
    return res.status(400).json({ success: false, message: 'month (1-12) and year are required' });
  }

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Please select at least one employee' });
  }

  const companyId = req.user.companyId;
  const monthKey = toMonthKey({ month: m, year: y });

  const employees = await all(
    `SELECT * FROM employees WHERE companyId = ? AND id IN (${employeeIds.map(() => '?').join(',')})`,
    [companyId, ...employeeIds]
  );

  if (employees.length === 0) {
    return res.status(404).json({ success: false, message: 'No employees found' });
  }

  const runId = nanoid();
  const now = new Date().toISOString();

  const lineItems = employees.map(emp => {
    const c = calcNet(emp);
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      baseSalaryMonthly: c.base,
      deductionsMonthly: c.deductions,
      bonusesMonthly: c.bonuses,
      taxPercentage: c.taxRate,
      taxAmount: c.taxAmount,
      netSalary: c.net
    };
  });

  const totals = lineItems.reduce(
    (acc, it) => {
      acc.base += it.baseSalaryMonthly;
      acc.deductions += it.deductionsMonthly;
      acc.bonuses += it.bonusesMonthly;
      acc.tax += it.taxAmount;
      acc.net += it.netSalary;
      return acc;
    },
    { base: 0, deductions: 0, bonuses: 0, tax: 0, net: 0 }
  );

  const payrollRun = {
    runId,
    monthKey,
    month: m,
    year: y,
    status: 'PROCESSED',
    createdAt: now,
    processedAt: now,
    lineItems,
    totals,
    employeeCount: employees.length
  };

  await run(
    `INSERT INTO payrollRuns (runId, companyId, monthKey, month, year, status, createdAt, processedAt, lineItemsJson, totalsJson)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [runId, companyId, monthKey, m, y, 'PROCESSED', now, now, JSON.stringify(lineItems), JSON.stringify(totals)]
  );

  res.status(201).json({ success: true, data: payrollRun });
});

// POST /api/payroll/run - Bulk payroll for all employees
router.post('/run', requireAuth, requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  await ensureDb();
  const { month, year } = req.body || {};
  const companyId = req.user.companyId;

  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) {
    return res.status(400).json({ success: false, message: 'month (1-12) and year are required' });
  }

  const monthKey = toMonthKey({ month: m, year: y });
  const existing = await get('SELECT runId FROM payrollRuns WHERE companyId = ? AND monthKey = ?', [companyId, monthKey]);
  if (existing) {
    return res.status(409).json({ success: false, message: `Payroll already processed for ${monthKey}` });
  }

  const employees = await all('SELECT * FROM employees WHERE companyId = ?', [companyId]);
  if (employees.length === 0) {
    return res.status(400).json({ success: false, message: 'No employees to process' });
  }

  const runId = nanoid();
  const now = new Date().toISOString();

  const lineItems = employees.map(emp => {
    const c = calcNet(emp);
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      baseSalaryMonthly: c.base,
      deductionsMonthly: c.deductions,
      bonusesMonthly: c.bonuses,
      taxPercentage: c.taxRate,
      taxAmount: c.taxAmount,
      netSalary: c.net
    };
  });

  const totals = lineItems.reduce(
    (acc, it) => {
      acc.base += it.baseSalaryMonthly;
      acc.deductions += it.deductionsMonthly;
      acc.bonuses += it.bonusesMonthly;
      acc.tax += it.taxAmount;
      acc.net += it.netSalary;
      return acc;
    },
    { base: 0, deductions: 0, bonuses: 0, tax: 0, net: 0 }
  );

  await run(
    `INSERT INTO payrollRuns (runId, companyId, monthKey, month, year, status, createdAt, processedAt, lineItemsJson, totalsJson)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [runId, companyId, monthKey, m, y, 'PROCESSED', now, now, JSON.stringify(lineItems), JSON.stringify(totals)]
  );

  res.status(201).json({ success: true, data: { runId, monthKey, employeeCount: employees.length, totals } });
});

// GET /api/payroll/runs
router.get('/runs', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM payrollRuns WHERE companyId = ? ORDER BY createdAt DESC', [companyId]);

  const payrollRuns = rows.map((r) => {
    const totals = JSON.parse(r.totalsJson || '{"base":0,"deductions":0,"bonuses":0,"tax":0,"net":0}');
    const lineItems = JSON.parse(r.lineItemsJson || '[]');
    return {
      runId: r.runId,
      companyId: r.companyId,
      monthKey: r.monthKey,
      month: r.month,
      year: r.year,
      status: r.status,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
      processedAt: r.processedAt,
      processed_at: r.processedAt,
      total_employees: lineItems.length,
      total_gross_pay: Number(totals.base) + Number(totals.bonuses) + Number(totals.tax),
      total_deductions: Number(totals.deductions) + Number(totals.tax),
      total_net_pay: Number(totals.net),
      lineItems,
      totals
    };
  });

  res.json({ success: true, data: payrollRuns });
});

// GET /api/payroll/my - Employee's own payslips
router.get('/my', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;
  const employeeRows = await all('SELECT id FROM employees WHERE companyId = ? AND user_id = ?', [companyId, req.user.sub]);
  if (!employeeRows.length) return res.json({ success: true, data: [] });
  const employeeId = employeeRows[0].id;

  const runs = await all('SELECT * FROM payrollRuns WHERE companyId = ? ORDER BY createdAt DESC', [companyId]);
  const slips = runs
    .map(r => {
      const lineItems = JSON.parse(r.lineItemsJson || '[]');
      const item = lineItems.find(li => li.employeeId === employeeId);
      if (!item) return null;
      return {
        id: r.runId,
        month: r.month,
        year: r.year,
        basic_salary: item.baseSalaryMonthly,
        total_earnings: item.baseSalaryMonthly + item.bonusesMonthly,
        total_deductions: item.deductionsMonthly + (item.taxAmount || 0),
        tax_deductions: item.taxAmount || 0,
        net_pay: item.netSalary,
        paid_days: 30,
        working_days: 30,
        status: r.status,
        processed_at: r.processedAt
      };
    })
    .filter(Boolean);

  res.json({ success: true, data: slips });
});

// GET /api/payroll/salary-structure
router.get('/salary-structure', requireAuth, async (req, res) => {
  await ensureDb();
  const companyId = req.user.companyId;
  const emp = await get('SELECT * FROM employees WHERE companyId = ? AND user_id = ?', [companyId, req.user.sub]);
  if (!emp) return res.json({ success: true, data: null });

  const net = Number(emp.baseSalaryMonthly || 0) + Number(emp.bonusesMonthly || 0) - Number(emp.deductionsMonthly || 0);
  res.json({
    success: true,
    data: {
      basic_salary: emp.baseSalaryMonthly || 0,
      net_salary: net,
      components_arr: [
        { name: 'Basic Salary', amount: emp.baseSalaryMonthly || 0, type: 'EARNING' },
        { name: 'Bonuses', amount: emp.bonusesMonthly || 0, type: 'EARNING' },
        { name: 'Deductions', amount: emp.deductionsMonthly || 0, type: 'DEDUCTION' },
        { name: 'Tax (' + (emp.taxPercentage || 0) + '%)', amount: (emp.baseSalaryMonthly || 0) * (emp.taxPercentage || 0) / 100, type: 'DEDUCTION' }
      ]
    }
  });
});

// GET /api/payroll/:id/download
router.get('/:id/download', requireAuth, async (req, res) => {
  await ensureDb();
  const { id } = req.params;
  const companyId = req.user.companyId;
  const run = await get('SELECT * FROM payrollRuns WHERE companyId = ? AND runId = ?', [companyId, id]);
  if (!run) return res.status(404).json({ success: false, message: 'Payslip not found' });

  const employeeRows = await all('SELECT id FROM employees WHERE companyId = ? AND user_id = ?', [companyId, req.user.sub]);
  if (!employeeRows.length) return res.status(404).json({ success: false, message: 'Employee not found' });

  const lineItems = JSON.parse(run.lineItemsJson || '[]');
  const item = lineItems.find(li => li.employeeId === employeeRows[0].id);
  if (!item) return res.status(404).json({ success: false, message: 'Payslip not found for you' });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip_${id}.pdf`);
  doc.pipe(res);

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  doc.fontSize(20).text('PAYSLIP', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);

  doc.text(`Period: ${months[run.month] || run.month} ${run.year}`, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(14).font('Helvetica-Bold').text('Employee Details', { underline: true });
  doc.font('Helvetica').fontSize(12);
  doc.text(`Name: ${item.employeeName}`);
  doc.text(`Employee ID: ${item.employeeId}`);
  doc.text(`Department: ${item.department || 'N/A'}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').fontSize(14).text('Salary Breakdown', { underline: true });
  doc.font('Helvetica').fontSize(12);
  doc.text(`Basic Salary: ₹${Number(item.baseSalaryMonthly || 0).toLocaleString()}`);
  doc.text(`Bonus: ₹${Number(item.bonusesMonthly || 0).toLocaleString()}`);
  doc.text(`Deductions: ₹${Number(item.deductionsMonthly || 0).toLocaleString()}`);
  doc.text(`Tax (${item.taxPercentage || 0}%): ₹${Number(item.taxAmount || 0).toLocaleString()}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').fontSize(14).text(`Net Salary: ₹${Number(item.netSalary || 0).toLocaleString()}`, { align: 'right' });
  doc.moveDown(2);

  doc.font('Helvetica').fontSize(10).text('Status: ' + (run.status || 'PROCESSED'), { align: 'center' });
  doc.moveDown(4);
  doc.text('Authorized Signature: ___________________', { align: 'right' });

  doc.end();
});

module.exports = router;
