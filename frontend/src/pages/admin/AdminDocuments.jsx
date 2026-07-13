import React, { useState, useEffect } from 'react';
import { documentAPI, notificationAPI, API_BASE_URL } from '../../services/api';
import ActionMenu from '../../components/ActionMenu';
import toast from 'react-hot-toast';

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editDoc, setEditDoc] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: '', status: '', rejection_reason: '' });

  useEffect(() => {
    loadDocuments();
    notificationAPI.markCategoryRead('DOCUMENT').catch(() => {});
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await documentAPI.getAll();
      setDocuments(res.data.data);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await documentAPI.verify(id);
      toast.success('Document accepted');
      loadDocuments();
    } catch (err) {
      toast.error('Failed to accept document');
    }
  };

  const openReject = (id) => { setRejectId(id); setRejectReason(''); };

  const submitReject = async () => {
    try {
      await documentAPI.reject(rejectId, { rejection_reason: rejectReason });
      toast.success('Document rejected');
      setRejectId(null);
      loadDocuments();
    } catch (err) {
      toast.error('Failed to reject document');
    }
  };

  const openEdit = (doc) => {
    setEditDoc(doc);
    setEditForm({
      name: doc.name || '',
      type: doc.type || '',
      status: doc.status || 'Pending',
      rejection_reason: doc.rejection_reason || ''
    });
  };

  const submitEdit = async () => {
    try {
      await documentAPI.update(editDoc.id, editForm);
      toast.success('Document updated');
      setEditDoc(null);
      loadDocuments();
    } catch (err) {
      toast.error('Failed to update document');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await documentAPI.delete(id);
      toast.success('Document deleted');
      loadDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const fileUrl = (doc) => `${API_BASE_URL.replace('/api', '')}${doc.file_path}`;

  const getStatusBadge = (doc) => {
    if (doc.status === 'Verified') return <span className="badge badge-success">Accepted</span>;
    if (doc.status === 'Rejected') return <span className="badge badge-danger">Rejected</span>;
    return <span className="badge badge-warning">Pending</span>;
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Employee Documents</h1>
        <p>Review documents uploaded by employees. Accept, reject, edit, or remove each submission.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Document Submissions</div>
            <div className="card-subtitle">{documents.length} document(s)</div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Document Name</th>
                <th>Type</th>
                <th>Uploaded At</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.employee_name || 'Unknown'}</td>
                  <td>{doc.name}</td>
                  <td><span className="badge badge-info">{doc.type}</span></td>
                  <td>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '-'}</td>
                  <td>
                    {getStatusBadge(doc)}
                    {doc.status === 'Rejected' && doc.rejection_reason && (
                      <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{doc.rejection_reason}</div>
                    )}
                  </td>
                  <td>
                    <ActionMenu
                      items={[
                        { label: 'View', onClick: () => window.open(fileUrl(doc), '_blank') },
                        { label: 'Download', onClick: () => {
                          const a = document.createElement('a');
                          a.href = fileUrl(doc);
                          a.download = doc.name || 'document';
                          a.click();
                        } },
                        ...(doc.status !== 'Verified' ? [{ label: 'Accept', onClick: () => handleVerify(doc.id) }] : []),
                        ...(doc.status !== 'Rejected' ? [{ label: 'Reject', onClick: () => openReject(doc.id) }] : [])
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>No documents uploaded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectId && (
        <div className="modal-overlay" onClick={() => setRejectId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Reject Document</div>
              <button className="btn btn-sm" onClick={() => setRejectId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reason for rejection (optional)</label>
                <textarea className="form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setRejectId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={submitReject}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {editDoc && (
        <div className="modal-overlay" onClick={() => setEditDoc(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Document</div>
              <button className="btn btn-sm" onClick={() => setEditDoc(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Document Name</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <input className="form-input" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} placeholder="e.g. ID Proof" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="Verified">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              {editForm.status === 'Rejected' && (
                <div className="form-group">
                  <label className="form-label">Rejection Reason</label>
                  <textarea className="form-textarea" value={editForm.rejection_reason} onChange={e => setEditForm({ ...editForm, rejection_reason: e.target.value })} placeholder="Enter rejection reason" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setEditDoc(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
