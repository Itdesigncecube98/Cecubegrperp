'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, CheckSquare, Square, Search, RefreshCw, Save,
  ChevronDown, ChevronRight, Users, Zap, CheckCheck,
  X, ArrowLeft, Filter, UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Canonical tool definitions (kept in sync with the API) ───────────────────
const MODULE_TOOLS = {
  Contracting: [
    'Send WO to Contractor by Email','Add New Rate while Generating WO','Contract Rate Approve',
    'Contractor Advance Recovery','Labour Requisition Approve','Labour Requisition wise WO Generation',
    'Other Securities','RA Bill Approve TYPE1','RA Bill Approve TYPE2','RA Bill Approve TYPE3',
    'RA Bill Approve TYPE4','RA Bill Delete','RA Bill WC Wise Other Amount Edit','RAbill Approve',
    'Retention Debit','Task wise WO Generation','WO Browse','Work Order Approve',
    'Work Order Approve Type1 Security','Work Order Approve Type2','Work Order Approve Type3 DND',
    'Work Order Approve Type4 MEP Consultancy MSEDCL','Work Order Cancel','Work Order Complete',
    'Work Order Foreclose','Work Order Revision',
  ],
  Engineering: [
    'Allow to change Task Status when Task is Closed','Budget Browse Edit','Budget Release',
    'Task Attach Add','Task Attach Delete','Budget Approve','Non Conformity QC Raise',
    'Project Version Delete','Projectwise Category Config Labour Approval',
    'Projectwise Category Config Material Approval','Re-Open Approved Quality Check',
    'Restimate Completed Tasks','Task Estimate Approval','Task Status Allow Backdated',
    'Task Status Allow Previous Stage','Task Status Closed','Task Status Completed',
    'Task Status Confirmed','Task Status Normal','Task Status Started','Task Status Tentative',
    'Update Rera Stage','WBS',
  ],
  Purchase: [
    'Allow to Use Challan Qty while Purchase Bill','Approved PO Qty Add','Approved PO Qty Edit',
    'Delete Approved Dr Cr Note in PO','Easy PO','Material Extra Requisition Approve',
    'PO Amendment','PO Qty Edit','PO Status Update','PO Browse','PO Other Charges Edit',
    'Purchase Advance Cancel','Purchase Advance Voucher Approve','Purchase Advance Voucher Post',
    'Purchase Bill Approve','Purchase Bill Delete','Purchase Bills Allow Payment',
    'Purchase Order Approve','Purchase Order Approve Capital Goods',
    'Purchase Order Approve Related Party','Purchase Rate Approve',
    'Purchase Transporter Advance Voucher Approve','Purchase Voucher Credit Note Approve',
    'Purchase Voucher Debit Note Approve','Quotation Comparison','Send PO to Supplier by Email',
  ],
  Site: [
    'Gate Pass Browse','Gate Pass Delete','GRN','GRN Approve','GRN Contractor','GRN Delete',
    'GRN IST','GRN IST Materials from Library','GRN IST Materials from Requisition',
    'GRN Browse','GRN Browse Datewise','GRN Print','GRN without PO','GTN Delete',
    'Inward Gate Pass','Issue IST Materials from Library','Issue IST Materials from Requisition',
    'Issue IST Post Voucher','Issue Request Slip Approve','Issue Reverse Entry',
    'Issue Browse','Issue Print','IST','IST Browse','Non Estimated Issue','Outward Gate Pass',
    'QC Completion','Raise Requisition for Contract Material','Requisition Easy Requisition',
    'Requisition Material Wise','Requisition Procurement Plan','Requisition Workflow',
    'Requisition Browse','Allow Challan date Less than GRN Date','Stock Browse',
    'Stock Transaction','Store Delete','Task wise Requisition','Work Completion Approve',
    'Work Completion Browse Qty Edit','Work Completion Delete','Work Completion',
    'Work Completion Allow Negative Qty','Work Completion Other Amount Edit',
    'Work Completion Entry','Site App Allow GRN Document Upload from Gallery',
  ],
};

const MODULE_COLORS = {
  Contracting: { color: '#0891b2', bg: '#ecfeff', light: '#cffafe' },
  Engineering: { color: '#0ea5e9', bg: '#e0f2fe', light: '#bae6fd' },
  Purchase:    { color: '#f59e0b', bg: '#fffbeb', light: '#fde68a' },
  Site:        { color: '#ef4444', bg: '#fef2f2', light: '#fecaca' },
};

const MODULES = Object.keys(MODULE_TOOLS);

export default function AdminToolsPage() {
  const router = useRouter();

  // Role selection
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [rolesLoading, setRolesLoading] = useState(true);

  // Tools from DB (with roleAccess for selected role)
  const [dbTools, setDbTools] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local granted set (tool name-based for UI, converted to IDs on save)
  const [granted, setGranted] = useState(new Set());

  // UI state
  const [activeModule, setActiveModule] = useState(MODULES[0]);
  const [expandedModules, setExpandedModules] = useState(
    Object.fromEntries(MODULES.map(m => [m, true]))
  );
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all | granted | denied

  // ── Load roles ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/roles')
      .then(r => r.json())
      .then(data => { setRoles(data.data || []); setRolesLoading(false); })
      .catch(() => setRolesLoading(false));
  }, []);

  // ── Load tools for selected role ──────────────────────────────────────────────
  const loadTools = useCallback(async (roleId) => {
    if (!roleId) return;
    setToolsLoading(true);
    try {
      const res = await fetch(`/api/admin/tools?roleId=${roleId}`);
      const tools = await res.json();
      if (Array.isArray(tools)) {
        setDbTools(tools);
        // Build granted set from roleAccess
        const grantedNames = new Set(
          tools.filter(t => t.roleAccess?.some(a => a.granted)).map(t => `${t.module}|||${t.name}`)
        );
        setGranted(grantedNames);
      }
    } catch (e) {
      console.error(e);
    }
    setToolsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedRoleId) loadTools(selectedRoleId);
    else { setDbTools([]); setGranted(new Set()); }
  }, [selectedRoleId, loadTools]);

  // ── Seed tools ────────────────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      if (selectedRoleId) await loadTools(selectedRoleId);
    } catch (e) { console.error(e); }
    setSeeding(false);
  };

  // ── Save role tool grants ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      // Convert granted names → tool IDs
      const toolIds = dbTools
        .filter(t => granted.has(`${t.module}|||${t.name}`))
        .map(t => t.id);
      await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId, toolIds }),
      });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────────
  const toolKey = (module, name) => `${module}|||${name}`;

  const toggleTool = (module, name) => {
    const k = toolKey(module, name);
    setGranted(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const toggleModule = (module, grant) => {
    const tools = MODULE_TOOLS[module] || [];
    setGranted(prev => {
      const next = new Set(prev);
      tools.forEach(name => {
        const k = toolKey(module, name);
        if (grant) next.add(k); else next.delete(k);
      });
      return next;
    });
  };

  const grantAll = () => {
    const all = new Set();
    MODULES.forEach(m => MODULE_TOOLS[m].forEach(n => all.add(toolKey(m, n))));
    setGranted(all);
  };

  const revokeAll = () => setGranted(new Set());

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = MODULES.reduce((s, m) => s + MODULE_TOOLS[m].length, 0);
    return { total, granted: granted.size, denied: total - granted.size };
  }, [granted]);

  // ── Filtered tools for current view ──────────────────────────────────────────
  const filteredTools = useMemo(() => {
    const sq = search.toLowerCase();
    return MODULE_TOOLS[activeModule]?.filter(name => {
      const matchSearch = !sq || name.toLowerCase().includes(sq);
      const k = toolKey(activeModule, name);
      const isGranted = granted.has(k);
      const matchFilter = filterMode === 'all' || (filterMode === 'granted' && isGranted) || (filterMode === 'denied' && !isGranted);
      return matchSearch && matchFilter;
    }) || [];
  }, [activeModule, search, filterMode, granted]);

  const moduleGrantedCount = (module) =>
    MODULE_TOOLS[module].filter(n => granted.has(toolKey(module, n))).length;

  const isModuleFullyGranted = (module) =>
    MODULE_TOOLS[module].every(n => granted.has(toolKey(module, n)));

  const isModulePartial = (module) => {
    const c = moduleGrantedCount(module);
    return c > 0 && c < MODULE_TOOLS[module].length;
  };

  const dbSeeded = dbTools.length > 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href="/admin-dashboard" style={iconBtnStyle}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
          <Shield size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Admin Tool Permissions
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Control granular feature access per role — Contracting, Engineering, Purchase & Site
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/admin-dashboard/employee-tools"
            style={{ ...actionBtnStyle, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', textDecoration: 'none' }}>
            <UserCheck size={14} /> Project-wise (Employee)
          </Link>
          {!dbSeeded && (
            <button onClick={handleSeed} disabled={seeding} style={{ ...actionBtnStyle, background: '#f97316', color: '#fff' }}>
              <Zap size={14} /> {seeding ? 'Seeding…' : 'Seed All Tools'}
            </button>
          )}
          <button onClick={() => { if (selectedRoleId) loadTools(selectedRoleId); }} style={{ ...actionBtnStyle, background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={handleSave} disabled={!selectedRoleId || saving} style={{ ...actionBtnStyle, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', opacity: !selectedRoleId ? 0.5 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Access'}
          </button>
        </div>
      </div>

      {/* Role Selector + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Select Role
          </label>
          {rolesLoading ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading roles…</div>
          ) : (
            <select
              value={selectedRoleId}
              onChange={e => setSelectedRoleId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#f8fafc', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">— Choose a role —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.isSystem ? ' (System)' : ''}</option>
              ))}
            </select>
          )}
          {!dbSeeded && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              ⚠️ Tools not seeded yet. Click <strong>Seed All Tools</strong> first.
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Tools', value: stats.total, color: '#6366f1', bg: '#eef2ff', icon: Shield },
            { label: 'Granted', value: stats.granted, color: '#10b981', bg: '#ecfdf5', icon: CheckCheck },
            { label: 'Denied', value: stats.denied, color: '#ef4444', bg: '#fef2f2', icon: X },
          ].map(s => (
            <div key={s.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout: Module Tabs + Tools */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>

        {/* Left: Module list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px', marginBottom: 4 }}>
            Modules
          </div>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={grantAll} title="Grant all tools" style={{ flex: 1, padding: '6px 0', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#065f46', cursor: 'pointer' }}>
              ✅ All
            </button>
            <button onClick={revokeAll} title="Revoke all tools" style={{ flex: 1, padding: '6px 0', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#991b1b', cursor: 'pointer' }}>
              ❌ None
            </button>
          </div>
          {MODULES.map(module => {
            const { color, bg } = MODULE_COLORS[module];
            const cnt = moduleGrantedCount(module);
            const total = MODULE_TOOLS[module].length;
            const isActive = activeModule === module;
            const partial = isModulePartial(module);
            const full = isModuleFullyGranted(module);
            return (
              <button
                key={module}
                onClick={() => setActiveModule(module)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${isActive ? color : '#e2e8f0'}`,
                  background: isActive ? bg : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: full ? '#10b981' : partial ? '#f59e0b' : '#e2e8f0', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{cnt}/{total} granted</div>
                </div>
                <div style={{ background: isActive ? color : '#f1f5f9', color: isActive ? '#fff' : '#64748b', borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {cnt}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Tools panel */}
        <div style={cardStyle}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MODULE_COLORS[activeModule].bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color={MODULE_COLORS[activeModule].color} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{activeModule}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {moduleGrantedCount(activeModule)}/{MODULE_TOOLS[activeModule].length} tools granted
                </div>
              </div>
            </div>

            {/* Module-level quick toggles */}
            <button
              onClick={() => toggleModule(activeModule, true)}
              style={{ ...smallBtnStyle, background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}
            >
              <CheckCheck size={12} /> Grant All
            </button>
            <button
              onClick={() => toggleModule(activeModule, false)}
              style={{ ...smallBtnStyle, background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}
            >
              <X size={12} /> Revoke All
            </button>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#94a3b8' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tools…"
                style={{ padding: '8px 12px 8px 30px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', width: 180 }}
              />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={12} /></button>}
            </div>

            {/* Filter */}
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">All</option>
              <option value="granted">Granted</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          {/* Tool list */}
          {toolsLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading tool access…</div>
          ) : !selectedRoleId ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <Shield size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Select a role to manage its tool access</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 380px)', overflowY: 'auto', paddingRight: 4 }}>
              {filteredTools.length === 0 && (
                <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  {search ? `No tools matching "${search}"` : 'No tools here.'}
                </div>
              )}
              {filteredTools.map((name, idx) => {
                const k = toolKey(activeModule, name);
                const isGranted = granted.has(k);
                const { color } = MODULE_COLORS[activeModule];
                return (
                  <div
                    key={name}
                    onClick={() => toggleTool(activeModule, name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px', borderRadius: 9, cursor: 'pointer',
                      background: isGranted ? `${color}08` : 'transparent',
                      border: `1px solid ${isGranted ? color + '30' : '#f1f5f9'}`,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isGranted ? `${color}15` : '#f8fafc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isGranted ? `${color}08` : 'transparent'; }}
                  >
                    {isGranted
                      ? <CheckSquare size={17} color={color} style={{ flexShrink: 0 }} />
                      : <Square size={17} color="#cbd5e1" style={{ flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 13, fontWeight: isGranted ? 600 : 400, color: isGranted ? '#0f172a' : '#64748b', flex: 1 }}>
                      {name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: isGranted ? `${color}20` : '#f1f5f9',
                      color: isGranted ? color : '#94a3b8'
                    }}>
                      {isGranted ? 'GRANTED' : 'DENIED'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      {selectedRoleId && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #e2e8f0', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{stats.granted}</span> of {stats.total} tools granted to{' '}
            <span style={{ fontWeight: 700, color: '#6366f1' }}>{roles.find(r => r.id === selectedRoleId)?.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={revokeAll} style={{ ...actionBtnStyle, background: '#fff', color: '#ef4444', border: '1px solid #fca5a5' }}>
              Revoke All
            </button>
            <button onClick={grantAll} style={{ ...actionBtnStyle, background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}>
              Grant All
            </button>
            <button onClick={handleSave} disabled={saving} style={{ ...actionBtnStyle, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Access Config'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
const actionBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const smallBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' };
const iconBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', textDecoration: 'none', transition: 'all 0.15s' };
