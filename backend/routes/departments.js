const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM departments WHERE companyId = ? ORDER BY createdAt DESC', [companyId]);
  res.json({ departments: rows });
});

router.post('/', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { name, headId, budget } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const companyId = req.user.companyId;
  const now = new Date().toISOString();
  const dept = {
    id: nanoid(),
    companyId,
    name,
    headId: headId || null,
    budget: budget || 0,
    createdAt: now
  };

  await run(
    'INSERT INTO departments (id, companyId, name, headId, budget, createdAt) VALUES (?,?,?,?,?,?)',
    [dept.id, dept.companyId, dept.name, dept.headId, dept.budget, dept.createdAt]
  );

  res.status(201).json({ department: dept });
});

router.put('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const { name, headId, budget } = req.body;
  const companyId = req.user.companyId;

  const existing = await all('SELECT * FROM departments WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });

  await run(
    'UPDATE departments SET name = COALESCE(?, name), headId = COALESCE(?, headId), budget = COALESCE(?, budget) WHERE id = ? AND companyId = ?',
    [name, headId, budget, id, companyId]
  );

  const updated = await all('SELECT * FROM departments WHERE id = ?', [id]);
  res.json({ department: updated[0] });
});

router.delete('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  await run('DELETE FROM departments WHERE id = ? AND companyId = ?', [id, companyId]);
  res.json({ success: true });
});

module.exports = { router };
