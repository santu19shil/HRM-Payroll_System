const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateId } = require('../utils/helpers');

// Ensure upload directories exist
const uploadDirs = ['uploads/profiles', 'uploads/documents', 'uploads/temp', 'uploads/notices'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/temp';
    if (file.fieldname === 'profile_picture' || file.fieldname === 'profile') {
      uploadPath = 'uploads/profiles';
    } else     if (file.fieldname === 'document' || file.fieldname === 'documents') {
      uploadPath = 'uploads/documents';
    } else if (file.fieldname === 'attachment') {
      uploadPath = 'uploads/notices';
    }
    cb(null, path.join(__dirname, '..', uploadPath));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${generateId()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];

  if (file.fieldname === 'profile_picture' || file.fieldname === 'profile') {
    if (!allowedImageTypes.includes(file.mimetype)) {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for profile pictures'), false);
      return;
    }
  } else {
    if (!allowedDocTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG'), false);
      return;
    }
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

module.exports = upload;