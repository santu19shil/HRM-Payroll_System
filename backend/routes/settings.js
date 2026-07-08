const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM company_settings WHERE companyId = ?', [companyId]);
  
  if (rows.length === 0) {
    // Return default settings shape if none exist
    return res.json({
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        payrollCycle: 'Monthly',
        theme: 'Light'
      }
    });
  }
  
  // Pivot rows into an object
  const settings = {};
  rows.forEach(row => {
    settings[row.key] = row.value;
  });
  
  res.json({ settings });
});

router.post('/', requireRole(['SUPER_ADMIN']), async (req, res) => {
  const companyId = req.user.companyId;
  const settingsObj = req.body; // expect { key: value, key2: value2 }

  if (!settingsObj || typeof settingsObj !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  for (const [key, value] of Object.entries(settingsObj)) {
    const existing = await all('SELECT id FROM company_settings WHERE companyId = ? AND key = ?', [companyId, key]);
    
    if (existing.length > 0) {
      await run('UPDATE company_settings SET value = ?, updatedAt = ? WHERE id = ?', 
        [String(value), new Date().toISOString(), existing[0].id]);
    } else {
      await run('INSERT INTO company_settings (id, companyId, key, value, createdAt, updatedAt) VALUES (?,?,?,?,?,?)',
        [nanoid(), companyId, key, String(value), new Date().toISOString(), new Date().toISOString()]);
    }
  }

  res.json({ success: true, message: 'Settings saved' });
});

module.exports = { router };
