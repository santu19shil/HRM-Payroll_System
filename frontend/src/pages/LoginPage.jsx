import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({ employeeId: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('id');

  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role_name || user.role || localStorage.getItem('userRole');
      if (role === 'SUPER_ADMIN' || role === 'HR_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const identifier = loginMode === 'id' ? formData.employeeId : formData.email;
    if (!identifier || !formData.password) {
      toast.error('Please enter your credentials');
      return;
    }

    setLoading(true);
    try {
      const credentials = {
        employeeId: loginMode === 'id' ? identifier : undefined,
        email: loginMode === 'email' ? identifier : undefined,
        password: formData.password
      };

      await login(credentials);
      toast.success('Login successful!');

      // Redirect is handled by useEffect watching isAuthenticated/user
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Enterprise HRMS</h1>
          <p>Payroll Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`btn btn-sm ${loginMode === 'id' ? 'btn-primary' : ''}`}
              onClick={() => setLoginMode('id')}
              style={{ flex: 1 }}
            >
              Employee ID
            </button>
            <button
              type="button"
              className={`btn btn-sm ${loginMode === 'email' ? 'btn-primary' : ''}`}
              onClick={() => setLoginMode('email')}
              style={{ flex: 1 }}
            >
              Email
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">
              {loginMode === 'id' ? 'Employee ID' : 'Company Email'}
            </label>
            <input
              type={loginMode === 'email' ? 'email' : 'text'}
              className="form-input"
              placeholder={loginMode === 'id' ? 'Enter your Employee ID' : 'Enter your email'}
              value={loginMode === 'id' ? formData.employeeId : formData.email}
              onChange={(e) => {
                if (loginMode === 'id') {
                  setFormData({ ...formData, employeeId: e.target.value });
                } else {
                  setFormData({ ...formData, email: e.target.value });
                }
              }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '13px'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '14px', textDecoration: 'none' }}>
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}

