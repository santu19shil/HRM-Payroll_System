import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChangePasswordModal from './ChangePasswordModal';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(user?.must_change_password || user?.mustChangePassword);

  return (
    <div className="app-layout">
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
