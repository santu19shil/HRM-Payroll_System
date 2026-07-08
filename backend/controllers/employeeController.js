const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { success, created, badRequest, notFound, error, paginated } = require('../utils/response');
const { generateId, generateEmployeeId, generateTempPassword, isValidEmail } = require('../utils/helpers');
const { sendWelcomeEmail } = require('../config/email');

const SALT_ROUNDS = 12;

/**
 * Get employees with pagination and filters
 * GET /api/employees
 */
const getEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const departmentId = req.query.department_id || '';
    const status = req.query.status || '';
    const designationId = req.query.designation_id || '';

    let whereClause = 'WHERE e.is_active = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ? OR e.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (departmentId) {
      whereClause += ' AND e.department_id = ?';
      params.push(departmentId);
    }

    if (designationId) {
      whereClause += ' AND e.designation_id = ?';
      params.push(designationId);
    }

    if (status) {
      whereClause += status === 'active' ? ' AND e.is_active = 1' : ' AND e.is_active = 0';
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get employees with joins
    const [employees] = await pool.query(
      `SELECT e.*, 
              d.name as department_name, 
              des.title as designation_title,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN employees m ON e.reporting_manager_id = m.id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    return paginated(res, employees, total, page, limit);
  } catch (err) {
    console.error('Get employees error:', err);
    return error(res, 'Failed to fetch employees');
  }
};

/**
 * Get employee by ID
 * GET /api/employees/:id
 */
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [employees] = await pool.query(
      `SELECT e.*, 
              d.name as department_name, d.description as department_description,
              des.title as designation_title, des.grade as designation_grade,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name,
              u.email as user_email, u.is_temp_password, u.must_change_password, u.is_active as user_active
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN employees m ON e.reporting_manager_id = m.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [id]
    );

    if (!employees || employees.length === 0) {
      return notFound(res, 'Employee not found');
    }

    return success(res, employees[0]);
  } catch (err) {
    console.error('Get employee error:', err);
    return error(res, 'Failed to fetch employee');
  }
};

/**
 * Create employee (HR only)
 * POST /api/employees
 */
const createEmployee = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      first_name, last_name, email, phone, gender, date_of_birth,
      address, city, state, postal_code, country,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      department_id, designation_id, reporting_manager_id,
      joining_date, employment_type, work_location,
      bank_account_name, bank_account_number, bank_name, bank_ifsc, bank_branch,
      pan_number, aadhar_number, uan_number, pf_number,
      basic_salary
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return badRequest(res, 'First name, last name and email are required');
    }

    // Validate email
    if (!isValidEmail(email)) {
      return badRequest(res, 'Invalid email format');
    }

    // Check if email already exists
    const [existing] = await connection.query(
      'SELECT id FROM employees WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return badRequest(res, 'An employee with this email already exists');
    }

    // Generate employee ID
    const [counter] = await connection.query(
      "SELECT MAX(CAST(SUBSTRING(employee_id, 4) AS UNSIGNED)) as max_id FROM employees"
    );
    const nextCounter = (counter[0].max_id || 0) + 1;
    const employeeId = generateEmployeeId(nextCounter);

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    // Create user account
    const userId = generateId();
    const [roleResult] = await connection.query(
      'SELECT id FROM roles WHERE name = ?',
      ['EMPLOYEE']
    );
    const roleId = roleResult[0]?.id || 'role_employee';

    await connection.query(
      `INSERT INTO users (id, employee_id, email, password_hash, role_id, is_temp_password, must_change_password, is_active)
       VALUES (?, ?, ?, ?, ?, 1, 1, 1)`,
      [userId, employeeId, email, passwordHash, roleId]
    );

    // Create employee record
    const employeeRecordId = generateId();
    await connection.query(
      `INSERT INTO employees (
        id, employee_id, user_id, first_name, last_name, email, phone, gender, date_of_birth,
        address, city, state, postal_code, country,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        department_id, designation_id, reporting_manager_id,
        joining_date, employment_type, work_location,
        bank_account_name, bank_account_number, bank_name, bank_ifsc, bank_branch,
        pan_number, aadhar_number, uan_number, pf_number,
        created_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        employeeRecordId, employeeId, userId,
        first_name, last_name, email, phone || null, gender || null, date_of_birth || null,
        address || null, city || null, state || null, postal_code || null, country || 'India',
        emergency_contact_name || null, emergency_contact_phone || null, emergency_contact_relation || null,
        department_id || null, designation_id || null, reporting_manager_id || null,
        joining_date || null, employment_type || 'Full-Time', work_location || null,
        bank_account_name || null, bank_account_number || null, bank_name || null, bank_ifsc || null, bank_branch || null,
        pan_number || null, aadhar_number || null, uan_number || null, pf_number || null,
        req.user.userId || null
      ]
    );

    // If basic salary provided, create salary structure
    if (basic_salary && parseFloat(basic_salary) > 0) {
      const salaryStructureId = generateId();
      await connection.query(
        `INSERT INTO salary_structures (id, employee_id, effective_from, basic_salary, total_earnings, total_deductions, net_salary, is_active, created_by)
         VALUES (?, ?, CURDATE(), ?, 0, 0, ?, 1, ?)`,
        [salaryStructureId, employeeRecordId, basic_salary, basic_salary, req.user.userId || null]
      );
    }

    await connection.commit();

    // Send welcome email (non-blocking)
    sendWelcomeEmail({
      email,
      employeeId,
      tempPassword,
      name: `${first_name} ${last_name}`
    }).catch(err => console.error('Welcome email send failed:', err));

    return created(res, {
      id: employeeRecordId,
      employee_id: employeeId,
      user_id: userId,
      temp_password: tempPassword // Only returned once on creation
    }, 'Employee created successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Create employee error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return badRequest(res, 'An employee with this email or employee ID already exists');
    }
    return error(res, 'Failed to create employee');
  } finally {
    connection.release();
  }
};

/**
 * Update employee
 * PUT /api/employees/:id
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check employee exists
    const [existing] = await pool.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return notFound(res, 'Employee not found');
    }

    // Build update query dynamically
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'gender', 'date_of_birth',
      'address', 'city', 'state', 'postal_code', 'country',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      'department_id', 'designation_id', 'reporting_manager_id',
      'joining_date', 'employment_type', 'work_location',
      'bank_account_name', 'bank_account_number', 'bank_name', 'bank_ifsc', 'bank_branch',
      'pan_number', 'aadhar_number', 'uan_number', 'pf_number'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      return badRequest(res, 'No fields to update');
    }

    params.push(id);

    await pool.query(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // If updating email, also update users table
    if (updateData.email) {
      await pool.query(
        'UPDATE users SET email = ? WHERE id = (SELECT user_id FROM employees WHERE id = ?)',
        [updateData.email, id]
      );
    }

    return success(res, null, 'Employee updated successfully');
  } catch (err) {
    console.error('Update employee error:', err);
    return error(res, 'Failed to update employee');
  }
};

/**
 * Deactivate employee (soft delete)
 * DELETE /api/employees/:id
 */
const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, user_id FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return notFound(res, 'Employee not found');
    }

    // Soft delete employee and deactivate user
    await pool.query('UPDATE employees SET is_active = 0 WHERE id = ?', [id]);
    
    if (existing[0].user_id) {
      await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [existing[0].user_id]);
    }

    return success(res, null, 'Employee deactivated successfully');
  } catch (err) {
    console.error('Deactivate employee error:', err);
    return error(res, 'Failed to deactivate employee');
  }
};

/**
 * Get employee profile (self-service)
 * GET /api/employees/profile
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [employees] = await pool.query(
      `SELECT e.*, 
              d.name as department_name,
              des.title as designation_title,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN employees m ON e.reporting_manager_id = m.id
       WHERE e.user_id = ?`,
      [userId]
    );

    if (!employees || employees.length === 0) {
      return notFound(res, 'Employee profile not found');
    }

    return success(res, employees[0]);
  } catch (err) {
    console.error('Get my profile error:', err);
    return error(res, 'Failed to fetch profile');
  }
};

/**
 * Update my profile (self-service - limited fields)
 * PUT /api/employees/profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) {
      return notFound(res, 'Employee profile not found');
    }

    const employeeId = employees[0].id;
    const { phone, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relation } = req.body;

    await pool.query(
      `UPDATE employees SET 
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        emergency_contact_relation = COALESCE(?, emergency_contact_relation)
       WHERE id = ?`,
      [phone, address, city, state, postal_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, employeeId]
    );

    return success(res, null, 'Profile updated successfully');
  } catch (err) {
    console.error('Update my profile error:', err);
    return error(res, 'Failed to update profile');
  }
};

/**
 * Upload profile picture
 * POST /api/employees/profile/picture
 */
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return badRequest(res, 'Profile picture is required');
    }

    const userId = req.user.userId;
    const filePath = `/uploads/profiles/${req.file.filename}`;

    await pool.query(
      'UPDATE employees SET profile_picture = ? WHERE user_id = ?',
      [filePath, userId]
    );

    return success(res, { profile_picture: filePath }, 'Profile picture updated');
  } catch (err) {
    console.error('Upload profile picture error:', err);
    return error(res, 'Failed to upload profile picture');
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture
};