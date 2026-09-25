'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Search, Edit2, Trash2, CheckSquare, Square, Save, X, RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';

const ACTIONS = ['View', 'Add', 'Edit', 'Delete', 'Approve', 'Reject', 'Export', 'Print', 'Download', 'Import', 'Submit', 'Cancel'];

const MODULE_MAP = {
  HR:              ['Employee Master','Attendance','Leave Management','Shift Management','Payroll','Appraisal','Recruitment','Imprest','Documents','Organization Chart','Reports'],
  Admin:           ['User Management','Role & Rights','Company Setup','Security Policy','Audit Log','License Management'],
  Engineering:     ['Projects','WBS','Budget','Estimate','Unit Library','Task Library','Material Library','Manufacturing','Quality Check','Project Wise Rate','Reports'],
  Purchase:        ['Requisitions','Purchase Orders','Vendors','Approvals'],
  Store:           ['Inventory','Issuing','Stock Reports'],
  Planning:        ['Schedule','Resource Planning','Progress Tracking'],
  Site:            ['Daily Progress','Site Attendance','Material Consumption'],
  Accounts:        ['Vouchers','Ledger','Reports','TDS','Bank'],
  Marketing:       ['Leads','Opportunities','Clients'],
  Tender:          ['Bids','Awards','Documents'],
  Quality:         ['Checklists','Inspection Reports','Punch Points'],
  Safety:          ['Incidents','Safety Inspections','Training'],
  'Project Billing':['Client Billing','Revenue Recognition','Reports'],
  Subcontractor:   ['Contracts','Bills','Payments'],
};

const MODULE_COLORS = {
  HR:'#6366f1', Admin:'#0f172a', Engineering:'#0ea5e9', Purchase:'#f59e0b',
  Store:'#10b981', Planning:'#8b5cf6', Site:'#ef4444', Accounts:'#14b8a6',
  Marketing:'#f97316', Tender:'#06b6d4', Quality:'#22c55e', Safety:'#dc2626',
  'Project Billing':'#7c3aed', Subcontractor:'#0891b2',
};

export default function RolesPage() {
  const [roles,         setRoles]         = useState([]);
  const [permissions,   setPermissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedRole,  setSelectedRole]  = useState(null);
  const [rolePerms,     setRolePerms]     = useState({}); // { permId: bool }
  const [expandedMods,  setExpandedMods]  = useState({});
  const [saving,        setSaving]        = useState(false);
  const [search,        setSearch]        = useState('');
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [newRole,       setNewRole]       = useState({ name: '', description: '' });
  const [view,          setView]          = useState('matrix'); // 'list' | 'matrix'

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      fetch('/api/admin/roles').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/admin/permissions').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setRoles(rRes.data || []);
    setPermissions(pRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    const res = await fetch(`/api/admin/roles/${role.id}`).then(r => r.json()).catch(() => ({ data: null }));
    if (res.data) {
      const map = {};
      (res.data.rolePermissions || []).forEach(rp => { map[rp.permissionId] = true; });
      setRolePerms(map);
    }
  };

  const togglePerm = (permId) => {
    setRolePerms(prev => ({ ...prev, [permId]: !prev[permId] }));
  };

  const toggleModule = (module, value) => {
    const modPerms = permissions.filter(p => p.module === module);
    const updates = {};
    modPerms.forEach(p => { updates[p.id] = value; });
    setRolePerms(prev => ({ ...prev, ...updates }));
  };

  const toggleSubModule = (module, subModule, value) => {
    const subPerms = permissions.filter(p => p.module === module && p.subModule === subModule);
    const updates = {};
    subPerms.forEach(p => { updates[p.id] = value; });
    setRolePerms(prev => ({ ...prev, ...updates }));
  };

  const toggleAction = (module, action, value) => {
    const actPerms = permissions.filter(p => p.module === module && p.action === action);
    const updates = {};
    actPerms.forEach(p => { updates[p.id] = value; });
    setRolePerms(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const permissionIds = Object.entries(rolePerms).filter(([,v]) => v).map(([k]) => k);
    const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds }),
    });
    if (res.ok) { load(); }
    setSaving(false);
  };

  const handleAddRole = async () => {
    if (!newRole.name) return;
    const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRole) });
    if (res.ok) { setShowAddModal(false); setNewRole({ name: '', description: '' }); load(); }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystem) return alert('System roles cannot be deleted.');
    if (!confirm(`Delete role "${role.name}"?`)) return;
    await fetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
    if (selectedRole?.id === role.id) setSelectedRole(null);
    load();
  };

  const getModulePermCount = (module) => {
    const modPerms = permissions.filter(p => p.module === module);
    const enabled  = modPerms.filter(p => rolePerms[p.id]).length;
    return { enabled, total: modPerms.length };
  };

  const isModuleAllChecked  = (m) => permissions.filter(p => p.module === m).every(p => rolePerms[p.id]);
  const isModuleSomeChecked = (m) => permissions.filter(p => p.module === m).some(p => rolePerms[p.id]);

  const groupedPerms = {};
  permissions.forEach(p => {
    if (!groupedPerms[p.module]) groupedPerms[p.module] = {};
    if (!groupedPerms[p.module][p.subModule]) groupedPerms[p.module][p.subModule] = {};
    groupedPerms[p.module][p.subModule][p.action] = p;
  });

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)', maxWidth: 1300, margin: '0 auto' }}>

      {/* ── Left: Role List ── */}
      <div style={{ width: 260, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={15} color="#6366f1" /> Roles</h2>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '5px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} />New</button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles…" style={{ width: '100%', padding: '8px 8px 8px 28px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div> :
            filteredRoles.map(role => {
              const active = selectedRole?.id === role.id;
              return (
                <div key={role.id} onClick={() => handleSelectRole(role)}
                  style={{ padding: '10px 12px', borderRadius: 9, cursor: 'pointer', marginBottom: 4, background: active ? '#eef2ff' : 'transparent', border: `1px solid ${active ? '#c7d2fe' : 'transparent'}`, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#4f46e5' : '#0f172a' }}>{role.name}</div>
                      {role.isSystem && <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>SYSTEM</span>}
                    </div>
                    {!role.isSystem && (
                      <button onClick={e => { e.stopPropagation(); handleDeleteRole(role); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {role.description && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{role.description}</div>}
                </div>
              );
            })
          }
        </div>
      </div>

      {/* ── Right: Permission Matrix ── */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {!selectedRole ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: 12 }}>
            <Shield size={40} color="#e2e8f0" />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Select a role to manage permissions</div>
            <div style={{ fontSize: 13 }}>Choose from the list on the left</div>
          </div>
        ) : (
          <>
            {/* Matrix Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{selectedRole.name}</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{selectedRole.description || 'Configure granular permissions below'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={load} style={ghostBtnSm}><RefreshCw size={13} /></button>
                <button onClick={handleSave} disabled={saving} style={saveBtnSm}>
                  <Save size={13} /> {saving ? 'Saving…' : 'Save Permissions'}
                </button>
              </div>
            </div>

            {/* Matrix Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {Object.entries(MODULE_MAP).map(([module, subModules]) => {
                const color = MODULE_COLORS[module] || '#6366f1';
                const { enabled, total } = getModulePermCount(module);
                const allChecked  = isModuleAllChecked(module);
                const someChecked = isModuleSomeChecked(module);
                const expanded    = expandedMods[module];

                return (
                  <div key={module} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Module Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', cursor: 'pointer', gap: 10 }}
                      onClick={() => setExpandedMods(prev => ({ ...prev, [module]: !prev[module] }))}>
                      <div onClick={e => { e.stopPropagation(); toggleModule(module, !allChecked); }} style={{ cursor: 'pointer' }}>
                        {allChecked ? <CheckSquare size={16} color={color} /> : someChecked ? <CheckSquare size={16} color="#94a3b8" /> : <Square size={16} color="#cbd5e1" />}
                      </div>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', flex: 1 }}>{module}</span>
                      <span style={{ fontSize: 11, color: enabled > 0 ? color : '#94a3b8', fontWeight: 600, background: enabled > 0 ? `${color}15` : '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                        {enabled}/{total}
                      </span>
                      {expanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                    </div>

                    {/* Sub-Module Rows */}
                    {expanded && (
                      <div style={{ borderTop: '1px solid #f1f5f9' }}>
                        {/* Action header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 1fr)', padding: '6px 14px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Sub-module</div>
                          {ACTIONS.map(a => (
                            <div key={a} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{a.slice(0, 3)}</div>
                          ))}
                        </div>
                        {subModules.map(sub => (
                          <div key={sub} style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 1fr)', padding: '7px 14px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                            <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{sub}</div>
                            {ACTIONS.map(action => {
                              const perm = groupedPerms[module]?.[sub]?.[action];
                              if (!perm) return <div key={action} />;
                              const checked = !!rolePerms[perm.id];
                              return (
                                <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                                  <input type="checkbox" checked={checked} onChange={() => togglePerm(perm.id)}
                                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: color }} />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Role Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create New Role</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Role Name *</label>
                <input value={newRole.name} onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} placeholder="e.g. Project Manager" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Description</label>
                <textarea value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', minHeight: 70 }} placeholder="Describe this role…" />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowAddModal(false)} style={ghostBtnSm}>Cancel</button>
              <button onClick={handleAddRole} style={saveBtnSm}><Save size={13} /> Create Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const saveBtnSm  = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const ghostBtnSm = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
