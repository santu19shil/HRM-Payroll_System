const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');
const pool = require('../config/database');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';

const signAccessToken = (payload) => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Access token is required');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token has expired');
    }
    return unauthorized(res, 'Invalid access token');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return forbidden(res, 'Access denied. No role found.');
    }
    
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
    }
    
    next();
  };
};

const authorizeHR = (req, res, next) => {
  const hrRoles = ['SUPER_ADMIN', 'HR_ADMIN'];
  if (!req.user || !hrRoles.includes(req.user.role)) {
    return forbidden(res, 'Access denied. HR or Admin role required.');
  }
  next();
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authenticate,
  authorize,
  authorizeHR,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET
};