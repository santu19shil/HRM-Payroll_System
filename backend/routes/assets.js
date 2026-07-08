const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const isEmployee = req.user.role === 'EMPLOYEE';

  let query = `
    SELECT a.*, e.name as assignedToName 
    FROM company_assets a
    LEFT JOIN employees e ON a.assignedTo = e.id
    WHERE a.companyId = ?
  `;
  let params = [companyId];

  if (isEmployee) {
    const empRows = await all('SELECT id FROM employees WHERE companyId = ? AND name = ?', [companyId, req.user.name]);
    if (empRows.length > 0) {
      query += ' AND a.assignedTo = ?';
      params.push(empRows[0].id);
    } else {
      return res.json({ assets: [] });
    }
  }

  query += ' ORDER BY a.createdAt DESC';
  const rows = await all(query, params);
  res.json({ assets: rows });
});

router.post('/', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { name, type, serial, status, assignedTo } = req.body;
  if (!name || !serial) return res.status(400).json({ error: 'Name and Serial are required' });

  const companyId = req.user.companyId;
  const asset = {
    id: nanoid(),
    companyId,
    name,
    type: type || 'Other',
    serial,
    status: status || 'Available',
    assignedTo: assignedTo || null,
    createdAt: new Date().toISOString()
  };

  await run(
    'INSERT INTO company_assets (id, companyId, name, type, serial, status, assignedTo, createdAt) VALUES (?,?,?,?,?,?,?,?)',
    [asset.id, asset.companyId, asset.name, asset.type, asset.serial, asset.status, asset.assignedTo, asset.createdAt]
  );

  res.status(201).json({ asset });
});

router.put('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const { status, assignedTo } = req.body;
  const companyId = req.user.companyId;

  await run(
    'UPDATE company_assets SET status = COALESCE(?, status), assignedTo = COALESCE(?, assignedTo) WHERE id = ? AND companyId = ?',
    [status, assignedTo, id, companyId]
  );

  const updated = await all('SELECT * FROM company_assets WHERE id = ?', [id]);
  res.json({ asset: updated[0] });
});

router.delete('/:id', requireRole(['SUPER_ADMIN', 'HR']), async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  await run('DELETE FROM company_assets WHERE id = ? AND companyId = ?', [id, companyId]);
  res.json({ success: true });
});

module.exports = { router };
