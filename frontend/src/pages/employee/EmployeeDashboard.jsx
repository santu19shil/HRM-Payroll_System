import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserCheck, CalendarX, Wallet, FileText, CalendarClock, Download, Megaphone
} from 'lucide-react';
import { attendanceAPI, leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';


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

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const firstName = user?.first_name || 'there';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    try {
      const [attRes, sumRes, leaveRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getSummary({ month, year }),
        leaveAPI.getMy()
      ]);
      setAttendance(attRes.data.data);
      setSummary(sumRes.data.data);
      setLeaves(leaveRes.data?.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await attendanceAPI.checkIn({});
      toast.success('Check-in successful!');
      setAttendance(res.data.data);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const res = await attendanceAPI.checkOut({});
      toast.success('Check-out successful!');
      setAttendance(res.data.data);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  const isCheckedIn = attendance?.check_in_time && !attendance?.check_out_time;
  const canCheckIn = !attendance?.check_in_time;
  const canCheckOut = isCheckedIn;

  const checkInButton = (
    <button
      className="btn btn-primary"
      onClick={handleCheckIn}
      disabled={!canCheckIn || checkingIn}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      {checkingIn ? 'Checking in...' : 'Check In'}
    </button>
  );

  const checkOutButton = (
    <button
      className="btn btn-primary"
      onClick={handleCheckOut}
      disabled={!canCheckOut || checkingOut}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      {checkingOut ? 'Checking out...' : 'Check Out'}
    </button>
  );

  const empStats = [
    { label: 'My Attendance', value: summary ? `${Math.round((summary.present_days || 0) / Math.max(1, (summary.present_days || 0) + (summary.absent_days || 0)) * 100)}%` : '—', icon: UserCheck, tone: 'green', to: '/employee/attendance' },
    { label: 'Leaves Left', value: '14', icon: CalendarX, tone: 'yellow', to: '/employee/leaves' },
    { label: 'Next Payroll', value: '₹0', icon: Wallet, tone: 'blue', to: '/employee/payroll' },
    { label: 'Documents', value: '0', icon: FileText, tone: 'purple', to: '/employee/documents' },
  ];

  const fmt = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };
  const toneOf = (st) => (st === 'Approved' ? 'green' : st === 'Rejected' ? 'red' : 'yellow');

  const recentLeaves = (leaves || []).slice(0, 4).map((l) => ({
    type: l.leave_type || l.type || 'Leave',
    from: fmt(l.start_date || l.from),
    to: fmt(l.end_date || l.to),
    days: l.days || (l.half_day ? 0.5 : 1),
    status: l.status || 'Pending',
    tone: toneOf(l.status)
  }));

  const leaveRows = recentLeaves.length ? recentLeaves : [
    { type: 'Annual Leave', from: '12 Aug', to: '16 Aug', days: 5, status: 'Approved', tone: 'green' },
    { type: 'Casual Leave', from: '03 Sep', to: '03 Sep', days: 1, status: 'Pending', tone: 'yellow' },
    { type: 'Sick Leave', from: '21 Jul', to: '22 Jul', days: 2, status: 'Approved', tone: 'green' },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>Welcome back, {firstName}</h1>
        <p>Here's your personal workspace.</p>
      </div>

      <StatGrid stats={empStats} onJump={(to) => navigate(to)} />

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My Attendance</div>
              <div className="card-subtitle">Check in/out from your dashboard</div>
            </div>
            <CalendarClock size={18} color="var(--muted)" />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: 12 }}>
            {checkInButton}
            {checkOutButton}
          </div>

          {attendance?.check_in_time && (
            <div style={{ padding: '0 12px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
              Checked in: {new Date(attendance.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {attendance?.check_out_time ? (
                <>
                  <span style={{ margin: '0 8px' }}>•</span>
                  Checked out: {new Date(attendance.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My Leave Balance</div>

              <div className="card-subtitle">Current cycle</div>
            </div>
            <CalendarClock size={18} color="var(--muted)" />
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr>
              </thead>
              <tbody>
                {leaveRows.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{l.type}</td>
                    <td>{l.from}</td>
                    <td>{l.to}</td>
                    <td>{l.days}</td>
                    <td><Badge tone={l.tone}>{l.status}</Badge></td>
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
