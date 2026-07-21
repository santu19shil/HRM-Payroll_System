import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = (user?.role_name || user?.role) === 'SUPER_ADMIN' || (user?.role_name || user?.role) === 'HR_ADMIN';
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('employees')) return 'Employee Management';
    if (path.includes('departments')) return 'Departments';
    if (path.includes('designations')) return 'Designations';
    if (path.includes('attendance')) return 'Attendance';
    if (path.includes('leaves')) return 'Leave Management';
    if (path.includes('payroll')) return 'Payroll';
    if (path.includes('holidays')) return 'Holidays';
    if (path.includes('profile')) return 'My Profile';
    if (path.includes('documents')) return 'Documents';
    if (path.includes('notices')) return 'Notices';
    if (path.includes('notifications')) return 'Notifications';
    if (path.includes('settings')) return 'Settings';
    return 'Dashboard';
  };

  const roleLabel = (user?.role_name || user?.role) === 'SUPER_ADMIN' ? 'Super Admin' :
    (user?.role_name || user?.role) === 'HR_ADMIN' ? 'HR Admin' :
    (user?.role_name || user?.role) === 'MANAGER' ? 'Manager' : 'Employee';

  const initials = (() => {
    const f = user?.first_name || '';
    const l = user?.last_name || '';
    const base = (f[0] || '') + (l[0] || '');
    if (base) return base.toUpperCase();
    const email = user?.email || '';
    return email ? email[0].toUpperCase() : 'U';
  })();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{getPageTitle()}</h1>
      </div>
      <div className="topbar-right">
        <span className="topbar-datetime">
          {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          &nbsp;|&nbsp;
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </span>
        <span className="role-pill">{roleLabel}</span>
        <div className="topbar-avatar" title={user?.email || ''}>{initials}</div>
        <button className="btn btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}