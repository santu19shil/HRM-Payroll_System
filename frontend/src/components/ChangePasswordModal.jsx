import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ChangePasswordModal({ onClose }) {
  const { changePassword, user, loadUser } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      toast.error('Password must contain uppercase, lowercase, number and special character');
      return;
    }

    setLoading(true);
    try {
      await changePassword(formData);
      toast.success('Password changed successfully!');
      await loadUser();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Set New Password</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
              This is your first login. Please set a new password to continue.
            </p>
            
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your temporary password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter your new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}