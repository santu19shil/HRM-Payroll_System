import React, { useEffect, useMemo, useState } from 'react';
import { employeeAPI, departmentAPI, designationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const buildInitialForm = (p) => ({
  // employee-owned/self-service fields
  phone: p?.contactNumber || '',
  address: p?.address || '',
  city: p?.city || '',
  state: p?.state || '',
  postalCode: p?.postalCode || '',
  emergencyContactName: p?.emergencyContactName || '',
  emergencyContactPhone: p?.emergencyContactPhone || '',
  emergencyContactRelation: p?.emergencyContactRelation || ''
});

export default function AdminEmployeeProfile({ employeeId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({});
  const isFormDisabled = true; // per requirement: HR can view only

  const initials = useMemo(() => {
    if (!profile?.name) return '?';
    return profile.name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [profile?.name]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [empRes] = await Promise.all([employeeAPI.getById(employeeId)]);
        const p = empRes.data?.data || empRes.data;
        setProfile(p);
        setFormData(buildInitialForm(p));
      } catch (e) {
        setError(e?.message || 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    };
    if (employeeId) load();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{error || 'Employee profile not found'}</div>
        <button className="btn" style={{ marginTop: 12 }} onClick={onClose}>
          Back
        </button>
      </div>
    );
  }

  const department = profile.department_name || profile.department || 'N/A';
  const designation = profile.designation_title || profile.designationId || 'N/A';

  return (
    <div style={{ minHeight: 300 }}>
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.profile_picture ? (
            <img
              src={`http://localhost:5000${profile.profile_picture}`}
              alt="Profile"
              style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div className="profile-avatar-placeholder">{initials}</div>
          )}
        </div>

        <div className="profile-info">
          <div className="profile-name">{profile.name || 'N/A'}</div>
          <div className="profile-role">
            {designation} • {department}
          </div>
          <div className="profile-role" style={{ marginTop: 4 }}>
            ID: {profile.employee_id || 'N/A'}
          </div>
        </div>

        <button className="btn" onClick={onClose}>
          Back
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Personal Information (View Only)</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={profile.name || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={profile.email || '-'} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <input className="form-input" value={profile.gender || '-'} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" value={profile.dob || profile.date_of_birth || '-'} disabled />
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
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>

          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className="form-input"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input
              className="form-input"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Emergency Contact (View Only)</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Contact Name</label>
            <input
              className="form-input"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              className="form-input"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Relation</label>
            <input
              className="form-input"
              value={formData.emergencyContactRelation}
              onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
              disabled={isFormDisabled}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Work Information (View Only)</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" value={profile.joiningDate || profile.joining_date || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <input className="form-input" value={profile.employmentType || profile.employment_type || '-'} disabled />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Work Location</label>
            <input className="form-input" value={profile.workLocation || profile.work_location || '-'} disabled />
          </div>
        </div>
      </div>
    </div>
  );
}

