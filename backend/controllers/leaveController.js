const pool = require('../config/database');
const { success, created, badRequest, notFound, error, paginated } = require('../utils/response');
const { generateId, daysBetween, createNotification, getAdminUserIds } = require('../utils/helpers');

/**
 * Get leave types
 * GET /api/leaves/types
 */
const getLeaveTypes = async (req, res) => {
  try {
    const [types] = await pool.query('SELECT * FROM leave_types WHERE is_active = 1 ORDER BY name');
    return success(res, types);
  } catch (err) {
    console.error('Get leave types error:', err);
    return error(res, 'Failed to fetch leave types');
  }
};

/**
 * Apply for leave
 * POST /api/leaves/apply
 */
const applyLeave = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const userId = req.user.userId;
    const { leave_type_id, start_date, end_date, reason } = req.body;

    if (!leave_type_id || !start_date || !end_date || !reason) {
      return badRequest(res, 'Leave type, start date, end date and reason are required');
    }

    // Get employee
    const [employees] = await connection.query('SELECT id FROM employees WHERE user_id = ? AND is_active = 1', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');
    const employeeId = employees[0].id;

    // Validate dates
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) return badRequest(res, 'End date must be after start date');

    const totalDays = daysBetween(start_date, end_date);
    if (totalDays <= 0) return badRequest(res, 'Invalid date range');

    // Check leave balance
    const [leaveType] = await connection.query('SELECT * FROM leave_types WHERE id = ? AND is_active = 1', [leave_type_id]);
    if (leaveType.length === 0) return notFound(res, 'Leave type not found');

    const year = start.getFullYear();
    const [balance] = await connection.query(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [employeeId, leave_type_id, year]
    );

    if (balance.length > 0 && balance[0].remaining_days < totalDays) {
      return badRequest(res, `Insufficient leave balance. Available: ${balance[0].remaining_days} days`);
    }

    // Check for overlapping leaves
    const [overlapping] = await connection.query(
      `SELECT id FROM leave_requests 
       WHERE employee_id = ? AND status IN ('Pending', 'Approved')
       AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date))`,
      [employeeId, start_date, end_date, start_date, end_date, start_date]
    );

    if (overlapping.length > 0) {
      return badRequest(res, 'You already have a leave request for this period');
    }

    // Create leave request
    const leaveRequestId = generateId();
    await connection.query(
      'INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [leaveRequestId, employeeId, leave_type_id, start_date, end_date, totalDays, reason, 'Pending']
    );

    // Update pending days in balance
    if (balance.length > 0) {
      await connection.query(
        'UPDATE leave_balances SET pending_days = pending_days + ? WHERE id = ?',
        [totalDays, balance[0].id]
      );
    } else {
      // Create balance record if not exists
      await connection.query(
        'INSERT INTO leave_balances (id, employee_id, leave_type_id, total_days, used_days, pending_days, remaining_days, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId(), employeeId, leave_type_id, leaveType[0].days_per_year, 0, totalDays, leaveType[0].days_per_year, year]
      );
    }

    await connection.commit();

    // Notify admins about the new leave request
    try {
      const adminIds = await getAdminUserIds(connection);
      const [emp] = await connection.query('SELECT CONCAT(first_name, " ", last_name) as full_name FROM employees WHERE id = ?', [employeeId]);
      const empName = emp.length > 0 ? emp[0].full_name : 'An employee';
      for (const adminId of adminIds) {
        await createNotification(connection, {
          userId: adminId,
          title: 'New Leave Request',
          message: `${empName} applied for ${totalDays}-day leave (${start_date} to ${end_date})`,
          type: 'INFO',
          category: 'LEAVE',
          referenceType: 'LEAVE',
          referenceId: leaveRequestId
        });
      }
    } catch (notifyErr) {
      console.error('Notify admins leave error:', notifyErr);
    }

    return created(res, { id: leaveRequestId }, 'Leave applied successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Apply leave error:', err);
    return error(res, 'Failed to apply for leave');
  } finally {
    connection.release();
  }
};

/**
 * Get my leave requests
 * GET /api/leaves/my
 */
const getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const [leaves] = await pool.query(
      `SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.employee_id = ?
       ORDER BY lr.applied_at DESC`,
      [employees[0].id]
    );

    return success(res, leaves);
  } catch (err) {
    console.error('Get my leaves error:', err);
    return error(res, 'Failed to fetch leave requests');
  }
};

/**
 * Get my leave balance
 * GET /api/leaves/balance
 */
const getMyLeaveBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const year = req.query.year || new Date().getFullYear();
    const [balances] = await pool.query(
      `SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.days_per_year
       FROM leave_balances lb
       RIGHT JOIN leave_types lt ON lb.leave_type_id = lt.id AND lb.year = ?
       WHERE lt.is_active = 1
       ORDER BY lt.name`,
      [year]
    );

    return success(res, balances);
  } catch (err) {
    console.error('Get leave balance error:', err);
    return error(res, 'Failed to fetch leave balance');
  }
};

/**
 * Get all leave requests (HR/Manager view)
 * GET /api/leaves
 */
const getAllLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status, department_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) { whereClause += ' AND lr.status = ?'; params.push(status); }
    if (department_id) { whereClause += ' AND e.department_id = ?'; params.push(department_id); }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id ${whereClause}`, params
    );
    const total = countResult[0].total;

    const [leaves] = await pool.query(
      `SELECT lr.*, 
              lt.name as leave_type_name, lt.code as leave_type_code,
              CONCAT(e.first_name, ' ', e.last_name) as employee_name,
              e.employee_id as emp_id,
              d.name as department_name,
              CONCAT(apr.first_name, ' ', apr.last_name) as approved_by_name
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       JOIN employees e ON lr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN employees apr ON lr.approved_by = apr.user_id
       ${whereClause}
       ORDER BY lr.applied_at DESC
       LIMIT ? OFFSET ?`,
       [...params, limit, offset]
    );

    return paginated(res, leaves, total, page, limit);
  } catch (err) {
    console.error('Get all leaves error:', err);
    return error(res, 'Failed to fetch leave requests');
  }
};

/**
 * Approve leave request (HR/Manager)
 * PUT /api/leaves/:id/approve
 */
const approveLeave = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const userId = req.user.userId;

    const [leaves] = await connection.query('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (leaves.length === 0) return notFound(res, 'Leave request not found');
    if (leaves[0].status !== 'Pending') return badRequest(res, 'Leave request is already processed');

    await connection.query(
      'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['Approved', userId, id]
    );

    // Update leave balance
    const leave = leaves[0];
    const year = new Date(leave.start_date).getFullYear();
    const [balance] = await connection.query(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [leave.employee_id, leave.leave_type_id, year]
    );

    if (balance.length > 0) {
      await connection.query(
        'UPDATE leave_balances SET used_days = used_days + ?, pending_days = pending_days - ?, remaining_days = remaining_days - ? WHERE id = ?',
        [leave.total_days, leave.total_days, leave.total_days, balance[0].id]
      );
    }

    // Mark attendance as On Leave
    const currentDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const [existingAtt] = await connection.query(
        'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
        [leave.employee_id, dateStr]
      );

      if (existingAtt.length === 0) {
        await connection.query(
          'INSERT INTO attendance (id, employee_id, date, status) VALUES (?, ?, ?, ?)',
          [generateId(), leave.employee_id, dateStr, 'On Leave']
        );
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Notify employee
    const [empUsers] = await connection.query('SELECT user_id FROM employees WHERE id = ?', [leave.employee_id]);
    if (empUsers.length > 0 && empUsers[0].user_id) {
      await createNotification(connection, {
        userId: empUsers[0].user_id,
        title: 'Leave Request Approved',
        message: `Your ${leave.total_days}-day leave request (${leave.start_date} to ${leave.end_date}) has been approved.`,
        type: 'SUCCESS',
        category: 'LEAVE',
        referenceType: 'LEAVE',
        referenceId: id
      });
    }

    await connection.commit();
    return success(res, null, 'Leave approved successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Approve leave error:', err);
    return error(res, 'Failed to approve leave');
  } finally {
    connection.release();
  }
};

/**
 * Reject leave request (HR/Manager)
 * PUT /api/leaves/:id/reject
 */
const rejectLeave = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.user.userId;

    const [leaves] = await connection.query('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (leaves.length === 0) return notFound(res, 'Leave request not found');
    if (leaves[0].status !== 'Pending') return badRequest(res, 'Leave request is already processed');

    await connection.query(
      'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?',
      ['Rejected', userId, rejection_reason || null, id]
    );

    // Revert pending days
    const leave = leaves[0];
    const year = new Date(leave.start_date).getFullYear();
    await connection.query(
      'UPDATE leave_balances SET pending_days = pending_days - ? WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [leave.total_days, leave.employee_id, leave.leave_type_id, year]
    );

    // Notify employee
    const [empUsers] = await connection.query('SELECT user_id FROM employees WHERE id = ?', [leave.employee_id]);
    if (empUsers.length > 0 && empUsers[0].user_id) {
      await createNotification(connection, {
        userId: empUsers[0].user_id,
        title: 'Leave Request Rejected',
        message: rejection_reason
          ? `Your leave request (${leave.start_date} to ${leave.end_date}) was rejected. Reason: ${rejection_reason}`
          : `Your leave request (${leave.start_date} to ${leave.end_date}) was rejected.`,
        type: 'ERROR',
        category: 'LEAVE',
        referenceType: 'LEAVE',
        referenceId: id
      });
    }

    await connection.commit();
    return success(res, null, 'Leave rejected successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Reject leave error:', err);
    return error(res, 'Failed to reject leave');
  } finally {
    connection.release();
  }
};

module.exports = {
  getLeaveTypes,
  applyLeave,
  getMyLeaves,
  getMyLeaveBalance,
  getAllLeaves,
  approveLeave,
  rejectLeave
};