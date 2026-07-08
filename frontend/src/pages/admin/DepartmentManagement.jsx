import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await departmentAPI.getAll();
      setDepartments(res.data.data);
    } catch (err) { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await departmentAPI.update(editing.id, formData);
        toast.success('Department updated');
      } else {
        await departmentAPI.create(formData);
        toast.success('Department created');
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', description: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', description: '' }); setShowModal(true); }}>+ Add Department</button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Head</th><th>Employees</th><th>Actions</th></tr></thead>
          <tbody>
            {departments.map(d => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong></td>
                <td>{d.description || '-'}</td>
                <td>{d.head_name || '-'}</td>
                <td><span className="badge badge-primary">{d.employee_count || 0}</span></td>
                <td>
                  <button className="btn btn-sm" onClick={() => { setEditing(d); setFormData({ name: d.name, description: d.description || '' }); setShowModal(true); }}>Edit</button>
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
              <div className="modal-title">{editing ? 'Edit Department' : 'Add Department'}</div>
              <button className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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