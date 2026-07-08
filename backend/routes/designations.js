const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const rows = await all('SELECT * FROM designations WHERE companyId = ? ORDER BY createdAt DESC', [companyId]);
  res.json({ designations: rows });
});

router.post('/', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { departmentId, title, salaryGrade } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const companyId = req.user.companyId;
  const now = new Date().toISOString();
  
  const desig = {
    id: nanoid(),
    companyId,
    departmentId: departmentId || null,
    title,
    salaryGrade: salaryGrade || null,
    createdAt: now
  };

  await run(
    'INSERT INTO designations (id, companyId, departmentId, title, salaryGrade, createdAt) VALUES (?,?,?,?,?,?)',
    [desig.id, desig.companyId, desig.departmentId, desig.title, desig.salaryGrade, desig.createdAt]
  );

  res.status(201).json({ designation: desig });
});

router.put('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const { departmentId, title, salaryGrade } = req.body;
  const companyId = req.user.companyId;

  await run(
    'UPDATE designations SET departmentId = COALESCE(?, departmentId), title = COALESCE(?, title), salaryGrade = COALESCE(?, salaryGrade) WHERE id = ? AND companyId = ?',
    [departmentId, title, salaryGrade, id, companyId]
  );

  const updated = await all('SELECT * FROM designations WHERE id = ?', [id]);
  res.json({ designation: updated[0] });
});

router.delete('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  await run('DELETE FROM designations WHERE id = ? AND companyId = ?', [id, companyId]);
  res.json({ success: true });
});

module.exports = { router };
