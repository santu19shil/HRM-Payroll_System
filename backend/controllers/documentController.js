const pool = require('../config/database');
const { success, created, badRequest, notFound, error } = require('../utils/response');
const { generateId } = require('../utils/helpers');

const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const [documents] = await pool.query(
      'SELECT * FROM documents WHERE employee_id = ? ORDER BY uploaded_at DESC',
      [employees[0].id]
    );
    return success(res, documents);
  } catch (err) {
    console.error('Get documents error:', err);
    return error(res, 'Failed to fetch documents');
  }
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return badRequest(res, 'File is required');
    
    const userId = req.user.userId;
    const { name, type } = req.body;

    const [employees] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) return notFound(res, 'Employee not found');

    const id = generateId();
    await pool.query(
      'INSERT INTO documents (id, employee_id, name, type, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, employees[0].id, name || req.file.originalname, type || 'Other', `/uploads/documents/${req.file.filename}`, req.file.size, req.file.mimetype]
    );

    return created(res, { id, name: name || req.file.originalname }, 'Document uploaded successfully');
  } catch (err) {
    console.error('Upload document error:', err);
    return error(res, 'Failed to upload document');
  }
};

module.exports = { getMyDocuments, uploadDocument };