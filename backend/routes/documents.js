const express = require('express');
const multer = require('multer');
const path = require('path');
const { nanoid } = require('nanoid');

const { init, run, get, all } = require('../db/sqlite');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function ensureDb() {
  await init();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'documents'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  }
});

const upload = multer({ storage });

async function getOrCreateCompany() {
  const company = await get('SELECT * FROM companies ORDER BY createdAt DESC LIMIT 1');
  if (company) return company.id;
  const createdAt = new Date().toISOString();
  const companyId = nanoid();
  await run('INSERT INTO companies (id, name, createdAt) VALUES (?,?,?)', [companyId, 'Default Company', createdAt]);
  return companyId;
}

async function ensureSuperAdmin(companyId) {
  const admin = await get('SELECT * FROM users WHERE employeeId = ?', ['ADMIN001']);
  if (!admin) {
    await run(
      `INSERT INTO users (id, companyId, email, name, employeeId, role, passwordHash, tempPassword, isFirstLogin, isActive, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ['user_admin', companyId, 'admin@hrpayroll.com', 'Super Admin', 'ADMIN001', 'SUPER_ADMIN', 'Admin@123', 'Admin@123', 0, 1, new Date().toISOString()]
    );
  }
  return companyId;
}

async function seedDatabase() {
  await ensureDb();
  const companyId = await getOrCreateCompany();
  await ensureSuperAdmin(companyId);
  return companyId;
}

// POST /api/documents/upload - Employee uploads document
router.post('/upload', requireAuth, upload.single('document'), async (req, res) => {
  try {
    await seedDatabase();
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const companyId = req.user.companyId;
    const userId = req.user.sub;
    const { name, type } = req.body || {};

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const employee = await get('SELECT * FROM employees WHERE companyId = ? AND user_id = ?', [companyId, userId]);
    const employeeId = employee ? employee.id : null;
    const employeeName = user.name || '';

    const documentId = nanoid();
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const now = new Date().toISOString();

    await run(
      `INSERT INTO documents (id, companyId, employeeId, employeeName, uploadedBy, name, type, fileUrl, uploadedAt)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [documentId, companyId, employeeId, employeeName, userId, name || req.file.originalname, type || req.file.mimetype, fileUrl, now]
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: documentId,
        name: name || req.file.originalname,
        type: type || req.file.mimetype,
        fileUrl
      }
    });
  } catch (e) {
    console.error('Upload document error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to upload document' });
  }
});

// GET /api/documents/my - Employee views own documents
router.get('/my', requireAuth, async (req, res) => {
  try {
    await seedDatabase();
    const companyId = req.user.companyId;
    const userId = req.user.sub;

    const docs = await all(
      'SELECT * FROM documents WHERE companyId = ? AND uploadedBy = ? ORDER BY uploadedAt DESC',
      [companyId, userId]
    );

    res.json({ success: true, data: docs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch documents' });
  }
});

// GET /api/documents/all - Admin views all documents
router.get('/all', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    await seedDatabase();
    const companyId = req.user.companyId;

    const docs = await all(
      'SELECT * FROM documents WHERE companyId = ? ORDER BY uploadedAt DESC',
      [companyId]
    );

    res.json({ success: true, data: docs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to fetch documents' });
  }
});

module.exports = router;
