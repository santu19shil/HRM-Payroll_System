const pool = require('../config/database');
const { success, created, badRequest, notFound, error, paginated } = require('../utils/response');
const { generateId } = require('../utils/helpers');

const getDepartments = async (req, res) => {
  try {
    const [departments] = await pool.query(
      `SELECT d.*, 
              CONCAT(e.first_name, ' ', e.last_name) as head_name,
              (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND is_active = 1) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.head_id = e.id
       WHERE d.is_active = 1
       ORDER BY d.name`
    );
    return success(res, departments);
  } catch (err) {
    console.error('Get departments error:', err);
    return error(res, 'Failed to fetch departments');
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [departments] = await pool.query(
      `SELECT d.*, 
              CONCAT(e.first_name, ' ', e.last_name) as head_name,
              (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND is_active = 1) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.head_id = e.id
       WHERE d.id = ?`,
      [id]
    );
    if (departments.length === 0) return notFound(res, 'Department not found');
    return success(res, departments[0]);
  } catch (err) {
    console.error('Get department error:', err);
    return error(res, 'Failed to fetch department');
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description, head_id } = req.body;
    if (!name) return badRequest(res, 'Department name is required');

    const id = generateId();
    await pool.query(
      'INSERT INTO departments (id, name, description, head_id) VALUES (?, ?, ?, ?)',
      [id, name, description || null, head_id || null]
    );

    return created(res, { id, name }, 'Department created successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Department name already exists');
    console.error('Create department error:', err);
    return error(res, 'Failed to create department');
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, head_id } = req.body;

    const [existing] = await pool.query('SELECT id FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) return notFound(res, 'Department not found');

    await pool.query(
      'UPDATE departments SET name = COALESCE(?, name), description = COALESCE(?, description), head_id = ? WHERE id = ?',
      [name || null, description || null, head_id || null, id]
    );

    return success(res, null, 'Department updated successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Department name already exists');
    console.error('Update department error:', err);
    return error(res, 'Failed to update department');
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if department has employees
    const [employees] = await pool.query('SELECT COUNT(*) as count FROM employees WHERE department_id = ? AND is_active = 1', [id]);
    if (employees[0].count > 0) {
      return badRequest(res, 'Cannot delete department with active employees. Please reassign employees first.');
    }

    await pool.query('UPDATE departments SET is_active = 0 WHERE id = ?', [id]);
    return success(res, null, 'Department deleted successfully');
  } catch (err) {
    console.error('Delete department error:', err);
    return error(res, 'Failed to delete department');
  }
};

module.exports = { getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment };