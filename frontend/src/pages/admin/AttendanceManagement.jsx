import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AttendanceManagement() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => { loadData(); }, [page, date]);

  useEffect(() => {
    attendanceAPI.getAdminSummary({ month, year })
      .then(res => setSummary(res.data.data))
      .catch(() => setSummary(null));
  }, [month, year]);

  const loadData = async () => {
    try {
      const res = await attendanceAPI.getAll({ page, limit: 20, date });
      setRecords(res.data.data);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { 'Present': 'badge-success', 'Late': 'badge-warning', 'Absent': 'badge-danger', 'On Leave': 'badge-info', 'Holiday': 'badge-primary', 'Missing Check Out': 'badge-warning' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="toolbar-left">
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Monthly Summary:</span>
          <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 130 }}>
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <input type="number" className="form-input" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </div>
      </div>

      {summary && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div className="stat-content">
              <div className="stat-label">Present</div>
              <div className="stat-value">{summary.present_days || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">Late</div>
              <div className="stat-value">{summary.late_days || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">❌</div>
            <div className="stat-content">
              <div className="stat-label">Absent</div>
              <div className="stat-value">{summary.absent_days || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Hours</div>
              <div className="stat-value">{parseFloat(summary.total_working_hours || 0).toFixed(1) || 0}h</div>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <input type="date" className="form-input" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} style={{ width: 200 }} />
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Employee</th><th>ID</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Hours</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{r.employee_name}</td>
                <td><span className="badge badge-primary">{r.emp_id}</span></td>
                <td>{r.date}</td>
                <td>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'}</td>
                <td>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</td>
                <td>{getStatusBadge(r.status)}</td>
                <td>{r.working_hours ? `${r.working_hours}h` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ padding: '8px 12px' }}>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}