import React, { useState, useEffect } from 'react';
import { payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PayrollManagement() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await payrollAPI.getRuns();
      setRuns(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleProcess = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    if (!window.confirm(`Process payroll for ${month}/${year}?`)) return;
    
    setProcessing(true);
    try {
      const res = await payrollAPI.process({ month, year });
      toast.success(`Payroll processed! Net pay: ₹${res.data.data.total_net_pay.toLocaleString()}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={handleProcess} disabled={processing}>
            {processing ? 'Processing...' : 'Process Payroll'}
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Period</th><th>Employees</th><th>Gross Pay</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Processed At</th></tr></thead>
          <tbody>
            {runs.map(r => (
              <tr key={r.id}>
                <td><strong>{months[r.month]} {r.year}</strong></td>
                <td>{r.total_employees}</td>
                <td>₹{parseFloat(r.total_gross_pay || 0).toLocaleString()}</td>
                <td>₹{parseFloat(r.total_deductions || 0).toLocaleString()}</td>
                <td><strong>₹{parseFloat(r.total_net_pay || 0).toLocaleString()}</strong></td>
                <td><span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : r.status === 'PROCESSING' ? 'badge-warning' : 'badge-gray'}`}>{r.status}</span></td>
                <td>{r.processed_at ? new Date(r.processed_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>No payroll runs yet. Click "Process Payroll" to generate.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}