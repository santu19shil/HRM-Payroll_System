const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM global_taxes WHERE companyId = ?', [companyId]);
  res.json({ taxes: rows });
});

router.post('/', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { name, rate, type } = req.body;
  if (!name || !rate) return res.status(400).json({ error: 'Name and rate are required' });

  const companyId = req.user.companyId;
  const tax = {
    id: nanoid(),
    companyId,
    name,
    rate,
    type: type || 'Deduction',
    createdAt: new Date().toISOString()
  };

  await run(
    'INSERT INTO global_taxes (id, companyId, name, rate, type, createdAt) VALUES (?,?,?,?,?,?)',
    [tax.id, tax.companyId, tax.name, tax.rate, tax.type, tax.createdAt]
  );

  res.status(201).json({ tax });
});

router.delete('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  await run('DELETE FROM global_taxes WHERE id = ? AND companyId = ?', [id, companyId]);
  res.json({ success: true });
});

module.exports = { router };
