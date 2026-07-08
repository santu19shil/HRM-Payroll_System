const pool = require('../config/database');
const { success, created, badRequest, notFound, error, paginated } = require('../utils/response');
const { generateId, isWithinRadius, calculateWorkingHours, calculateLateMinutes, getCurrentDate, daysBetween } = require('../utils/helpers');

/**
 * Get office locations for geofence check
 */
const getOfficeLocations = async (req, res) => {
  try {
    const [offices] = await pool.query('SELECT * FROM office_locations WHERE is_active = 1');
    return success(res, offices);
  } catch (err) {
    console.error('Get office locations error:', err);
    return error(res, 'Failed to fetch office locations');
  }
};

/**
 * Check In
 * POST /api/attendance/check-in
 */
const checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude } = req.body;

    // Get employee record
    const [employees] = await pool.query('SELECT id, employee_id FROM employees WHERE user_id = ? AND is_active = 1', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee record not found');
    const employee = employees[0];

    const today = getCurrentDate();
    const now = new Date();

    // Check if already checked in today
    const [existing] = await pool.query(
      'SELECT id, status, check_in_time FROM attendance WHERE employee_id = ? AND date = ?',
      [employee.id, today]
    );

    if (existing.length > 0 && existing[0].check_in_time) {
      return badRequest(res, 'You have already checked in today');
    }

    // Get office location for geofence
    const [offices] = await pool.query('SELECT * FROM office_locations WHERE is_active = 1 LIMIT 1');
    if (offices.length > 0) {
      const office = offices[0];
      if (latitude && longitude) {
        const withinRadius = isWithinRadius(
          parseFloat(latitude), parseFloat(longitude),
          parseFloat(office.latitude), parseFloat(office.longitude),
          office.radius
        );
        if (!withinRadius) {
          return badRequest(res, 'You are outside the office premises. Please check in from the office location.');
        }
      }
    }

    // Get office start time from settings
    const [settings] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'office_start_time'");
    const officeStartTime = settings.length > 0 ? settings[0].setting_value : '09:30';
    const lateGraceMinutes = 30; // Grace period

    // Calculate late minutes
    const lateMinutes = calculateLateMinutes(now.toISOString(), officeStartTime);
    const status = lateMinutes > lateGraceMinutes ? 'Late' : 'Present';

    // Create or update attendance
    if (existing.length > 0) {
      await pool.query(
        'UPDATE attendance SET check_in_time = ?, check_in_latitude = ?, check_in_longitude = ?, status = ?, late_minutes = ? WHERE id = ?',
        [now, latitude || null, longitude || null, status, lateMinutes, existing[0].id]
      );
    } else {
      const attendanceId = generateId();
      await pool.query(
        'INSERT INTO attendance (id, employee_id, date, check_in_time, check_in_latitude, check_in_longitude, status, late_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [attendanceId, employee.id, today, now, latitude || null, longitude || null, status, lateMinutes]
      );
    }

    // Log attendance event
    const logId = generateId();
    await pool.query(
      'INSERT INTO attendance_logs (id, employee_id, event_type, timestamp, latitude, longitude, ip_address, device_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [logId, employee.id, 'CHECK_IN', now, latitude || null, longitude || null, req.ip || null, req.headers['user-agent'] || null]
    );

    return success(res, {
      date: today,
      check_in_time: now,
      status,
      late_minutes: lateMinutes
    }, 'Check-in successful');
  } catch (err) {
    console.error('Check-in error:', err);
    return error(res, 'Failed to check in');
  }
};

/**
 * Check Out
 * POST /api/attendance/check-out
 */
const checkOut = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude } = req.body;

    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ? AND is_active = 1', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee record not found');
    const employee = employees[0];

    const today = getCurrentDate();
    const now = new Date();

    // Check attendance record
    const [attendanceRecords] = await pool.query(
      'SELECT id, check_in_time, check_out_time FROM attendance WHERE employee_id = ? AND date = ?',
      [employee.id, today]
    );

    if (attendanceRecords.length === 0) {
      return badRequest(res, 'You have not checked in today');
    }

    const attendance = attendanceRecords[0];
    if (attendance.check_out_time) {
      return badRequest(res, 'You have already checked out today');
    }

    // Validate check-out time (must be after 6:00 PM)
    const checkOutHour = now.getHours();
    const checkOutMinutes = now.getMinutes();
    if (checkOutHour < 18) {
      return badRequest(res, 'Check-out is only allowed after 6:00 PM');
    }

    // Get office location for geofence
    const [offices] = await pool.query('SELECT * FROM office_locations WHERE is_active = 1 LIMIT 1');
    if (offices.length > 0) {
      const office = offices[0];
      if (latitude && longitude) {
        const withinRadius = isWithinRadius(
          parseFloat(latitude), parseFloat(longitude),
          parseFloat(office.latitude), parseFloat(office.longitude),
          office.radius
        );
        if (!withinRadius) {
          return badRequest(res, 'You are outside the office premises. Please check out from the office location.');
        }
      }
    }

    // Calculate working hours
    const workingHours = calculateWorkingHours(attendance.check_in_time, now);

    await pool.query(
      'UPDATE attendance SET check_out_time = ?, check_out_latitude = ?, check_out_longitude = ?, working_hours = ? WHERE id = ?',
      [now, latitude || null, longitude || null, workingHours, attendance.id]
    );

    // Log attendance event
    const logId = generateId();
    await pool.query(
      'INSERT INTO attendance_logs (id, employee_id, attendance_id, event_type, timestamp, latitude, longitude, ip_address, device_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [logId, employee.id, attendance.id, 'CHECK_OUT', now, latitude || null, longitude || null, req.ip || null, req.headers['user-agent'] || null]
    );

    return success(res, {
      date: today,
      check_out_time: now,
      working_hours: workingHours
    }, 'Check-out successful');
  } catch (err) {
    console.error('Check-out error:', err);
    return error(res, 'Failed to check out');
  }
};

/**
 * Get today's attendance
 * GET /api/attendance/today
 */
const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const today = getCurrentDate();
    const [attendance] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employees[0].id, today]
    );

    return success(res, attendance.length > 0 ? attendance[0] : null);
  } catch (err) {
    console.error('Get today attendance error:', err);
    return error(res, 'Failed to fetch today attendance');
  }
};

/**
 * Get attendance history
 * GET /api/attendance/history
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    const month = req.query.month;
    const year = req.query.year || new Date().getFullYear();

    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    let whereClause = 'WHERE employee_id = ?';
    const params = [employees[0].id];

    if (month) {
      whereClause += ' AND MONTH(date) = ?';
      params.push(month);
    }
    whereClause += ' AND YEAR(date) = ?';
    params.push(year);

    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM attendance ${whereClause}`, params);
    const total = countResult[0].total;

    const [records] = await pool.query(
      `SELECT * FROM attendance ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    return paginated(res, records, total, page, limit);
  } catch (err) {
    console.error('Get attendance history error:', err);
    return error(res, 'Failed to fetch attendance history');
  }
};

/**
 * Get attendance summary (for dashboard)
 * GET /api/attendance/summary
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const employeeId = employees[0].id;
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1);

    const [summary] = await pool.query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) as leave_days,
        SUM(CASE WHEN status = 'Missing Check Out' THEN 1 ELSE 0 END) as missing_checkout_days,
        COALESCE(SUM(working_hours), 0) as total_working_hours,
        COALESCE(AVG(working_hours), 0) as avg_working_hours
       FROM attendance 
       WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?`,
      [employeeId, year, month]
    );

    return success(res, summary[0]);
  } catch (err) {
    console.error('Get attendance summary error:', err);
    return error(res, 'Failed to fetch attendance summary');
  }
};

/**
 * Get all attendance (HR view)
 * GET /api/attendance
 */
const getAllAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { date, employee_id, status, department_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (date) { whereClause += ' AND a.date = ?'; params.push(date); }
    if (employee_id) { whereClause += ' AND a.employee_id = ?'; params.push(employee_id); }
    if (status) { whereClause += ' AND a.status = ?'; params.push(status); }
    if (department_id) { whereClause += ' AND e.department_id = ?'; params.push(department_id); }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM attendance a JOIN employees e ON a.employee_id = e.id ${whereClause}`, params
    );
    const total = countResult[0].total;

    const [records] = await pool.query(
      `SELECT a.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.employee_id as emp_id, d.name as department_name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereClause}
       ORDER BY a.date DESC, a.check_in_time DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    return paginated(res, records, total, page, limit);
  } catch (err) {
    console.error('Get all attendance error:', err);
    return error(res, 'Failed to fetch attendance records');
  }
};

/**
 * Correct attendance (HR only)
 * PUT /api/attendance/:id/correct
 */
const correctAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, check_in_time, check_out_time, notes } = req.body;

    const [existing] = await pool.query('SELECT id FROM attendance WHERE id = ?', [id]);
    if (existing.length === 0) return notFound(res, 'Attendance record not found');

    const workingHours = check_in_time && check_out_time ? calculateWorkingHours(check_in_time, check_out_time) : undefined;

    await pool.query(
      'UPDATE attendance SET status = COALESCE(?, status), check_in_time = COALESCE(?, check_in_time), check_out_time = COALESCE(?, check_out_time), working_hours = COALESCE(?, working_hours), notes = COALESCE(?, notes) WHERE id = ?',
      [status, check_in_time, check_out_time, workingHours, notes, id]
    );

    return success(res, null, 'Attendance corrected successfully');
  } catch (err) {
    console.error('Correct attendance error:', err);
    return error(res, 'Failed to correct attendance');
  }
};

module.exports = {
  getOfficeLocations,
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceSummary,
  getAllAttendance,
  correctAttendance
};