const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const {
  getOfficeLocations, checkIn, checkOut, getTodayAttendance,
  getAttendanceHistory, getAttendanceSummary, getAllAttendance, correctAttendance
} = require('../controllers/attendanceController');

// Employee self-service
router.get('/offices', authenticate, getOfficeLocations);
router.post('/check-in', authenticate, checkIn);
router.post('/check-out', authenticate, checkOut);
router.get('/today', authenticate, getTodayAttendance);
router.get('/history', authenticate, getAttendanceHistory);
router.get('/summary', authenticate, getAttendanceSummary);

// HR routes
router.get('/', authenticate, authorizeHR, getAllAttendance);
router.put('/:id/correct', authenticate, authorizeHR, correctAttendance);

module.exports = router;