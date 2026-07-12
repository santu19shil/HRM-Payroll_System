const express = require('express');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const { init, run, get, all } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateTempPassword } = require('../utils/helpers');

const router = express.Router();
const SALT_ROUNDS = 12;

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

async function ensureRoles(companyId) {
  const existing = await all('SELECT * FROM roles WHERE companyId = ?', [companyId]);
  if (existing.length > 0) return;

  await run('INSERT INTO roles (id, companyId, name, description) VALUES (?,?,?,?)', [nanoid(), companyId, 'SUPER_ADMIN', 'Full system access']);
  await run('INSERT INTO roles (id, companyId, name, description) VALUES (?,?,?,?)', [nanoid(), companyId, 'EMPLOYEE', 'Employee']);
}

async function ensureSuperAdmin(companyId) {
  const admin = await get('SELECT * FROM users WHERE employeeId = ?', ['ADMIN001']);
  if (!admin) {
    await run(
      `INSERT INTO users (id, companyId, email, name, employeeId, role, passwordHash, tempPassword, isFirstLogin, isActive, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ['user_admin', companyId, 'admin@hrpayroll.com', 'Super Admin', 'ADMIN001', 'SUPER_ADMIN', 'Admin@123', 'Admin@123', 0, 1, new Date().toISOString()]
    );
  }
  return companyId;
}

async function seedDatabase() {
  await ensureDb();
  const companyId = await getOrCreateCompany();
  await ensureRoles(companyId);
  await ensureSuperAdmin(companyId);
  return companyId;
}

// GET /api/employees
router.get('/', requireAuth, async (req, res) => {
  try {
    await seedDatabase();
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `SELECT e.*, u.tempPassword, u.isFirstLogin FROM employees e
                 LEFT JOIN users u ON e.user_id = u.id
                 WHERE e.companyId = ? AND u.role != 'SUPER_ADMIN'`;
    const params = [companyId];

    if (search) {
      query += ' AND (e.name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace('SELECT e.*, u.tempPassword, u.isFirstLogin', 'SELECT COUNT(*) as total');
    const countResult = await all(countQuery, params);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    query += ' ORDER BY e.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const rows = await all(query, params);

    res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch employees' });
  }
});

// GET /api/employees/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    await seedDatabase();
    const employee = await get(
      `SELECT e.*,
              d.name AS department_name,
              des.title AS designation_title
       FROM employees e
       LEFT JOIN departments d ON e.departmentId = d.id
       LEFT JOIN designations des ON e.designationId = des.id
       WHERE e.companyId = ? AND e.user_id = ?`,
      [req.user.companyId, req.user.sub]
    );
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }
    res.json({ success: true, data: employee });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch profile' });
  }
});

// GET /api/employees/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    await seedDatabase();
    const employee = await get('SELECT * FROM employees WHERE id = ? AND companyId = ?', [req.params.id, req.user.companyId]);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch employee' });
  }
});

function buildEmployeePayload(body) {
  const name = [body.first_name, body.last_name].filter(Boolean).join(' ').trim() || body.name || '';
  const department = body.department || '';
  const departmentId = body.department_id || null;
  const designationId = body.designation_id || null;

  return {
    name,
    email: body.email || '',
    phone: body.phone || '',
    gender: body.gender || '',
    dob: body.date_of_birth || body.dob || '',
    address: body.address || '',
    city: body.city || '',
    state: body.state || '',
    postalCode: body.postal_code || '',
    emergencyContactName: body.emergency_contact_name || '',
    emergencyContactPhone: body.emergency_contact_phone || '',
    emergencyContactRelation: body.emergency_contact_relation || '',
    departmentId,
    designationId,
    department,
    joiningDate: body.joining_date || body.joingDate || '',
    employmentType: body.employment_type || body.employmentType || 'Full-Time',
    workLocation: body.work_location || body.workLocation || '',
    bankDetailsJson: JSON.stringify({
      accountName: body.bank_account_name || '',
      accountNumber: body.bank_account_number || '',
      bankName: body.bank_name || '',
      ifsc: body.bank_ifsc || '',
      branch: body.bank_branch || ''
    }),
    panNumber: body.pan_number || '',
    aadharNumber: body.aadhar_number || '',
    baseSalaryMonthly: Number(body.base_salary || body.basic_salary || body.baseSalaryMonthly || 0),
    deductionsMonthly: Number(body.deductionsMonthly || 0),
    bonusesMonthly: Number(body.bonusesMonthly || 0)
  };
}

// POST /api/employees
router.post('/', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await seedDatabase();
    const companyId = req.user.companyId;
    const payload = buildEmployeePayload(req.body || {});

    if (!payload.name || !payload.email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await all('SELECT id FROM employees WHERE companyId = ? AND email = ?', [companyId, payload.email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An employee with this email already exists' });
    }

    const counter = await all("SELECT MAX(CAST(SUBSTRING(employee_id, 4) AS INTEGER)) as max_id FROM employees WHERE companyId = ?", [companyId]);
    const nextCounter = (counter[0]?.max_id || 0) + 1;
    const employeeId = `EMP${String(nextCounter).padStart(3, '0')}`;

    const tempPassword = generateTempPassword ? generateTempPassword() : nanoid(8);
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const userId = nanoid();
    const now = new Date().toISOString();
    await run(
      `INSERT INTO users (id, companyId, email, name, employeeId, role, passwordHash, tempPassword, isFirstLogin, isActive, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [userId, companyId, payload.email, payload.name, employeeId, 'EMPLOYEE', passwordHash, tempPassword, 1, 1, now]
    );

    const employeeRecordId = nanoid();
    await run(
      `INSERT INTO employees (id, companyId, user_id, employee_id, name, email, departmentId, designationId, department, baseSalaryMonthly, deductionsMonthly, bonusesMonthly, contactNumber, dob, gender, address, joiningDate, employmentType, workLocation, bankDetailsJson, emergencyContactName, emergencyContactPhone, emergencyContactRelation, panNumber, aadharNumber, isActive, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [employeeRecordId, companyId, userId, employeeId, payload.name, payload.email, payload.departmentId, payload.designationId, payload.department, payload.baseSalaryMonthly, payload.deductionsMonthly, payload.bonusesMonthly, payload.phone, payload.dob, payload.gender, payload.address, payload.joiningDate, payload.employmentType, payload.workLocation, payload.bankDetailsJson, payload.emergencyContactName, payload.emergencyContactPhone, payload.emergencyContactRelation, payload.panNumber, payload.aadharNumber, 1, now, now]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: employeeRecordId,
        employeeId,
        userId,
        temp_password: tempPassword
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to create employee' });
  }
});

// PUT /api/employees/:id
router.put('/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await seedDatabase();
    const { id } = req.params;
    const payload = buildEmployeePayload(req.body || {});

    const existing = await all('SELECT * FROM employees WHERE id = ? AND companyId = ?', [id, req.user.companyId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const updates = [];
    const params = [];
    if (payload.name !== undefined) { updates.push('name = ?'); params.push(payload.name); }
    if (payload.email !== undefined) { updates.push('email = ?'); params.push(payload.email); }
    if (payload.departmentId !== undefined) { updates.push('departmentId = ?'); params.push(payload.departmentId); }
    if (payload.designationId !== undefined) { updates.push('designationId = ?'); params.push(payload.designationId); }
    if (payload.department !== undefined) { updates.push('department = ?'); params.push(payload.department); }
    if (payload.baseSalaryMonthly !== undefined) { updates.push('baseSalaryMonthly = ?'); params.push(payload.baseSalaryMonthly); }
    if (payload.deductionsMonthly !== undefined) { updates.push('deductionsMonthly = ?'); params.push(payload.deductionsMonthly); }
    if (payload.bonusesMonthly !== undefined) { updates.push('bonusesMonthly = ?'); params.push(payload.bonusesMonthly); }
    if (payload.phone !== undefined) { updates.push('contactNumber = ?'); params.push(payload.phone); }
    if (payload.dob !== undefined) { updates.push('dob = ?'); params.push(payload.dob); }
    if (payload.gender !== undefined) { updates.push('gender = ?'); params.push(payload.gender); }
    if (payload.address !== undefined) { updates.push('address = ?'); params.push(payload.address); }
    if (payload.joiningDate !== undefined) { updates.push('joiningDate = ?'); params.push(payload.joiningDate); }
    if (payload.employmentType !== undefined) { updates.push('employmentType = ?'); params.push(payload.employmentType); }
    if (payload.workLocation !== undefined) { updates.push('workLocation = ?'); params.push(payload.workLocation); }
    if (payload.bankDetailsJson !== undefined) { updates.push('bankDetailsJson = ?'); params.push(payload.bankDetailsJson); }
    if (payload.emergencyContactName !== undefined) { updates.push('emergencyContactName = ?'); params.push(payload.emergencyContactName); }
    if (payload.emergencyContactPhone !== undefined) { updates.push('emergencyContactPhone = ?'); params.push(payload.emergencyContactPhone); }
    if (payload.emergencyContactRelation !== undefined) { updates.push('emergencyContactRelation = ?'); params.push(payload.emergencyContactRelation); }
    if (payload.panNumber !== undefined) { updates.push('panNumber = ?'); params.push(payload.panNumber); }
    if (payload.aadharNumber !== undefined) { updates.push('aadharNumber = ?'); params.push(payload.aadharNumber); }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(id);
    params.push(req.user.companyId);

    await run(`UPDATE employees SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`, params);
    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await seedDatabase();
    const existing = await all('SELECT * FROM employees WHERE id = ? AND companyId = ?', [req.params.id, req.user.companyId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await run('DELETE FROM employees WHERE id = ? AND companyId = ?', [req.params.id, req.user.companyId]);
    await run('DELETE FROM users WHERE companyId = ? AND role = ? AND name = ?', [req.user.companyId, 'EMPLOYEE', existing[0].name]);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to delete employee' });
  }
});

module.exports = router;
