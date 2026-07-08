import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role_name === 'SUPER_ADMIN' || user?.role_name === 'HR_ADMIN';

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
    if (path.includes('notifications')) return 'Notifications';
    if (path.includes('settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{getPageTitle()}</h1>
      </div>
      <div className="topbar-right">
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          {user?.role_name === 'SUPER_ADMIN' ? 'Super Admin' : 
           user?.role_name === 'HR_ADMIN' ? 'HR Admin' :
           user?.role_name === 'MANAGER' ? 'Manager' : 'Employee'}
        </span>
        <button className="btn btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}