const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { getMyDocuments, getAllDocuments, uploadDocument, verifyDocument, rejectDocument, updateDocument, deleteDocument } = require('../controllers/documentController');

router.get('/', authenticate, getMyDocuments);
router.get('/my', authenticate, getMyDocuments);
router.get('/all', authenticate, getAllDocuments);
router.post('/upload', authenticate, upload.single('document'), uploadDocument);
router.put('/:id/verify', authenticate, verifyDocument);
router.put('/:id/reject', authenticate, rejectDocument);
router.put('/:id', authenticate, updateDocument);
router.delete('/:id', authenticate, deleteDocument);

module.exports = router;