import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setStatus('');
    setLoading(true);
    try {
      const data = await api('/api/auth/reset-password', { token, password });
      setStatus(data?.message || 'Password updated.');
      // After success, go to login.
      setTimeout(() => nav('/login'), 800);
    } catch (e) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Reset Password</h2>
      <div style={{ height: 8 }} />
      <label>New Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div style={{ height: 12 }} />
      <div className="btnrow">
        <button className="primary" onClick={submit} disabled={loading || !token}>
          {loading ? 'Updating...' : 'Reset Password'}
        </button>
        <button onClick={() => nav('/login')}>Back to Login</button>
      </div>
      {status && <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>{status}</div>}
      {token ? (
        <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 12 }}>
          Token from URL: <span className="mono">{token}</span>
        </div>
      ) : (
        <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 12 }}>
          No token found in URL.
        </div>
      )}
    </div>
  );
}

