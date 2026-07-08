import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      const res = await leaveAPI.getAll({ status: filter });
      setLeaves(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try { await leaveAPI.approve(id); toast.success('Approved'); loadData(); }
    catch (err) { toast.error('Failed'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    try { await leaveAPI.reject(id, { rejection_reason: reason }); toast.success('Rejected'); loadData(); }
    catch (err) { toast.error('Failed'); }
  };

  const getStatusBadge = (status) => {
    const map = { 'Pending': 'badge-warning', 'Approved': 'badge-success', 'Rejected': 'badge-danger', 'Cancelled': 'badge-gray' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          {['Pending', 'Approved', 'Rejected'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {leaves.map(l => (
              <tr key={l.id}>
                <td>{l.employee_name}</td>
                <td><span className="badge badge-info">{l.leave_type_name}</span></td>
                <td>{l.start_date}</td>
                <td>{l.end_date}</td>
                <td>{l.total_days}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.reason}</td>
                <td>{getStatusBadge(l.status)}</td>
                <td>
                  {l.status === 'Pending' && (
                    <>
                      <button className="btn btn-sm btn-success" onClick={() => handleApprove(l.id)}>Approve</button>
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => handleReject(l.id)}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}