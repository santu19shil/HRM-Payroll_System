const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const {
  getMyPayslips,
  getMySalaryStructure,
  downloadPayslip,
  getPayrollRuns,
  processPayroll,
  getAllPayslips,
  getComponents,
  getSalaryStructure,
  updateSalaryStructure,
  deletePayrollRun,
  deletePayslip,
  updatePayslip
} = require('../controllers/payrollController');

// Employee self-service
router.get('/my', authenticate, getMyPayslips);
router.get('/salary-structure', authenticate, getMySalaryStructure);
router.get('/:id/download', authenticate, downloadPayslip);

// HR routes
router.get('/runs', authenticate, authorizeHR, getPayrollRuns);
router.get('/admin/payslips', authenticate, authorizeHR, getAllPayslips);
router.put('/admin/payslips/:id', authenticate, authorizeHR, updatePayslip);
router.delete('/admin/payslips/:id', authenticate, authorizeHR, deletePayslip);
router.get('/components', authenticate, authorizeHR, getComponents);
router.get('/employees/:id/salary-structure', authenticate, authorizeHR, getSalaryStructure);
router.put('/employees/:id/salary-structure', authenticate, authorizeHR, updateSalaryStructure);
router.delete('/runs/:id', authenticate, authorizeHR, deletePayrollRun);
router.post('/generate', authenticate, authorizeHR, processPayroll);
router.post('/process', authenticate, authorizeHR, processPayroll);

module.exports = router;
