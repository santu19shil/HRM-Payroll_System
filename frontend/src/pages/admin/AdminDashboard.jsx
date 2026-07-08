import React, { useState, useEffect } from 'react';
import { employeeAPI, attendanceAPI, leaveAPI, payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    pendingPayroll: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

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
      <div className="grid-4" style={{ marginBottom: '24px' }}>
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
  );
}