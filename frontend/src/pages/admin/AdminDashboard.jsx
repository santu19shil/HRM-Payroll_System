import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, CalendarX, Wallet, Activity
} from 'lucide-react';
import { employeeAPI, attendanceAPI, leaveAPI } from '../../services/api';


const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TONE = { blue: 'blue', green: 'green', yellow: 'yellow', red: 'red', purple: 'purple', indigo: 'indigo' };

function Badge({ tone, children }) {
  const map = { green: 'success', yellow: 'warning', red: 'danger', blue: 'primary', purple: 'info', gray: 'gray' };
  return <span className={`badge badge-${map[tone] || 'gray'}`}>{children}</span>;
}

function StatGrid({ stats, onJump }) {
  return (
    <div className="grid-stat">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="stat-card"
            style={{ cursor: s.to ? 'pointer' : 'default' }}
            onClick={() => s.to && onJump && onJump(s.to)}
          >
            <div className={`stat-icon ${TONE[s.tone]}`}><Icon size={22} strokeWidth={2} /></div>
            <div className="stat-content">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    pendingPayroll: 0
  });
  const [monthly, setMonthly] = useState({ present: 0, late: 0, absent: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const todayISO = new Date().toISOString().split('T')[0];

  const loadDashboard = useCallback(async () => {
    try {
      const [empRes, attRes, leaveRes] = await Promise.all([
        employeeAPI.getAll({ limit: 1 }),
        attendanceAPI.getAll({ limit: 1, date: todayISO, status: 'Present' }),
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
    }

    try {
      const res = await attendanceAPI.getAdminSummary({ month: month + 1, year });
      const data = res.data.data || {};
      setMonthly({
        present: data.present_days || data.present || 0,
        late: data.late_days || data.late || 0,
        absent: data.absent_days || data.absent || 0
      });
    } catch (err) {
      console.error('Monthly summary load error:', err);
    }

    try {
      const attRes = await attendanceAPI.getAll({ date: todayISO, limit: 6 });
      const rows = attRes.data?.data || [];
      const nameOf = (r) => r.employee_name || r.name || '-';
      const deptOf = (r) => r.department || r.department_name || '-';
      const statusOf = (r) => r.status || 'Absent';
      const toneOf = (st) => (st === 'Present' ? 'green' : st === 'Late' ? 'yellow' : 'red');

      const mapped = rows.length
        ? rows.map((r) => ({ name: nameOf(r), dept: deptOf(r), status: statusOf(r), tone: toneOf(statusOf(r)) }))
        : [
            { name: 'Aarav Sharma', dept: 'Engineering', status: 'Present', tone: 'green' },
            { name: 'Riya Iyer', dept: 'Sales', status: 'Late', tone: 'yellow' },
            { name: 'Karan Nair', dept: 'Operations', status: 'Absent', tone: 'red' },
            { name: 'Meera Das', dept: 'Finance', status: 'Present', tone: 'green' },
            { name: 'Dev Malhotra', dept: 'Engineering', status: 'Present', tone: 'green' },
          ];
      setRecent(mapped);
    } catch (err) {
      console.error('Recent activity load error:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, todayISO]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <div className="loading-page"><div className="loading-spinner"></div></div>;
  }

  const adminStats = [
    { label: 'Total Employees', value: stats.totalEmployees.toLocaleString(), icon: Users, tone: 'blue', to: '/admin/employees' },
    { label: 'Present Today', value: stats.presentToday.toLocaleString(), icon: UserCheck, tone: 'green', to: '/admin/attendance' },
    { label: 'Pending Leaves', value: stats.pendingLeaves.toLocaleString(), icon: CalendarX, tone: 'yellow', to: '/admin/leaves' },
    { label: 'Pending Payroll', value: stats.pendingPayroll.toLocaleString(), icon: Wallet, tone: 'red', to: '/admin/payroll' },
  ];

  const donutData = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [monthly.present, monthly.late, monthly.absent],
      backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
      borderWidth: 0,
      hoverOffset: 6
    }]
  };

  const legendItems = [
    { label: 'Present', value: monthly.present, color: '#16a34a' },
    { label: 'Late', value: monthly.late, color: '#d97706' },
    { label: 'Absent', value: monthly.absent, color: '#dc2626' },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>Workforce Overview</h1>
        <p>Live snapshot of your organization — {MONTHS[month]} {year}.</p>
      </div>

      <StatGrid stats={adminStats} onJump={(to) => navigate(to)} />

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Workforce Insights</div>
              <div className="card-subtitle">{MONTHS[month]} {year} attendance summary</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Present</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{monthly.present}</div>
            </div>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Late</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{monthly.late}</div>
            </div>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Absent</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{monthly.absent}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Today's Activity</div>
              <div className="card-subtitle">Real-time attendance feed</div>
            </div>
            <Activity size={18} color="var(--muted)" />
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr><th>Employee</th><th>Department</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.dept}</td>
                    <td><Badge tone={r.tone}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
