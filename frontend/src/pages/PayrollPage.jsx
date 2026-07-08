import React, { useEffect, useState } from 'react';
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
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}


export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [payrollRun, setPayrollRun] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadRuns() {
    try {
      const data = await api('/api/payroll/runs');
      setHistory(data.payrollRuns || []);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function runPayroll() {
    setError('');
    setRunning(true);
    setPayrollRun(null);
    try {
      const data = await api('/api/payroll/run', {
        method: 'POST',
        body: JSON.stringify({ month, year })
      });
      setPayrollRun(data.payrollRun);
      await loadRuns();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <h2>Run Payroll</h2>
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
            <button className="good" onClick={runPayroll} disabled={running} style={{ width: '100%' }}>
              {running ? 'Running...' : 'Run Payroll'}
            </button>
          </div>
        </div>
        <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
          This creates a snapshot for the selected month/year. Duplicate runs are blocked.
        </div>
      </div>

      <PayrollSummary payrollRun={payrollRun} />

      <div className="card">
        <h2>Payroll History</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Employees</th>
              <th>Net Total</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>No runs yet.</td></tr>
            ) : (
              history.map(r => (
                <tr key={r.runId}>
                  <td style={{ fontWeight: 900 }}>{r.monthKey}</td>
                  <td>{r.lineItems.length}</td>
                  <td className="mono">{Number(r.totals.net).toFixed(2)}</td>
                  <td style={{ color: 'var(--muted)' }}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

