import React, { useState, useEffect, useCallback } from 'react';
import { employeeAPI, attendanceAPI, leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    pendingPayroll: 0
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, title: '', loading: false, rows: [], kind: '' });

  const loadDashboard = useCallback(async () => {
    try {
      const [empRes, attRes, leaveRes] = await Promise.all([
        employeeAPI.getAll({ limit: 1 }),
        attendanceAPI.getAll({ limit: 1, date: new Date().toISOString().split('T')[0], status: 'Present' }),
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
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const todayISO = new Date().toISOString().split('T')[0];

  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false, loading: false })), [setModal]);

  const openList = useCallback(async (kind) => {
    setModal({ open: true, title: '', loading: true, rows: [], kind });
    try {
      if (kind === 'allEmployees') {
        const empRes = await employeeAPI.getAll({ limit: 1000 });
        setModal({
          open: true,
          loading: false,
          kind,
          title: 'All Employees',
          rows: empRes.data?.data || []
        });
        return;
      }

      if (kind === 'presentToday') {
        const res = await attendanceAPI.getAll({ date: todayISO, status: 'Present' });
        const rows = res.data?.data || [];
        setModal({ open: true, loading: false, kind, title: 'Present Today', rows });
        return;
      }

      if (kind === 'lateToday') {
        const res = await attendanceAPI.getAll({ date: todayISO, status: 'Late' });
        const rows = res.data?.data || [];
        setModal({ open: true, loading: false, kind, title: 'Late Entries (Today)', rows });
        return;
      }

      if (kind === 'absentToday') {
        // Absent = all employees without any attendance record for today
        const [empRes, attRes] = await Promise.all([
          employeeAPI.getAll({ limit: 1000 }),
          attendanceAPI.getAll({ date: todayISO })
        ]);

        const allEmp = empRes.data?.data || [];
        const attRows = attRes.data?.data || [];
        const attendedEmpIds = new Set(attRows.map((r) => r.emp_id || r.employee_id || r.employeeId || r.employee?.id).filter(Boolean));

        const absent = allEmp.filter((e) => {
          const key = e.id || e.employee_id || e.employeeId;
          return !attendedEmpIds.has(key);
        });

        setModal({ open: true, loading: false, kind, title: 'Absent Today', rows: absent });
        return;
      }

      if (kind === 'pendingPayroll') {
        setModal({ open: true, loading: false, kind, title: 'Pending Payroll', rows: [] });
        return;
      }

      if (kind === 'pendingPayslip') {
        setModal({ open: true, loading: false, kind, title: 'Pending Payslip', rows: [] });
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load list');
      setModal((m) => ({ ...m, loading: false }));
    }
  }, [todayISO]);

  // Determine table columns based on modal kind
  const getTableColumns = (kind) => {
    if (kind === 'allEmployees') {
      // Ensure correct fields for department/designation from API response.
      return ['Employee', 'Employee ID', 'Department', 'Designation', 'Status'];
    }
    return ['Employee', 'Employee ID', 'Date', 'Check In', 'Status'];
  };

  // Render row cells based on modal kind
  const renderRow = (r, kind) => {
    if (kind === 'allEmployees') {
      const empName = r.name || r.employee_name || '-';
      const empId = r.employee_id || r.emp_id || '-';
      const department = r.department || r.department_name || '-';
      const designation = r.designation_title || r.designation_name || r.designation || '-';
      return (
        <tr key={r.id || empId}>
          <td style={{ fontWeight: 800 }}>{empName}</td>
          <td><span className="badge badge-primary">{empId}</span></td>
          <td>{department}</td>
          <td>{designation}</td>
          <td><span className="badge badge-success">Active</span></td>
        </tr>
      );
    }

    const isAttendanceRow = kind === 'presentToday' || kind === 'lateToday';
    if (!isAttendanceRow) {
      const empName = r.name || r.employee_name || '-';
      const empId = r.employee_id || r.emp_id || '-';
      return (
        <tr key={r.id || empId}>
          <td style={{ fontWeight: 800 }}>{empName}</td>
          <td><span className="badge badge-primary">{empId}</span></td>
          <td>-</td>
          <td>-</td>
          <td><span className="badge badge-danger">Absent</span></td>
        </tr>
      );
    }

    const empName = r.employee_name || r.name || '-';
    const empId = r.emp_id || r.employee_id || '-';
    const checkIn = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-';
    const status = r.status || '-';

    return (
      <tr key={r.id || `${empId}-${status}-${checkIn}`}>
        <td style={{ fontWeight: 800 }}>{empName}</td>
        <td><span className="badge badge-primary">{empId}</span></td>
        <td>{r.date || todayISO}</td>
        <td>
          {checkIn}
          {status === 'Late' && <div style={{ marginTop: 4 }}><span className="badge badge-warning">Late</span></div>}
        </td>
        <td>
          {status === 'Present' ? <span className="badge badge-success">Present</span> : null}
          {status === 'Late' ? <span className="badge badge-warning">Late</span> : null}
        </td>
      </tr>
    );
  };

  if (loading) {
    return <div className="loading-page"><div className="loading-spinner"></div></div>;
  }

  const columns = getTableColumns(modal.kind);

  return (
    <div>
      <div className="grid-stat" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openList('allEmployees')}>
          <div className="stat-icon blue">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{stats.totalEmployees}</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openList('presentToday')}>
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-label">Present Today</div>
            <div className="stat-value">{stats.presentToday}</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openList('lateToday')}>
          <div className="stat-icon yellow">⚠️</div>
          <div className="stat-content">
            <div className="stat-label">Late Entries</div>
            <div className="stat-value">0</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openList('absentToday')}>
          <div className="stat-icon red">❌</div>
          <div className="stat-content">
            <div className="stat-label">Absent Today</div>
            <div className="stat-value">0</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openList('pendingPayroll')}>
          <div className="stat-icon purple">💰</div>
          <div className="stat-content">
            <div className="stat-label">Pending Payroll</div>
            <div className="stat-value">{stats.pendingPayroll}</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openList('pendingPayslip')}>
          <div className="stat-icon purple">🧾</div>
          <div className="stat-content">
            <div className="stat-label">Pending Payslip</div>
            <div className="stat-value">0</div>
          </div>
        </div>
      </div>

      {modal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal.title}</div>
              <button className="btn btn-sm" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {modal.loading ? (
                <div style={{ padding: 20 }}>Loading...</div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {columns.map((col, i) => (
                          <th key={i}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modal.rows.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No records found</td>
                        </tr>
                      ) : (
                        modal.rows.map((r) => renderRow(r, modal.kind))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}