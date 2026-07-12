const pool = require('../config/database');
const { success, created, badRequest, notFound, error } = require('../utils/response');
const { generateId, createNotification, getAdminUserIds } = require('../utils/helpers');

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

    // Notify admins about the new document
    const adminIds = await getAdminUserIds(pool);
    const [emp] = await pool.query('SELECT CONCAT(first_name, " ", last_name) as full_name FROM employees WHERE id = ?', [employees[0].id]);
    const empName = emp.length > 0 ? emp[0].full_name : 'An employee';
    for (const adminId of adminIds) {
      await createNotification(pool, {
        userId: adminId,
        title: 'New Document Uploaded',
        message: `${empName} uploaded a document: ${name || req.file.originalname}`,
        type: 'INFO',
        category: 'DOCUMENT',
        referenceType: 'DOCUMENT',
        referenceId: id
      });
    }

    return created(res, { id, name: name || req.file.originalname }, 'Document uploaded successfully');
  } catch (err) {
    console.error('Upload document error:', err);
    return error(res, 'Failed to upload document');
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const [documents] = await pool.query(
      `SELECT d.*, 
              CONCAT(e.first_name, ' ', e.last_name) as employee_name,
              e.employee_id,
              CONCAT(v.first_name, ' ', v.last_name) as verified_by_name
       FROM documents d
       LEFT JOIN employees e ON d.employee_id = e.id
       LEFT JOIN users vu ON d.verified_by = vu.id
       LEFT JOIN employees v ON vu.employee_id = v.id
       ORDER BY d.uploaded_at DESC`
    );
    return success(res, documents);
  } catch (err) {
    console.error('Get all documents error:', err);
    return error(res, 'Failed to fetch documents');
  }
};

/**
 * Accept/verify a document (HR/admin)
 * PUT /api/documents/:id/verify
 */
const verifyDocument = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [docs] = await connection.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) return notFound(res, 'Document not found');
    const doc = docs[0];

    await connection.query(
      'UPDATE documents SET status = ?, is_verified = 1, verified_by = ?, verified_at = NOW() WHERE id = ?',
      ['Verified', req.user.userId, id]
    );

    const [emps] = await connection.query('SELECT user_id FROM employees WHERE id = ?', [doc.employee_id]);
    if (emps.length > 0 && emps[0].user_id) {
      await createNotification(connection, {
        userId: emps[0].user_id,
        title: 'Document Accepted',
        message: `Your document "${doc.name}" has been accepted by the admin.`,
        type: 'SUCCESS',
        category: 'DOCUMENT',
        referenceType: 'DOCUMENT',
        referenceId: id
      });
    }

    await connection.commit();
    return success(res, null, 'Document accepted');
  } catch (err) {
    await connection.rollback();
    console.error('Verify document error:', err);
    return error(res, 'Failed to verify document');
  } finally {
    connection.release();
  }
};

/**
 * Reject a document (HR/admin)
 * PUT /api/documents/:id/reject
 * Body: { rejection_reason }
 */
const rejectDocument = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const [docs] = await connection.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) return notFound(res, 'Document not found');
    const doc = docs[0];

    await connection.query(
      'UPDATE documents SET status = ?, is_verified = 0, verified_by = ?, verified_at = NULL, rejection_reason = ? WHERE id = ?',
      ['Rejected', req.user.userId, rejection_reason || null, id]
    );

    const [emps] = await connection.query('SELECT user_id FROM employees WHERE id = ?', [doc.employee_id]);
    if (emps.length > 0 && emps[0].user_id) {
      await createNotification(connection, {
        userId: emps[0].user_id,
        title: 'Document Rejected',
        message: rejection_reason
          ? `Your document "${doc.name}" was rejected. Reason: ${rejection_reason}`
          : `Your document "${doc.name}" was rejected by the admin.`,
        type: 'ERROR',
        category: 'DOCUMENT',
        referenceType: 'DOCUMENT',
        referenceId: id
      });
    }

    await connection.commit();
    return success(res, null, 'Document rejected');
  } catch (err) {
    await connection.rollback();
    console.error('Reject document error:', err);
    return error(res, 'Failed to reject document');
  } finally {
    connection.release();
  }
};

/**
 * Update a document's metadata (HR/admin)
 * PUT /api/documents/:id
 * Body: { name, type, status, rejection_reason }
 */
const updateDocument = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { name, type, status, rejection_reason } = req.body;

    const [docs] = await connection.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) return notFound(res, 'Document not found');

    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (type !== undefined) { fields.push('type = ?'); params.push(type); }
    if (status !== undefined) {
      const allowed = ['Pending', 'Verified', 'Rejected'];
      if (!allowed.includes(status)) return badRequest(res, 'Invalid status');
      fields.push('status = ?'); params.push(status);
      if (status === 'Verified') { fields.push('is_verified = 1', 'verified_by = ?', 'verified_at = NOW()'); params.push(req.user.userId); }
      if (status === 'Rejected') { fields.push('is_verified = 0'); }
    }
    if (rejection_reason !== undefined) { fields.push('rejection_reason = ?'); params.push(rejection_reason || null); }

    if (fields.length > 0) {
      await connection.query(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
    }

    await connection.commit();
    return success(res, null, 'Document updated');
  } catch (err) {
    await connection.rollback();
    console.error('Update document error:', err);
    return error(res, 'Failed to update document');
  } finally {
    connection.release();
  }
};

/**
 * Delete a document (HR/admin)
 * DELETE /api/documents/:id
 */
const deleteDocument = async (req, res) => {
  const connection = await pool.getConnection();
  const fs = require('fs');
  const path = require('path');
  try {
    const { id } = req.params;
    const [docs] = await connection.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) return notFound(res, 'Document not found');

    const filePath = docs[0].file_path;
    await connection.query('DELETE FROM documents WHERE id = ?', [id]);

    if (filePath) {
      const abs = path.join(__dirname, '..', filePath);
      try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch (_) { /* ignore */ }
    }

    return success(res, null, 'Document deleted');
  } catch (err) {
    console.error('Delete document error:', err);
    return error(res, 'Failed to delete document');
  } finally {
    connection.release();
  }
};

module.exports = { getMyDocuments, getAllDocuments, uploadDocument, verifyDocument, rejectDocument, updateDocument, deleteDocument };
