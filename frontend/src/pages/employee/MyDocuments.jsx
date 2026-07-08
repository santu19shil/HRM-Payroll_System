import React, { useState, useEffect, useRef } from 'react';
import { documentAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

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

      <div className="table-container">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Status</th></tr></thead>
          <tbody>
            {documents.map(d => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td><span className="badge badge-info">{d.type}</span></td>
                <td>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '-'}</td>
                <td>{new Date(d.uploaded_at).toLocaleDateString()}</td>
                <td><span className={`badge ${d.is_verified ? 'badge-success' : 'badge-warning'}`}>{d.is_verified ? 'Verified' : 'Pending'}</span></td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40 }}>No documents uploaded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}