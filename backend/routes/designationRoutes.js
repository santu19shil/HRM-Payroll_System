const express = require('express');
const router = express.Router();
const { authenticate, authorizeHR } = require('../middleware/authMiddleware');
const { getDesignations, getDesignationById, createDesignation, updateDesignation, deleteDesignation } = require('../controllers/designationController');

router.get('/', authenticate, getDesignations);
router.get('/:id', authenticate, getDesignationById);
router.post('/', authenticate, authorizeHR, createDesignation);
router.put('/:id', authenticate, authorizeHR, updateDesignation);
router.delete('/:id', authenticate, authorizeHR, deleteDesignation);

module.exports = router;