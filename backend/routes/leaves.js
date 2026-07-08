const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const isEmployee = req.user.role === 'EMPLOYEE';

  let query = 'SELECT * FROM leave_requests WHERE companyId = ?';
  let params = [companyId];

  if (isEmployee) {
    const empRows = await all('SELECT id FROM employees WHERE companyId = ? AND name = ?', [companyId, req.user.name]);
    if (empRows.length > 0) {
      query += ' AND employeeId = ?';
      params.push(empRows[0].id);
    } else {
      return res.json({ leaves: [] });
    }
  }

  query += ' ORDER BY createdAt DESC';
  const rows = await all(query, params);
  res.json({ leaves: rows });
});

router.post('/', async (req, res) => {
  const companyId = req.user.companyId;
  const { leaveType, startDate, endDate, reason } = req.body;
  
  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const empRows = await all('SELECT id, reportingManagerId FROM employees WHERE companyId = ? AND name = ?', [companyId, req.user.name]);
  if (!empRows.length) return res.status(404).json({ error: 'Employee profile not found' });
  
  const reqObj = {
    id: nanoid(),
    companyId,
    employeeId: empRows[0].id,
    leaveType,
    startDate,
    endDate,
    status: 'Pending',
    reason: reason || null,
    managerId: empRows[0].reportingManagerId || null,
    hrId: null,
    createdAt: new Date().toISOString()
  };

  await run(
    'INSERT INTO leave_requests (id, companyId, employeeId, leaveType, startDate, endDate, status, reason, managerId, hrId, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [reqObj.id, reqObj.companyId, reqObj.employeeId, reqObj.leaveType, reqObj.startDate, reqObj.endDate, reqObj.status, reqObj.reason, reqObj.managerId, reqObj.hrId, reqObj.createdAt]
  );

  res.status(201).json({ leave: reqObj });
});

router.put('/:id/status', requireRole(['SUPER_ADMIN', 'HR', 'MANAGER']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const companyId = req.user.companyId;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  await run('UPDATE leave_requests SET status = ? WHERE id = ? AND companyId = ?', [status, id, companyId]);
  res.json({ success: true, status });
});

module.exports = { router };
