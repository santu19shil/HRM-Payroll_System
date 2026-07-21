import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatbotWidget from './ChatbotWidget';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const { user } = useAuth();
  const roleName = user?.role_name || user?.role;
  const isAdmin = roleName === 'SUPER_ADMIN' || roleName === 'HR_ADMIN';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      <ChatbotWidget user={user} mode={isAdmin ? 'admin' : 'employee'} />
    </div>
  );
}
