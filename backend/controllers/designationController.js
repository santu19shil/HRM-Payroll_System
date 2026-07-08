const pool = require('../config/database');
const { success, created, badRequest, notFound, error } = require('../utils/response');
const { generateId } = require('../utils/helpers');

const getDesignations = async (req, res) => {
  try {
    const { department_id } = req.query;
    let query = `SELECT des.*, d.name as department_name,
                  (SELECT COUNT(*) FROM employees WHERE designation_id = des.id AND is_active = 1) as employee_count
                 FROM designations des
                 LEFT JOIN departments d ON des.department_id = d.id
                 WHERE des.is_active = 1`;
    const params = [];
    if (department_id) {
      query += ' AND des.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY des.title';
    
    const [designations] = await pool.query(query, params);
    return success(res, designations);
  } catch (err) {
    console.error('Get designations error:', err);
    return error(res, 'Failed to fetch designations');
  }
};

const getDesignationById = async (req, res) => {
  try {
    const { id } = req.params;
    const [designations] = await pool.query(
      `SELECT des.*, d.name as department_name 
       FROM designations des 
       LEFT JOIN departments d ON des.department_id = d.id 
       WHERE des.id = ?`,
      [id]
    );
    if (designations.length === 0) return notFound(res, 'Designation not found');
    return success(res, designations[0]);
  } catch (err) {
    console.error('Get designation error:', err);
    return error(res, 'Failed to fetch designation');
  }
};

const createDesignation = async (req, res) => {
  try {
    const { title, department_id, grade, min_salary, max_salary } = req.body;
    if (!title || !department_id) return badRequest(res, 'Title and department are required');

    const id = generateId();
    await pool.query(
      'INSERT INTO designations (id, title, department_id, grade, min_salary, max_salary) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, department_id, grade || null, min_salary || 0, max_salary || 0]
    );

    return created(res, { id, title }, 'Designation created successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Designation already exists in this department');
    console.error('Create designation error:', err);
    return error(res, 'Failed to create designation');
  }
};

const updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, department_id, grade, min_salary, max_salary } = req.body;

    const [existing] = await pool.query('SELECT id FROM designations WHERE id = ?', [id]);
    if (existing.length === 0) return notFound(res, 'Designation not found');

    await pool.query(
      'UPDATE designations SET title = COALESCE(?, title), department_id = COALESCE(?, department_id), grade = COALESCE(?, grade), min_salary = COALESCE(?, min_salary), max_salary = COALESCE(?, max_salary) WHERE id = ?',
      [title, department_id, grade, min_salary, max_salary, id]
    );

    return success(res, null, 'Designation updated successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Designation already exists in this department');
    console.error('Update designation error:', err);
    return error(res, 'Failed to update designation');
  }
};

const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const [employees] = await pool.query('SELECT COUNT(*) as count FROM employees WHERE designation_id = ? AND is_active = 1', [id]);
    if (employees[0].count > 0) {
      return badRequest(res, 'Cannot delete designation with active employees');
    }
    await pool.query('UPDATE designations SET is_active = 0 WHERE id = ?', [id]);
    return success(res, null, 'Designation deleted successfully');
  } catch (err) {
    console.error('Delete designation error:', err);
    return error(res, 'Failed to delete designation');
  }
};

module.exports = { getDesignations, getDesignationById, createDesignation, updateDesignation, deleteDesignation };