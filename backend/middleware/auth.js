const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(403).json({ error: 'Forbidden' });
    if (roles.includes(role)) return next();
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  signAccessToken,
  signRefreshToken,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET
};

