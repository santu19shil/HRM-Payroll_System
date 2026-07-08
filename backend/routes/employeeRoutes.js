const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  getEmployees, getEmployeeById, createEmployee, updateEmployee, deactivateEmployee,
  getMyProfile, updateMyProfile, uploadProfilePicture
} = require('../controllers/employeeController');

// Employee self-service routes
router.get('/profile', authenticate, getMyProfile);
router.put('/profile', authenticate, updateMyProfile);
router.post('/profile/picture', authenticate, upload.single('profile_picture'), uploadProfilePicture);

// HR routes
router.get('/', authenticate, authorizeHR, getEmployees);
router.get('/:id', authenticate, authorizeHR, getEmployeeById);
router.post('/', authenticate, authorizeHR, createEmployee);
router.put('/:id', authenticate, authorizeHR, updateEmployee);
router.delete('/:id', authenticate, authorizeHR, deactivateEmployee);

module.exports = router;