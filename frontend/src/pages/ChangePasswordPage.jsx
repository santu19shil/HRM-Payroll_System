import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, user, loadUser, logout } = useAuth();
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
      toast.error('Passwords do not match');
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
      // ProtectedRoute will stop forcing /change-password once must_change_password is cleared.
      const role = localStorage.getItem('userRole');
      if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <div className="auth-aside-brand">
          <span className="landing-brand-logo"><ShieldCheck size={20} color="#fff" strokeWidth={2.4} /></span>
          <span>Enterprise HRMS</span>
        </div>
        <div className="auth-aside-content">
          <h2>Set your new password</h2>
          <p>You are logged in with a temporary password. Please set a new password to continue.</p>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <h1>Change Password</h1>
          <p>Enter your temporary password, then set a new one</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password (Temporary)</label>
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

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Updating...' : 'Set New Password'}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleLogout}
            style={{ width: '100%', marginTop: '12px' }}
          >
            <LogOut size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}