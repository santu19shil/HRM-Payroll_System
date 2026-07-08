import React, { useEffect, useMemo, useState } from 'react';

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

function Money({ value }) {
  const num = Number(value ?? 0);
  return <span className="mono">{num.toFixed(2)}</span>;
}

export default function AdminPayrollSlipsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [error, setError] = useState('');

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  async function loadEmployees() {
    setLoadingEmployees(true);
    setError('');
    try {
      const data = await api('/api/employees');
      setEmployees(data.employees || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingEmployees(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const runKey = useMemo(() => {
    const m = String(month).padStart(2, '0');
    return `${year}-${m}`;
  }, [month, year]);

  async function loadDetailsForEmployee(empId) {
    setError('');
    setDetails(null);
    setLoadingDetails(true);

    try {
      const data = await api(
        `/api/admin/payroll/slips/employee?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}&employeeId=${encodeURIComponent(empId)}`
      );
      setDetails(data);
      if (!data?.employee?.userId) {
        setError('Credentials not found for this employee (employee name mapping issue in backend).');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDetails(false);
    }

  }

  useEffect(() => {
    if (!selectedEmployeeId) return;
    // Reload slip details whenever month/year changes.
    loadDetailsForEmployee(selectedEmployeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);


  return (
    <div>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <h2>Payroll Slips (Admin)</h2>
        <div className="grid grid3" style={{ alignItems: 'end' }}>
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
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>Run Key</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 900 }}>{runKey}</div>
          </div>
        </div>

        <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
          Click an employee name to view decrypted credentials and payroll slip totals for the selected month/year.
        </div>
      </div>

      <div className="card">
        <h2>Employees</h2>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>
          {loadingEmployees ? 'Loading employees…' : `${employees.length} employees`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {employees.length === 0 ? (
            <div style={{ color: 'var(--muted)' }}>No employees yet.</div>
          ) : (
            employees.map((e) => {
              const isSelected = String(e.id) === String(selectedEmployeeId);
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEmployeeId(e.id)}
                  className={isSelected ? 'primary' : ''}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  disabled={loadingDetails}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 900 }}>{e.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{e.department}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <h2>Employee Details</h2>

        {!details && !loadingDetails ? (
          <div style={{ color: 'var(--muted)' }}>
            Select an employee to view their credentials + slip totals.
          </div>
        ) : null}

        {loadingDetails ? (
          <div style={{ color: 'var(--muted)' }}>Loading details…</div>
        ) : null}

        {details ? (
          <>
            {(!details.employee?.userId && !details.employee?.password) ? (
              <div className="alert error" style={{ marginBottom: 12 }}>
                Credentials not found for this employee. Slip totals are available.
              </div>
            ) : null}
            <div className="grid grid3">
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Employee</div>
                <div style={{ fontWeight: 900 }}>{details.employee.employeeName}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{details.employee.department}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Credentials</div>
                <div style={{ marginTop: 6 }}>
                  User ID: <span className="mono">{details.employee.userId}</span>
                </div>
                <div>
                  Password: <span className="mono">{details.employee.password}</span>
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Payroll</div>
                <div style={{ marginTop: 6 }}>
                  MonthKey: <span className="mono">{details.monthKey}</span>
                </div>
                <div>
                  Run ID: <span className="mono">{details.runId}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>Slip Totals</div>
              <div className="grid grid3">
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Base</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}><Money value={details.slip.baseSalaryMonthly} /></div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Bonuses</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}><Money value={details.slip.bonusesMonthly} /></div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Deductions</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}><Money value={details.slip.deductionsMonthly} /></div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Net Salary</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 950 }}><Money value={details.slip.netSalary} /></div>
              </div>

              <div className="btnrow" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                <a
                  className="primary"
                  href={`/api/admin/payroll/slips/${encodeURIComponent(details.runId)}/${encodeURIComponent(details.employee.employeeId)}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}
                >
                  Download PDF
                </a>

                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  Generated: {details.createdAt ? new Date(details.createdAt).toLocaleString() : '—'}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

