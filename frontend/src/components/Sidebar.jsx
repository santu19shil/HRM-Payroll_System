import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationAPI } from '../services/api';

const adminLinks = [
  { section: 'Main', items: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/admin/employees', label: 'Employees', icon: '👥' },
    { to: '/admin/departments', label: 'Departments', icon: '🏢' },
    { to: '/admin/designations', label: 'Designations', icon: '💼' },
  ]},
  { section: 'Operations', items: [
    { to: '/admin/attendance', label: 'Attendance', icon: '⏰' },
    { to: '/admin/leaves', label: 'Leave Management', icon: '📅', badge: 'leaves' },
    { to: '/admin/payroll', label: 'Payroll', icon: '💰' },
    { to: '/admin/holidays', label: 'Holidays', icon: '🎉' },
    { to: '/admin/documents', label: 'Documents', icon: '📄', badge: 'documents' },
    { to: '/admin/notices', label: 'Notices', icon: '📢' },
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
    { to: '/employee/leaves', label: 'Leave Requests', icon: '📅', badge: 'leaves' },
    { to: '/employee/payroll', label: 'Payslips', icon: '💰' },
    { to: '/employee/documents', label: 'Documents', icon: '📄', badge: 'documents' },
    { to: '/employee/notifications', label: 'Notifications', icon: '🔔', badge: 'notifications' },
  ]}
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({ leaves: 0, documents: 0, notifications: 0 });

  const roleName = user?.role || user?.role_name;
  const isAdmin = roleName === 'SUPER_ADMIN' || roleName === 'HR_ADMIN';
  const links = isAdmin ? adminLinks : employeeLinks;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await notificationAPI.getCounts();
        if (active) setCounts(res.data.data || { leaves: 0, documents: 0, notifications: 0 });
      } catch {
        /* ignore */
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [location.pathname]);

  const badgeFor = (link) => {
    if (!link.badge) return null;
    const val = counts[link.badge] || 0;
    return val > 0 ? <span className="nav-badge">{val}</span> : null;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">💼</div>
        <div>
          <h2>Enterprise HRMS</h2>
          <p>Payroll Management System</p>
        </div>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {link.label}
                  {badgeFor(link)}
                </span>
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
