import React, { useState, useEffect } from 'react';
import { employeeAPI, API_BASE_URL } from '../../services/api';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploadingPic, setUploadingPic] = useState(false);
  const [previewPic, setPreviewPic] = useState(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await employeeAPI.getMyProfile();
      const data = res.data.data;
      setProfile(data);
      
      // Initialize only the fields the employee is allowed to edit
      setFormData({
        email: data.email || '',
        contactNumber: data.contactNumber || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
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
      // Map only the allowed fields to the backend payload
      const payload = {
        email: formData.email,
        phone: formData.contactNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relation: formData.emergencyContactRelation
      };

      await employeeAPI.updateMyProfile(payload);
      toast.success('Profile updated');
      setEditing(false);
      loadProfile();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    const formData = new FormData();
    formData.append('profile_picture', file);
    setUploadingPic(true);
    try {
      await employeeAPI.uploadProfilePicture(formData);
      toast.success('Profile picture updated');
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPic(false);
    }
  };

  if (loading) {
    return <div className="loading-page"><div className="loading-spinner"></div></div>;
  }

  if (error || !profile) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Profile not found</div>
        <button className="btn" style={{ marginTop: 12 }} onClick={loadProfile}>Retry</button>
      </div>
    );
  }

  const initials = (profile.name || '?').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const fullName = profile.name || 'N/A';
  const department = profile.department_name || profile.department || 'N/A';
  const designation = profile.designation_title || profile.designationId || 'N/A';

  const profilePicUrl = profile.profile_picture
    ? `${API_BASE_URL.replace('/api', '')}${profile.profile_picture}`
    : profile.profile_picture_url || profile.profilePictureUrl || null;

  return (
    <div>
      <div className="profile-header">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt={fullName}
              onClick={() => setPreviewPic(profilePicUrl)}
              style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)', cursor: 'pointer' }}
            />
          ) : (
            <div className="profile-avatar-placeholder" style={{ cursor: 'default' }}>{initials}</div>
          )}
          <label
            htmlFor="profile-pic-upload"
            style={{
              position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%',
              background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'transform 0.15s'
            }}
            title="Change profile picture"
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {uploadingPic ? '⏳' : '📷'}
          </label>
          <input
            id="profile-pic-upload" type="file" accept="image/*" style={{ display: 'none' }}
            onChange={handleProfilePicUpload} disabled={uploadingPic}
          />
        </div>
        <div className="profile-info">
          <div className="profile-name">{fullName}</div>
          <div className="profile-role">{designation} • {department}</div>
          <div className="profile-role" style={{ marginTop: 4 }}>ID: {profile.employee_id || 'N/A'}</div>
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
          {/* LOCKED FIELD */}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={fullName} disabled />
          </div>
          
          {/* EDITABLE FIELD */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              className="form-input" 
              value={editing ? formData.email : (profile.email || '-')} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!editing} 
            />
          </div>

          {/* EDITABLE FIELD */}
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-input"
              value={editing ? formData.contactNumber : (profile.contactNumber || '-')}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              disabled={!editing}
            />
          </div>

          {/* LOCKED FIELDS BELOW */}
          <div className="form-group">
            <label className="form-label">Gender</label>
            <input className="form-input" value={profile.gender || '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" value={profile.dob ? new Date(profile.dob).toLocaleDateString('en-IN') : '-'} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" value={department} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input className="form-input" value={designation} disabled />
          </div>
          
          {/* EDITABLE FIELD */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <textarea
              className="form-textarea"
              value={editing ? formData.address : (profile.address || '-')}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!editing}
            />
          </div>

          {/* EDITABLE FIELD */}
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className="form-input"
              value={editing ? formData.city : (profile.city || '-')}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={!editing}
            />
          </div>
          
          {/* EDITABLE FIELD */}
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
          {/* ALL LOCKED */}
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-IN') : '-'} disabled />
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
          {/* EDITABLE FIELD */}
          <div className="form-group">
            <label className="form-label">Contact Name</label>
            <input
              className="form-input"
              value={editing ? formData.emergencyContactName : (profile.emergencyContactName || '-')}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              disabled={!editing}
            />
          </div>
          
          {/* EDITABLE FIELD */}
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              className="form-input"
              value={editing ? formData.emergencyContactPhone : (profile.emergencyContactPhone || '-')}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              disabled={!editing}
            />
          </div>
          
          {/* EDITABLE FIELD */}
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

      {/* Picture Preview Modal remains unchanged */}
      {previewPic && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: 20 }}
          onClick={() => setPreviewPic(null)}
        >
          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewPic} alt={fullName} style={{ display: 'block', maxWidth: '85vw', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} />
            <button
              type="button" onClick={() => setPreviewPic(null)}
              style={{ position: 'absolute', top: -16, right: -16, width: 36, height: 36, borderRadius: '50%', border: '2px solid #fff', background: '#ef4444', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}