'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Lock, Unlock, Shield, X, Save, Eye, EyeOff, RefreshCw } from 'lucide-react';

const STATUS_COLORS = {
  Active:   { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  Inactive: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  Locked:   { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Deleted:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

const EMPTY_FORM = { username: '', email: '', displayName: '', password: '', companyId: '', isSuperAdmin: false, status: 'Active', roleIds: [] };

export default function UsersPage() {
  const [users,    setUsers]    = useState([]);
  const [roles,    setRoles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('');
  const [modal,    setModal]    = useState(null); // 'add' | 'edit' | 'view'
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [uRes, rRes] = await Promise.all([
      fetch(`/api/admin/users?${filter ? `status=${filter}` : ''}`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/admin/roles').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setUsers(uRes.data || []);
    setRoles(rRes.data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setModal('add'); };
  const openEdit = (u) => {
    setSelected(u);
    setForm({ username: u.username, email: u.email, displayName: u.displayName, password: '', companyId: u.companyId || '', isSuperAdmin: u.isSuperAdmin, status: u.status, roleIds: (u.userRoles || []).map(r => r.role.id) });
    setError(''); setModal('edit');
  };

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      let res;
      if (modal === 'add') {
        res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        res = await fetch(`/api/admin/users/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setModal(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (u, newStatus) => {
    await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    load();
  };

  const handleDelete = async (u) => {
    if (!confirm(`Soft-delete user "${u.username}"?`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={22} color="#6366f1" /> User Management
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Create and manage ERP system login accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={ghostBtn}><RefreshCw size={14} /></button>
          <button onClick={openAdd} style={primaryBtn}><Plus size={15} /> Add User</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" style={{ ...inputStyle, paddingLeft: 36, width: '100%' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, minWidth: 140 }}>
          <option value="">All Status</option>
          {['Active','Inactive','Locked'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading users…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['User','Email','Status','Roles','Super Admin','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: h === 'Actions' ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const sc = STATUS_COLORS[u.status] || STATUS_COLORS.Active;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                          {u.displayName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{u.displayName}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{u.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>
                      {(u.userRoles || []).map(r => (
                        <span key={r.role.id} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: '#eef2ff', color: '#4f46e5', fontWeight: 600, marginRight: 4, fontSize: 11 }}>{r.role.name}</span>
                      ))}
                      {(u.userRoles || []).length === 0 && <span style={{ color: '#cbd5e1' }}>No roles</span>}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {u.isSuperAdmin && <Shield size={16} color="#6366f1" />}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button onClick={() => openEdit(u)} style={iconBtn} title="Edit"><Edit2 size={13} /></button>
                        {u.status === 'Active' && (
                          <button onClick={() => handleToggleStatus(u, 'Inactive')} style={{ ...iconBtn, color: '#d97706' }} title="Deactivate"><Lock size={13} /></button>
                        )}
                        {u.status === 'Inactive' && (
                          <button onClick={() => handleToggleStatus(u, 'Active')} style={{ ...iconBtn, color: '#059669' }} title="Activate"><Unlock size={13} /></button>
                        )}
                        {u.status === 'Locked' && (
                          <button onClick={() => handleToggleStatus(u, 'Active')} style={{ ...iconBtn, color: '#059669' }} title="Unlock"><Unlock size={13} /></button>
                        )}
                        {!u.isSuperAdmin && (
                          <button onClick={() => handleDelete(u)} style={{ ...iconBtn, color: '#ef4444' }} title="Delete"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                {modal === 'add' ? 'Add New User' : 'Edit User'}
              </h2>
              <button onClick={() => setModal(null)} style={closeBtn}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Display Name *"><input style={inputStyle} value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} /></Field>
                <Field label="Username *"><input style={inputStyle} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></Field>
                <Field label="Email *"><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
                <Field label={modal === 'add' ? 'Password *' : 'New Password (optional)'}>
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 38 }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    <button onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div>
                </Field>
              </div>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['Active','Inactive'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Assign Roles">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', maxHeight: 140, overflowY: 'auto' }}>
                  {roles.filter(r => r.isActive).map(r => {
                    const sel = form.roleIds.includes(r.id);
                    return (
                      <button key={r.id} onClick={() => setForm(f => ({ ...f, roleIds: sel ? f.roleIds.filter(x => x !== r.id) : [...f.roleIds, r.id] }))}
                        style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${sel ? '#6366f1' : '#e2e8f0'}`, background: sel ? '#eef2ff' : '#fff', color: sel ? '#4f46e5' : '#64748b', fontWeight: sel ? 700 : 500, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {r.name}
                      </button>
                    );
                  })}
                  {roles.length === 0 && <span style={{ color: '#94a3b8', fontSize: 12 }}>No roles found. Seed the system first.</span>}
                </div>
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isSuperAdmin} onChange={e => setForm(f => ({ ...f, isSuperAdmin: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Super Admin</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Bypasses all permission checks</span>
              </label>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={ghostBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : <><Save size={14} /> Save</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };
const primaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' };
const ghostBtn   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const iconBtn    = { padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center' };
const closeBtn   = { background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' };
