'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Edit2, Folder, FolderOpen, Plus, Search, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportToExcel } from '@/lib/exportExcel';

const controlStyle = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155' };

export default function ChartOfAccounts() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [name, setName] = useState('');
  const [nature, setNature] = useState('Asset');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [groupResponse, accountResponse] = await Promise.all([
        fetch('/api/accounts/groups', { cache: 'no-store' }),
        fetch('/api/accounts/ledgers', { cache: 'no-store' }),
      ]);
      const [groupData, accountData] = await Promise.all([groupResponse.json(), accountResponse.json()]);
      if (!groupResponse.ok) throw new Error(groupData.error || 'Unable to load account groups.');
      if (!accountResponse.ok) throw new Error(accountData.error || 'Unable to load contractors and parties.');
      const nextGroups = Array.isArray(groupData) ? groupData : [];
      setGroups(nextGroups);
      setAccounts(Array.isArray(accountData) ? accountData : []);
      setExpanded(previous => Object.keys(previous).length ? previous : Object.fromEntries(nextGroups.map(group => [group.id, true])));
    } catch (cause) {
      setError(cause.message || 'Unable to load the chart of accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter(account => [account.code, account.name, account.group, account.subGroup, account.contactPerson, account.mobile, account.email]
      .some(value => String(value || '').toLowerCase().includes(term)));
  }, [accounts, search]);

  const rootGroups = groups.filter(group => !group.parentId);
  const openDialog = parentId => {
    setName('');
    setNature(parentId ? groups.find(group => group.id === parentId)?.type || 'Asset' : 'Asset');
    setDialog({ parentId: parentId || null });
  };

  const saveGroup = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/accounts/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: nature, parentId: dialog.parentId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to save group.');
      setDialog(null);
      await loadData();
    } catch (cause) { window.alert(cause.message); }
    finally { setSaving(false); }
  };

  const deleteGroup = async group => {
    if (!window.confirm(`Delete "${group.name}"? Groups with subgroups or linked parties must be emptied first.`)) return;
    const response = await fetch(`/api/accounts/groups?id=${encodeURIComponent(group.id)}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { window.alert(result.error || 'Unable to delete group.'); return; }
    await loadData();
  };

  const deleteAccount = async account => {
    if (!window.confirm(`Delete contractor / party "${account.name}"?`)) return;
    const response = await fetch(`/api/accounts/ledgers?id=${encodeURIComponent(account.id)}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { window.alert(result.error || 'Unable to delete contractor / party.'); return; }
    await loadData();
  };

  const exportAccounts = () => exportToExcel(filteredAccounts.map(account => ({
    Code: account.code || '', ContractorOrParty: account.name,
    Group: account.group || '', Subgroup: account.subGroup || '',
    Contact: account.contactPerson || '', Mobile: account.mobile || '', Email: account.email || '',
    GSTIN: account.gstin || '', PAN: account.pan || '',
    OpeningBalance: account.openingBalance || 0, BalanceType: account.balanceType || 'Dr',
    Status: account.status || 'Active',
  })), 'Chart_of_Accounts');

  const accountRows = (rows, indent = 0) => rows.map(account => (
    <tr key={account.id} style={{ borderTop: '1px solid #eef2f7' }}>
      <td style={{ padding: '12px 16px', color: '#64748b', paddingLeft: 20 + indent * 22 }}>{account.code || '—'}</td>
      <td style={{ padding: '12px 16px', fontWeight: 650, color: '#0f172a' }}>{account.name}</td>
      <td style={{ padding: '12px 16px', color: '#475569' }}>{(account.groupPath || [account.group, account.subGroup].filter(Boolean)).join(' / ') || '—'}</td>
      <td style={{ padding: '12px 16px', color: '#64748b' }}>{[account.contactPerson, account.mobile, account.email].filter(Boolean).join(' · ') || '—'}</td>
      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>{account.balance ? `${new Intl.NumberFormat('en-IN').format(account.balance)} ${account.balanceType || ''}` : '—'}</td>
      <td style={{ padding: '12px 16px' }}><span style={{ color: account.status === 'Active' ? '#15803d' : '#b91c1c', background: account.status === 'Active' ? '#dcfce7' : '#fee2e2', padding: '4px 8px', borderRadius: 12, fontSize: 12 }}>{account.status || 'Active'}</span></td>
      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}><button aria-label="Edit contractor" onClick={() => router.push(`/accounts/ledgers/new?id=${encodeURIComponent(account.id)}`)} style={{ ...controlStyle, padding: '6px 9px', cursor: 'pointer', marginRight: 5 }}><Edit2 size={14} /></button><button aria-label="Delete contractor" onClick={() => deleteAccount(account)} style={{ ...controlStyle, padding: '6px 9px', cursor: 'pointer', color: '#b42318', borderColor: '#fecaca' }}><Trash2 size={14} /></button></td>
    </tr>
  ));

  const renderGroup = (group, depth = 0) => {
    const children = groups.filter(item => item.parentId === group.id);
    const direct = filteredAccounts.filter(account => account.groupId === group.id);
    const term = search.trim().toLowerCase();
    const ownMatch = !term || group.name.toLowerCase().includes(term);
    const visibleChildren = children.map(child => renderGroup(child, depth + 1)).filter(Boolean);
    if (!ownMatch && !direct.length && !visibleChildren.length) return null;
    const isOpen = !term && expanded[group.id] === false ? false : true;
    return <React.Fragment key={group.id}>
      <tr style={{ background: depth === 0 ? '#e0f2fe' : '#f3f7fa' }}><td colSpan="7" style={{ padding: '10px 14px 10px ' + (14 + depth * 25) + 'px', fontWeight: 700, color: depth === 0 ? '#075985' : '#334155' }}>
        <button onClick={() => setExpanded(prev => ({ ...prev, [group.id]: !isOpen }))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}{isOpen ? <FolderOpen size={15} /> : <Folder size={15} />}{group.name}<span style={{ fontSize: 12, fontWeight: 500 }}>· {group.type}</span></button>
        <span style={{ float: 'right', display: 'flex', gap: 6 }}><button onClick={() => openDialog(group.id)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#0369a1', borderRadius: 6, padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}><Plus size={13} /> Subgroup</button><Link href={`/accounts/ledgers/new?groupId=${encodeURIComponent(group.id)}`} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 6, padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><Plus size={13} /> Party</Link><button aria-label={`Delete ${group.name}`} onClick={() => deleteGroup(group)} style={{ border: '1px solid #fecaca', background: '#fff', color: '#b42318', borderRadius: 6, padding: '5px 7px', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}><Trash2 size={13} /></button></span>
      </td></tr>
      {isOpen && <>{accountRows(direct, depth + 1)}{visibleChildren}</>}
    </React.Fragment>;
  };

  return <div style={{ padding: 24, maxWidth: 1500, margin: '0 auto', color: '#0f172a' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      <div><h1 style={{ margin: 0, fontSize: 25 }}>Chart of Accounts</h1><p style={{ margin: '5px 0 0', color: '#64748b' }}>Organize accounts as Group → Subgroup → Contractor / Party</p></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => openDialog(null)} style={{ ...controlStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><Plus size={15} /> New Group</button>
        <button onClick={() => rootGroups.length ? openDialog(rootGroups[0].id) : window.alert('Create a group first.')} style={{ ...controlStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><Plus size={15} /> New Subgroup</button>
        <button onClick={exportAccounts} style={{ ...controlStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}><Download size={15} /> Export</button>
        <Link href="/accounts/ledgers/new" style={{ ...controlStyle, background: '#2563eb', borderColor: '#2563eb', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}><Plus size={15} /> New Contractor / Party</Link>
      </div>
    </div>

    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 14px rgba(15,23,42,.04)' }}>
      <div style={{ padding: 14, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={16} color="#64748b" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search groups, contractors, contact details..." style={{ ...controlStyle, width: 'min(520px, 100%)' }} />
        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>{filteredAccounts.length} contractors / parties</span>
      </div>
      {error && <div role="alert" style={{ padding: 14, color: '#991b1b', background: '#fef2f2' }}>{error} <button onClick={loadData} style={{ marginLeft: 8 }}>Retry</button></div>}
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
        <thead><tr style={{ background: '#eff6ff', color: '#334155' }}>{['Code', 'Contractor / Party', 'Group / Subgroup', 'Contact details', 'Balance', 'Status', ''].map((label, index) => <th key={index} style={{ padding: '11px 16px', fontWeight: 650, textAlign: label === 'Balance' ? 'right' : 'left' }}>{label}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading chart of accounts…</td></tr>
          : rootGroups.map(group => renderGroup(group)).filter(Boolean)}
          {!loading && !error && !rootGroups.length && <tr><td colSpan="7" style={{ padding: 42, textAlign: 'center', color: '#64748b' }}>Create your first group to start the chart.</td></tr>}
        </tbody>
      </table></div>
    </div>

    {dialog && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, padding: 16, display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,.45)' }}>
      <form onSubmit={saveGroup} style={{ width: 'min(440px, 100%)', padding: 24, borderRadius: 12, background: '#fff', boxShadow: '0 20px 60px rgba(15,23,42,.25)' }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 20 }}>{dialog.parentId ? 'Create Subgroup' : 'Create Group'}</h2>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 650, marginBottom: 6 }}>Name</label><input autoFocus required value={name} onChange={event => setName(event.target.value)} style={{ ...controlStyle, width: '100%', boxSizing: 'border-box', marginBottom: 14 }} />
        {!dialog.parentId && <><label style={{ display: 'block', fontSize: 13, fontWeight: 650, marginBottom: 6 }}>Account nature</label><select value={nature} onChange={event => setNature(event.target.value)} style={{ ...controlStyle, width: '100%', boxSizing: 'border-box', marginBottom: 16 }}><option value="Asset">Assets</option><option value="Liability">Liabilities</option><option value="Capital">Capital</option><option value="Income">Income</option><option value="Expense">Expenses</option></select></>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={() => setDialog(null)} style={controlStyle}>Cancel</button><button disabled={saving} style={{ ...controlStyle, background: '#2563eb', color: '#fff', borderColor: '#2563eb' }}>{saving ? 'Saving…' : 'Save'}</button></div>
      </form>
    </div>}
  </div>;
}
