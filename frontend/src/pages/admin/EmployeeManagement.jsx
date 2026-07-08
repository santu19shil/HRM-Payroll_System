import React, { useState, useEffect } from 'react';
import { employeeAPI, departmentAPI, designationAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', gender: '', date_of_birth: '',
    address: '', city: '', state: '', postal_code: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    department_id: '', designation_id: '', reporting_manager_id: '',
    joining_date: '', employment_type: 'Full-Time', work_location: '',
    bank_account_name: '', bank_account_number: '', bank_name: '', bank_ifsc: '', bank_branch: '',
    pan_number: '', aadhar_number: '', basic_salary: ''
  });

  useEffect(() => {
    loadData();
  }, [page, search]);

  const loadData = async () => {
    try {
      const [empRes, deptRes, desigRes] = await Promise.all([
        employeeAPI.getAll({ page, limit: 10, search }),
        departmentAPI.getAll(),
        designationAPI.getAll()
      ]);
      setEmployees(empRes.data.data);
      setTotalPages(empRes.data.pagination?.totalPages || 1);
      setDepartments(deptRes.data.data);
      setDesignations(desigRes.data.data);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await employeeAPI.update(editingEmployee.id, formData);
        toast.success('Employee updated successfully');
      } else {
        const res = await employeeAPI.create(formData);
        toast.success(`Employee created! Temp Password: ${res.data.data.temp_password}`);
      }
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', email: '', phone: '', gender: '', date_of_birth: '',
      address: '', city: '', state: '', postal_code: '',
      emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
      department_id: '', designation_id: '', reporting_manager_id: '',
      joining_date: '', employment_type: 'Full-Time', work_location: '',
      bank_account_name: '', bank_account_number: '', bank_name: '', bank_ifsc: '', bank_branch: '',
      pan_number: '', aadhar_number: '', basic_salary: ''
    });
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      first_name: emp.first_name, last_name: emp.last_name, email: emp.email,
      phone: emp.phone || '', gender: emp.gender || '', date_of_birth: emp.date_of_birth || '',
      address: emp.address || '', city: emp.city || '', state: emp.state || '', postal_code: emp.postal_code || '',
      emergency_contact_name: emp.emergency_contact_name || '', emergency_contact_phone: emp.emergency_contact_phone || '',
      emergency_contact_relation: emp.emergency_contact_relation || '',
      department_id: emp.department_id || '', designation_id: emp.designation_id || '',
      reporting_manager_id: emp.reporting_manager_id || '',
      joining_date: emp.joining_date || '', employment_type: emp.employment_type || 'Full-Time',
      work_location: emp.work_location || '',
      bank_account_name: emp.bank_account_name || '', bank_account_number: emp.bank_account_number || '',
      bank_name: emp.bank_name || '', bank_ifsc: emp.bank_ifsc || '', bank_branch: emp.bank_branch || '',
      pan_number: emp.pan_number || '', aadhar_number: emp.aadhar_number || '', basic_salary: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this employee?')) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee deactivated');
      loadData();
    } catch (err) {
      toast.error('Failed to deactivate');
    }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <span className="search-bar-icon">🔍</span>
            <input placeholder="Search employees..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setEditingEmployee(null); resetForm(); setShowModal(true); }}>
            + Add Employee
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td><span className="badge badge-primary">{emp.employee_id}</span></td>
                <td>{emp.first_name} {emp.last_name}</td>
                <td>{emp.email}</td>
                <td>{emp.department_name || '-'}</td>
                <td>{emp.designation_title || '-'}</td>
                <td>{emp.phone || '-'}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => openEdit(emp)}>Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => handleDelete(emp.id)}>Deactivate</button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No employees found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ padding: '8px 12px', fontSize: '14px' }}>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</div>
              <button className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-input" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-input" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                      <option value="">Select</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <select className="form-select" value={formData.designation_id} onChange={e => setFormData({...formData, designation_id: e.target.value})}>
                      <option value="">Select</option>
                      {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joining Date</label>
                    <input type="date" className="form-input" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Type</label>
                    <select className="form-select" value={formData.employment_type} onChange={e => setFormData({...formData, employment_type: e.target.value})}>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                      <option value="Probation">Probation</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Basic Salary</label>
                    <input type="number" className="form-input" value={formData.basic_salary} onChange={e => setFormData({...formData, basic_salary: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Work Location</label>
                    <input className="form-input" value={formData.work_location} onChange={e => setFormData({...formData, work_location: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEmployee ? 'Update' : 'Create Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}