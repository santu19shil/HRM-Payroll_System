const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const pool = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'company');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

const getSettings = async (req, res) => {
  try {
    const { group } = req.query;
    let query = 'SELECT * FROM settings';
    const params = [];
    if (group) { query += ' WHERE setting_group = ?'; params.push(group); }
    query += ' ORDER BY setting_group, setting_key';
    
    const [settings] = await pool.query(query, params);
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    return success(res, { settings: settingsObj, settingsList: settings });
  } catch (err) {
    console.error('Get settings error:', err);
    return error(res, 'Failed to fetch settings');
  }
};

const getPublicSettings = async (req, res) => {
  try {
    const [settings] = await pool.query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('company_name', 'company_logo', 'company_address')");
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    return success(res, settingsObj);
  } catch (err) {
    console.error('Get public settings error:', err);
    return error(res, 'Failed to fetch public settings');
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

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) return badRequest(res, 'Logo file is required');
    const relative = `/uploads/company/${req.file.filename}`;
    await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [relative, 'company_logo']);
    return success(res, { logo_path: relative }, 'Company logo uploaded');
  } catch (err) {
    console.error('Upload logo error:', err);
    return error(res, err.message || 'Failed to upload logo');
  }
};

router.get('/', authenticate, getSettings);
router.get('/public', getPublicSettings);
router.put('/', authenticate, authorizeHR, updateSettings);
router.post('/logo', authenticate, authorizeHR, upload.single('logo'), uploadLogo);

module.exports = router;