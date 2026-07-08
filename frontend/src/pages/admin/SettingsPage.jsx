import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.get();
      setSettings(res.data.data.settings || {});
    } catch (err) { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({ updates: settings });
      toast.success('Settings saved');
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="loading-page"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div className="card" style={{ maxWidth: 700 }}>
        <div className="card-header">
          <div>
            <div className="card-title">System Settings</div>
            <div className="card-subtitle">Configure company and system preferences</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={settings.company_name || ''} onChange={e => updateSetting('company_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Company Email</label>
            <input className="form-input" value={settings.company_email || ''} onChange={e => updateSetting('company_email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Company Phone</label>
            <input className="form-input" value={settings.company_phone || ''} onChange={e => updateSetting('company_phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-select" value={settings.currency || 'INR'} onChange={e => updateSetting('currency', e.target.value)}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Office Start Time</label>
            <input type="time" className="form-input" value={settings.office_start_time || '09:30'} onChange={e => updateSetting('office_start_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Office End Time</label>
            <input type="time" className="form-input" value={settings.office_end_time || '18:30'} onChange={e => updateSetting('office_end_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Payroll Cycle</label>
            <select className="form-select" value={settings.payroll_cycle || 'Monthly'} onChange={e => updateSetting('payroll_cycle', e.target.value)}>
              <option value="Monthly">Monthly</option>
              <option value="Bi-Weekly">Bi-Weekly</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Company Address</label>
            <textarea className="form-textarea" value={settings.company_address || ''} onChange={e => updateSetting('company_address', e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}