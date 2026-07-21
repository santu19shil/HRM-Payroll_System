import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout
import DashboardLayout from './components/DashboardLayout';

// Landing + Auth Pages
import PreviewPage from './pages/PreviewPage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeManagement from './pages/admin/EmployeeManagement';
import AdminEmployeeProfileRoute from './pages/admin/AdminEmployeeProfileRoute';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminNotices from './pages/admin/AdminNotices';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import DesignationManagement from './pages/admin/DesignationManagement';
import AttendanceManagement from './pages/admin/AttendanceManagement';
import LeaveManagement from './pages/admin/LeaveManagement';
import PayrollManagement from './pages/admin/PayrollManagement';
import HolidayManagement from './pages/admin/HolidayManagement';
import SettingsPage from './pages/admin/SettingsPage';

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyProfile from './pages/employee/MyProfile';
import MyAttendance from './pages/employee/MyAttendance';
import MyLeaves from './pages/employee/MyLeaves';
import MyPayroll from './pages/employee/MyPayroll';
import MyDocuments from './pages/employee/MyDocuments';
import MyNotifications from './pages/employee/MyNotifications';

// Protected Route
import ProtectedRoute from './components/ProtectedRoute';

function LandingRedirect() {
  useEffect(() => { window.location.href = '/landing.html'; }, []);
  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#fff', borderRadius: '8px' }
        }} />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute requiredRole="SUPER_ADMIN"><DashboardLayout /></ProtectedRoute>}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<EmployeeManagement />} />
            <Route path="/admin/employees/profile/:id" element={<AdminEmployeeProfileRoute />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/notices" element={<AdminNotices />} />
            <Route path="/admin/departments" element={<DepartmentManagement />} />
            <Route path="/admin/designations" element={<DesignationManagement />} />
            <Route path="/admin/attendance" element={<AttendanceManagement />} />
            <Route path="/admin/leaves" element={<LeaveManagement />} />
            <Route path="/admin/payroll" element={<PayrollManagement />} />
            <Route path="/admin/holidays" element={<HolidayManagement />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          {/* Employee Routes */}
          <Route element={<ProtectedRoute requiredRole="EMPLOYEE"><DashboardLayout /></ProtectedRoute>}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/profile" element={<MyProfile />} />
            <Route path="/employee/attendance" element={<MyAttendance />} />
            <Route path="/employee/leaves" element={<MyLeaves />} />
            <Route path="/employee/payroll" element={<MyPayroll />} />
            <Route path="/employee/documents" element={<MyDocuments />} />
            <Route path="/employee/notifications" element={<MyNotifications />} />
          </Route>

          {/* Landing (static 3D page served from public/landing.html) */}
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/preview" element={<PreviewPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
