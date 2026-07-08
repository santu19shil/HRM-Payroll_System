const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const pool = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

const getSettings = async (req, res) => {
  try {
    const { group } = req.query;
    let query = 'SELECT * FROM settings';
    const params = [];
    if (group) { query += ' WHERE setting_group = ?'; params.push(group); }
    query += ' ORDER BY setting_group, setting_key';
    
    const [settings] = await pool.query(query, params);
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    return success(res, { settings: settingsObj, settingsList: settings });
  } catch (err) {
    console.error('Get settings error:', err);
    return error(res, 'Failed to fetch settings');
  }
};

const updateSettings = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') return badRequest(res, 'Updates object is required');

    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
        [String(value), key]
      );
    }
    return success(res, null, 'Settings updated successfully');
  } catch (err) {
    console.error('Update settings error:', err);
    return error(res, 'Failed to update settings');
  }
};

router.get('/', authenticate, getSettings);
router.put('/', authenticate, authorizeHR, updateSettings);

module.exports = router;