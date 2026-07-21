import React, { useEffect, useMemo, useState } from 'react';
import { employeeAPI, departmentAPI, designationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const buildInitialForm = (p) => ({
  phone: p?.contactNumber || '',
  address: p?.address || '',
  city: p?.city || '',
  state: p?.state || '',
  postalCode: p?.postalCode || '',
  emergencyContactName: p?.emergencyContactName || '',
  emergencyContactPhone: p?.emergencyContactPhone || '',
  emergencyContactRelation: p?.emergencyContactRelation || '',
  bank_name: p?.bank_name || '',
  bank_account_number: p?.bank_account_number || '',
  bank_account_name: p?.bank_account_name || '',
  bank_ifsc: p?.bank_ifsc || '',
  bank_branch: p?.bank_branch || '',
  pan_number: p?.pan_number || '',
  aadhar_number: p?.aadhar_number || '',
  uan_number: p?.uan_number || '',
  pf_number: p?.pf_number || ''
});

export default function AdminEmployeeProfile({ employeeId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewPic, setPreviewPic] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({});
  const isFormDisabled = false;

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

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await employeeAPI.update(employeeId, {
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relation: formData.emergencyContactRelation,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_account_name: formData.bank_account_name,
        bank_ifsc: formData.bank_ifsc,
        bank_branch: formData.bank_branch,
        pan_number: formData.pan_number,
        aadhar_number: formData.aadhar_number,
        uan_number: formData.uan_number,
        pf_number: formData.pf_number
      });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: 300 }}>
      <div className="profile-header">
        <div style={{ position: 'relative' }}>
          {profile.profile_picture ? (
            <img
              src={`http://localhost:5000${profile.profile_picture}`}
              alt="Profile"
              onClick={() => setPreviewPic(`http://localhost:5000${profile.profile_picture}`)}
              style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)', cursor: 'pointer' }}
            />
          ) : (
            <div
              className="profile-avatar-placeholder"
              style={{ width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, var(--primary-light), #e0e7ff)', color: 'var(--primary)' }}
            >
              {initials}
            </div>
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
          <div className="card-title">Personal Information</div>
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
          <div className="card-title">Bank & Personal Details</div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input className="form-input" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">Bank Account Number</label>
            <input className="form-input" value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Holder Name</label>
            <input className="form-input" value={formData.bank_account_name} onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">IFSC Code</label>
            <input className="form-input" value={formData.bank_ifsc} onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">Bank Branch</label>
            <input className="form-input" value={formData.bank_branch} onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">PAN Number</label>
            <input className="form-input" value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">Aadhar Number</label>
            <input className="form-input" value={formData.aadhar_number} onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">UAN Number</label>
            <input className="form-input" value={formData.uan_number} onChange={(e) => setFormData({ ...formData, uan_number: e.target.value })} disabled={isFormDisabled} />
          </div>
          <div className="form-group">
            <label className="form-label">PF Number</label>
            <input className="form-input" value={formData.pf_number} onChange={(e) => setFormData({ ...formData, pf_number: e.target.value })} disabled={isFormDisabled} />
          </div>
        </div>
        {!isFormDisabled && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {previewPic && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 20
          }}
          onClick={() => setPreviewPic(null)}
        >
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewPic}
              alt="Profile"
              style={{
                display: 'block',
                maxWidth: '85vw',
                maxHeight: '85vh',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewPic(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid #fff',
                background: '#ef4444',
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

