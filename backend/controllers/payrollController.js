const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const { success, created, badRequest, notFound, error, paginated } = require('../utils/response');
const { generateId, getCurrentMonthYear, getWorkingDaysInMonth } = require('../utils/helpers');

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
 * Get salary structure
 * GET /api/payroll/salary-structure
 */
const getMySalaryStructure = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const [structures] = await pool.query(
      `SELECT ss.*, 
              GROUP_CONCAT(CONCAT(sc.name, ':', ssc.amount, ':', sc.type) SEPARATOR '||') as components
       FROM salary_structures ss
       LEFT JOIN salary_structure_components ssc ON ss.id = ssc.salary_structure_id
       LEFT JOIN salary_components sc ON ssc.component_id = sc.id
       WHERE ss.employee_id = ? AND ss.is_active = 1
       GROUP BY ss.id
       ORDER BY ss.created_at DESC LIMIT 1`,
      [employees[0].id]
    );

    if (structures.length === 0) return notFound(res, 'Salary structure not found');

    const structure = structures[0];
    if (structure.components) {
      structure.components_arr = structure.components.split('||').map(c => {
        const [name, amount, type] = c.split(':');
        return { name, amount: parseFloat(amount), type };
      });
    }
    delete structure.components;

    return success(res, structure);
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

    const item = items[0];
    const earningsBreakdown = typeof item.earnings_breakdown === 'string' ? JSON.parse(item.earnings_breakdown) : item.earnings_breakdown;
    const deductionsBreakdown = typeof item.deductions_breakdown === 'string' ? JSON.parse(item.deductions_breakdown) : item.deductions_breakdown;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${item.employee_id}_${item.month}_${item.year}.pdf`);
    doc.pipe(res);

    // Company header
    doc.fontSize(20).font('Helvetica-Bold').text('Enterprise HRMS Pvt. Ltd.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('123 Business Park, Tech City', { align: 'center' });
    doc.moveDown();

    // Payslip title
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    doc.fontSize(16).font('Helvetica-Bold').text(`Payslip for ${months[item.month]} ${item.year}`, { align: 'center' });
    doc.moveDown();

    // Employee details
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Employee ID: `, { continued: true }).font('Helvetica').text(item.employee_id);
    doc.font('Helvetica-Bold').text(`Name: `, { continued: true }).font('Helvetica').text(`${item.first_name} ${item.last_name}`);
    doc.font('Helvetica-Bold').text(`Department: `, { continued: true }).font('Helvetica').text(item.department_name || 'N/A');
    doc.font('Helvetica-Bold').text(`Designation: `, { continued: true }).font('Helvetica').text(item.designation_title || 'N/A');
    doc.font('Helvetica-Bold').text(`Days: `, { continued: true }).font('Helvetica').text(`${item.paid_days} / ${item.working_days}`);
    doc.moveDown();

    // Earnings table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Earnings', { underline: true });
    doc.moveDown(0.5);

    let earningsTotal = 0;
    if (earningsBreakdown && Array.isArray(earningsBreakdown)) {
      earningsBreakdown.forEach(e => {
        doc.fontSize(10).font('Helvetica').text(`${e.name}:`, 60, doc.y, { continued: true });
        doc.text(`₹${parseFloat(e.amount).toFixed(2)}`, { align: 'right' });
        earningsTotal += parseFloat(e.amount);
      });
    }

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`Basic Salary:`, 60, doc.y, { continued: true });
    doc.text(`₹${parseFloat(item.basic_salary).toFixed(2)}`, { align: 'right' });
    earningsTotal += parseFloat(item.basic_salary);

    doc.font('Helvetica-Bold').text(`Gross Pay:`, 60, doc.y, { continued: true });
    doc.text(`₹${parseFloat(item.gross_pay).toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    // Deductions table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Deductions', { underline: true });
    doc.moveDown(0.5);

    let deductionsTotal = 0;
    if (deductionsBreakdown && Array.isArray(deductionsBreakdown)) {
      deductionsBreakdown.forEach(d => {
        doc.fontSize(10).font('Helvetica').text(`${d.name}:`, 60, doc.y, { continued: true });
        doc.text(`₹${parseFloat(d.amount).toFixed(2)}`, { align: 'right' });
        deductionsTotal += parseFloat(d.amount);
      });
    }

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`Total Deductions:`, 60, doc.y, { continued: true });
    doc.text(`₹${parseFloat(item.total_deductions).toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    // Net Pay
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb');
    doc.text(`Net Pay:`, 60, doc.y, { continued: true });
    doc.text(`₹${parseFloat(item.net_pay).toFixed(2)}`, { align: 'right' });
    doc.fillColor('#000');
    doc.moveDown(2);

    // Footer
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
 * Process payroll (HR only)
 * POST /api/payroll/process
 */
const processPayroll = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { month, year } = req.body;
    if (!month || !year) return badRequest(res, 'Month and year are required');

    const userId = req.user.userId;

    // Check if payroll already processed for this period
    const [existingRun] = await connection.query(
      'SELECT id FROM payroll_runs WHERE month = ? AND year = ?',
      [month, year]
    );
    if (existingRun.length > 0) {
      return badRequest(res, 'Payroll already processed for this period');
    }

    // Get all active employees with salary structure
    const [employees] = await connection.query(
      `SELECT e.id, e.employee_id, CONCAT(e.first_name, ' ', e.last_name) as name,
              ss.basic_salary, ss.id as salary_structure_id
       FROM employees e
       LEFT JOIN salary_structures ss ON e.id = ss.employee_id AND ss.is_active = 1
       WHERE e.is_active = 1`
    );

    if (employees.length === 0) {
      return badRequest(res, 'No active employees found');
    }

    // Get working days
    const workingDays = getWorkingDaysInMonth(year, month);

    // Create payroll run
    const runId = generateId();
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    await connection.query(
      'INSERT INTO payroll_runs (id, month, year, status, total_employees, processed_by, processed_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [runId, month, year, 'PROCESSING', employees.length, userId]
    );

    // Process each employee
    for (const emp of employees) {
      // Get attendance for the month
      const [attendance] = await connection.query(
        `SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_days
         FROM attendance 
         WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
        [emp.id, month, year]
      );

      const paidDays = attendance[0].present_days || 0;
      const lopDays = workingDays - paidDays;

      // Calculate salary components
      const basicSalary = parseFloat(emp.basic_salary) || 0;
      const perDaySalary = basicSalary / workingDays;
      const actualBasic = perDaySalary * paidDays;

      // Get default salary components
      const [components] = await connection.query(
        'SELECT * FROM salary_components WHERE is_active = 1 AND is_default = 1'
      );

      const earnings = [];
      const deductions = [];
      let totalEarnings = actualBasic;
      let totalDeductionsAmount = 0;

      for (const comp of components) {
        let amount = 0;
        if (comp.calculation_type === 'PERCENTAGE') {
          amount = (parseFloat(comp.calculation_value) / 100) * actualBasic;
        } else if (comp.code === 'CONV') {
          amount = 1600;
        } else if (comp.code === 'MED') {
          amount = 1250;
        }

        // Prorate for LOP
        amount = (amount / workingDays) * paidDays;

        if (comp.type === 'EARNING') {
          earnings.push({ name: comp.name, code: comp.code, amount: Math.round(amount) });
          totalEarnings += amount;
        } else {
          deductions.push({ name: comp.name, code: comp.code, amount: Math.round(amount) });
          totalDeductionsAmount += amount;
        }
      }

      const grossPay = totalEarnings;
      const netPay = grossPay - totalDeductionsAmount;
      totalGrossPay += grossPay;
      totalDeductions += totalDeductionsAmount;
      totalNetPay += netPay;

      // Create payroll item
      const itemId = generateId();
      await connection.query(
        `INSERT INTO payroll_items (id, payroll_run_id, employee_id, basic_salary, total_earnings, total_deductions, net_pay, gross_pay, working_days, paid_days, lop_days, earnings_breakdown, deductions_breakdown)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, runId, emp.id, actualBasic, totalEarnings, totalDeductionsAmount, netPay, grossPay, workingDays, paidDays, lopDays,
         JSON.stringify(earnings), JSON.stringify(deductions)]
      );
    }

    // Update payroll run totals
    await connection.query(
      'UPDATE payroll_runs SET status = ?, total_gross_pay = ?, total_deductions = ?, total_net_pay = ? WHERE id = ?',
      ['COMPLETED', totalGrossPay, totalDeductions, totalNetPay, runId]
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

module.exports = {
  getMyPayslips,
  getMySalaryStructure,
  downloadPayslip,
  getPayrollRuns,
  processPayroll
};