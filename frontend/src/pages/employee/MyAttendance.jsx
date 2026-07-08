import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyAttendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [histRes, sumRes] = await Promise.all([
        attendanceAPI.getHistory({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), limit: 50 }),
        attendanceAPI.getSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })
      ]);
      setRecords(histRes.data.data);
      setSummary(sumRes.data.data);
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
              <div className="stat-value">{summary.total_working_hours?.toFixed(1) || 0}h</div>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>Date</th><th>Day</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Hours</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                <td>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'}</td>
                <td>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</td>
                <td>{getStatusBadge(r.status)}</td>
                <td>{r.working_hours ? `${r.working_hours}h` : '-'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>No attendance records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}