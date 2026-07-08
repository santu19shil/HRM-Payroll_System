import React from 'react';

function Money({ value }) {
  const num = Number(value ?? 0);
  return <span className="mono">{num.toFixed(2)}</span>;
}

export default function PayrollSummary({ payrollRun }) {
  if (!payrollRun) return null;

  return (
    <div className="card">
      <h2>Payroll Summary • {payrollRun.monthKey}</h2>
      <div className="grid grid3">
        <div>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Base</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}><Money value={payrollRun.totals.base} /></div>
        </div>
        <div>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Deductions</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}><Money value={payrollRun.totals.deductions} /></div>
        </div>
        <div>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Net</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}><Money value={payrollRun.totals.net} /></div>
        </div>
      </div>

      <div style={{ height: 10 }} />

      <table className="table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Dept</th>
            <th>Base</th>
            <th>Deductions</th>
            <th>Bonuses</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {payrollRun.lineItems.map((it) => (
            <tr key={it.employeeId}>
              <td style={{ fontWeight: 800 }}>{it.employeeName}</td>
              <td>{it.department}</td>
              <td><Money value={it.baseSalaryMonthly} /></td>
              <td><Money value={it.deductionsMonthly} /></td>
              <td><Money value={it.bonusesMonthly} /></td>
              <td><Money value={it.netSalary} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 12 }}>
        Created: {new Date(payrollRun.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

