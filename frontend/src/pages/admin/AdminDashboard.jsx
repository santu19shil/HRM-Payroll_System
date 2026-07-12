import React, { useState, useEffect } from 'react';
import { employeeAPI, attendanceAPI, leaveAPI, payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    pendingPayroll: 0
  });
  const [attSummary, setAttSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    attendanceAPI.getAdminSummary({ month, year })
      .then(res => setAttSummary(res.data.data))
      .catch(() => setAttSummary(null));
  }, [month, year]);

  const loadDashboard = async () => {
    try {
      const [empRes, attRes, leaveRes] = await Promise.all([
        employeeAPI.getAll({ limit: 1 }),
        attendanceAPI.getAll({ limit: 1, date: new Date().toISOString().split('T')[0] }),
        leaveAPI.getAll({ status: 'Pending', limit: 1 })
      ]);

      setStats({
        totalEmployees: empRes.data.pagination?.total || 0,
        presentToday: attRes.data.pagination?.total || 0,
        pendingLeaves: leaveRes.data.pagination?.total || 0,
        pendingPayroll: 0
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="toolbar-left">
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Monthly Attendance:</span>
          <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 130 }}>
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <input type="number" className="form-input" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </div>
      </div>

      <div className="grid-stat" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{stats.totalEmployees}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-label">Present (Month)</div>
            <div className="stat-value">{attSummary?.present_days || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⚠️</div>
          <div className="stat-content">
            <div className="stat-label">Late (Month)</div>
            <div className="stat-value">{attSummary?.late_days || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div className="stat-content">
            <div className="stat-label">Absent (Month)</div>
            <div className="stat-value">{attSummary?.absent_days || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid-stat" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-label">Present Today</div>
            <div className="stat-value">{stats.presentToday}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-label">Present Today</div>
            <div className="stat-value">{stats.presentToday}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">📋</div>
          <div className="stat-content">
            <div className="stat-label">Pending Leaves</div>
            <div className="stat-value">{stats.pendingLeaves}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">💰</div>
          <div className="stat-content">
            <div className="stat-label">Pending Payroll</div>
            <div className="stat-value">{stats.pendingPayroll}</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Workforce Insights</div>
              <div className="card-subtitle">{months[month]} {year} attendance distribution</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 180, height: 180, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Present', 'Late', 'Absent'],
                  datasets: [{
                    data: [attSummary?.present_days || 0, attSummary?.late_days || 0, attSummary?.absent_days || 0],
                    backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
                    borderWidth: 0,
                    hoverOffset: 6
                  }]
                }}
                options={{ cutout: '68%', plugins: { legend: { display: false } } }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Present', value: attSummary?.present_days || 0, color: '#16a34a' },
                { label: 'Late', value: attSummary?.late_days || 0, color: '#d97706' },
                { label: 'Absent', value: attSummary?.absent_days || 0, color: '#dc2626' }
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></span>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 60 }}>{s.label}</span>
                  <span style={{ fontSize: 14, color: '#64748b' }}>{s.value} days</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Welcome to Enterprise HRMS</div>
              <div className="card-subtitle">HR Administration Dashboard</div>
            </div>
          </div>
          <p style={{ color: '#64748b', lineHeight: '1.8' }}>
            Use the sidebar to navigate through the system. You can manage employees,
            departments, designations, attendance, leaves, payroll, and holidays from here.
          </p>
        </div>
      </div>
    </div>
  );
}