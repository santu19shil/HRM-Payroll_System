import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await employeeAPI.getMyProfile();
      const data = res.data.data;
      setProfile(data);
      setFormData({
        contactNumber: data.contactNumber || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        emergencyContactRelation: data.emergencyContactRelation || ''
      });
    } catch (err) {
      setError(true);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await employeeAPI.updateMyProfile(formData);
      toast.success('Profile updated');
      setEditing(false);
      loadProfile();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Profile not found</div>
        <button className="btn" style={{ marginTop: 12 }} onClick={loadProfile}>
          Retry
        </button>
      </div>
    );
  }

  const initials = (profile.name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const fullName = profile.name || 'N/A';
  const department = profile.department_name || profile.department || 'N/A';
  const designation = profile.designation_title || profile.designationId || 'N/A';

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar-placeholder">{initials}</div>
        <div className="profile-info">
          <div className="profile-name">{fullName}</div>
          <div className="profile-role">{designation} • {department}</div>
          <div className="profile-role" style={{ marginTop: 4 }}>
            ID: {profile.employee_id || 'N/A'}
          </div>
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
            <label className="form-label">Name</label>
            <input className="form-input" value={fullName} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={profile.email || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              value={editing ? formData.contactNumber : (profile.contactNumber || '-')}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <input className="form-input" value={profile.gender || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" value={profile.dob || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" value={department} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input className="form-input" value={designation} disabled />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <textarea
              className="form-textarea"
              value={editing ? formData.address : (profile.address || '-')}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className="form-input"
              value={editing ? formData.city : (profile.city || '-')}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input
              className="form-input"
              value={editing ? formData.state : (profile.state || '-')}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Work Information</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" value={profile.joiningDate || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <input className="form-input" value={profile.employmentType || '-'} disabled />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Work Location</label>
            <input className="form-input" value={profile.workLocation || '-'} disabled />
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
            <input
              className="form-input"
              value={editing ? formData.emergencyContactName : (profile.emergencyContactName || '-')}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              className="form-input"
              value={editing ? formData.emergencyContactPhone : (profile.emergencyContactPhone || '-')}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Relation</label>
            <input
              className="form-input"
              value={editing ? formData.emergencyContactRelation : (profile.emergencyContactRelation || '-')}
              onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
              disabled={!editing}
            />
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
