import React, { useState, useEffect, useMemo } from 'react';
import { payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SECTION_LABELS = {
  EARNING: 'Earnings (Additions)',
  DEDUCTION: 'Deductions',
  EMPLOYER: 'Employer Contributions'
};

export default function SalaryStructureModal({ employeeId, employeeName, onClose, onSaved }) {
  const [basic, setBasic] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [compRes, structRes] = await Promise.all([
          payrollAPI.getComponents(),
          payrollAPI.getEmployeeSalaryStructure(employeeId)
        ]);
        const data = structRes.data.data || {};
        setBasic(data.basic_salary ? String(data.basic_salary) : '');
        const structureComponents = data.components || [];
        const merged = (compRes.data.data || []).map(c => {
          const sc = structureComponents.find(s => s.component_id === c.id);
          const calcType = sc ? sc.calculation_type : c.calculation_type;
          const calcValue = sc ? sc.calculation_value : c.calculation_value;
          return {
            component_id: c.id,
            name: c.name,
            code: c.code,
            type: c.type,
            category: c.category,
            calculation_type: calcType,
            calculation_value: calcValue === 0 || calcValue === '0' ? '' : String(calcValue)
          };
        }).filter(c => c.code !== 'BASIC');
        setRows(merged);
      } catch (err) {
        toast.error('Failed to load salary structure');
      } finally {
        setLoading(false);
      }
    })();
  }, [employeeId]);

  const preview = (row) => {
    const base = parseFloat(basic) || 0;
    const val = parseFloat(row.calculation_value);
    if (isNaN(val)) return 0;
    return row.calculation_type === 'PERCENTAGE'
      ? Math.round((base * val) / 100)
      : Math.round(val);
  };

  const setRow = (component_id, patch) => {
    setRows(rs => rs.map(r => (r.component_id === component_id ? { ...r, ...patch } : r)));
  };

  const grouped = useMemo(() => {
    const g = { EARNING: [], DEDUCTION: [], EMPLOYER: [] };
    rows.forEach(r => { g[r.category === 'EMPLOYER' ? 'EMPLOYER' : r.type].push(r); });
    return g;
  }, [rows]);

  const handleSave = async () => {
    try {
      const payload = {
        basic_salary: parseFloat(basic) || 0,
        components: rows
          .filter(r => r.calculation_value !== '' && r.calculation_value != null)
          .map(r => ({
            component_id: r.component_id,
            calculation_type: r.calculation_type,
            calculation_value: parseFloat(r.calculation_value)
          }))
      };
      await payrollAPI.updateSalaryStructure(employeeId, payload);
      toast.success('Salary structure saved');
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const renderRow = (row) => (
    <div key={row.component_id} className="salary-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ flex: 1, fontWeight: 600 }}>{row.name}</div>
      <select
        className="form-select"
        style={{ width: 90 }}
        value={row.calculation_type}
        onChange={(e) => setRow(row.component_id, { calculation_type: e.target.value })}
      >
        <option value="FIXED">₹ Fixed</option>
        <option value="PERCENTAGE">% Basic</option>
      </select>
      <input
        type="number"
        className="form-input"
        style={{ width: 110 }}
        placeholder="0"
        step="any"
        value={row.calculation_value}
        onChange={(e) => setRow(row.component_id, { calculation_value: e.target.value })}
        onFocus={(e) => e.target.select()}
      />
      <div style={{ width: 130, textAlign: 'right', color: 'var(--primary)', fontWeight: 700 }}>
        = ₹{preview(row).toLocaleString()}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Salary Structure - {employeeName}</div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>Loading…</div>
          ) : (
            <>
              <div className="form-group" style={{ maxWidth: 300, marginBottom: 16 }}>
                <label className="form-label">Basic Salary (₹)</label>
                <input type="number" className="form-input" value={basic} placeholder="0" step="any" onChange={(e) => setBasic(e.target.value)} onFocus={(e) => e.target.select()} />
              </div>

              {['EARNING', 'DEDUCTION', 'EMPLOYER'].map(section => (
                <div key={section} style={{ marginBottom: 18 }}>
                  <div className="card-subtitle" style={{ marginBottom: 4 }}>{SECTION_LABELS[section]}</div>
                  <div className="salary-row" style={{ display: 'flex', fontWeight: 800, fontSize: 12, color: '#64748b', paddingBottom: 6 }}>
                    <div style={{ flex: 1 }}>Component</div>
                    <div style={{ width: 90, textAlign: 'center' }}>Type</div>
                    <div style={{ width: 110, textAlign: 'center' }}>Value</div>
                    <div style={{ width: 130, textAlign: 'right' }}>Calculated</div>
                  </div>
                  {grouped[section].length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}>No components.</div>
                  ) : (
                    grouped[section].map(renderRow)
                  )}
                </div>
              ))}

              <div style={{ fontSize: 12, color: '#64748b' }}>
                Enter a fixed amount (₹) or a percentage of Basic Salary. The calculated amount updates automatically.
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading}>Save Structure</button>
        </div>
      </div>
    </div>
  );
}
