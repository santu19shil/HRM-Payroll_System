const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM holidays WHERE companyId = ? ORDER BY date ASC', [companyId]);
  res.json({ success: true, data: rows });
});

router.post('/', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { name, date, type } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });

  const companyId = req.user.companyId;
  const holiday = {
    id: nanoid(),
    companyId,
    name,
    date,
    type: type || 'Public Holiday',
    createdAt: new Date().toISOString()
  };

  await run(
    'INSERT INTO holidays (id, companyId, name, date, type, createdAt) VALUES (?,?,?,?,?,?)',
    [holiday.id, holiday.companyId, holiday.name, holiday.date, holiday.type, holiday.createdAt]
  );

  res.status(201).json({ success: true, data: holiday });
});

router.delete('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  await run('DELETE FROM holidays WHERE id = ? AND companyId = ?', [id, companyId]);
  res.json({ success: true });
});

module.exports = router;
