const pool = require('../config/database');
const { success, badRequest, error } = require('../utils/response');
const { generateId } = require('../utils/helpers');

/**
 * Get counts for sidebar badges.
 * Returns unread notification counts by category for the current user
 * (works for both admin and employee).
 * GET /api/notifications/counts
 */
const getCounts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [leaves] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND category = ? AND is_read = 0',
      [userId, 'LEAVE']
    );
    const [docs] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND category = ? AND is_read = 0',
      [userId, 'DOCUMENT']
    );
    const [notifs] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return success(res, {
      leaves: leaves[0].count,
      documents: docs[0].count,
      notifications: notifs[0].count
    });
  } catch (err) {
    console.error('Get counts error:', err);
    return error(res, 'Failed to fetch counts');
  }
};

/**
 * Mark all notifications of a category as read (clears sidebar badge on view)
 * PUT /api/notifications/read-category  { category }
 */
const markCategoryRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category } = req.body;
    if (!category) return badRequest(res, 'Category is required');

    await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND category = ? AND is_read = 0',
      [userId, category]
    );
    return success(res, null, 'Notifications marked as read');
  } catch (err) {
    console.error('Mark category read error:', err);
    return error(res, 'Failed to mark as read');
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [userId]
    );

    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: notifications,
      unread_count: unreadCount[0].count,
      pagination: {
        total: countResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    return error(res, 'Failed to fetch notifications');
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return success(res, null, 'Notification marked as read');
  } catch (err) {
    console.error('Mark notification error:', err);
    return error(res, 'Failed to mark notification as read');
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    console.error('Mark all notifications error:', err);
    return error(res, 'Failed to mark all as read');
  }
};

module.exports = { getMyNotifications, getCounts, markCategoryRead, markAsRead, markAllAsRead };