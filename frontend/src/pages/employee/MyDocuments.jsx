import React, { useState, useEffect, useRef } from 'react';
import { documentAPI, notificationAPI, API_BASE_URL } from '../../services/api';
import ActionMenu from '../../components/ActionMenu';
import toast from 'react-hot-toast';

export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    notificationAPI.markCategoryRead('DOCUMENT').catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      const res = await documentAPI.getMy();
      setDocuments(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('name', file.name);
      formData.append('type', file.type);

      await documentAPI.upload(formData);
      toast.success('Document uploaded');
      loadData();
    } catch (err) { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const fileUrl = (doc) => `${API_BASE_URL.replace('/api', '')}${doc.file_path}`;

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await documentAPI.delete(id);
      toast.success('Document deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (doc) => {
    if (doc.status === 'Verified') return <span className="badge badge-success">Accepted</span>;
    if (doc.status === 'Rejected') return <span className="badge badge-danger">Rejected</span>;
    return <span className="badge badge-warning">Pending</span>;
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-right">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>

      <div className="table-container allow-overflow">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {Array.isArray(documents) && documents.length > 0 && documents.map(d => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td><span className="badge badge-info">{d.type}</span></td>
                <td>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '-'}</td>
                <td>{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : '-'}</td>
                <td>
                  {getStatusBadge(d)}
                  {d.status === 'Rejected' && d.rejection_reason && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{d.rejection_reason}</div>
                  )}
                </td>
                <td>
                  <ActionMenu
                    items={[
                      { label: 'Open', onClick: () => window.open(fileUrl(d), '_blank') },
                      { label: 'Download', onClick: () => {
                        const a = document.createElement('a');
                        a.href = fileUrl(d);
                        a.download = d.name || 'document';
                        a.click();
                      } },
                      { label: 'Delete', danger: true, onClick: () => handleDelete(d.id) }
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
  );
}
