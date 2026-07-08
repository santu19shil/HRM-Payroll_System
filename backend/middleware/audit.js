const db = require('../db/sqlite');
const crypto = require('crypto');

function auditLog(action, getEntityDetails) {
  return async (req, res, next) => {
    // We want to log AFTER the request finishes to capture success/failure if possible,
    // but the simplest is to log what the user is attempting.
    // Or we can hook into res.on('finish')
    
    res.on('finish', async () => {
      // Only log successful modifications
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const user = req.user;
          if (!user) return;

          const { entity, entityId, details } = typeof getEntityDetails === 'function' ? getEntityDetails(req, res) : getEntityDetails;

          const logId = crypto.randomUUID();
          const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

          await db.run(
            `INSERT INTO audit_logs (id, companyId, userId, action, entity, entityId, detailsJson, ipAddress, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              logId,
              user.companyId,
              user.id,
              action,
              entity,
              entityId || null,
              details ? JSON.stringify(details) : null,
              ipAddress,
              new Date().toISOString()
            ]
          );
        } catch (err) {
          console.error('Audit Log Error:', err);
        }
      }
    });

    next();
  };
}

module.exports = { auditLog };
