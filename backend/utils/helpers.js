const crypto = require('crypto');

/**
 * Generate a UUID v4
 */
const generateId = () => {
  return crypto.randomUUID();
};

/**
 * Generate employee ID in format EMP000XXX
 */
const generateEmployeeId = (counter) => {
  const num = String(counter).padStart(6, '0');
  return `EMP${num}`;
};

/**
 * Generate a secure temporary password
 * Format: 2 uppercase + 2 lowercase + 2 digits + 2 special chars
 */
const generateTempPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@#$!%&*';
  
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if a point is within a given radius from center
 */
const isWithinRadius = (lat1, lon1, lat2, lon2, radiusMeters) => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusMeters;
};

/**
 * Calculate working hours between two times
 */
const calculateWorkingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end - start;
  return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
};

/**
 * Calculate late minutes based on office start time
 */
const calculateLateMinutes = (checkIn, officeStartTime) => {
  if (!checkIn) return 0;
  const checkInDate = new Date(checkIn);
  const [hours, minutes] = officeStartTime.split(':').map(Number);
  const officeStart = new Date(checkInDate);
  officeStart.setHours(hours, minutes, 0, 0);
  
  const diffMs = checkInDate - officeStart;
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};

/**
 * Get current date as YYYY-MM-DD
 */
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get current month and year
 */
const getCurrentMonthYear = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
};

/**
 * Calculate number of working days in a month (excluding weekends)
 */
const getWorkingDaysInMonth = (year, month) => {
  const days = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      workingDays++;
    }
  }
  return workingDays;
};

/**
 * Calculate days between two dates (inclusive)
 */
const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Sanitize string for SQL (basic XSS prevention)
 */
const sanitize = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate phone number (Indian format)
 */
const isValidPhone = (phone) => {
  const re = /^[+]?[\d\s-]{10,15}$/;
  return re.test(phone);
};

/**
 * Parse JSON safely
 */
const safeJsonParse = (str, defaultVal = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultVal;
  }
};

/**
 * Create a notification row for a user.
 * opts: { userId, title, message, type, category, referenceType, referenceId }
 */
const createNotification = async (connection, opts) => {
  const id = generateId();
  await connection.query(
    `INSERT INTO notifications (id, user_id, title, message, type, category, reference_type, reference_id, link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      opts.userId,
      opts.title,
      opts.message,
      opts.type || 'INFO',
      opts.category || 'General',
      opts.referenceType || null,
      opts.referenceId || null,
      opts.link || null
    ]
  );
  return id;
};

/**
 * Get user ids of all active HR/Admin users (SUPER_ADMIN, HR_ADMIN).
 */
const getAdminUserIds = async (connection) => {
  const [rows] = await connection.query(
    `SELECT u.id FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE r.name IN ('SUPER_ADMIN', 'HR_ADMIN') AND u.is_active = 1`
  );
  return rows.map(r => r.id);
};

module.exports = {
  generateId,
  generateEmployeeId,
  generateTempPassword,
  calculateDistance,
  isWithinRadius,
  calculateWorkingHours,
  calculateLateMinutes,
  getCurrentDate,
  getCurrentMonthYear,
  getWorkingDaysInMonth,
  daysBetween,
  sanitize,
  isValidEmail,
  isValidPhone,
  safeJsonParse,
  createNotification,
  getAdminUserIds
};