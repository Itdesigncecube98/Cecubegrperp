'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, AlertTriangle, CheckCircle, Clock, XCircle, Shield, Users, Calendar, RefreshCw, X, Save } from 'lucide-react';

const MODULES = ['HR','Admin','Engineering','Purchase','Store','Planning','Site','Accounts','Marketing','Tender','Quality','Safety','Project Billing','Subcontractor','Workflow','Reports','Management Dashboard'];

function DaysCountdown({ expiresAt }) {
  if (!expiresAt) return <span style={{ color: '#94a3b8' }}>No expiry</span>;
  const days = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  const color = days <= 7 ? '#dc2626' : days <= 15 ? '#d97706' : days <= 30 ? '#f59e0b' : '#10b981';
  const bg    = days <= 7 ? '#fef2f2' : days <= 15 ? '#fef3c7' : days <= 30 ? '#fffbeb' : '#ecfdf5';
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
      {days > 0 ? `${days} days left` : 'EXPIRED'}
    </span>
  );
}

function AlertBanner({ license }) {
  if (!license?.expiresAt) return null;
  const days = Math.ceil((new Date(license.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  if (days > 30) return null;
  const cfg = days <= 0
    ? { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: XCircle, text: 'Licence expired. Please contact system administrator.' }
    : days <= 7
    ? { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: AlertTriangle, text: `CRITICAL: Licence expires in ${days} day(s)! Renew immediately.` }
    : days <= 15
    ? { bg: '#fef3c7', border: '#fde68a', color: '#d97706', icon: AlertTriangle, text: `WARNING: Licence expires in ${days} day(s). Please arrange renewal.` }
    : { bg: '#fffbeb', border: '#fde68a', color: '#d97706', icon: Clock, text: `NOTICE: Licence expires in ${days} day(s).` };
  const Icon = cfg.icon;
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <Icon size={18} color={cfg.color} />
      <span style={{ color: cfg.color, fontWeight: 600, fontSize: 13 }}>{cfg.text}</span>
    </div>
  );
}

export default function LicensePage() {
  const [licenses, setLicenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState({ key: '', plan: 'Standard', maxUsers: 10, expiresAt: '', modules: [...MODULES], notes: '' });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/license').then(r => r.json()).catch(() => ({ data: [] }));
    setLicenses(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeLicense = licenses.find(l => l.isActive);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, expiresAt: form.expiresAt || undefined }),
    });
    if (res.ok) { setModal(false); load(); }
    setSaving(false);
  };

  const handleToggleActive = async (lic) => {
    await fetch('/api/admin/license', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lic.id, isActive: !lic.isActive }) });
    load();
  };

  const toggleModule = (mod) => {
    setForm(f => ({ ...f, modules: f.modules.includes(mod) ? f.modules.filter(m => m !== mod) : [...f.modules, mod] }));
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={22} color="#f59e0b" /> Licence Management
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Control user limits, module access, and licence validity</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={ghostBtn}><RefreshCw size={14} /></button>
          <button onClick={() => setModal(true)} style={primaryBtn}><Plus size={14} /> Add Licence Key</button>
        </div>
      </div>

      {/* Alert banner */}
      <AlertBanner license={activeLicense} />

      {/* Active licence status card */}
      {activeLicense && (
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ background: '#10b981', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>ACTIVE</div>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{activeLicense.plan} Plan</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
                {activeLicense.key.slice(0, 5)}-XXXXX-XXXXX
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>Licence ID: {activeLicense.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {[
                { label: 'Users', value: `${activeLicense.maxUsers}`, sub: 'Max allowed', icon: Users },
                { label: 'Modules', value: `${activeLicense.modules.length}`, sub: 'Licensed', icon: Shield },
                { label: 'Expires', value: activeLicense.expiresAt ? new Date(activeLicense.expiresAt).toLocaleDateString('en-IN') : 'Never', sub: 'Expiry date', icon: Calendar },
              ].map(({ label, value, sub, icon: Icon }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <Icon size={18} color="#64748b" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Module chips */}
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MODULES.map(m => {
              const enabled = activeLicense.modules.includes(m);
              return (
                <span key={m} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', color: enabled ? '#34d399' : '#475569', border: `1px solid ${enabled ? 'rgba(52,211,153,0.3)' : 'rgba(71,85,105,0.3)'}` }}>
                  {enabled ? '✓' : '✗'} {m}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* All Licences Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>All Licence Keys</div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Key', 'Plan', 'Users', 'Modules', 'Issued', 'Expiry', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map(lic => (
                <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#0f172a' }}>{lic.key.slice(0, 5)}-XXXXX</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: '#eef2ff', color: '#4f46e5' }}>{lic.plan}</span></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{lic.maxUsers}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{lic.modules.length} modules</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{new Date(lic.createdAt).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '12px 14px' }}><DaysCountdown expiresAt={lic.expiresAt} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: lic.isActive ? '#ecfdf5' : '#f8fafc', color: lic.isActive ? '#059669' : '#94a3b8', border: `1px solid ${lic.isActive ? '#a7f3d0' : '#e2e8f0'}` }}>
                      {lic.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => handleToggleActive(lic)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {lic.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No licences yet. Add your first licence key.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Licence Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add Licence Key</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Licence Key *</label>
                  <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="XXXXX-XXXXX-XXXXX" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Plan</label>
                  <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} style={inputStyle}>
                    {['Standard','Professional','Enterprise'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Max Users</label>
                  <input type="number" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: +e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Licensed Modules ({form.modules.length}/{MODULES.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  {MODULES.map(m => {
                    const sel = form.modules.includes(m);
                    return (
                      <button key={m} onClick={() => toggleModule(m)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${sel ? '#6366f1' : '#e2e8f0'}`, background: sel ? '#eef2ff' : '#fff', color: sel ? '#4f46e5' : '#64748b', fontWeight: sel ? 700 : 500, fontSize: 11, cursor: 'pointer' }}>
                        {sel ? '✓ ' : ''}{m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(false)} style={ghostBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={primaryBtn}><Save size={14} /> {saving ? 'Saving…' : 'Save Licence'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle  = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };
const labelStyle  = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };
const primaryBtn  = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghostBtn    = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
