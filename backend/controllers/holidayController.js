const pool = require('../config/database');
const { success, created, badRequest, notFound, error } = require('../utils/response');
const { generateId } = require('../utils/helpers');

const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT * FROM holidays WHERE is_active = 1';
    const params = [];
    if (year) { query += ' AND YEAR(date) = ?'; params.push(year); }
    query += ' ORDER BY date';
    
    const [holidays] = await pool.query(query, params);
    return success(res, holidays);
  } catch (err) {
    console.error('Get holidays error:', err);
    return error(res, 'Failed to fetch holidays');
  }
};

const createHoliday = async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) return badRequest(res, 'Name and date are required');

    const id = generateId();
    await pool.query(
      'INSERT INTO holidays (id, name, date, type, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, date, type || 'National', description || null, req.user.userId]
    );

    return created(res, { id, name, date }, 'Holiday created successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Holiday already exists for this date');
    console.error('Create holiday error:', err);
    return error(res, 'Failed to create holiday');
  }
};

const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type, description } = req.body;

    const [existing] = await pool.query('SELECT id FROM holidays WHERE id = ?', [id]);
    if (existing.length === 0) return notFound(res, 'Holiday not found');

    await pool.query(
      'UPDATE holidays SET name = COALESCE(?, name), date = COALESCE(?, date), type = COALESCE(?, type), description = COALESCE(?, description) WHERE id = ?',
      [name, date, type, description, id]
    );

    return success(res, null, 'Holiday updated successfully');
  } catch (err) {
    console.error('Update holiday error:', err);
    return error(res, 'Failed to update holiday');
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE holidays SET is_active = 0 WHERE id = ?', [id]);
    return success(res, null, 'Holiday deleted successfully');
  } catch (err) {
    console.error('Delete holiday error:', err);
    return error(res, 'Failed to delete holiday');
  }
};

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday };