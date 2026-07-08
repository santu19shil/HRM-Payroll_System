import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout
import DashboardLayout from './components/DashboardLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeManagement from './pages/admin/EmployeeManagement';
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

          {/* Protected Routes with Layout */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<EmployeeManagement />} />
            <Route path="/admin/departments" element={<DepartmentManagement />} />
            <Route path="/admin/designations" element={<DesignationManagement />} />
            <Route path="/admin/attendance" element={<AttendanceManagement />} />
            <Route path="/admin/leaves" element={<LeaveManagement />} />
            <Route path="/admin/payroll" element={<PayrollManagement />} />
            <Route path="/admin/holidays" element={<HolidayManagement />} />
            <Route path="/admin/settings" element={<SettingsPage />} />

            {/* Employee Routes */}
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/profile" element={<MyProfile />} />
            <Route path="/employee/attendance" element={<MyAttendance />} />
            <Route path="/employee/leaves" element={<MyLeaves />} />
            <Route path="/employee/payroll" element={<MyPayroll />} />
            <Route path="/employee/documents" element={<MyDocuments />} />
            <Route path="/employee/notifications" element={<MyNotifications />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}