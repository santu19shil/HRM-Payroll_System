import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await employeeAPI.getMyProfile();
      setProfile(res.data.data);
      setFormData({
        phone: res.data.data.phone || '',
        address: res.data.data.address || '',
        city: res.data.data.city || '',
        state: res.data.data.state || '',
        postal_code: res.data.data.postal_code || '',
        emergency_contact_name: res.data.data.emergency_contact_name || '',
        emergency_contact_phone: res.data.data.emergency_contact_phone || '',
        emergency_contact_relation: res.data.data.emergency_contact_relation || ''
      });
    } catch (err) { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      await employeeAPI.updateMyProfile(formData);
      toast.success('Profile updated');
      setEditing(false);
      loadProfile();
    } catch (err) { toast.error('Failed to update'); }
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;
  if (!profile) return <div className="empty-state"><div className="empty-state-title">Profile not found</div></div>;

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar-placeholder">
          {profile.first_name?.[0]}{profile.last_name?.[0]}
        </div>
        <div className="profile-info">
          <div className="profile-name">{profile.first_name} {profile.last_name}</div>
          <div className="profile-role">{profile.designation_title || 'Employee'} • {profile.department_name || 'N/A'}</div>
          <div className="profile-role" style={{ marginTop: 4 }}>ID: {profile.employee_id}</div>
        </div>
        <button className="btn" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Personal Information</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={profile.email} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={editing ? formData.phone : (profile.phone || '-')} 
              onChange={e => setFormData({...formData, phone: e.target.value})} disabled={!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <input className="form-input" value={profile.gender || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" value={profile.date_of_birth || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" value={profile.department_name || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input className="form-input" value={profile.designation_title || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Manager</label>
            <input className="form-input" value={profile.manager_name || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" value={profile.joining_date || '-'} disabled />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <textarea className="form-textarea" value={editing ? formData.address : (profile.address || '-')}
              onChange={e => setFormData({...formData, address: e.target.value})} disabled={!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={editing ? formData.city : (profile.city || '-')}
              onChange={e => setFormData({...formData, city: e.target.value})} disabled={!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" value={editing ? formData.state : (profile.state || '-')}
              onChange={e => setFormData({...formData, state: e.target.value})} disabled={!editing} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Emergency Contact</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Contact Name</label>
            <input className="form-input" value={editing ? formData.emergency_contact_name : (profile.emergency_contact_name || '-')}
              onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} disabled={!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input className="form-input" value={editing ? formData.emergency_contact_phone : (profile.emergency_contact_phone || '-')}
              onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} disabled={!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">Relation</label>
            <input className="form-input" value={editing ? formData.emergency_contact_relation : (profile.emergency_contact_relation || '-')}
              onChange={e => setFormData({...formData, emergency_contact_relation: e.target.value})} disabled={!editing} />
          </div>
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      )}
    </div>
  );
}