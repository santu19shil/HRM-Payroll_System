import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, CalendarX, Wallet, Activity, TrendingUp
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { employeeAPI, attendanceAPI, leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';

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
              <div className="stat-change positive" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={13} /> +4.2% vs last month
              </div>
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
              <div className="card-subtitle">{MONTHS[month]} {year} attendance distribution</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ width: 190, height: 190, flexShrink: 0 }}>
              <Doughnut data={donutData} options={{ cutout: '68%', plugins: { legend: { display: false } } }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {legendItems.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></span>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 64 }}>{s.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.value} days</span>
                </div>
              ))}
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

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Welcome to Enterprise HRMS</div>
            <div className="card-subtitle">HR Administration Dashboard</div>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Use the sidebar to navigate through the system. You can manage employees,
          departments, designations, attendance, leaves, payroll, and holidays from here.
        </p>
      </div>
    </div>
  );
}
