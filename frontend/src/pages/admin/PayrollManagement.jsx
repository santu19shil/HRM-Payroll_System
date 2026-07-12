import React, { useState, useEffect } from 'react';
import { payrollAPI, employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatPayrollAmount, getPayrollStatusBadge } from '../../utils/payrollHelpers';
import ActionMenu from '../../components/ActionMenu';
import SalaryStructureModal from './SalaryStructureModal';

const safeParse = (v) => {
  try {
    const a = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

export default function PayrollManagement() {
  const [runs, setRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [salaryEdit, setSalaryEdit] = useState(null);
  const [viewRun, setViewRun] = useState(null);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [runDetails, setRunDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [tab, setTab] = useState('payslips');

  useEffect(() => {
    loadData();
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadData = async () => {
    try {
      const [runsRes, empRes, payslipsRes] = await Promise.allSettled([
        payrollAPI.getRuns(),
        employeeAPI.getAll({ limit: 100 }),
        payrollAPI.getAllPayslips()
      ]);
      if (runsRes.status === 'fulfilled') setRuns(runsRes.value.data.data || []);
      else toast.error('Failed to load payroll runs');
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data.data || []);
      else toast.error('Failed to load employees');
      if (payslipsRes.status === 'fulfilled') setPayslips(payslipsRes.value.data.data || []);
      else toast.error('Failed to load payslips');
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openEditSalary = (emp) => setSalaryEdit({ id: emp.id, name: emp.name });

  const handleProcessAll = async () => {
    if (!window.confirm(`Process payroll for all employees for ${month}/${year}?`)) return;
    setProcessing(true);
    try {
      const res = await payrollAPI.process({ month, year });
      toast.success(`Payroll processed! Net pay: ₹${res.data.data.totals?.net?.toLocaleString() || 'N/A'}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    setShowGenerateModal(false);
    setProcessing(true);
    try {
      const res = await payrollAPI.generate({ month, year, employeeIds: selectedEmployees });
      toast.success(`Payslips generated for ${selectedEmployees.length} employees`);
      setSelectedEmployees([]);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPayslip = async (id) => {
    try {
      const res = await payrollAPI.downloadPayslip(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payslip downloaded');
    } catch (err) {
      toast.error('Failed to download payslip');
    }
  };

  const handleDownloadRun = async (run) => {
    try {
      const res = await payrollAPI.getAllPayslips();
      const allPayslips = res.data.data || [];
      const runPayslips = allPayslips.filter(p => p.payroll_run_id === run.id || p.runId === run.id);
      if (runPayslips.length === 0) {
        toast.error('No payslips to download');
        return;
      }
      for (const p of runPayslips) {
        await handleDownloadPayslip(p.id);
      }
      toast.success(`Downloading ${runPayslips.length} payslips`);
    } catch (err) {
      toast.error('Failed to download payslips');
    }
  };

  const handleViewRun = async (run) => {
    setViewRun(run);
    setLoadingDetails(true);
    try {
      const res = await payrollAPI.getAllPayslips();
      const allPayslips = res.data.data || [];
      const runPayslips = allPayslips.filter(p => p.payroll_run_id === run.id || p.runId === run.id);
      setRunDetails(runPayslips);
    } catch (err) {
      setRunDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteRun = async (run) => {
    if (!window.confirm(`Delete payroll run for ${months[run.month]} ${run.year}? This will also delete all payslips for this run.`)) return;
    try {
      await payrollAPI.deleteRun(run.id || run.runId);
      toast.success('Payroll run deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeletePayslip = async (p) => {
    if (!window.confirm(`Delete payslip for ${p.employee_name} (${months[p.month]} ${p.year})?`)) return;
    try {
      await payrollAPI.deletePayslip(p.id);
      toast.success('Payslip deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete payslip');
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Payroll Management</h1>
        <p>Process salaries, manage structures, and distribute payslips across the organization.</p>
      </div>

      <div className="grid-stat">
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-content">
            <div className="stat-label">Employees</div>
            <div className="stat-value">{employees.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo">📄</div>
          <div className="stat-content">
            <div className="stat-label">Payroll Runs</div>
            <div className="stat-value">{runs.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🧾</div>
          <div className="stat-content">
            <div className="stat-label">Payslips</div>
            <div className="stat-value">{payslips.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-content">
            <div className="stat-label">Latest Net Payroll</div>
            <div className="stat-value">₹{runs[0] ? Number(runs[0].total_net_pay || 0).toLocaleString() : '0'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Run Payroll</div>
            <div className="card-subtitle">Choose a period and process for all or selected employees</div>
          </div>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="toolbar-left">
            <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 140 }}>
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input type="number" className="form-input" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 110 }} />
          </div>
          <div className="toolbar-right">
            <button className="btn btn-primary" onClick={handleProcessAll} disabled={processing}>
              {processing ? 'Processing...' : 'Process All'}
            </button>
            <button className="btn" onClick={() => setShowGenerateModal(true)} disabled={processing || selectedEmployees.length === 0}>
              Generate Selected ({selectedEmployees.length})
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Employees</div>
            <div className="card-subtitle">Set bonus, deductions, and tax percentage for each employee</div>
          </div>
          <span style={{ fontSize: 22 }}>🧑‍💼</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={selectedEmployees.length === employees.length && employees.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>Employee</th>
              <th>Department</th>
              <th>Basic Salary</th>
              <th>Gross Pay</th>
              <th>Total Deductions</th>
              <th>Net Pay</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <input type="checkbox" checked={selectedEmployees.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                </td>
                <td><strong>{emp.name}</strong><br/><span style={{ fontSize: 12, color: '#64748b' }}>{emp.employee_id}</span></td>
                <td>{emp.department_name || '-'}</td>
                <td>₹{(emp.baseSalaryMonthly || 0).toLocaleString()}</td>
                <td>₹{(Number(emp.grossPay) || (Number(emp.baseSalaryMonthly) || 0) + (Number(emp.bonusesMonthly) || 0)).toLocaleString()}</td>
                <td>₹{(Number(emp.totalDeductions) || (Number(emp.deductionsMonthly) || 0)).toLocaleString()}</td>
                <td><strong>₹{(Number(emp.netPay) || ((Number(emp.baseSalaryMonthly) || 0) + (Number(emp.bonusesMonthly) || 0) - (Number(emp.deductionsMonthly) || 0))).toLocaleString()}</strong></td>
                <td>
                  <button className="btn btn-sm" onClick={() => openEditSalary(emp)}>Edit</button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>No employees found. Add employees first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="tabs">
          <button type="button" className={`tab ${tab === 'payslips' ? 'active' : ''}`} onClick={() => setTab('payslips')}>Payslips</button>
          <button type="button" className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Payroll History</button>
        </div>

        {tab === 'payslips' ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Employee</th><th>Period</th><th>Basic</th><th>Earnings</th><th>Deductions</th><th>Net Pay</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {payslips.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.employee_name}</strong><br/><span style={{ fontSize: 12, color: '#64748b' }}>{(p.employee_number || p.employee_id || '-')}</span></td>
                    <td><strong>{months[p.month]} {p.year}</strong></td>
                    <td>{formatPayrollAmount(p.basic_salary)}</td>
                    <td>{formatPayrollAmount(p.total_earnings)}</td>
                    <td>{formatPayrollAmount(p.total_deductions)}</td>
                    <td><strong>{formatPayrollAmount(p.net_pay)}</strong></td>
                    <td>{p.paid_days}/{p.working_days}</td>
                    <td><span className={`badge ${getPayrollStatusBadge(p.status)}`}>{p.status}</span></td>
                    <td>
                      <ActionMenu items={[
                        { label: 'View', onClick: () => setViewPayslip(p) },
                        { label: 'Download PDF', onClick: () => handleDownloadPayslip(p.id) },
                        { label: 'Delete', danger: true, onClick: () => handleDeletePayslip(p) }
                      ]} />
                    </td>
                  </tr>
                ))}
                {payslips.length === 0 && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>No payslips found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === 'history' ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Period</th><th>Employees</th><th>Gross Pay</th><th>Deductions</th><th>Tax</th><th>Net Pay</th><th>Status</th><th>Processed At</th><th></th></tr></thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.runId || r.id}>
                    <td><strong>{months[r.month]} {r.year}</strong></td>
                    <td>{r.total_employees}</td>
                    <td>₹{formatPayrollAmount(r.total_gross_pay)}</td>
                    <td>₹{formatPayrollAmount(r.total_deductions)}</td>
                    <td>₹{formatPayrollAmount(0)}</td>
                    <td><strong>{formatPayrollAmount(r.total_net_pay)}</strong></td>
                    <td><span className={`badge ${getPayrollStatusBadge(r.status)}`}>{r.status}</span></td>
                    <td>{r.processed_at ? new Date(r.processed_at).toLocaleString() : '-'}</td>
                    <td>
                      <ActionMenu items={[
                        { label: 'View', onClick: () => handleViewRun(r) },
                        { label: 'Download', onClick: () => handleDownloadRun(r) },
                        { label: 'Delete', danger: true, onClick: () => handleDeleteRun(r) }
                      ]} />
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>No payroll runs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Generate Payslips</div>
              <button className="btn btn-sm" onClick={() => setShowGenerateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Generate payslips for <strong>{selectedEmployees.length}</strong> selected employees for <strong>{months[month]} {year}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setShowGenerateModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleGenerateSelected} disabled={processing}>
                {processing ? 'Generating...' : 'Generate Payslips'}
              </button>
            </div>
          </div>
        </div>
      )}

      {salaryEdit && (
        <SalaryStructureModal
          employeeId={salaryEdit.id}
          employeeName={salaryEdit.name}
          onClose={() => setSalaryEdit(null)}
          onSaved={() => loadData()}
        />
      )}

      {viewRun && (
        <div className="modal-overlay" onClick={() => setViewRun(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Payroll Run Details - {months[viewRun.month]} {viewRun.year}</div>
              <button className="btn btn-sm" onClick={() => setViewRun(null)}>✕</button>
            </div>
            <div className="modal-body">
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Employee</th><th>Basic</th><th>Earnings</th><th>Deductions</th><th>Net Pay</th><th>Days</th><th>Status</th></tr></thead>
                    <tbody>
                      {runDetails.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.employee_name}</strong><br/><span style={{ fontSize: 12, color: '#64748b' }}>{(p.employee_number || p.employee_id || '-')}</span></td>
                          <td>{formatPayrollAmount(p.basic_salary)}</td>
                          <td>{formatPayrollAmount(p.total_earnings)}</td>
                          <td>{formatPayrollAmount(p.total_deductions)}</td>
                          <td><strong>{formatPayrollAmount(p.net_pay)}</strong></td>
                          <td>{p.paid_days}/{p.working_days}</td>
                  <td><span className={`badge ${getPayrollStatusBadge(p.status)}`}>{p.status}</span></td>
                        </tr>
                      ))}
                      {runDetails.length === 0 && (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>No payslips for this run.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setViewRun(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {viewPayslip && (
        <div className="modal-overlay" onClick={() => setViewPayslip(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Payslip - {months[viewPayslip.month]} {viewPayslip.year}</div>
              <button className="btn btn-sm" onClick={() => setViewPayslip(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Employee</label>
                  <div style={{ fontWeight: 600 }}>{viewPayslip.employee_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{(viewPayslip.employee_number || viewPayslip.employee_id || '-')}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <span className={`badge ${getPayrollStatusBadge(viewPayslip.status)}`}>{viewPayslip.status}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Days (Paid / Working)</label>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{viewPayslip.paid_days}/{viewPayslip.working_days}</div>
                </div>
              </div>

              {[
                { title: 'Earnings', rows: safeParse(viewPayslip.earnings_breakdown) },
                { title: 'Deductions', rows: safeParse(viewPayslip.deductions_breakdown) },
                { title: 'Employer Contributions', rows: safeParse(viewPayslip.employer_contributions) }
              ].map(section => (
                <div key={section.title} style={{ marginBottom: 12 }}>
                  <div className="card-subtitle" style={{ marginBottom: 4 }}>{section.title}</div>
                  {section.rows.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>None</div>
                  ) : (
                    section.rows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span>{r.name}</span>
                        <span style={{ fontWeight: 600 }}>{formatPayrollAmount(r.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              ))}

              <div className="grid-2" style={{ marginTop: 8 }}>
                <div className="form-group">
                  <label className="form-label">Gross Salary</label>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatPayrollAmount(viewPayslip.gross_pay || viewPayslip.total_earnings)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Deductions</label>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatPayrollAmount(viewPayslip.total_deductions)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Net Pay</label>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{formatPayrollAmount(viewPayslip.net_pay)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setViewPayslip(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => { setViewPayslip(null); handleDownloadPayslip(viewPayslip.id); }}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}