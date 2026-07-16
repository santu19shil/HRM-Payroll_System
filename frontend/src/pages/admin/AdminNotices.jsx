import React, { useState, useEffect, useMemo } from 'react';
import { noticeAPI, departmentAPI, designationAPI, employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';
import MultiSelect from '../../components/MultiSelect';
import ActionMenu from '../../components/ActionMenu';

export default function AdminNotices() {
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAll, setTargetAll] = useState(false);
  const [selDepartments, setSelDepartments] = useState([]);
  const [selDesignations, setSelDesignations] = useState([]);
  const [selEmployees, setSelEmployees] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [nRes, dRes, desRes, eRes] = await Promise.all([
        noticeAPI.list(),
        departmentAPI.getAll(),
        designationAPI.getAll(),
        employeeAPI.getAll({ limit: 1000 })
      ]);
      setNotices(nRes.data.data || []);
      setDepartments(dRes.data.data || []);
      setDesignations(desRes.data.data || []);
      setEmployees(eRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const empName = (e) => `${e.first_name || ''} ${e.last_name || ''}`.trim();

  const departmentOptions = useMemo(
    () => departments.map(d => ({ value: d.id, label: d.name })),
    [departments]
  );

  // Deduplicate designations so the same title appears only once.
  const designationOptions = useMemo(() => {
    const seen = new Map();
    designations.forEach(d => {
      if (!seen.has(d.title)) seen.set(d.title, { value: d.id, label: d.title });
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [designations]);

  const employeeOptions = useMemo(
    () => employees.map(e => ({
      value: e.id,
      label: `${empName(e)}${e.employee_id ? ` · ${e.employee_id}` : ''}`
    })),
    [employees]
  );

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    if (!targetAll && selDepartments.length === 0 && selDesignations.length === 0 && selEmployees.length === 0) {
      toast.error('Select at least one recipient or choose "All employees"');
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('target_all', targetAll ? 'true' : 'false');
      formData.append('departments', JSON.stringify(selDepartments));
      formData.append('designations', JSON.stringify(selDesignations));
      formData.append('employees', JSON.stringify(selEmployees));
      if (attachment) formData.append('attachment', attachment);

      await noticeAPI.create(formData);
      toast.success('Notice published');
      setTitle('');
      setContent('');
      setTargetAll(false);
      setSelDepartments([]);
      setSelDesignations([]);
      setSelEmployees([]);
      setAttachment(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice? This cannot be undone.')) return;
    try {
      await noticeAPI.delete(id);
      toast.success('Notice deleted');
      loadAll();
    } catch (err) {
      toast.error('Failed to delete notice');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Notices &amp; Announcements</h1>
        <p>Compose company-wide updates and target them by department, designation, or individual employees.</p>
      </div>

      <div className="notice-layout">
        {/* Compose */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Compose Notice</div>
              <div className="card-subtitle">Reach the right people in a few clicks</div>
            </div>
            <span style={{ fontSize: 22 }}>📢</span>
          </div>

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Holiday on Independence Day" />
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="Write the announcement..." rows={5} />
          </div>

          <div className="form-group">
            <label className="form-label">Attachment</label>
            <div className="file-drop">
              <input type="file" id="notice-file" className="file-input" onChange={e => setAttachment(e.target.files[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
              <label htmlFor="notice-file" className="file-label">
                <span style={{ fontSize: 20 }}>📎</span>
                <span>{attachment ? attachment.name : 'Click to attach a file (optional)'}</span>
              </label>
            </div>
          </div>

          <div className="audience-box">
            <label className="checkbox-row">
              <input type="checkbox" checked={targetAll} onChange={e => setTargetAll(e.target.checked)} />
              <span>Send to <strong>all employees</strong></span>
            </label>

            {!targetAll && (
              <div className="audience-grid">
                <MultiSelect
                  label="Departments"
                  options={departmentOptions}
                  selected={selDepartments}
                  onChange={setSelDepartments}
                  placeholder="Select departments"
                />
                <MultiSelect
                  label="Designations"
                  options={designationOptions}
                  selected={selDesignations}
                  onChange={setSelDesignations}
                  placeholder="Select designations"
                />
                <MultiSelect
                  label="Specific Employees"
                  options={employeeOptions}
                  selected={selEmployees}
                  onChange={setSelEmployees}
                  placeholder="Select employees"
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSend} disabled={sending}>
              {sending ? 'Publishing…' : 'Publish Notice'}
            </button>
          </div>
        </div>

        {/* Sent feed */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Sent Notices</div>
              <div className="card-subtitle">{notices.length} published</div>
            </div>
          </div>

          {notices.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 12px' }}>
              <div className="empty-state-icon">🗒️</div>
              <div className="empty-state-title">No notices yet</div>
              <div className="empty-state-text">Published notices will appear here.</div>
            </div>
          ) : (
            <div className="notice-feed">
              {notices.map(n => (
                <div key={n.id} className="notice-item">
                  <div className="notice-item-head">
                    <div className="notice-item-title">{n.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="notice-date">{n.created_at ? new Date(n.created_at).toLocaleDateString() : '-'}</div>
                      <ActionMenu
                        items={[{ label: 'Delete', danger: true, onClick: () => handleDelete(n.id) }]}
                        menuWidth={130}
                      />
                    </div>
                  </div>
                  <div className="notice-item-body">{n.content}</div>
                  {n.attachment_name && (
                    <div className="notice-attachment">📎 {n.attachment_name}</div>
                  )}
                  <div className="notice-meta">
                    {n.target_all
                      ? <span className="badge badge-primary">All Employees</span>
                      : <span className="badge badge-info">{n.recipient_count} recipient(s)</span>}
                    <span className="notice-author">by {n.created_by_name || 'Admin'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
