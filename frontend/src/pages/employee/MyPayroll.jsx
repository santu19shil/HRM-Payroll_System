import React, { useState, useEffect } from 'react';
import { payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyPayroll() {
  const [payslips, setPayslips] = useState([]);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [payRes, salRes] = await Promise.all([
        payrollAPI.getMy(),
        payrollAPI.getSalaryStructure()
      ]);
      setPayslips(payRes.data.data);
      setSalaryStructure(salRes.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleDownload = async (id) => {
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
    } catch (err) { toast.error('Failed to download'); }
  };

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      {/* Salary Structure */}
      {salaryStructure && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">Salary Structure</div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Basic Salary</label>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                ₹{parseFloat(salaryStructure.basic_salary || 0).toLocaleString()}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Net Salary</label>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
                ₹{parseFloat(salaryStructure.net_salary || 0).toLocaleString()}
              </div>
            </div>
          </div>
          {salaryStructure.components_arr && (
            <div className="table-container" style={{ marginTop: 16 }}>
              <table>
                <thead><tr><th>Component</th><th>Amount</th><th>Type</th></tr></thead>
                <tbody>
                  {salaryStructure.components_arr.map((c, i) => (
                    <tr key={i}>
                      <td>{c.name}</td>
                      <td>₹{parseFloat(c.amount).toLocaleString()}</td>
                      <td><span className={`badge ${c.type === 'EARNING' ? 'badge-success' : 'badge-danger'}`}>{c.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payslips */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Payslips</div>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Period</th><th>Basic</th><th>Earnings</th><th>Deductions</th><th>Net Pay</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id}>
                  <td><strong>{months[p.month]} {p.year}</strong></td>
                  <td>₹{parseFloat(p.basic_salary || 0).toLocaleString()}</td>
                  <td>₹{parseFloat(p.total_earnings || 0).toLocaleString()}</td>
                  <td>₹{parseFloat(p.total_deductions || 0).toLocaleString()}</td>
                  <td><strong>₹{parseFloat(p.net_pay || 0).toLocaleString()}</strong></td>
                  <td>{p.paid_days}/{p.working_days}</td>
                  <td><span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-info'}`}>{p.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleDownload(p.id)}>Download PDF</button>
                  </td>
                </tr>
              ))}
              {payslips.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>No payslips available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}