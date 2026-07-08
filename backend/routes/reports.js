const express = require('express');

const { init, get } = require('../db/sqlite');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/summary?month=MM&year=YYYY
router.get('/summary', requireAuth, async (req, res) => {
  await init();
  const { month, year } = req.query || {};
  const m = Number(month);
  const y = Number(year);

  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) {
    return res.status(400).json({ error: 'month (1-12) and year are required' });
  }

  const companyId = req.user.companyId;
  const monthKey = `${y}-${String(m).padStart(2, '0')}`;

  const run = await get(
    'SELECT runId, monthKey, totalsJson FROM payrollRuns WHERE companyId = ? AND monthKey = ?',
    [companyId, monthKey]
  );
  if (!run) return res.status(404).json({ error: 'No payroll run found for requested month/year' });

  res.json({ monthKey, totals: JSON.parse(run.totalsJson), payrollRunId: run.runId });
});

module.exports = { router };


