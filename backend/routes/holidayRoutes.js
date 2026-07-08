const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const { getHolidays, createHoliday, updateHoliday, deleteHoliday } = require('../controllers/holidayController');

router.get('/', authenticate, getHolidays);
router.post('/', authenticate, authorizeHR, createHoliday);
router.put('/:id', authenticate, authorizeHR, updateHoliday);
router.delete('/:id', authenticate, authorizeHR, deleteHoliday);

module.exports = router;