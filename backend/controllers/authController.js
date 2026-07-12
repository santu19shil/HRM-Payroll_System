const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../middleware/authMiddleware');
const { success, created, badRequest, unauthorized, notFound, error } = require('../utils/response');
const { generateId } = require('../utils/helpers');
// const { forbidden } = require('../utils/response');

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Login - Auto detects role from database
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { employeeId, email, password } = req.body;
    
    if ((!employeeId && !email) || !password) {
      return badRequest(res, 'Employee ID/Email and password are required');
    }

    // Find user by employee_id or email
    const identifier = employeeId || email;
    const [users] = await pool.query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE (u.employee_id = ? OR u.email = ?) AND u.is_active = 1',
      [identifier, identifier]
    );

    if (!users || users.length === 0) {
      return unauthorized(res, 'Invalid credentials');
    }

    const user = users[0];
    
    // Verify password
    // All users (including SUPER_ADMIN) are stored as bcrypt hashes.
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return unauthorized(res, 'Invalid credentials');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role_name,
      mustChangePassword: user.must_change_password === 1
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store refresh token in database
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    
    await pool.query(
      'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ?, last_login_at = NOW() WHERE id = ?',
      [refreshToken, refreshExpires, user.id]
    );

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    const responseData = {
      accessToken,
      user: {
        id: user.id,
        employeeId: user.employee_id,
        email: user.email,
        role: user.role_name,
        mustChangePassword: user.must_change_password === 1,
      // Temp password must never be returned to clients/admin.
      isTempPassword: false
      }
    };

    return success(res, responseData, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Login failed');
  }
};

/**
 * Refresh Token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!token) {
      return unauthorized(res, 'Refresh token is required');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return unauthorized(res, 'Invalid or expired refresh token');
    }

    // Verify token exists in database
    const [users] = await pool.query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.refresh_token = ? AND u.is_active = 1',
      [decoded.userId, token]
    );

    if (!users || users.length === 0) {
      return unauthorized(res, 'Refresh token has been revoked');
    }

    const user = users[0];

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role_name,
      mustChangePassword: user.must_change_password === 1
    };

    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    // Update refresh token
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    
    await pool.query(
      'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?',
      [newRefreshToken, refreshExpires, user.id]
    );

    // Set new cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    return success(res, { accessToken }, 'Token refreshed successfully');
  } catch (err) {
    console.error('Refresh token error:', err);
    return error(res, 'Token refresh failed');
  }
};

/**
 * Change Password (First login or any time)
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return badRequest(res, 'All password fields are required');
    }

    if (newPassword !== confirmPassword) {
      return badRequest(res, 'New password and confirm password do not match');
    }

    if (newPassword.length < 8) {
      return badRequest(res, 'Password must be at least 8 characters long');
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return badRequest(res, 'Password must contain at least one uppercase, one lowercase, one number and one special character');
    }

    // Verify current password
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return notFound(res, 'User not found');
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return badRequest(res, 'Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = ?, is_temp_password = 0, must_change_password = 0 WHERE id = ?',
      [passwordHash, userId]
    );

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    console.error('Change password error:', err);
    return error(res, 'Failed to change password');
  }
};

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return badRequest(res, 'Email is required');
    }

    // Always return success to prevent email enumeration
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    
    if (users && users.length > 0) {
      // Send reset email (development-friendly)
      // NOTE: This system currently doesn't implement a persistent token table.
      // If you have one, we can extend this to store/verify tokens.
      const resetLink = `http://localhost:5173/reset-password?email=${encodeURIComponent(email)}`;

      // Reuse sendEmail directly to ensure email actually sends
      // eslint-disable-next-line global-require
      const { sendEmail } = require('../config/email');
      await sendEmail({
        to: email,
        subject: 'Reset your HRMS password',
        html: `
          <p>You requested a password reset.</p>
          <p><a href="${resetLink}">Reset password</a></p>
          <p>If you didn\'t request this, ignore this email.</p>
        `
      });
    }

    return success(res, null, 'If the email exists in our system, a password reset link has been sent');
  } catch (err) {
    console.error('Forgot password error:', err);
    return error(res, 'Failed to process request');
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [users] = await pool.query(
      `SELECT u.id, u.employee_id, u.email, u.is_temp_password, u.must_change_password, u.last_login_at, u.is_active,
              r.name as role_name,
              e.id as employee_record_id, e.first_name, e.last_name, e.profile_picture,
              e.department_id, e.designation_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN employees e ON u.id = e.user_id 
       WHERE u.id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return notFound(res, 'User not found');
    }

    // If user is not linked to an employees row, return safe defaults to avoid null-field issues in UI.
    // Note: self-service endpoints like /api/employees/profile will still 404 until the DB linkage exists.
    const row = users[0];

    // Unread counts for sidebar badges (based on notifications)
    const [unreadLeaves] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND category = ? AND is_read = 0',
      [userId, 'LEAVE']
    ).catch(() => [{ count: 0 }]);

    const [unreadDocs] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND category = ? AND is_read = 0',
      [userId, 'DOCUMENT']
    ).catch(() => [{ count: 0 }]);

    return success(res, {
      ...row,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      profile_picture: row.profile_picture ?? null,
      department_id: row.department_id ?? null,
      designation_id: row.designation_id ?? null,
      unreadLeavesCount: unreadLeaves?.[0]?.count ?? 0,
      unreadDocumentsCount: unreadDocs?.[0]?.count ?? 0
    });
  } catch (err) {
    console.error('Get current user error:', err);
    return error(res, 'Failed to get user details');
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (userId) {
      await pool.query(
        'UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ?',
        [userId]
      );
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    console.error('Logout error:', err);
    return error(res, 'Failed to logout');
  }
};

/**
 * Soft-delete current user account (self-service)
 * DELETE /api/auth/me
 */
const deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return unauthorized(res, 'Access token is required');
    }

    // If you want to prevent deleting SUPER_ADMIN, you can uncomment the check below.
    // const [roleRows] = await pool.query('SELECT r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [userId]);
    // const roleName = roleRows?.[0]?.role_name;
    // if (roleName === 'SUPER_ADMIN') return forbidden(res, 'Cannot delete this account');

    // Write audit record for self-deactivation
    await pool.query(
      `INSERT INTO activity_logs (id, user_id, employee_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent, created_at)
       SELECT ?, u.id, e.id, ?, 'USER', u.id, ?, ?, ?, ?, NOW()
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = ?`,
      [
        generateId(),
        userId,
        'SELF_DEACTIVATE',
        'User initiated soft-deactivation of their own account',
        JSON.stringify({ reason: 'self', revokes_tokens: true }),
        null,
        null,
        null,
        userId
      ]
    );

    await pool.query('UPDATE users SET is_active = 0, refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ?', [userId]);

    // Also deactivate linked employee record if present
    await pool.query('UPDATE employees SET is_active = 0 WHERE user_id = ?', [userId]).catch(() => undefined);

    res.clearCookie('refreshToken', { path: '/api/auth' });
    return success(res, null, 'Account deactivated successfully');
  } catch (err) {
    console.error('Delete my account error:', err);
    return error(res, 'Failed to deactivate account');
  }
};

module.exports = {
  login,
  refreshToken,
  changePassword,
  forgotPassword,
  getCurrentUser,
  logout,
  deleteMyAccount
};
