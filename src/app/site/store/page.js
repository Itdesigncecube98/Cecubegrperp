'use client';

import { useEffect, useState } from 'react';
import { Package, RefreshCw, Search, Plus, X, Truck, Pencil, Clock3 } from 'lucide-react';
import { getClientActor } from '@/lib/clientActor';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontSize: 14 };
const ISSUE_STATUSES = ['Issued', 'In Transit', 'Delivered', 'Received', 'Cancelled'];

function localDateTimeValue(value = new Date()) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function emptyIssueForm() {
  return {
    issueDate: localDateTimeValue(),
    vehicleNo: '',
    workOrderNo: '',
    purchaseOrderNo: '',
    purchaseBillNo: '',
    ewayBillNo: '',
    challanNo: '',
    remarks: '',
    items: [{ stockId: '', quantity: '' }],
  };
}

function getIssueEditForm(issue) {
  return {
    issueDate: localDateTimeValue(issue.issueDate),
    vehicleNo: issue.vehicleNo || '',
    workOrderNo: issue.workOrderNo || '',
    purchaseOrderNo: issue.purchaseOrderNo || '',
    purchaseBillNo: issue.purchaseBillNo || '',
    ewayBillNo: issue.ewayBillNo || '',
    challanNo: issue.challanNo || '',
    remarks: issue.remarks || '',
  };
}

export default function SiteStorePage() {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [permissions, setPermissions] = useState({ canAdd: false, canEdit: false, canChangeStatus: false });
  const [permissionsByProjectId, setPermissionsByProjectId] = useState({});
  const [totals, setTotals] = useState({ lines: 0, quantity: 0 });
  const [filters, setFilters] = useState({ projectId: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [updatingIssueId, setUpdatingIssueId] = useState('');
  const [editingIssue, setEditingIssue] = useState(null);
  const [historyIssue, setHistoryIssue] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadStore = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.search) params.set('search', filters.search);
      const response = await fetch(`/api/site/store?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load site store');
      setItems(Array.isArray(data.items) ? data.items : []);
      setIssues(Array.isArray(data.issues) ? data.issues : []);
      setPermissions(data.permissions || { canAdd: false, canEdit: false, canChangeStatus: false });
      setPermissionsByProjectId(data.permissionsByProjectId || {});
      setTotals(data.totals || { lines: 0, quantity: 0 });
    } catch (loadError) {
      setError(loadError.message);
      setItems([]);
      setIssues([]);
      setPermissions({ canAdd: false, canEdit: false, canChangeStatus: false });
      setPermissionsByProjectId({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/engineering/projects').then(response => response.json()).then(data => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.search) params.set('search', filters.search);
    fetch(`/api/site/store?${params}`)
      .then(response => response.json().then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || 'Failed to load site store');
        setItems(Array.isArray(data.items) ? data.items : []);
        setIssues(Array.isArray(data.issues) ? data.issues : []);
        setPermissions(data.permissions || { canAdd: false, canEdit: false, canChangeStatus: false });
        setPermissionsByProjectId(data.permissionsByProjectId || {});
        setTotals(data.totals || { lines: 0, quantity: 0 });
        setError('');
      })
      .catch(loadError => {
        if (!cancelled) {
          setError(loadError.message);
          setItems([]);
          setIssues([]);
          setPermissions({ canAdd: false, canEdit: false, canChangeStatus: false });
          setPermissionsByProjectId({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters.projectId, filters.search]);

  const openIssueModal = () => {
    if (!filters.projectId) {
      setError('Select an engineering project before issuing material.');
      return;
    }
    if (!permissions.canAdd) {
      setError('You do not have Site Store Add permission for this project.');
      return;
    }
    if (!items.some(item => item.projectId === filters.projectId && Number(item.quantity) > 0)) {
      setError('There is no available stock for the selected project.');
      return;
    }
    setError('');
    setIssueForm(emptyIssueForm());
    setShowIssueModal(true);
  };

  const openEditModal = issue => {
    if (!permissionsByProjectId[issue.projectId]?.canEdit) {
      setError('You do not have Site Store Edit permission for this project.');
      return;
    }
    setError('');
    setEditingIssue(issue);
    setEditForm(getIssueEditForm(issue));
  };

  const handleSaveIssueEdit = async event => {
    event.preventDefault();
    if (!editingIssue || !editForm) return;
    setSavingEdit(true);
    setError('');
    try {
      const response = await fetch('/api/site/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          issueId: editingIssue.id,
          ...editForm,
          issueDate: new Date(editForm.issueDate).toISOString(),
          updatedBy: getClientActor(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to edit site store issue');
      setIssues(current => current.map(item => item.id === editingIssue.id ? data.issue : item));
      setEditingIssue(null);
      setEditForm(null);
    } catch (editError) {
      setError(editError.message || 'Failed to edit site store issue');
    } finally {
      setSavingEdit(false);
    }
  };

  const updateIssueItem = (index, field, value) => {
    setIssueForm(current => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreateIssue = async event => {
    event.preventDefault();
    if (!filters.projectId) {
      setError('Select an engineering project before issuing material.');
      return;
    }
    const issueItems = issueForm.items
      .filter(item => item.stockId || item.quantity)
      .map(item => ({ stockId: item.stockId, quantity: Number(item.quantity) }));
    if (!issueItems.length || issueItems.some(item => !item.stockId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      setError('Choose a stock item and enter a quantity greater than zero for each issue line.');
      return;
    }

    setSubmittingIssue(true);
    setError('');
    try {
      const response = await fetch('/api/site/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...issueForm,
          projectId: filters.projectId,
          issueDate: new Date(issueForm.issueDate).toISOString(),
          items: issueItems,
          issuedBy: getClientActor(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to issue material');
      setShowIssueModal(false);
      setIssueForm(emptyIssueForm());
      await loadStore();
    } catch (issueError) {
      setError(issueError.message || 'Failed to issue material');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleIssueStatusChange = async (issue, status) => {
    if (status === issue.status || updatingIssueId) return;
    if (status === 'Cancelled' && !window.confirm(`Cancel ${issue.issueNo}? Its issued quantity will be returned to Site Store.`)) return;
    setUpdatingIssueId(issue.id);
    setError('');
    try {
      const response = await fetch('/api/site/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', issueId: issue.id, status, actorName: getClientActor() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update issue status');
      setIssues(current => current.map(item => item.id === issue.id ? data.issue : item));
      if (status === 'Cancelled') await loadStore();
    } catch (statusError) {
      setError(statusError.message || 'Failed to update issue status');
    } finally {
      setUpdatingIssueId('');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>
            <Package size={22} color="#0284c7" /> Site Store
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Material available after GRN and successful GTN testing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={openIssueModal}
            disabled={!permissions.canAdd || !filters.projectId}
            title={!filters.projectId ? 'Select a project first' : !permissions.canAdd ? 'Site Store Add permission is required' : ''}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: '1px solid #0284c7', borderRadius: 6, background: '#0284c7', color: '#fff', cursor: !permissions.canAdd || !filters.projectId ? 'not-allowed' : 'pointer', opacity: !permissions.canAdd || !filters.projectId ? 0.6 : 1 }}
          >
            <Truck size={15} /> Issue Material to Site
          </button>
          <button
            type="button"
            onClick={loadStore}
            title="Refresh store"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: '1px solid #bae6fd', borderRadius: 6, background: '#f0f9ff', color: '#0369a1', cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 240px))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <div style={{ color: '#64748b', fontSize: 12 }}>Stock Lines</div>
          <strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 22 }}>{totals.lines}</strong>
        </div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <div style={{ color: '#64748b', fontSize: 12 }}>Available Quantity</div>
          <strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 22 }}>{totals.quantity.toLocaleString('en-IN')}</strong>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 2fr)', gap: 12, padding: 18, marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <select
          aria-label="Filter by engineering project"
          value={filters.projectId}
          onChange={event => setFilters(previous => ({ ...previous, projectId: event.target.value }))}
          style={inputStyle}
        >
          <option value="">All Engineering Projects</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          <input
            aria-label="Search site store"
            value={filters.search}
            onChange={event => setFilters(previous => ({ ...previous, search: event.target.value }))}
            onKeyDown={event => { if (event.key === 'Enter') loadStore(); }}
            placeholder="Search material..."
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
      </div>
      {error && <div style={{ padding: 14, marginBottom: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>{error}</div>}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 17, color: '#1e293b' }}>Available Stock</h2>
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          {loading ? <div style={{ padding: 50, textAlign: 'center', color: '#64748b' }}>Loading site store...</div> : (
            <table style={{ width: '100%', minWidth: 1150, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Project', 'Material', 'Available Quantity', 'Unit', 'Store', 'Brand', 'GRN / GTN', 'PO', 'Purchase Bill', 'Received'].map(header => (
                    <th key={header} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.project?.name || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{item.materialName}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.quantity}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.unit || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.storeName || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.brand || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.sourceType} {item.gtnId ? '(GTN)' : '(GRN)'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.poNo || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{item.purchaseBillNo || 'Pending'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{new Date(item.receivedAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
                {!items.length && !loading && <tr><td colSpan="10" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No material is available in the site store yet.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 style={{ margin: '0 0 10px', fontSize: 17, color: '#1e293b' }}>Material Issues to Site</h2>
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', minWidth: 1450, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Issue No / Date & Time', 'Project', 'Material / Quantity', 'Work Order No', 'Purchase Order No', 'Purchase Bill No', 'Vehicle No', 'E-way Bill No', 'Challan No', 'Status & Timeline'].map(header => (
                  <th key={header} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map(issue => {
                const issuePermissions = permissionsByProjectId[issue.projectId] || permissions;
                return (
                <tr key={issue.id}>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                    <strong style={{ display: 'block' }}>{issue.issueNo}</strong>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(issue.issueDate).toLocaleString('en-IN')}</span>
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.project?.name || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                    {issue.items.map(line => `${line.materialName}: ${line.quantity} ${line.unit || ''}`).join(', ')}
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.workOrderNo || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.purchaseOrderNo || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.purchaseBillNo || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.vehicleNo || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.ewayBillNo || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{issue.challanNo || '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select
                        aria-label={`Status for ${issue.issueNo}`}
                        value={issue.status}
                        disabled={!issuePermissions.canChangeStatus || updatingIssueId === issue.id || issue.status === 'Cancelled'}
                        onChange={event => handleIssueStatusChange(issue, event.target.value)}
                        style={{ ...inputStyle, minWidth: 135, padding: '6px 8px', opacity: issuePermissions.canChangeStatus ? 1 : 0.65 }}
                      >
                        {ISSUE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                      {issuePermissions.canEdit && issue.status !== 'Cancelled' && (
                        <button
                          type="button"
                          aria-label={`Edit ${issue.issueNo}`}
                          title="Edit issue details"
                          onClick={() => openEditModal(issue)}
                          style={{ width: 34, height: 34, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#475569', cursor: 'pointer' }}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`History for ${issue.issueNo}`}
                        title="View status history"
                        onClick={() => setHistoryIssue(issue)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        <Clock3 size={14} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
              {!issues.length && <tr><td colSpan="10" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No material has been issued to site yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showIssueModal && (
        <div
          onClick={() => !submittingIssue && setShowIssueModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Issue material to site"
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(900px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Issue Material to Site</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                  Stock will be deducted immediately when the issue is saved.
                </p>
              </div>
              <button type="button" onClick={() => setShowIssueModal(false)} disabled={submittingIssue} aria-label="Close issue form" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
                {[
                  ['Issue Date & Time', 'issueDate', 'datetime-local'],
                  ['Vehicle No', 'vehicleNo', 'text'],
                  ['Work Order No', 'workOrderNo', 'text'],
                  ['Purchase Order No', 'purchaseOrderNo', 'text'],
                  ['Purchase Bill No', 'purchaseBillNo', 'text'],
                  ['E-way Bill No', 'ewayBillNo', 'text'],
                  ['Challan No', 'challanNo', 'text'],
                ].map(([label, field, type]) => (
                  <label key={field} style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 600 }}>
                    {label}
                    <input
                      required={field === 'issueDate'}
                      type={type}
                      value={issueForm[field]}
                      onChange={event => setIssueForm(current => ({ ...current, [field]: event.target.value }))}
                      style={inputStyle}
                    />
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: '#334155', fontSize: 14 }}>Materials and quantities</strong>
                  <button
                    type="button"
                    onClick={() => setIssueForm(current => ({ ...current, items: [...current.items, { stockId: '', quantity: '' }] }))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 9px', border: '1px solid #bae6fd', borderRadius: 6, background: '#f0f9ff', color: '#0369a1', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <Plus size={14} /> Add Material
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {issueForm.items.map((line, index) => {
                    const selectedStock = items.find(item => item.id === line.stockId);
                    return (
                      <div key={`issue-line-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px 36px', gap: 8, alignItems: 'center' }}>
                        <div>
                          <select
                            required
                            aria-label={`Material for issue line ${index + 1}`}
                            value={line.stockId}
                            onChange={event => updateIssueItem(index, 'stockId', event.target.value)}
                            style={inputStyle}
                          >
                            <option value="">Select stock item</option>
                            {items.filter(item => item.projectId === filters.projectId && Number(item.quantity) > 0).map(item => (
                              <option key={item.id} value={item.id}>
                                {item.materialName} — {item.quantity} {item.unit || ''} · {item.storeName || 'Site Store'} · PO {item.poNo || '-'}
                              </option>
                            ))}
                          </select>
                          {selectedStock && <div style={{ marginTop: 3, color: '#64748b', fontSize: 11 }}>Available: {selectedStock.quantity} {selectedStock.unit || ''}</div>}
                        </div>
                        <input
                          required
                          type="number"
                          min="0.001"
                          step="any"
                          max={selectedStock?.quantity}
                          aria-label={`Issue quantity for line ${index + 1}`}
                          placeholder="Quantity"
                          value={line.quantity}
                          onChange={event => updateIssueItem(index, 'quantity', event.target.value)}
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setIssueForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}
                          aria-label={`Remove issue line ${index + 1}`}
                          style={{ width: 36, height: 36, border: '1px solid #fecaca', borderRadius: 6, background: '#fff7f7', color: '#b91c1c', cursor: 'pointer' }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'grid', gap: 5, marginBottom: 18, color: '#334155', fontSize: 12, fontWeight: 600 }}>
                Remarks
                <textarea
                  rows={2}
                  value={issueForm.remarks}
                  onChange={event => setIssueForm(current => ({ ...current, remarks: event.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowIssueModal(false)} disabled={submittingIssue} style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingIssue} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: 0, borderRadius: 6, background: '#0284c7', color: '#fff', cursor: submittingIssue ? 'wait' : 'pointer', opacity: submittingIssue ? 0.7 : 1 }}>
                  <Truck size={15} /> {submittingIssue ? 'Issuing…' : 'Issue Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingIssue && editForm && (
        <div
          onClick={() => !savingEdit && setEditingIssue(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${editingIssue.issueNo}`}
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Edit {editingIssue.issueNo}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Material lines and issued quantities are unchanged.</p>
              </div>
              <button type="button" onClick={() => setEditingIssue(null)} disabled={savingEdit} aria-label="Close edit form" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveIssueEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
                {[
                  ['Issue Date & Time', 'issueDate', 'datetime-local'],
                  ['Vehicle No', 'vehicleNo', 'text'],
                  ['Work Order No', 'workOrderNo', 'text'],
                  ['Purchase Order No', 'purchaseOrderNo', 'text'],
                  ['Purchase Bill No', 'purchaseBillNo', 'text'],
                  ['E-way Bill No', 'ewayBillNo', 'text'],
                  ['Challan No', 'challanNo', 'text'],
                ].map(([label, field, type]) => (
                  <label key={field} style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 600 }}>
                    {label}
                    <input
                      required={field === 'issueDate'}
                      type={type}
                      value={editForm[field]}
                      onChange={event => setEditForm(current => ({ ...current, [field]: event.target.value }))}
                      style={inputStyle}
                    />
                  </label>
                ))}
              </div>
              <label style={{ display: 'grid', gap: 5, marginBottom: 18, color: '#334155', fontSize: 12, fontWeight: 600 }}>
                Remarks
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={event => setEditForm(current => ({ ...current, remarks: event.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setEditingIssue(null)} disabled={savingEdit} style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} style={{ padding: '9px 14px', border: 0, borderRadius: 6, background: '#0284c7', color: '#fff', cursor: savingEdit ? 'wait' : 'pointer', opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {historyIssue && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Status history for ${historyIssue.issueNo}`}
          onClick={() => setHistoryIssue(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(560px, 100%)', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Status History</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{historyIssue.issueNo} · {historyIssue.project?.name || '-'}</p>
              </div>
              <button type="button" onClick={() => setHistoryIssue(null)} aria-label="Close status history" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            {historyIssue.statusHistory?.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {historyIssue.statusHistory.map(entry => (
                  <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 10 }}>
                    <span style={{ width: 10, height: 10, marginTop: 4, borderRadius: '50%', background: '#0284c7' }} />
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                      <strong style={{ color: '#0f172a', fontSize: 14 }}>
                        {entry.fromStatus ? `${entry.fromStatus} → ` : ''}{entry.toStatus}
                      </strong>
                      <div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>
                        {new Date(entry.changedAt).toLocaleString('en-IN')}
                        {entry.actorName ? ` · ${entry.actorName}` : ''}
                      </div>
                      {entry.note && <div style={{ marginTop: 3, color: '#475569', fontSize: 12 }}>{entry.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No status history recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
