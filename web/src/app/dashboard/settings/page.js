'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings, updateSettings } from '../../../lib/data';

const SIDEBAR_TABS = [
  { key: 'default', label: 'Default Settings', icon: '⚙️' },
  { key: 'photo', label: 'User Profile Photo Settings', icon: '📷' },
  { key: 'holiday', label: 'Holiday Punch Handling', icon: '📅' },
  { key: 'weekoff', label: 'Week Off Punch Handling', icon: '📅' },
  { key: 'overtime', label: 'Shift Overtime Rules', icon: '⏱️' },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('holiday');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      showToast('Successfully saved');
    } catch (e) {
      showToast('Error saving settings');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
          😊 {toast}
        </div>
      )}

      {/* Back link */}
      <div style={{ background: 'white', padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
          ← Back to Account Setup
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>General Settings</h2>
        <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '24px' }} />

        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Left Sidebar */}
          <div style={{ width: '260px', flexShrink: 0 }}>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {SIDEBAR_TABS.map((tab, i) => (
                <div key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeTab === tab.key ? '#f0f9ff' : 'white', borderLeft: activeTab === tab.key ? '4px solid #007bff' : '4px solid transparent', borderBottom: i < SIDEBAR_TABS.length - 1 ? '1px solid #f3f4f6' : 'none', fontWeight: activeTab === tab.key ? 600 : 400, fontSize: '13px', color: activeTab === tab.key ? '#007bff' : '#374151', transition: '0.15s', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tab.icon} {tab.label}
                  </span>
                  <span style={{ color: '#9ca3af' }}>›</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '32px' }}>

            {activeTab === 'holiday' && (
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#111827' }}>Holiday Punch Handling</h3>
                <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '28px' }} />
                <p style={{ color: '#374151', fontSize: '14px', marginBottom: '24px', fontWeight: 500 }}>How should punches received on holidays be processed?</p>

                {[
                  { value: 'MARK_HOLIDAY_NO_REG', label: 'Mark it as a holiday and do not allow regularization.' },
                  { value: 'MARK_HOLIDAY_ALLOW_REG', label: 'Mark it as a holiday and allow the user to regularize it.' },
                  { value: 'PROCESS_AS_REGULAR', label: 'Process it like a regular working day.' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${settings?.holidayPunchHandling === opt.value ? '#007bff' : '#d1d5db'}`, background: settings?.holidayPunchHandling === opt.value ? '#007bff' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => setSettings({ ...settings, holidayPunchHandling: opt.value })}>
                      {settings?.holidayPunchHandling === opt.value && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                    </div>
                    {opt.label}
                  </label>
                ))}

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button onClick={() => fetchSettings()} style={{ padding: '10px 24px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                    Close
                  </button>
                  <button onClick={handleSave} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    Submit
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'weekoff' && (
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#111827' }}>Week Off Punch Handling</h3>
                <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '28px' }} />
                <p style={{ color: '#374151', fontSize: '14px', marginBottom: '24px', fontWeight: 500 }}>How should punches received on weekly off days be processed?</p>

                {[
                  { value: 'MARK_WEEKOFF_NO_REG', label: 'Mark it as a week off and do not allow regularization.' },
                  { value: 'MARK_WEEKOFF_ALLOW_REG', label: 'Mark it as a week off and allow the user to regularize it.' },
                  { value: 'PROCESS_AS_REGULAR', label: 'Process it like a regular working day.' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${settings?.weekOffPunchHandling === opt.value ? '#007bff' : '#d1d5db'}`, background: settings?.weekOffPunchHandling === opt.value ? '#007bff' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => setSettings({ ...settings, weekOffPunchHandling: opt.value })}>
                      {settings?.weekOffPunchHandling === opt.value && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                    </div>
                    {opt.label}
                  </label>
                ))}

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button onClick={() => fetchSettings()} style={{ padding: '10px 24px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                    Close
                  </button>
                  <button onClick={handleSave} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    Submit
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'default' && (
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>Default Settings</h3>
                <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '28px' }} />
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelSm}>Company Name</label>
                  <input value={settings?.companyName || ''} onChange={e => setSettings({ ...settings, companyName: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelSm}>Enable Overtime</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                    {[true, false].map(v => (
                      <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${settings?.enableOvertime === v ? '#007bff' : '#d1d5db'}`, background: settings?.enableOvertime === v ? '#007bff' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSettings({ ...settings, enableOvertime: v })}>
                          {settings?.enableOvertime === v && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                        </div>
                        {v ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                </div>
                {settings?.enableOvertime && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={labelSm}>OT Start After (minutes)</label>
                      <input type="number" value={settings?.otStartMinutes || 0} onChange={e => setSettings({ ...settings, otStartMinutes: parseInt(e.target.value) })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelSm}>Daily OT Cap (hours)</label>
                      <input type="number" value={settings?.otDailyCapHours || 0} onChange={e => setSettings({ ...settings, otDailyCapHours: parseInt(e.target.value) })} style={inputStyle} />
                    </div>
                  </div>
                )}
                <button onClick={handleSave} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                  Save Settings
                </button>
              </div>
            )}

            {activeTab === 'overtime' && (
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 600, color: '#111827' }}>Shift Overtime Rules (Optional)</h3>
                <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '28px' }} />
                
                <p style={{ fontWeight: 500, fontSize: '14px', color: '#374151', marginBottom: '16px' }}>Do you want to enable Overtime calculation?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                  {[true, false].map(v => (
                    <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', color: '#374151' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${settings?.enableOvertime === v ? '#007bff' : '#d1d5db'}`, background: settings?.enableOvertime === v ? '#007bff' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSettings({ ...settings, enableOvertime: v })}>
                        {settings?.enableOvertime === v && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                      </div>
                      {v ? 'Yes' : 'No'}
                    </label>
                  ))}
                </div>

                {settings?.enableOvertime && (
                  <>
                    <p style={{ fontWeight: 500, fontSize: '14px', color: '#374151', marginBottom: '16px' }}>Compute Overtime based on</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                      {[
                        { value: 'WORKED_HOURS', label: 'Worked Hours' },
                        { value: 'CUT_OFF_TIME', label: 'Cut Off Time' },
                      ].map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', color: '#374151' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${settings?.computeOvertimeBasedOn === opt.value ? '#007bff' : '#d1d5db'}`, background: settings?.computeOvertimeBasedOn === opt.value ? '#007bff' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSettings({ ...settings, computeOvertimeBasedOn: opt.value })}>
                            {settings?.computeOvertimeBasedOn === opt.value && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                          </div>
                          {opt.label}
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '6px' }}>
                          Start Overtime after extra worked minutes beyond the scheduled shift <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Enter in minutes)</span>
                        </label>
                        <input type="number" value={settings?.otStartMinutes || ''} onChange={e => setSettings({ ...settings, otStartMinutes: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="e.g. 15" />
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Example: enter 15 to start OT after 15 extra minutes beyond scheduled hours.</p>
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '6px' }}>
                          Cap Overtime hours per day to a maximum of Y hours <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Enter in minutes)</span>
                        </label>
                        <input type="number" value={settings?.otDailyCapHours || ''} onChange={e => setSettings({ ...settings, otDailyCapHours: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} placeholder="e.g. 120" />
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button onClick={() => fetchSettings()} style={{ padding: '10px 24px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                    Close
                  </button>
                  <button onClick={handleSave} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    Submit
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'photo' && (
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>User Profile Photo Settings</h3>
                <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginBottom: '28px' }} />
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Configure how employee profile photos are handled in the system.</p>
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '20px', marginTop: '16px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Photo upload settings coming soon. Employees can update their photos from their profile page.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelSm = { fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
