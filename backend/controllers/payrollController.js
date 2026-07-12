const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { success, created, badRequest, notFound, error, paginated } = require('../utils/response');
const { generateId, getCurrentMonthYear, getWorkingDaysInMonth } = require('../utils/helpers');

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Fetch company settings (name, address, logo, etc.)
 */
async function fetchSettings(connection) {
  const [rows] = await connection.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_group = 'Company'"
  );
  const obj = {};
  rows.forEach(r => { obj[r.setting_key] = r.setting_value; });
  return obj;
}

/**
 * Resolve a component's rupee amount from its calculation type.
 */
function resolveAmount(calcType, calcValue, base) {
  const v = parseFloat(calcValue) || 0;
  if (calcType === 'PERCENTAGE') return (v / 100) * base;
  return v;
}

/**
 * Build the full payslip breakdown (earnings, deductions, employer contributions)
 * for a given base salary and set of component overrides.
 */
async function resolveStructure(connection, { baseSalary, overrides = {}, workingDays, paidDays }) {
  const basic = parseFloat(baseSalary) || 0;
  const perDay = workingDays > 0 ? basic / workingDays : 0;
  const actualBasic = perDay * paidDays;

  const [components] = await connection.query(
    'SELECT * FROM salary_components WHERE is_active = 1 ORDER BY category, type, name'
  );

  const earnings = [{ name: 'Basic Salary', code: 'BASIC', amount: Math.round(actualBasic) }];
  const deductions = [];
  const employer = [];
  let gross = actualBasic;
  let totalDeductions = 0;
  let employerTotal = 0;

  for (const comp of components) {
    if (comp.code === 'BASIC') continue; // already added

    const ov = overrides[comp.id];
    const calcType = ov ? ov.calculation_type : comp.calculation_type;
    const calcValue = ov ? ov.calculation_value : comp.calculation_value;
    const amount = resolveAmount(calcType, calcValue, actualBasic);
    const rounded = Math.round(amount);

    // Skip zero-value non-default components that have not been explicitly set
    if (rounded === 0 && !ov && comp.is_default === 0) continue;

    if (comp.category === 'EMPLOYER') {
      employer.push({ name: comp.name, code: comp.code, amount: rounded });
      employerTotal += rounded;
    } else if (comp.type === 'EARNING') {
      earnings.push({ name: comp.name, code: comp.code, amount: rounded });
      gross += rounded;
    } else if (comp.type === 'DEDUCTION') {
      deductions.push({ name: comp.name, code: comp.code, amount: rounded });
      totalDeductions += rounded;
    }
  }

  const net = gross - totalDeductions;
  return { actualBasic, earnings, deductions, employer, gross, totalDeductions, net, employerTotal };
}

/**
 * Get the active salary structure overrides for an employee.
 */
async function getStructureOverrides(connection, employeeId) {
  const [structures] = await connection.query(
    'SELECT id FROM salary_structures WHERE employee_id = ? AND is_active = 1',
    [employeeId]
  );
  const overrides = {};
  if (structures.length > 0) {
    const [rows] = await connection.query(
      'SELECT component_id, calculation_type, calculation_value FROM salary_structure_components WHERE salary_structure_id = ?',
      [structures[0].id]
    );
    rows.forEach(o => { overrides[o.component_id] = o; });
  }
  return overrides;
}

/**
 * Get my payslips
 * GET /api/payroll/my
 */
const getMyPayslips = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const [payslips] = await pool.query(
      `SELECT pi.*, pr.month, pr.year, pr.status as run_status
       FROM payroll_items pi
       JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
       WHERE pi.employee_id = ?
       ORDER BY pr.year DESC, pr.month DESC`,
      [employees[0].id]
    );

    return success(res, payslips);
  } catch (err) {
    console.error('Get my payslips error:', err);
    return error(res, 'Failed to fetch payslips');
  }
};

/**
 * Get salary structure (employee self-service)
 * GET /api/payroll/salary-structure
 */
const getMySalaryStructure = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const connection = await pool.getConnection();
    try {
      const [structures] = await connection.query(
        'SELECT basic_salary FROM salary_structures WHERE employee_id = ? AND is_active = 1',
        [employees[0].id]
      );
      const basic = structures.length ? parseFloat(structures[0].basic_salary) || 0 : 0;
      const overrides = await getStructureOverrides(connection, employees[0].id);
      const workingDays = getWorkingDaysInMonth(new Date().getFullYear(), new Date().getMonth() + 1);
      const resolved = await resolveStructure(connection, { baseSalary: basic, overrides, workingDays, paidDays: workingDays });

      return success(res, {
        basic_salary: basic,
        net_salary: resolved.net,
        components_arr: [
          ...resolved.earnings.map(e => ({ ...e, type: 'EARNING' })),
          ...resolved.deductions.map(d => ({ ...d, type: 'DEDUCTION' })),
          ...resolved.employer.map(e => ({ ...e, type: 'EMPLOYER' }))
        ]
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Get salary structure error:', err);
    return error(res, 'Failed to fetch salary structure');
  }
};

/**
 * Download payslip PDF
 * GET /api/payroll/:id/download
 */
const downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let item;
    if (['SUPER_ADMIN', 'HR_ADMIN'].includes(userRole)) {
      const [items] = await pool.query(
        `SELECT pi.*, pr.month, pr.year, pr.status as run_status,
                e.first_name, e.last_name, e.employee_id, e.designation_id, e.department_id,
                d.name as department_name, des.title as designation_title
         FROM payroll_items pi
         JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
         JOIN employees e ON pi.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE pi.id = ?`,
        [id]
      );
      if (items.length === 0) return notFound(res, 'Payslip not found');
      item = items[0];
    } else {
      const [employees] = await pool.query('SELECT id, employee_id, first_name, last_name FROM employees WHERE user_id = ?', [userId]);
      if (employees.length === 0) return notFound(res, 'Employee not found');

      const [items] = await pool.query(
        `SELECT pi.*, pr.month, pr.year, pr.status as run_status,
                e.first_name, e.last_name, e.employee_id, e.designation_id, e.department_id,
                d.name as department_name, des.title as designation_title
         FROM payroll_items pi
         JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
         JOIN employees e ON pi.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE pi.id = ? AND pi.employee_id = ?`,
        [id, employees[0].id]
      );
      if (items.length === 0) return notFound(res, 'Payslip not found');
      item = items[0];
    }

    const connection = await pool.getConnection();
    let settings = {};
    try {
      settings = await fetchSettings(connection);
    } finally {
      connection.release();
    }

    const earningsBreakdown = typeof item.earnings_breakdown === 'string' ? JSON.parse(item.earnings_breakdown) : (item.earnings_breakdown || []);
    const deductionsBreakdown = typeof item.deductions_breakdown === 'string' ? JSON.parse(item.deductions_breakdown) : (item.deductions_breakdown || []);
    const employerBreakdown = typeof item.employer_contributions === 'string' ? JSON.parse(item.employer_contributions) : (item.employer_contributions || []);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${item.employee_id}_${item.month}_${item.year}.pdf`);
    doc.pipe(res);

    const companyName = settings.company_name || 'Enterprise HRMS Pvt. Ltd.';
    const companyAddress = settings.company_address || '';

    // Header: logo + company details
    const startY = doc.y;
    let logoBottom = startY;
    if (settings.company_logo) {
      try {
        const logoPath = path.join(__dirname, '..', settings.company_logo.replace(/^\//, ''));
        if (fs.existsSync(logoPath)) {
          // Constrain the logo to a 55x55 box (preserves aspect ratio)
          doc.image(logoPath, 40, startY, { fit: [55, 55] });
          logoBottom = startY + 55;
        }
      } catch (_) { /* ignore missing/unsupported logo */ }
    }

    doc.fontSize(18).font('Helvetica-Bold').text(companyName, 105, startY, { width: 420 });
    doc.fontSize(9).font('Helvetica').text(companyAddress, 105, doc.y, { width: 420 });

    // Separator line placed below the taller of the logo or the text block
    doc.y = Math.max(logoBottom, doc.y) + 12;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.4);
    doc.fontSize(15).font('Helvetica-Bold').text(`Payslip for ${MONTHS[item.month] || item.month} ${item.year}`, { align: 'center' });
    doc.moveDown(0.5);

    // Employee & Pay period block
    const empName = `${item.first_name} ${item.last_name}`;
    doc.fontSize(10).font('Helvetica');
    doc.text('Employee Name:', 40, doc.y).text(empName, 140, doc.y - doc.currentLineHeight());
    doc.text('Employee ID:', 40, doc.y).text(item.employee_id, 140, doc.y - doc.currentLineHeight());
    doc.text('Department:', 40, doc.y).text(item.department_name || 'N/A', 140, doc.y - doc.currentLineHeight());
    doc.text('Designation:', 40, doc.y).text(item.designation_title || 'N/A', 140, doc.y - doc.currentLineHeight());
    doc.text('Pay Period:', 40, doc.y).text(`${MONTHS[item.month] || item.month} ${item.year}`, 140, doc.y - doc.currentLineHeight());
    doc.text('Days (Paid/Working):', 40, doc.y).text(`${item.paid_days} / ${item.working_days}`, 140, doc.y - doc.currentLineHeight());
    doc.moveDown(0.5);

    // Earnings table
    const drawTable = (title, rows, totalLabel, totalValue) => {
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica-Bold').text(title, { underline: true });
      doc.moveDown(0.3);
      let total = 0;
      rows.forEach(r => {
        doc.fontSize(10).font('Helvetica').text(r.name, 45, doc.y, { continued: true });
        doc.text(`Rs. ${parseFloat(r.amount || 0).toLocaleString()}`, { align: 'right' });
        total += parseFloat(r.amount || 0);
      });
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').text(totalLabel, 45, doc.y, { continued: true });
      doc.text(`Rs. ${total.toLocaleString()}`, { align: 'right' });
      doc.moveDown(0.6);
      void totalValue;
    };

    drawTable('Earnings', earningsBreakdown, 'Gross Earnings', item.gross_pay);
    drawTable('Deductions', deductionsBreakdown, 'Total Deductions', item.total_deductions);
    if (employerBreakdown.length > 0) {
      drawTable('Employer Contributions', employerBreakdown, 'Total Employer Contribution', item.employer_total);
    }

    // Summary
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.4);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#2563eb');
    doc.text('Gross Salary:', 45, doc.y, { continued: true });
    doc.text(`Rs. ${parseFloat(item.gross_pay || 0).toLocaleString()}`, { align: 'right' });
    doc.text('Total Deductions:', 45, doc.y, { continued: true });
    doc.text(`Rs. ${parseFloat(item.total_deductions || 0).toLocaleString()}`, { align: 'right' });
    doc.fontSize(15).text('Net Salary:', 45, doc.y, { continued: true });
    doc.text(`Rs. ${parseFloat(item.net_pay || 0).toLocaleString()}`, { align: 'right' });
    doc.fillColor('#000');
    doc.moveDown(1.5);

    doc.fontSize(8).font('Helvetica').fillColor('#666');
    doc.text('This is a computer-generated payslip and does not require a signature.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Download payslip error:', err);
    return error(res, 'Failed to download payslip');
  }
};

/**
 * Get all payroll runs (HR view)
 * GET /api/payroll/runs
 */
const getPayrollRuns = async (req, res) => {
  try {
    const [runs] = await pool.query(
      'SELECT * FROM payroll_runs ORDER BY year DESC, month DESC'
    );
    return success(res, runs);
  } catch (err) {
    console.error('Get payroll runs error:', err);
    return error(res, 'Failed to fetch payroll runs');
  }
};

/**
 * Get all payslips (HR view)
 * GET /api/payroll/admin/payslips
 */
const getAllPayslips = async (req, res) => {
  try {
    const [payslips] = await pool.query(
      `SELECT pi.id, pi.employee_id, pi.payroll_run_id, pi.basic_salary, pi.total_earnings, pi.total_deductions, pi.net_pay, pi.gross_pay, pi.employer_total, pi.working_days, pi.paid_days, pi.lop_days, pi.status, pi.paid_at, pi.employer_contributions, pi.earnings_breakdown, pi.deductions_breakdown,
              pr.month, pr.year, pr.status as run_status,
              e.first_name, e.last_name, CONCAT(e.first_name, ' ', e.last_name) as employee_name,
              e.employee_id as employee_number,
              d.name as department_name, des.title as designation_title
       FROM payroll_items pi
       JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
       JOIN employees e ON pi.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       ORDER BY pr.year DESC, pr.month DESC, e.first_name ASC`
    );
    return success(res, payslips);
  } catch (err) {
    console.error('Get all payslips error:', err);
    return error(res, 'Failed to fetch payslips');
  }
};

/**
 * List active salary components (for the HR entry form)
 * GET /api/payroll/components
 */
const getComponents = async (req, res) => {
  try {
    const [components] = await pool.query(
      'SELECT id, name, code, type, category, calculation_type, calculation_value, is_default FROM salary_components WHERE is_active = 1 ORDER BY category, type, name'
    );
    return success(res, components);
  } catch (err) {
    console.error('Get components error:', err);
    return error(res, 'Failed to fetch components');
  }
};

/**
 * Get an employee's salary structure (HR entry form)
 * GET /api/payroll/employees/:id/salary-structure
 */
const getSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [emp] = await connection.query('SELECT id FROM employees WHERE id = ?', [id]);
      if (emp.length === 0) return notFound(res, 'Employee not found');

      const [structures] = await connection.query(
        'SELECT id, basic_salary FROM salary_structures WHERE employee_id = ? AND is_active = 1',
        [id]
      );
      const basic = structures.length ? parseFloat(structures[0].basic_salary) || 0 : 0;

      const [components] = await connection.query(
        'SELECT id, name, code, type, category, calculation_type, calculation_value, is_default FROM salary_components WHERE is_active = 1 ORDER BY category, type, name'
      );

      const overrides = await getStructureOverrides(connection, id);

      const componentRows = components.map(c => {
        const ov = overrides[c.id];
        const calcType = ov ? ov.calculation_type : c.calculation_type;
        const calcValue = ov ? ov.calculation_value : c.calculation_value;
        const resolvedAmount = Math.round(resolveAmount(calcType, calcValue, basic));
        return {
          component_id: c.id,
          code: c.code,
          name: c.name,
          type: c.type,
          category: c.category,
          calculation_type: calcType,
          calculation_value: calcValue,
          resolved_amount: resolvedAmount,
          overridden: !!ov
        };
      });

      return success(res, { employee_id: id, basic_salary: basic, components: componentRows });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Get salary structure error:', err);
    return error(res, 'Failed to fetch salary structure');
  }
};

/**
 * Update an employee's salary structure (HR entry form)
 * PUT /api/payroll/employees/:id/salary-structure
 * Body: { basic_salary, components: [{ component_id, calculation_type, calculation_value }] }
 */
const updateSalaryStructure = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { basic_salary, components } = req.body;

    const [existing] = await connection.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      await connection.commit();
      return notFound(res, 'Employee not found');
    }

    const basic = basic_salary !== undefined ? Number(basic_salary) : 0;

    // Upsert salary structure
    const [structure] = await connection.query(
      'SELECT id FROM salary_structures WHERE employee_id = ? AND is_active = 1',
      [id]
    );

    let structureId;
    if (structure.length > 0) {
      structureId = structure[0].id;
      await connection.query(
        'UPDATE salary_structures SET basic_salary = ? WHERE id = ?',
        [basic, structureId]
      );
    } else {
      structureId = generateId();
      await connection.query(
        `INSERT INTO salary_structures (id, employee_id, effective_from, basic_salary, total_earnings, total_deductions, net_salary, is_active, created_by)
         VALUES (?, ?, CURDATE(), ?, 0, 0, ?, 1, ?)`,
        [structureId, id, basic, basic, req.user.userId || null]
      );
    }

    // Replace component overrides
    await connection.query('DELETE FROM salary_structure_components WHERE salary_structure_id = ?', [structureId]);

    if (Array.isArray(components)) {
      for (const c of components) {
        if (!c || !c.component_id) continue;
        const calcType = c.calculation_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
        const calcValue = Number(c.calculation_value) || 0;
        const resolvedAmount = Math.round(resolveAmount(calcType, calcValue, basic));
        await connection.query(
          `INSERT INTO salary_structure_components (id, salary_structure_id, component_id, amount, calculation_type, calculation_value)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [generateId(), structureId, c.component_id, resolvedAmount, calcType, calcValue]
        );
      }
    }

    // Recompute any pending (not PAID) payslip items so they reflect the new structure
    const [pendingItems] = await connection.query(
      'SELECT id, working_days, paid_days FROM payroll_items WHERE employee_id = ? AND status != ?',
      [id, 'PAID']
    );
    const workingDays = getWorkingDaysInMonth(new Date().getFullYear(), new Date().getMonth() + 1);
    const overrides = await getStructureOverrides(connection, id);

    // Store the resolved full-month summary on the salary structure so the
    // employee list can show accurate Basic / Gross / Deductions / Net.
    const fullResolved = await resolveStructure(connection, { baseSalary: basic, overrides, workingDays, paidDays: workingDays });
    await connection.query(
      'UPDATE salary_structures SET basic_salary = ?, total_earnings = ?, total_deductions = ?, net_salary = ? WHERE id = ?',
      [basic, fullResolved.gross, fullResolved.totalDeductions, fullResolved.net, structureId]
    );

    for (const item of pendingItems) {
      const wd = Number(item.working_days) || workingDays;
      // Recompute using the full month so the payslip matches the salary structure.
      const resolved = await resolveStructure(connection, { baseSalary: basic, overrides, workingDays: wd, paidDays: wd });
      await connection.query(
        `UPDATE payroll_items
         SET basic_salary = ?, total_earnings = ?, total_deductions = ?, net_pay = ?, gross_pay = ?, employer_total = ?, earnings_breakdown = ?, deductions_breakdown = ?, employer_contributions = ?
         WHERE id = ?`,
        [resolved.actualBasic, resolved.gross, resolved.totalDeductions, resolved.net, resolved.gross, resolved.employerTotal,
         JSON.stringify(resolved.earnings), JSON.stringify(resolved.deductions), JSON.stringify(resolved.employer), item.id]
      );
    }

    // Recompute the totals of every payroll run that contains this employee's
    // payslips so the Payroll History section stays in sync with the structure.
    const [affectedRuns] = await connection.query(
      'SELECT DISTINCT payroll_run_id FROM payroll_items WHERE employee_id = ?',
      [id]
    );
    for (const r of affectedRuns) {
      const [agg] = await connection.query(
        `SELECT COALESCE(SUM(total_earnings), 0) AS g, COALESCE(SUM(total_deductions), 0) AS d,
                COALESCE(SUM(net_pay), 0) AS n, COALESCE(SUM(employer_total), 0) AS em,
                COUNT(*) AS c
         FROM payroll_items WHERE payroll_run_id = ?`,
        [r.payroll_run_id]
      );
      await connection.query(
        `UPDATE payroll_runs
         SET total_gross_pay = ?, total_deductions = ?, total_net_pay = ?, total_employer_contributions = ?, total_employees = ?
         WHERE id = ?`,
        [agg[0].g, agg[0].d, agg[0].n, agg[0].em, agg[0].c, r.payroll_run_id]
      );
    }

    await connection.commit();
    return success(res, null, 'Salary structure updated successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Update salary structure error:', err);
    return error(res, 'Failed to update salary structure');
  } finally {
    connection.release();
  }
};

/**
 * Process payroll (HR only)
 * POST /api/payroll/process
 */
const processPayroll = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { month, year, employeeIds } = req.body;
    if (!month || !year) return badRequest(res, 'Month and year are required');

    const userId = req.user.userId;

    // If a run already exists for this period, remove it so we can regenerate
    const [existingRun] = await connection.query(
      'SELECT id FROM payroll_runs WHERE month = ? AND year = ?',
      [month, year]
    );
    if (existingRun.length > 0) {
      await connection.query('DELETE FROM payroll_items WHERE payroll_run_id = ?', [existingRun[0].id]);
      await connection.query('DELETE FROM payroll_runs WHERE id = ?', [existingRun[0].id]);
    }

    let employeeQuery = `SELECT e.id, e.employee_id, CONCAT(e.first_name, ' ', e.last_name) as name,
              ss.basic_salary, ss.id as salary_structure_id
       FROM employees e
       LEFT JOIN salary_structures ss ON e.id = ss.employee_id AND ss.is_active = 1
       WHERE e.is_active = 1`;
    const employeeParams = [];
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      employeeQuery += ' AND e.id IN (?)';
      employeeParams.push(employeeIds);
    }
    const [employees] = await connection.query(employeeQuery, employeeParams);

    if (employees.length === 0) {
      return badRequest(res, 'No active employees found');
    }

    const workingDays = getWorkingDaysInMonth(year, month);

    const runId = generateId();
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalEmployer = 0;

    await connection.query(
      'INSERT INTO payroll_runs (id, month, year, status, total_employees, processed_by, processed_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [runId, month, year, 'PROCESSING', employees.length, userId]
    );

    for (const emp of employees) {
      const [attendance] = await connection.query(
        `SELECT
          COUNT(*) as total_days,
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_days
         FROM attendance
         WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
        [emp.id, month, year]
      );

      // Payslips reflect the employee's salary structure (full monthly salary),
      // so they stay consistent with the salary-structure figures shown elsewhere.
      const paidDays = workingDays;
      const lopDays = 0;

      const overrides = await getStructureOverrides(connection, emp.id);
      const resolved = await resolveStructure(connection, {
        baseSalary: emp.basic_salary,
        overrides,
        workingDays,
        paidDays
      });

      totalGrossPay += resolved.gross;
      totalDeductions += resolved.totalDeductions;
      totalNetPay += resolved.net;
      totalEmployer += resolved.employerTotal;

      const itemId = generateId();
      await connection.query(
        `INSERT INTO payroll_items
          (id, payroll_run_id, employee_id, basic_salary, total_earnings, total_deductions, net_pay, gross_pay, employer_total, working_days, paid_days, lop_days, earnings_breakdown, deductions_breakdown, employer_contributions, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROCESSED')`,
        [itemId, runId, emp.id, resolved.actualBasic, resolved.gross, resolved.totalDeductions, resolved.net, resolved.gross, resolved.employerTotal,
         workingDays, paidDays, lopDays, JSON.stringify(resolved.earnings), JSON.stringify(resolved.deductions), JSON.stringify(resolved.employer)]
      );
    }

    await connection.query(
      'UPDATE payroll_runs SET status = ?, total_gross_pay = ?, total_deductions = ?, total_net_pay = ?, total_employer_contributions = ? WHERE id = ?',
      ['COMPLETED', totalGrossPay, totalDeductions, totalNetPay, totalEmployer, runId]
    );

    await connection.commit();
    return created(res, { id: runId, total_employees: employees.length, total_net_pay: totalNetPay }, 'Payroll processed successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Process payroll error:', err);
    return error(res, 'Failed to process payroll');
  } finally {
    connection.release();
  }
};

/**
 * Delete payroll run
 * DELETE /api/payroll/runs/:id
 */
const deletePayrollRun = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [run] = await connection.query('SELECT id, status FROM payroll_runs WHERE id = ?', [id]);
    if (run.length === 0) {
      await connection.commit();
      return notFound(res, 'Payroll run not found');
    }

    // Remove payslip items first to keep the database consistent
    await connection.query('DELETE FROM payroll_items WHERE payroll_run_id = ?', [id]);
    await connection.query('DELETE FROM payroll_runs WHERE id = ?', [id]);

    await connection.commit();

    return success(res, null, 'Payroll run deleted successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Delete payroll run error:', err);
    return error(res, 'Failed to delete payroll run');
  } finally {
    connection.release();
  }
};

/**
 * Delete a single payslip (payroll item) and recompute its run totals
 * DELETE /api/payroll/admin/payslips/:id
 */
const deletePayslip = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [item] = await connection.query('SELECT id, payroll_run_id FROM payroll_items WHERE id = ?', [id]);
    if (item.length === 0) {
      await connection.commit();
      return notFound(res, 'Payslip not found');
    }

    const runId = item[0].payroll_run_id;

    await connection.query('DELETE FROM payroll_items WHERE id = ?', [id]);

    const [remaining] = await connection.query(
      `SELECT
         COALESCE(SUM(total_earnings), 0) as gross_earnings,
         COALESCE(SUM(total_deductions), 0) as gross_deductions,
         COALESCE(SUM(net_pay), 0) as gross_net,
         COALESCE(SUM(employer_total), 0) as gross_employer,
         COUNT(*) as employee_count
       FROM payroll_items WHERE payroll_run_id = ?`,
      [runId]
    );

    await connection.query(
      `UPDATE payroll_runs
       SET total_gross_pay = ?, total_deductions = ?, total_net_pay = ?, total_employer_contributions = ?, total_employees = ?
       WHERE id = ?`,
      [remaining[0].gross_earnings || 0, remaining[0].gross_deductions || 0, remaining[0].gross_net || 0, remaining[0].gross_employer || 0, remaining[0].employee_count || 0, runId]
    );

    await connection.commit();
    return success(res, null, 'Payslip deleted successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Delete payslip error:', err);
    return error(res, 'Failed to delete payslip');
  } finally {
    connection.release();
  }
};

module.exports = {
  getMyPayslips,
  getMySalaryStructure,
  downloadPayslip,
  getPayrollRuns,
  processPayroll,
  getAllPayslips,
  getComponents,
  getSalaryStructure,
  updateSalaryStructure,
  deletePayrollRun,
  deletePayslip
};
