import React, { useMemo, useState, useEffect } from 'react';

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


export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const monthKey = useMemo(() => `${year}-${String(month).padStart(2, '0')}`, [month, year]);

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
    // Try load default current month; if not found, page still usable.
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <h2>Reports</h2>
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
            <button className="primary" onClick={loadSummary} style={{ width: '100%' }}>
              Get Summary
            </button>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {summary ? (
          <div className="alert ok">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Payroll Run</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{summary.monthKey}</div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Net Total</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{Number(summary.totals.net).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Base</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{Number(summary.totals.base).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            No summary loaded for <span className="mono">{monthKey}</span>. Run payroll first.
          </div>
        )}
      </div>
    </div>
  );
}

