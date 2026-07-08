import React, { useEffect, useMemo, useState } from 'react';

export default function EmployeeForm({ onSubmit, onCancel, initial }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    baseSalaryMonthly: '',
    deductionsMonthly: '',
    bonusesMonthly: ''
  });

  useEffect(() => {
    if (!initial) return;
    setForm({
      name: initial.name ?? '',
      email: initial.email ?? '',
      department: initial.department ?? '',
      baseSalaryMonthly: initial.baseSalaryMonthly ?? 0,
      deductionsMonthly: initial.deductionsMonthly ?? 0,
      bonusesMonthly: initial.bonusesMonthly ?? 0
    });
  }, [initial]);

  const netPreview = useMemo(() => {
    const base = Number(form.baseSalaryMonthly || 0);
    const ded = Number(form.deductionsMonthly || 0);
    const bon = Number(form.bonusesMonthly || 0);
    return base + bon - ded;
  }, [form]);

  function setNum(key) {
    return (e) => {
      const v = e.target.value;
      // Allow clearing the input (so user can delete the default 0).
      setForm((p) => ({ ...p, [key]: v === '' ? '' : Number(v) }));
    };
  }

  function handleSubmit() {
    // Normalize empty fields to 0 for backend consistency.
    const normalized = {
      ...form,
      baseSalaryMonthly: Number(form.baseSalaryMonthly || 0),
      deductionsMonthly: Number(form.deductionsMonthly || 0),
      bonusesMonthly: Number(form.bonusesMonthly || 0)
    };
    onSubmit(normalized);
  }

  return (
    <div className="card">
      <h2>{initial ? 'Edit Employee' : 'Add Employee'}</h2>
      <div className="grid grid3">
        <div>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Employee name" />
        </div>
        <div>
          <label>Email</label>
          <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="employee@email.com" />
        </div>
        <div>
          <label>Department</label>
          <input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="Engineering" />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="grid grid3">
        <div>
          <label>Base Salary (Monthly)</label>
          <input type="number" value={form.baseSalaryMonthly} onChange={setNum('baseSalaryMonthly')} />
        </div>
        <div>
          <label>Deductions (Monthly)</label>
          <input type="number" value={form.deductionsMonthly} onChange={setNum('deductionsMonthly')} />
        </div>
        <div>
          <label>Bonuses (Monthly)</label>
          <input type="number" value={form.bonusesMonthly} onChange={setNum('bonusesMonthly')} />
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div className="alert">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Net Salary Preview</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900 }}>{Number(netPreview).toFixed(2)}</div>
          </div>
          <div className="btnrow">
            <button className="primary" onClick={handleSubmit}>
              {initial ? 'Update Employee' : 'Add Employee'}
            </button>
            {initial && (
              <button onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

