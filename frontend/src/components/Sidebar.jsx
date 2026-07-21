import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationAPI, settingsAPI } from '../services/api';
import { LayoutDashboard, Users, Building2, Briefcase, Clock, CalendarDays, Wallet, Plane, FileText, Megaphone, Settings, UserCircle } from 'lucide-react';

const adminLinks = [
  { section: 'Main', items: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/employees', label: 'Employees', icon: Users },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/designations', label: 'Designations', icon: Briefcase },
  ]},
  { section: 'Operations', items: [
    { to: '/admin/attendance', label: 'Attendance', icon: Clock },
    { to: '/admin/leaves', label: 'Leave Management', icon: CalendarDays, badge: 'leaves' },
    { to: '/admin/payroll', label: 'Payroll', icon: Wallet },
    { to: '/admin/holidays', label: 'Holidays', icon: Plane },
    { to: '/admin/documents', label: 'Documents', icon: FileText, badge: 'documents' },
    { to: '/admin/notices', label: 'Notices', icon: Megaphone },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]}
];

const employeeLinks = [
  { section: 'Main', items: [
    { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/profile', label: 'My Profile', icon: UserCircle },
    { to: '/employee/attendance', label: 'Attendance', icon: Clock },
    { to: '/employee/leaves', label: 'Leave Requests', icon: CalendarDays, badge: 'leaves' },
    { to: '/employee/payroll', label: 'Payslips', icon: Wallet },
    { to: '/employee/documents', label: 'Documents', icon: FileText, badge: 'documents' },
    { to: '/employee/notifications', label: 'Notifications', icon: Megaphone, badge: 'notifications' },
  ]}
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({ leaves: 0, documents: 0, notifications: 0 });
  const [companyLogo, setCompanyLogo] = useState('');

  const roleName = user?.role || user?.role_name;
  const isAdmin = roleName === 'SUPER_ADMIN' || roleName === 'HR_ADMIN';
  const links = isAdmin ? adminLinks : employeeLinks;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [countsRes, settingsRes] = await Promise.all([
          notificationAPI.getCounts(),
          settingsAPI.get()
        ]);
        if (active) {
          setCounts(countsRes.data.data || { leaves: 0, documents: 0, notifications: 0 });
          const logo = settingsRes.data?.data?.settings?.company_logo || settingsRes.data?.data?.company_logo || '';
          setCompanyLogo(logo);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const interval = setInterval(load, 15000);
    const onLogoUpdate = (e) => {
      if (active) setCompanyLogo(e.detail?.logo || '');
    };
    window.addEventListener('company-logo-updated', onLogoUpdate);
    return () => { 
      active = false; 
      clearInterval(interval); 
      window.removeEventListener('company-logo-updated', onLogoUpdate);
    };
  }, [location.pathname]);

  const badgeFor = (link) => {
    if (!link.badge) return null;
    const val = counts[link.badge] || 0;
    return val > 0 ? <span className="nav-badge">{val}</span> : null;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
          <div className="sidebar-logo">
            {companyLogo ? (
              <img src={companyLogo} alt="Company logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            ) : (
              <Briefcase size={20} color="#fff" strokeWidth={2.2} />
            )}
          </div>
        <div>
          <h2>Enterprise HRMS</h2>
          <p>Payroll Management System</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map((section, idx) => (
          <div key={idx}>
            <div className="sidebar-section">{section.section}</div>
            {section.items.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="sidebar-icon"><Icon size={18} /></span>
                  <span className="sidebar-label">{link.label}</span>
                  {badgeFor(link)}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        © 2026 Enterprise HRMS v1.0
      </div>
    </aside>
  );
}
