import React, { useState, useEffect } from 'react';
import { holidayAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function HolidayManagement() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', date: '', type: 'National', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await holidayAPI.getAll({ year: new Date().getFullYear() });
      setHolidays(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await holidayAPI.update(editing.id, formData); toast.success('Updated'); }
      else { await holidayAPI.create(formData); toast.success('Created'); }
      setShowModal(false); setEditing(null); loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await holidayAPI.delete(id); toast.success('Deleted'); loadData(); }
    catch (err) { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', date: '', type: 'National', description: '' }); setShowModal(true); }}>+ Add Holiday</button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Name</th><th>Date</th><th>Type</th><th>Day</th><th>Actions</th></tr></thead>
          <tbody>
            {holidays.map(h => (
              <tr key={h.id}>
                <td><strong>{h.name}</strong></td>
                <td>{h.date}</td>
                <td><span className="badge badge-info">{h.type}</span></td>
                <td>{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => { setEditing(h); setFormData({ name: h.name, date: h.date, type: h.type, description: h.description || '' }); setShowModal(true); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => handleDelete(h.id)}>Delete</button>
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
              <div className="modal-title">{editing ? 'Edit Holiday' : 'Add Holiday'}</div>
              <button className="btn btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="National">National</option>
                      <option value="State">State</option>
                      <option value="Company">Company</option>
                      <option value="Festival">Festival</option>
                    </select>
                  </div>
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