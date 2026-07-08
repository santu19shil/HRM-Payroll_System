import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function AuthPage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [role, setRole] = useState('ADMIN'); // ADMIN | EMPLOYEE
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);



  useEffect(() => {

    // If token exists, send user to Employees
    const t = localStorage.getItem('accessToken');
    if (t) nav('/employees');
  }, [nav]);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const payload = {
        role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
        userId,
        password
      };

      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      localStorage.setItem('accessToken', data.accessToken);
      if (data.companyId) localStorage.setItem('companyId', data.companyId);

      // Route by role
      nav(role === 'ADMIN' ? '/employees' : '/payroll');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Login</h2>
      <div className="grid grid2">
          <div>
            <label>Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={loading}>
              <option value="ADMIN">Admin (HR)</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          <div>
            <label>Credentials</label>
            <div style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(0,0,0,.15)' }}>
              Enter your login details.
              <br />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>Admin/HR & Employee users are created/assigned in the system.</span>
              <div style={{ height: 8 }} />
              <a href="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: 13 }}>
                Forgot password?
              </a>
            </div>
          </div>
        </div>


        {error && <div className="alert error" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ height: 12 }} />

        <div className="grid grid2">
          <div>
            <label>User ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label>Password</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={loading}
                style={{ padding: '8px 10px' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

        </div>

        <div style={{ height: 16 }} />

        <div className="btnrow">
          <button className="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </button>
          <button
            disabled={loading}
            onClick={() => {
              setError('');
              setUserId('');
              setPassword('');
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

