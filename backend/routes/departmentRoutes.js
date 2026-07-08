const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const { getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');

router.get('/', authenticate, getDepartments);
router.get('/:id', authenticate, getDepartmentById);
router.post('/', authenticate, authorizeHR, createDepartment);
router.put('/:id', authenticate, authorizeHR, updateDepartment);
router.delete('/:id', authenticate, authorizeHR, deleteDepartment);

module.exports = router;