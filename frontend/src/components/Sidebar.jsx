import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const adminLinks = [
  { section: 'Main', items: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/admin/employees', label: 'Employees', icon: '👥' },
    { to: '/admin/departments', label: 'Departments', icon: '🏢' },
    { to: '/admin/designations', label: 'Designations', icon: '💼' },
  ]},
  { section: 'Operations', items: [
    { to: '/admin/attendance', label: 'Attendance', icon: '⏰' },
    { to: '/admin/leaves', label: 'Leave Management', icon: '📅' },
    { to: '/admin/payroll', label: 'Payroll', icon: '💰' },
    { to: '/admin/holidays', label: 'Holidays', icon: '🎉' },
  ]},
  { section: 'System', items: [
    { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ]}
];

const employeeLinks = [
  { section: 'Main', items: [
    { to: '/employee/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/employee/profile', label: 'My Profile', icon: '👤' },
    { to: '/employee/attendance', label: 'Attendance', icon: '⏰' },
    { to: '/employee/leaves', label: 'Leave Requests', icon: '📅' },
    { to: '/employee/payroll', label: 'Payslips', icon: '💰' },
    { to: '/employee/documents', label: 'Documents', icon: '📄' },
    { to: '/employee/notifications', label: 'Notifications', icon: '🔔' },
  ]}
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  
  const isAdmin = user?.role_name === 'SUPER_ADMIN' || user?.role_name === 'HR_ADMIN';
  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>Enterprise HRMS</h2>
        <p>Payroll Management System</p>
      </div>
      <nav className="sidebar-nav">
        {links.map((section, idx) => (
          <div key={idx}>
            <div className="sidebar-section">{section.section}</div>
            {section.items.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        © 2026 Enterprise HRMS v1.0
      </div>
    </aside>
  );
}