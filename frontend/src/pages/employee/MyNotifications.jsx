import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await notificationAPI.getMy();
      setNotifications(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      loadData();
    } catch (err) { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      toast.success('All marked as read');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const getTypeIcon = (type) => {
    const map = { 'INFO': 'ℹ️', 'SUCCESS': '✅', 'WARNING': '⚠️', 'ERROR': '❌' };
    return map[type] || 'ℹ️';
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <button className="btn btn-sm" onClick={handleMarkAllRead}>Mark All as Read</button>
        </div>
      </div>

      <div className="card">
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => !n.is_read && handleMarkRead(n.id)}
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              cursor: n.is_read ? 'default' : 'pointer',
              background: n.is_read ? 'transparent' : '#f8fafc',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: 20 }}>{getTypeIcon(n.type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: n.is_read ? 400 : 600, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{n.message}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
            {!n.is_read && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 6 }}></span>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-text">You're all caught up!</div>
          </div>
        )}
      </div>
    </div>
  );
}