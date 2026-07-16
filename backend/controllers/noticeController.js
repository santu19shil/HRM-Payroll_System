const pool = require('../config/database');
const { success, created, badRequest, error } = require('../utils/response');
const { generateId, createNotification } = require('../utils/helpers');

/**
 * Resolve the list of target employee ids for a notice.
 * opts: { targetAll, departments:[], designations:[], employees:[] }
 */
async function resolveRecipientIds(connection, { targetAll, departments, designations, employees }) {
  if (targetAll) {
    const [rows] = await connection.query('SELECT id FROM employees WHERE is_active = 1');
    return rows.map(r => r.id);
  }

  const ids = new Set(employees || []);

  if (Array.isArray(departments) && departments.length > 0) {
    const [rows] = await connection.query(
      'SELECT id FROM employees WHERE is_active = 1 AND department_id IN (?)',
      [departments]
    );
    rows.forEach(r => ids.add(r.id));
  }

  if (Array.isArray(designations) && designations.length > 0) {
    const [rows] = await connection.query(
      'SELECT id FROM employees WHERE is_active = 1 AND designation_id IN (?)',
      [designations]
    );
    rows.forEach(r => ids.add(r.id));
  }

  return Array.from(ids);
}

/**
 * Create a notice and notify targeted employees
 * POST /api/notices  (multipart: optional 'attachment' file)
 */
const createNotice = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Body may arrive as JSON or multipart form-data (strings)
    const parseArr = (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string' && v.trim()) {
        try { return JSON.parse(v); } catch { return []; }
      }
      return [];
    };
    const title = req.body.title;
    const content = req.body.content;
    const targetAll = req.body.target_all === true || req.body.target_all === 'true' || req.body.target_all === 'on';
    const departments = parseArr(req.body.departments);
    const designations = parseArr(req.body.designations);
    const employees = parseArr(req.body.employees);

    if (!title || !content) return badRequest(res, 'Title and content are required');

    const recipientIds = await resolveRecipientIds(connection, {
      targetAll: !!targetAll,
      departments,
      designations,
      employees
    });

    if (recipientIds.length === 0) {
      await connection.rollback();
      return badRequest(res, 'No recipients match the selected audience');
    }

    const attachment = req.file
      ? {
          path: `/uploads/notices/${req.file.filename}`,
          name: req.file.originalname,
          type: req.file.mimetype
        }
      : null;

    const noticeId = generateId();
    await connection.query(
      `INSERT INTO notices (id, title, content, target_all, departments, designations, employees, attachment_path, attachment_name, attachment_type, created_by, recipient_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noticeId,
        title,
        content,
        targetAll ? 1 : 0,
        JSON.stringify(departments),
        JSON.stringify(designations),
        JSON.stringify(employees),
        attachment ? attachment.path : null,
        attachment ? attachment.name : null,
        attachment ? attachment.type : null,
        req.user.userId,
        recipientIds.length
      ]
    );

    const noticeLink = attachment ? attachment.path : null;

    for (const empId of recipientIds) {
      await connection.query(
        'INSERT INTO notice_recipients (id, notice_id, employee_id) VALUES (?, ?, ?)',
        [generateId(), noticeId, empId]
      );
      const [users] = await connection.query('SELECT user_id FROM employees WHERE id = ?', [empId]);
      if (users.length > 0 && users[0].user_id) {
        await createNotification(connection, {
          userId: users[0].user_id,
          title: `New Notice: ${title}`,
          message: content,
          type: 'INFO',
          category: 'NOTICE',
          referenceType: 'NOTICE',
          referenceId: noticeId,
          link: noticeLink
        });
      }
    }

    await connection.commit();
    return created(res, { id: noticeId, recipient_count: recipientIds.length }, 'Notice published successfully');
  } catch (err) {
    await connection.rollback();
    console.error('Create notice error:', err);
    return error(res, 'Failed to publish notice');
  } finally {
    connection.release();
  }
};

/**
 * List all notices (HR/admin)
 * GET /api/notices
 */
const listNotices = async (req, res) => {
  try {
    const [notices] = await pool.query(
      `SELECT n.*, COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) as created_by_name
       FROM notices n
       LEFT JOIN users u ON n.created_by = u.id
       LEFT JOIN employees e ON u.id = e.user_id
       ORDER BY n.created_at DESC`
    );
    return success(res, notices);
  } catch (err) {
    console.error('List notices error:', err);
    return error(res, 'Failed to fetch notices');
  }
};

/**
 * Get notices for the current employee
 * GET /api/notices/my
 */
const myNotices = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [emps] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (emps.length === 0) return success(res, []);
    const employeeId = emps[0].id;

    const [notices] = await pool.query(
      `SELECT DISTINCT n.*
       FROM notices n
       JOIN notice_recipients nr ON nr.notice_id = n.id
       WHERE nr.employee_id = ?
       ORDER BY n.created_at DESC`,
      [employeeId]
    );
    return success(res, notices);
  } catch (err) {
    console.error('My notices error:', err);
    return error(res, 'Failed to fetch notices');
  }
};

/**
 * Delete a notice (HR/admin)
 * DELETE /api/notices/:id
 */
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM notices WHERE id = ?', [id]);
    if (existing.length === 0) return notFound(res, 'Notice not found');

    await pool.query('DELETE FROM notice_recipients WHERE notice_id = ?', [id]);
    await pool.query('DELETE FROM notifications WHERE reference_type = ? AND reference_id = ?', ['NOTICE', id]);
    await pool.query('DELETE FROM notices WHERE id = ?', [id]);

    return success(res, null, 'Notice deleted successfully');
  } catch (err) {
    console.error('Delete notice error:', err);
    return error(res, 'Failed to delete notice');
  }
};

module.exports = { createNotice, listNotices, myNotices, deleteNotice };
