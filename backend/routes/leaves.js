const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const { init, run, get, all } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function ensureDb() {
  await init();
}

async function getOrCreateCompany() {
  const company = await get('SELECT * FROM companies ORDER BY createdAt DESC LIMIT 1');
  if (company) return company.id;

  const createdAt = new Date().toISOString();
  const companyId = nanoid();
  await run('INSERT INTO companies (id, name, createdAt) VALUES (?,?,?)', [companyId, 'Default Company', createdAt]);
  return companyId;
}

async function ensureLeaveTypes(companyId) {
  const existing = await all('SELECT * FROM leave_types WHERE companyId = ?', [companyId]);
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const types = [
    ['Annual Leave', 'AL', 'Yearly paid vacation leave', 18, 1, 1, 10],
    ['Casual Leave', 'CL', 'Short notice personal leave', 12, 1, 0, 0],
    ['Medical Leave', 'ML', 'Sick leave with medical certificate', 15, 1, 0, 0],
    ['Maternity Leave', 'MAT', 'Maternity leave as per company policy', 180, 1, 0, 0],
    ['Paternity Leave', 'PAT', 'Paternity leave as per company policy', 15, 1, 0, 0],
    ['Bereavement Leave', 'BL', 'Leave due to family bereavement', 5, 1, 0, 0]
  ];

  for (const t of types) {
    await run('INSERT OR IGNORE INTO leave_types (id, companyId, name, code, description, days_per_year, is_paid, carry_forward, max_carry_forward, is_active, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [nanoid(), companyId, ...t, 1, now]);
  }

  return all('SELECT * FROM leave_types WHERE companyId = ? AND is_active = 1 ORDER BY name', [companyId]);
}

async function getEmployeeIdByUser(userId, companyId) {
  const employee = await get('SELECT id FROM employees WHERE companyId = ? AND user_id = ?', [companyId, userId]);
  if (employee) return employee.id;

  const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const id = nanoid();
  await run(`INSERT INTO employees (id, companyId, user_id, employee_id, name, email, baseSalaryMonthly, deductionsMonthly, bonusesMonthly, createdAt, updatedAt, isActive)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, companyId, userId, user.employeeId || nanoid(), user.name || 'Employee', user.email, 0, 0, 0, new Date().toISOString(), new Date().toISOString(), 1]);
  return id;
}

router.get('/types', requireAuth, async (req, res) => {
  try {
    await ensureDb();
    const companyId = await getOrCreateCompany();
    const types = await ensureLeaveTypes(companyId);
    res.json({ success: true, data: types });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch leave types' });
  }
});

router.post('/apply', requireAuth, async (req, res) => {
  try {
    await ensureDb();
    const companyId = await getOrCreateCompany();
    const { leave_type_id, start_date, end_date, reason } = req.body || {};

    if (!leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({ success: false, message: 'Leave type, start date, end date and reason are required' });
    }

    const employeeId = await getEmployeeIdByUser(req.user.sub, companyId);
    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) return res.status(400).json({ success: false, message: 'End date must be after start date' });

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= 0) return res.status(400).json({ success: false, message: 'Invalid date range' });

    const leaveType = await get('SELECT * FROM leave_types WHERE id = ? AND is_active = 1', [leave_type_id]);
    if (!leaveType) return res.status(404).json({ success: false, message: 'Leave type not found' });

    const year = start.getFullYear();
    const balance = await get('SELECT * FROM leave_balances WHERE employeeId = ? AND leave_type_id = ? AND year = ?', [employeeId, leave_type_id, year]);

    if (balance && balance.remaining_days < totalDays) {
      return res.status(400).json({ success: false, message: `Insufficient leave balance. Available: ${balance.remaining_days} days` });
    }

    const existing = await all(
      `SELECT id FROM leave_requests WHERE companyId = ? AND employeeId = ? AND status IN ('Pending', 'Approved')
       AND ((startDate BETWEEN ? AND ?) OR (endDate BETWEEN ? AND ?) OR (? BETWEEN startDate AND endDate))`,
      [companyId, employeeId, start_date, end_date, start_date, end_date, start_date]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a leave request for this period' });
    }

    const leaveRequestId = nanoid();
    const now = new Date().toISOString();
    await run(
      `INSERT INTO leave_requests (id, companyId, employeeId, leave_type_id, leaveType, startDate, endDate, total_days, reason, status, managerId, hrId, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [leaveRequestId, companyId, employeeId, leave_type_id, leaveType.name, start_date, end_date, totalDays, reason, 'Pending', null, null, now]
    );

    if (balance) {
      await run('UPDATE leave_balances SET pending_days = pending_days + ? WHERE id = ?', [totalDays, balance.id]);
    } else {
      await run(`INSERT INTO leave_balances (id, companyId, employeeId, leave_type_id, total_days, used_days, pending_days, remaining_days, year, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [nanoid(), companyId, employeeId, leave_type_id, leaveType.days_per_year, 0, totalDays, leaveType.days_per_year, year, now, now]);
    }

    res.status(201).json({ success: true, data: { id: leaveRequestId }, message: 'Leave applied successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to apply for leave' });
  }
});

router.get('/my', requireAuth, async (req, res) => {
  try {
    await ensureDb();
    const companyId = await getOrCreateCompany();
    const employeeId = await getEmployeeIdByUser(req.user.sub, companyId);
    if (!employeeId) return res.json({ success: true, data: [] });

    const leaves = await all(
      `SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.companyId = ? AND lr.employeeId = ?
       ORDER BY lr.createdAt DESC`,
      [companyId, employeeId]
    );

    res.json({ success: true, data: leaves });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch leave requests' });
  }
});

router.get('/balance', requireAuth, async (req, res) => {
  try {
    await ensureDb();
    const companyId = await getOrCreateCompany();
    const employeeId = await getEmployeeIdByUser(req.user.sub, companyId);
    if (!employeeId) return res.json({ success: true, data: [] });

    const year = req.query.year || new Date().getFullYear();
    const balances = await all(
      `SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.days_per_year
       FROM leave_balances lb
       RIGHT JOIN leave_types lt ON lb.leave_type_id = lt.id AND lb.year = ?
       WHERE lt.companyId = ? AND lt.is_active = 1
       ORDER BY lt.name`,
      [year, companyId]
    );

    res.json({ success: true, data: balances });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch leave balance' });
  }
});

router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    await ensureDb();
    const companyId = await getOrCreateCompany();
    const { status } = req.query;
    let query = `SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code,
              e.name as employee_name, e.employee_id as emp_id
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       JOIN employees e ON lr.employeeId = e.id
       WHERE lr.companyId = ?`;
    const params = [companyId];
    if (status) {
      query += ' AND lr.status = ?';
      params.push(status);
    }
    query += ' ORDER BY lr.createdAt DESC';
    const leaves = await all(query, params);
    res.json({ success: true, data: leaves });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch leave requests' });
  }
});

router.put('/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    await ensureDb();
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const companyId = await getOrCreateCompany();

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (status === 'Rejected') {
      await run('UPDATE leave_requests SET status = ?, rejection_reason = ? WHERE id = ? AND companyId = ?', [status, rejection_reason || null, id, companyId]);
    } else {
      await run('UPDATE leave_requests SET status = ? WHERE id = ? AND companyId = ?', [status, id, companyId]);
    }
    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to update leave status' });
  }
});

router.put('/:id/approve', requireAuth, requireRole(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    await ensureDb();
    const { id } = req.params;
    const companyId = await getOrCreateCompany();
    const leave = await get('SELECT * FROM leave_requests WHERE id = ? AND companyId = ?', [id, companyId]);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'Pending') return res.status(400).json({ success: false, message: 'Leave request is already processed' });

    await run('UPDATE leave_requests SET status = ? WHERE id = ? AND companyId = ?', ['Approved', id, companyId]);
    res.json({ success: true, status: 'Approved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to approve leave' });
  }
});

router.put('/:id/reject', requireAuth, requireRole(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    await ensureDb();
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const companyId = await getOrCreateCompany();
    const leave = await get('SELECT * FROM leave_requests WHERE id = ? AND companyId = ?', [id, companyId]);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'Pending') return res.status(400).json({ success: false, message: 'Leave request is already processed' });

    await run('UPDATE leave_requests SET status = ?, rejection_reason = ? WHERE id = ? AND companyId = ?', ['Rejected', rejection_reason || null, id, companyId]);
    res.json({ success: true, status: 'Rejected' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to reject leave' });
  }
});

module.exports = router;
