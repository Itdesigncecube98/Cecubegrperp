'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Search, Shield, Users, Building2, MapPin, Trash2, RefreshCw, X, Save } from 'lucide-react';

const SCOPES = ['Company', 'Project', 'Site', 'Branch', 'Department'];

export default function DataRightsPage() {
  const [data, setData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ targetType: 'user', targetId: '', scopeType: 'Project', scopeValue: '', module: '*' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rightsRes, usersRes, rolesRes] = await Promise.all([
        fetch('/api/admin/data-rights').then(r => r.json()).catch(() => ({ data: [], grouped: {} })),
        fetch('/api/admin/users').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/admin/roles').then(r => r.json()).catch(() => ({ data: [] })),
      ]);
      setData(rightsRes.data || []);
      setGrouped(rightsRes.grouped || {});
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this data access scope?')) return;
    await fetch(`/api/admin/data-rights?id=${id}`, { method: 'DELETE' });
    load();
  };

  const handleSave = async () => {
    if (!form.targetId || !form.scopeValue) return alert('Target and Scope Value are required.');
    setSaving(true);
    const body = {
      scopeType: form.scopeType,
      scopeValue: form.scopeValue,
      module: form.module,
      [form.targetType === 'user' ? 'userId' : 'roleId']: form.targetId,
    };
    await fetch('/api/admin/data-rights', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    setSaving(false);
    setModal(false);
    load();
  };

  const getTargetName = (item) => {
    if (item.userId) return users.find(u => u.id === item.userId)?.displayName || 'Unknown User';
    if (item.roleId) return roles.find(r => r.id === item.roleId)?.name || 'Unknown Role';
    return 'Unknown';
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={22} color="#0ea5e9" /> Data-Level Rights
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Restrict module access to specific projects, sites, or branches</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={ghostBtn}><RefreshCw size={14} /></button>
          <button onClick={() => { setForm({ targetType: 'user', targetId: '', scopeType: 'Project', scopeValue: '', module: '*' }); setModal(true); }} style={primaryBtn}>
            <Plus size={14} /> Add Scope Rule
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
      ) : SCOPES.map(scope => {
        const items = grouped[scope] || [];
        if (items.length === 0) return null;
        return (
          <div key={scope} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 24, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8 }}>
              {scope === 'Company' ? <Building2 size={16} color="#10b981" /> : scope === 'Site' ? <MapPin size={16} color="#ef4444" /> : <Database size={16} color="#0ea5e9" />}
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{scope}-Level Scopes</span>
              <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{items.length}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  {['Target', 'Scope Name/ID', 'Restricted To Module', 'Date Added', ''].map(h => (
                    <th key={h} style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.userId ? <Users size={14} color="#6366f1" /> : <Shield size={14} color="#0ea5e9" />}
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{getTargetName(item)}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{item.userId ? 'User' : 'Role'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#0ea5e9' }}>{item.scopeValue}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#475569' }}>
                      {item.module === '*' ? <span style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: 4 }}>Global (All Modules)</span> : item.module}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#94a3b8' }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {data.length === 0 && !loading && (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: 14 }}>
          No data-level restrictions active. All users have full access to their assigned modules.
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add Data Scope</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <Field label="Apply To">
                  <select value={form.targetType} onChange={e => setForm(f => ({...f, targetType: e.target.value, targetId: ''}))} style={inp}>
                    <option value="user">Specific User</option>
                    <option value="role">Entire Role</option>
                  </select>
                </Field>
                <Field label="Select Target">
                  <select value={form.targetId} onChange={e => setForm(f => ({...f, targetId: e.target.value}))} style={inp}>
                    <option value="">-- Select --</option>
                    {form.targetType === 'user' 
                      ? users.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.username})</option>)
                      : roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <Field label="Scope Level">
                  <select value={form.scopeType} onChange={e => setForm(f => ({...f, scopeType: e.target.value}))} style={inp}>
                    {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label={`${form.scopeType} Name / ID`}>
                  <input value={form.scopeValue} onChange={e => setForm(f => ({...f, scopeValue: e.target.value}))} placeholder={`e.g. Godrej Project`} style={inp} />
                </Field>
              </div>

              <Field label="Restricted Module">
                <select value={form.module} onChange={e => setForm(f => ({...f, module: e.target.value}))} style={inp}>
                  <option value="*">Global (Applies to all modules)</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Site">Site Management</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Project Billing">Project Billing</option>
                </select>
              </Field>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(false)} style={ghostBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={primaryBtn}><Save size={14} /> {saving ? 'Saving…' : 'Save Scope'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>{children}</div>; }
const inp = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff' };
const primaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghostBtn   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
