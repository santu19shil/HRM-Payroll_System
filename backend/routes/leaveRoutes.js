const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const { getLeaveTypes, applyLeave, getMyLeaves, getMyLeaveBalance, getAllLeaves, approveLeave, rejectLeave } = require('../controllers/leaveController');

// Employee self-service
router.get('/types', authenticate, getLeaveTypes);
router.post('/apply', authenticate, applyLeave);
router.get('/my', authenticate, getMyLeaves);
router.get('/balance', authenticate, getMyLeaveBalance);

// HR routes
router.get('/', authenticate, authorizeHR, getAllLeaves);
router.put('/:id/approve', authenticate, authorizeHR, approveLeave);
router.put('/:id/reject', authenticate, authorizeHR, rejectLeave);

module.exports = router;