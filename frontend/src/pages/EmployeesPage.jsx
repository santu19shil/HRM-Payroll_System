import React, { useEffect, useMemo, useState } from 'react';
import EmployeeForm from '../components/EmployeeForm.jsx';
import EmployeeTable from '../components/EmployeeTable.jsx';

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
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}


export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/employees');
      setEmployees(data.employees || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const base = employees.reduce((a, e) => a + Number(e.baseSalaryMonthly || 0), 0);
    const ded = employees.reduce((a, e) => a + Number(e.deductionsMonthly || 0), 0);
    const bon = employees.reduce((a, e) => a + Number(e.bonusesMonthly || 0), 0);
    return { base, ded, bon, net: base + bon - ded };
  }, [employees]);

  async function handleSubmit(form) {
    setError('');
    try {
      if (editing) {
        await api(`/api/employees/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        await api('/api/employees', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(emp) {
    const ok = window.confirm(`Delete employee "${emp.name}"?`);
    if (!ok) return;
    setError('');
    try {
      await api(`/api/employees/${emp.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="alert error">{error}</div>}

      <EmployeeForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSubmit={handleSubmit}
      />

      <div className="card">
        <h2>Monthly Totals (Based on Employees)</h2>
        <div className="grid grid3">
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Base</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{totals.base.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Deductions</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{totals.ded.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Net</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{totals.net.toFixed(2)}</div>
          </div>
        </div>
        <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
          Payroll Run page will snapshot these values per selected month/year.
        </div>
      </div>

      <div style={{ opacity: loading ? 0.7 : 1, transition: 'opacity .2s' }}>
        <EmployeeTable
          employees={employees}
          onEdit={(e) => setEditing(e)}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

