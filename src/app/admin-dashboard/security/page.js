'use client';
import React, { useState, useEffect } from 'react';
import { Lock, Save, RefreshCw, LogOut, Monitor, Globe, Clock, AlertTriangle, Phone, Key, Wifi, Smartphone } from 'lucide-react';

function Section({ title, icon: Icon, color, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa' }}>
        <Icon size={16} color={color} />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{desc}</div>}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
        <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: value ? '#6366f1' : '#cbd5e1', borderRadius: 24, transition: '0.3s' }}>
          <span style={{ position: 'absolute', content: '', height: 18, width: 18, left: value ? 23 : 3, bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.3s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </span>
      </label>
    </div>
  );
}

function NumField({ label, desc, value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{desc}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" value={value} min={min} max={max} onChange={e => onChange(+e.target.value)}
          style={{ width: 80, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, textAlign: 'center', outline: 'none' }} />
        {unit && <span style={{ fontSize: 11, color: '#64748b' }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [policy,   setPolicy]   = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('policy');

  const load = async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      fetch('/api/admin/security-policy').then(r => r.json()).catch(() => ({ data: null })),
      fetch('/api/admin/sessions').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setPolicy(pRes.data || {});
    setSessions(sRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (key, val) => setPolicy(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/admin/security-policy', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policy) });
    setSaving(false);
  };

  const forceLogout = async (token) => {
    await fetch(`/api/admin/sessions?token=${token}`, { method: 'DELETE' });
    load();
  };

  const forceLogoutAll = async (userId) => {
    if (!confirm('Force logout ALL sessions for this user?')) return;
    await fetch(`/api/admin/sessions?userId=${userId}`, { method: 'DELETE' });
    load();
  };

  const TABS = [
    { id: 'policy',   label: 'Password & Session Policy' },
    { id: 'sessions', label: `Active Sessions (${sessions.length})` },
    { id: 'advanced', label: 'Advanced Security' },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading security settings…</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={22} color="#ef4444" /> Security Management
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Password policy, session control, 2FA, IP restrictions</p>
        </div>
        {tab === 'policy' && (
          <button onClick={handleSave} disabled={saving} style={saveBtn}><Save size={14} /> {saving ? 'Saving…' : 'Save Policy'}</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#0f172a' : '#64748b', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'policy' && policy && (
        <>
          <Section title="Password Policy" icon={Key} color="#6366f1">
            <NumField label="Minimum Password Length" value={policy.minPasswordLength} onChange={v => set('minPasswordLength', v)} min={6} max={32} unit="chars" />
            <Toggle label="Require Uppercase" desc="At least one uppercase letter (A–Z)" value={policy.requireUppercase} onChange={v => set('requireUppercase', v)} />
            <Toggle label="Require Lowercase" desc="At least one lowercase letter (a–z)" value={policy.requireLowercase} onChange={v => set('requireLowercase', v)} />
            <Toggle label="Require Numbers" desc="At least one digit (0–9)" value={policy.requireNumbers} onChange={v => set('requireNumbers', v)} />
            <Toggle label="Require Special Characters" desc="At least one of !@#$%^&*()" value={policy.requireSpecialChars} onChange={v => set('requireSpecialChars', v)} />
            <NumField label="Password Expiry" desc="0 = never expires" value={policy.passwordExpiryDays} onChange={v => set('passwordExpiryDays', v)} min={0} max={365} unit="days" />
          </Section>

          <Section title="Login & Lockout" icon={AlertTriangle} color="#f59e0b">
            <NumField label="Max Failed Login Attempts" desc="Account locks after this many failures" value={policy.maxFailedAttempts} onChange={v => set('maxFailedAttempts', v)} min={1} max={20} unit="attempts" />
            <NumField label="Lockout Duration" desc="How long the account stays locked" value={policy.lockoutDurationMins} onChange={v => set('lockoutDurationMins', v)} min={1} max={1440} unit="minutes" />
          </Section>

          <Section title="Session Management" icon={Clock} color="#8b5cf6">
            <NumField label="Session Timeout" desc="Auto-logout after inactivity" value={policy.sessionTimeoutMins} onChange={v => set('sessionTimeoutMins', v)} min={5} max={1440} unit="minutes" />
            <Toggle label="Allow Multiple Simultaneous Sessions" desc="Allow same user to be logged in from multiple devices" value={policy.allowMultipleSessions} onChange={v => set('allowMultipleSessions', v)} />
          </Section>

          <Section title="Two-Factor Authentication" icon={Phone} color="#10b981">
            <Toggle label="Enable 2FA" desc="Require OTP on every login" value={policy.twoFactorEnabled} onChange={v => set('twoFactorEnabled', v)} />
          </Section>
        </>
      )}

      {tab === 'sessions' && (
        <Section title="Active Sessions" icon={Monitor} color="#6366f1">
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No active sessions.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['User', 'IP Address', 'Login Time', 'Device', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{s.user?.displayName}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.user?.username}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{s.ipAddress || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{new Date(s.loginAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.userAgent?.slice(0, 40) || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => forceLogout(s.token)} style={{ padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <LogOut size={11} /> Logout
                        </button>
                        <button onClick={() => forceLogoutAll(s.userId)} style={{ padding: '5px 10px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          All Sessions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {tab === 'advanced' && policy && (
        <>
          <Section title="IP Restrictions" icon={Wifi} color="#0ea5e9">
            <Toggle label="Enable IP Whitelist" desc="Only allow access from specific IP addresses" value={policy.ipWhitelistEnabled} onChange={v => set('ipWhitelistEnabled', v)} />
            {policy.ipWhitelistEnabled && (
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Whitelisted IPs (one per line)</label>
                <textarea
                  value={(policy.ipWhitelist || []).join('\n')}
                  onChange={e => set('ipWhitelist', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                  rows={5}
                  placeholder="192.168.1.0/24&#10;10.0.0.1"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </Section>
          <Section title="Device & API Management" icon={Smartphone} color="#8b5cf6">
            <Toggle label="Device Management" desc="Track and manage registered devices" value={policy.deviceManagementEnabled} onChange={v => set('deviceManagementEnabled', v)} />
            <Toggle label="Enable API Access" desc="Allow third-party API integrations" value={policy.apiAccessEnabled} onChange={v => set('apiAccessEnabled', v)} />
            {policy.apiAccessEnabled && (
              <NumField label="API Token Expiry" desc="Tokens expire after this many days" value={policy.apiTokenExpiryDays} onChange={v => set('apiTokenExpiryDays', v)} min={1} max={365} unit="days" />
            )}
          </Section>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} disabled={saving} style={saveBtn}><Save size={14} /> {saving ? 'Saving…' : 'Save Advanced Settings'}</button>
          </div>
        </>
      )}
    </div>
  );
}

const saveBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' };
