import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [formData, setFormData] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [leaveRes, balRes, typeRes] = await Promise.all([
        leaveAPI.getMy(),
        leaveAPI.getBalance(),
        leaveAPI.getTypes()
      ]);
      setLeaves(leaveRes.data.data);
      setBalances(balRes.data.data);
      setTypes(typeRes.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.apply(formData);
      toast.success('Leave applied successfully');
      setShowApply(false);
      setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to apply'); }
  };

  const getStatusBadge = (status) => {
    const map = { 'Pending': 'badge-warning', 'Approved': 'badge-success', 'Rejected': 'badge-danger', 'Cancelled': 'badge-gray' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => setShowApply(true)}>Apply for Leave</button>
        </div>
      </div>

      {/* Leave Balance */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {balances.map(b => (
          <div key={b.id || b.leave_type_id} className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="stat-label">{b.leave_type_name}</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{b.remaining_days || b.days_per_year || 0}</div>
            <div className="stat-change" style={{ fontSize: 12 }}>
              Used: {b.used_days || 0} | Pending: {b.pending_days || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Leave History */}
      <div className="table-container">
        <table>
          <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {leaves.map(l => (
              <tr key={l.id}>
                <td><span className="badge badge-info">{l.leave_type_name}</span></td>
                <td>{l.start_date}</td>
                <td>{l.end_date}</td>
                <td>{l.total_days}</td>
                <td style={{ maxWidth: 200 }}>{l.reason}</td>
                <td>{getStatusBadge(l.status)}</td>
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>No leave requests</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Apply for Leave</div>
              <button className="btn btn-sm" onClick={() => setShowApply(false)}>✕</button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Leave Type *</label>
                  <select className="form-select" value={formData.leave_type_id} onChange={e => setFormData({...formData, leave_type_id: e.target.value})} required>
                    <option value="">Select</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.days_per_year} days)</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input type="date" className="form-input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea className="form-textarea" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowApply(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}