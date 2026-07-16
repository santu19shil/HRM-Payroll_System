import React from 'react';

function Money({ value }) {
  const num = Number(value ?? 0);
  return <span className="mono">{num.toFixed(2)}</span>;
}

export default function EmployeeTable({ employees, onEdit, onDelete }) {
  return (
    <div className="card comp">
      <table className="table compact">
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Email</th>
            <th>Base</th>
            <th>Deductions</th>
            <th>Bonuses</th>
            <th>Net</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ color: 'var(--muted)' }}>No employees yet.</td>
            </tr>
          ) : (
            employees.map((e) => {
              const net = Number(e.baseSalaryMonthly || 0) + Number(e.bonusesMonthly || 0) - Number(e.deductionsMonthly || 0);
              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 700 }}>{e.name}</td>
                  <td>{e.department}</td>
                  <td style={{ color: 'var(--muted)' }}>{e.email}</td>
                  <td><Money value={e.baseSalaryMonthly} /></td>
                  <td><Money value={e.deductionsMonthly} /></td>
                  <td><Money value={e.bonusesMonthly} /></td>
                  <td><Money value={net} /></td>
                  <td>
                    <div className="btnrow" style={{ gap: 8 }}>
                      <button onClick={() => onEdit(e)} className="primary">Edit</button>
                      <button onClick={() => onDelete(e)} className="danger">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

