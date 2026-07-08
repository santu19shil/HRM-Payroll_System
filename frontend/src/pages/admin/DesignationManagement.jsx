import React, { useState, useEffect } from 'react';
import { designationAPI, departmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function DesignationManagement() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', department_id: '', grade: '', min_salary: '', max_salary: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [desigRes, deptRes] = await Promise.all([designationAPI.getAll(), departmentAPI.getAll()]);
      setDesignations(desigRes.data.data);
      setDepartments(deptRes.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await designationAPI.update(editing.id, formData); toast.success('Updated'); }
      else { await designationAPI.create(formData); toast.success('Created'); }
      setShowModal(false); setEditing(null); loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await designationAPI.delete(id); toast.success('Deleted'); loadData(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ title: '', department_id: '', grade: '', min_salary: '', max_salary: '' }); setShowModal(true); }}>+ Add Designation</button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Title</th><th>Department</th><th>Grade</th><th>Min Salary</th><th>Max Salary</th><th>Employees</th><th>Actions</th></tr></thead>
          <tbody>
            {designations.map(d => (
              <tr key={d.id}>
                <td><strong>{d.title}</strong></td>
                <td>{d.department_name || '-'}</td>
                <td>{d.grade || '-'}</td>
                <td>₹{parseFloat(d.min_salary || 0).toLocaleString()}</td>
                <td>₹{parseFloat(d.max_salary || 0).toLocaleString()}</td>
                <td><span className="badge badge-primary">{d.employee_count || 0}</span></td>
                <td>
                  <button className="btn btn-sm" onClick={() => { setEditing(d); setFormData({ title: d.title, department_id: d.department_id, grade: d.grade || '', min_salary: d.min_salary || '', max_salary: d.max_salary || '' }); setShowModal(true); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => handleDelete(d.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Designation' : 'Add Designation'}</div>
              <button className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-select" value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} required>
                    <option value="">Select</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Grade</label>
                    <input className="form-input" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Salary</label>
                    <input type="number" className="form-input" value={formData.min_salary} onChange={e => setFormData({...formData, min_salary: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Salary</label>
                    <input type="number" className="form-input" value={formData.max_salary} onChange={e => setFormData({...formData, max_salary: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}