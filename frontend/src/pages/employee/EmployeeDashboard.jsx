import React, { useState, useEffect, useCallback } from 'react';
import { attendanceAPI, leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeeDashboard() {
  const [attendance, setAttendance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    try {
      const [attRes, sumRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getSummary({ month, year })
      ]);
      setAttendance(attRes.data.data);
      setSummary(sumRes.data.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is required for attendance');
      return;
    }

    setCheckingIn(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const res = await attendanceAPI.checkIn({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      
      toast.success('Check-in successful!');
      setAttendance(res.data.data);
      loadData();
    } catch (err) {
      if (err.code === 1) {
        toast.error('Location permission denied. Please enable GPS.');
      } else {
        toast.error(err.response?.data?.message || 'Check-in failed');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is required for attendance');
      return;
    }

    setCheckingOut(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const res = await attendanceAPI.checkOut({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      
      toast.success('Check-out successful!');
      setAttendance(res.data.data);
      loadData();
    } catch (err) {
      if (err.code === 1) {
        toast.error('Location permission denied');
      } else {
        toast.error(err.response?.data?.message || 'Check-out failed');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isCheckedIn = attendance?.check_in_time && !attendance?.check_out_time;
  const isCheckedOut = attendance?.check_out_time;
  const canCheckIn = !attendance?.check_in_time;
  const canCheckOut = isCheckedIn;

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      {/* Attendance Card */}
      <div className="attendance-card" style={{ marginBottom: 24 }}>
        <div className="attendance-time">{formatTime(currentTime)}</div>
        <div className="attendance-date">{formatDate(currentTime)}</div>

        {attendance && (
          <div className="attendance-status" style={{ marginBottom: 16 }}>
            <span className={`attendance-status ${attendance.status?.toLowerCase()}`}>
              {attendance.status === 'Present' ? '✅' : attendance.status === 'Late' ? '⚠️' : '❌'} {attendance.status}
            </span>
          </div>
        )}

        <div className="attendance-details">
          <div className="attendance-detail-item">
            <div className="attendance-detail-label">Check In</div>
            <div className="attendance-detail-value">
              {attendance?.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString() : '--:--'}
            </div>
          </div>
          <div className="attendance-detail-item">
            <div className="attendance-detail-label">Check Out</div>
            <div className="attendance-detail-value">
              {attendance?.check_out_time ? new Date(attendance.check_out_time).toLocaleTimeString() : '--:--'}
            </div>
          </div>
          <div className="attendance-detail-item">
            <div className="attendance-detail-label">Working Hours</div>
            <div className="attendance-detail-value">
              {attendance?.working_hours ? `${attendance.working_hours}h` : '0h'}
            </div>
          </div>
        </div>

        <div className="attendance-actions">
          <button
            className="btn btn-success btn-lg"
            onClick={handleCheckIn}
            disabled={!canCheckIn || checkingIn}
            style={{ flex: 1 }}
          >
            {checkingIn ? 'Processing...' : 'CHECK IN'}
          </button>
          <button
            className="btn btn-warning btn-lg"
            onClick={handleCheckOut}
            disabled={!canCheckOut || checkingOut}
            style={{ flex: 1 }}
          >
            {checkingOut ? 'Processing...' : 'CHECK OUT'}
          </button>
        </div>
      </div>

      {/* Monthly Summary selector + cards */}
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
        <div className="grid-4">
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
    </div>
  );
}