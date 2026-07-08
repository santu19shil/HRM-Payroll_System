const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const { getMyPayslips, getMySalaryStructure, downloadPayslip, getPayrollRuns, processPayroll } = require('../controllers/payrollController');

// Employee self-service
router.get('/my', authenticate, getMyPayslips);
router.get('/salary-structure', authenticate, getMySalaryStructure);
router.get('/:id/download', authenticate, downloadPayslip);

// HR routes
router.get('/runs', authenticate, authorizeHR, getPayrollRuns);
router.post('/process', authenticate, authorizeHR, processPayroll);

module.exports = router;