import React, { useEffect, useMemo, useState } from 'react';
import PayrollSummary from '../components/PayrollSummary.jsx';

async function api(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function getSelf() {
  const token = localStorage.getItem('accessToken');
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return { userId: payload?.userId, role: payload?.role };
  } catch {
    return { userId: null, role: null };
  }
}

export default function EmployeeSelfPage() {
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);

  const self = useMemo(() => getSelf(), []);

  async function loadSummary() {
    setError('');
    setSummary(null);
    try {
      const data = await api(`/api/reports/summary?month=${month}&year=${year}`);
      setSummary(data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <h2>My Payroll Summary</h2>
        <div className="grid grid3">
          <div>
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="primary" onClick={loadSummary} style={{ width: '100%' }}>Get Summary</button>
          </div>
        </div>
        <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
          Self view only (UI). Backend currently returns full totals for the company.
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {/* Use existing PayrollSummary component only when a full payrollRun object exists */}
        {summary ? (
          <div className="card">
            <h2>Totals • {summary.monthKey}</h2>
            <div className="grid grid3">
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Net</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{Number(summary.totals.net).toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Base</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{Number(summary.totals.base).toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Deductions</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{Number(summary.totals.deductions).toFixed(2)}</div>
              </div>
            </div>
            <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
              Self userId: <span className="mono">{self.userId || 'unknown'}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

