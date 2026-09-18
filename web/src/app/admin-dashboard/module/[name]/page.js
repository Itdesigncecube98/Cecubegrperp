'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Users, Save, LayoutDashboard, ArrowLeft, CheckSquare, Square, Search, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MODULE_COLORS = {
  HR: '#6366f1', Engineering: '#0ea5e9', Purchase: '#f59e0b', Store: '#10b981',
  Planning: '#8b5cf6', Site: '#ef4444', Accounts: '#14b8a6', Marketing: '#f97316',
  Tender: '#06b6d4', Quality: '#22c55e', Safety: '#dc2626', 'Project Billing': '#7c3aed',
  Subcontractor: '#0891b2',
};

// Title casing function for URL param (e.g., 'project-billing' -> 'Project Billing')
const formatModuleName = (name) => {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function ModuleAccessPage({ params }) {
  const router = useRouter();
  const moduleParam = params.name;
  const moduleName = formatModuleName(moduleParam);
  const color = MODULE_COLORS[moduleName] || '#6366f1';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [allRoles, setAllRoles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  const [searchRole, setSearchRole] = useState('');
  const [searchUser, setSearchUser] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/module/${encodeURIComponent(moduleName)}`).then(r => r.json());
      if (res.roles) {
        setAllRoles(res.roles);
        const selRoles = new Set(res.roles.filter(r => r.isEnabled).map(r => r.id));
        setSelectedRoles(selRoles);
      }
      if (res.users) {
        setAllUsers(res.users);
        const selUsers = new Set(res.users.filter(u => u.isEnabled).map(u => u.id));
        setSelectedUsers(selUsers);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [moduleName]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/module/${encodeURIComponent(moduleName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleIds: Array.from(selectedRoles),
          userIds: Array.from(selectedUsers),
        }),
      });
      if (res.ok) {
        router.push('/admin-dashboard');
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const toggleRole = (id) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleUser = (id) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredRoles = allRoles.filter(r => r.name.toLowerCase().includes(searchRole.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.displayName.toLowerCase().includes(searchUser.toLowerCase()) || u.username.toLowerCase().includes(searchUser.toLowerCase()));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href="/admin-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${color}30` }}>
          <LayoutDashboard size={24} color={color} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            {moduleName} Module Access
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Manage which roles and specific users can access the {moduleName} module globally.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={loadData} style={{ ...btnStyle, background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}><RefreshCw size={14} /></button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: `linear-gradient(135deg, ${color}, ${color}dd)`, color: '#fff', border: 'none', boxShadow: `0 4px 12px ${color}40` }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save Access Config'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading access data…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Roles Column */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="#0ea5e9" />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Role Access</span>
                <span style={badgeStyle}>{selectedRoles.size} assigned</span>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input value={searchRole} onChange={e => setSearchRole(e.target.value)} placeholder="Search roles…" style={searchInp} />
                {searchRole && <button onClick={() => setSearchRole('')} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={14} /></button>}
              </div>
            </div>
            <div style={listContainer}>
              {filteredRoles.map(role => {
                const selected = selectedRoles.has(role.id);
                return (
                  <div key={role.id} onClick={() => toggleRole(role.id)} style={{ ...listItemStyle, background: selected ? '#f0f9ff' : 'transparent', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {selected ? <CheckSquare size={16} color="#0ea5e9" /> : <Square size={16} color="#cbd5e1" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#0284c7' : '#0f172a' }}>{role.name}</div>
                        {role.isSystem && <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, background: '#fef3c7', padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 3 }}>SYSTEM</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRoles.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No roles found.</div>}
            </div>
          </div>

          {/* Users Column */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#8b5cf6" />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>User Exceptions</span>
                <span style={badgeStyle}>{selectedUsers.size} overrides</span>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Search users…" style={searchInp} />
                {searchUser && <button onClick={() => setSearchUser('')} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={14} /></button>}
              </div>
            </div>
            <div style={listContainer}>
              <div style={{ padding: '12px 16px', fontSize: 11, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', lineHeight: 1.4 }}>
                Select users here to grant them access to <strong>{moduleName}</strong> even if their Role does not permit it.
              </div>
              {filteredUsers.map(user => {
                const selected = selectedUsers.has(user.id);
                return (
                  <div key={user.id} onClick={() => toggleUser(user.id)} style={{ ...listItemStyle, background: selected ? '#f5f3ff' : 'transparent', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {selected ? <CheckSquare size={16} color="#8b5cf6" /> : <Square size={16} color="#cbd5e1" />}
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 700, fontSize: 11 }}>
                        {user.displayName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#6d28d9' : '#0f172a' }}>{user.displayName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>@{user.username}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users found.</div>}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

const btnStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' };
const panelStyle = { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' };
const panelHeaderStyle = { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' };
const badgeStyle = { fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 10 };
const searchInp = { width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const listContainer = { flex: 1, overflowY: 'auto' };
const listItemStyle = { padding: '12px 16px', cursor: 'pointer', transition: 'background 0.1s' };
