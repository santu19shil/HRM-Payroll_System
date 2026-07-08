const express = require('express');
const { nanoid } = require('nanoid');
const { all, run } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const companyId = req.user.companyId;
  const isEmployee = req.user.role === 'EMPLOYEE';
  
  let query = 'SELECT * FROM attendance WHERE companyId = ?';
  let params = [companyId];

  // If Employee, only show their attendance. For simplicity we look up employeeId by email or name.
  // In a real system, req.user should contain employeeId if role=EMPLOYEE.
  // For now, let's assume if EMPLOYEE, we fetch based on user name matching employee name.
  if (isEmployee) {
    const empRows = await all('SELECT id FROM employees WHERE companyId = ? AND name = ?', [companyId, req.user.name]);
    if (empRows.length > 0) {
      query += ' AND employeeId = ?';
      params.push(empRows[0].id);
    } else {
      return res.json({ attendance: [] });
    }
  }

  query += ' ORDER BY date DESC';
  const rows = await all(query, params);
  res.json({ attendance: rows });
});

router.post('/check-in', async (req, res) => {
  const companyId = req.user.companyId;
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString();
  
  const empRows = await all('SELECT id FROM employees WHERE companyId = ? AND name = ?', [companyId, req.user.name]);
  if (!empRows.length) return res.status(404).json({ error: 'Employee profile not found' });
  const employeeId = empRows[0].id;

  const existing = await all('SELECT * FROM attendance WHERE companyId = ? AND employeeId = ? AND date = ?', [companyId, employeeId, date]);
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Already checked in for today' });
  }

  const att = {
    id: nanoid(),
    companyId,
    employeeId,
    date,
    checkIn: time,
    checkOut: null,
    breakTimeMinutes: 0,
    status: 'Present',
    workHours: 0
  };

  await run(
    'INSERT INTO attendance (id, companyId, employeeId, date, checkIn, status) VALUES (?,?,?,?,?,?)',
    [att.id, att.companyId, att.employeeId, att.date, att.checkIn, att.status]
  );

  res.status(201).json({ attendance: att });
});

router.post('/check-out', async (req, res) => {
  const companyId = req.user.companyId;
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString();

  const empRows = await all('SELECT id FROM employees WHERE companyId = ? AND name = ?', [companyId, req.user.name]);
  if (!empRows.length) return res.status(404).json({ error: 'Employee profile not found' });
  const employeeId = empRows[0].id;

  const existing = await all('SELECT * FROM attendance WHERE companyId = ? AND employeeId = ? AND date = ?', [companyId, employeeId, date]);
  if (existing.length === 0) return res.status(404).json({ error: 'No check-in found for today' });

  // Basic mock workHours calc for now
  await run(
    'UPDATE attendance SET checkOut = ?, workHours = ? WHERE id = ?',
    [time, 8.5, existing[0].id]
  );

  res.json({ success: true, checkOut: time });
});

module.exports = { router };
