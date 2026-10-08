'use client';

import { useEffect, useMemo, useState } from 'react';
import { getClientActor } from '@/lib/clientActor';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';

const RA_BILLS_ENDPOINT = '/api/contracting/ra-bills';
const WORK_ORDERS_ENDPOINT = '/api/contracting/work-orders';

const STATUS_COLORS = {
  Submitted: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  Approved:  { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  Paid:      { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  Rejected:  { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
};

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const emptyTaskLine = () => ({ description: '', qty: '', rate: '', amount: '' });

const emptyForm = () => ({
  workOrderId: '',
  date: new Date().toISOString().substring(0, 10),
  measuredValue: '',
  retentionPercent: '',
  advanceRecovery: '',
  otherDeductions: '',
  tdsPercent: '',
  remarks: '',
  taskLines: [emptyTaskLine()],
});

// ─── Style constants ──────────────────────────────────────────────────────────

const s = {
  page: { padding: '24px', fontFamily: 'inherit' },

  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '4px',
  },
  h1: { fontSize: '22px', fontWeight: 600, color: '#0f172a', margin: 0 },
  subtitle: { fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '20px' },

  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px',
    whiteSpace: 'pre-wrap',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px',
  },

  // ── Filters ──────────────────────────────────────────────────────────────
  // Explicit width + flex:'0 0 auto' on both the row and the selects so
  // these size to content instead of stretching to fill the row (which is
  // what was happening — some global form-element CSS was forcing
  // width:100% on <select>, and since these had no explicit `width` of
  // their own, the external rule was winning and stacking them full-width).
  filterRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '16px',
    width: '100%',
  },
  select: {
    display: 'inline-block',
    flex: '0 0 auto',
    width: 'auto',
    minWidth: '160px',
    maxWidth: '260px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
  },
  clearLink: {
    flex: '0 0 auto',
    fontSize: '13px',
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  tableWrap: {
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#fff',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: '#475569',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#0f172a',
  },
  emptyCell: { padding: '32px 14px', textAlign: 'center', color: '#94a3b8' },

  badge: {
    display: 'inline-block',
    borderRadius: '999px',
    padding: '2px 10px',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid',
  },
  actionBtn: {
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'transparent',
  },

  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
  },
  modal: {
    width: '100%',
    maxWidth: '660px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  modalTitle: { fontSize: '17px', fontWeight: 600, color: '#0f172a', margin: 0 },
  closeBtn: { border: 'none', background: 'none', fontSize: '16px', color: '#94a3b8', cursor: 'pointer' },

  label: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' },
  input: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    boxSizing: 'border-box',
    color: '#0f172a',
  },
  hint: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  fieldStack: { marginBottom: '16px' },

  taskHeader: {
    display: 'grid',
    gridTemplateColumns: '5fr 2fr 2fr 2fr auto',
    gap: '8px',
    marginBottom: '4px',
  },
  taskHeaderCell: { fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' },
  taskRow: {
    display: 'grid',
    gridTemplateColumns: '5fr 2fr 2fr 2fr auto',
    gap: '8px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  taskInput: {
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '12px',
    boxSizing: 'border-box',
    width: '100%',
  },
  removeLineBtn: { border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' },
  addLineBtn: { border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },

  previewBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  previewRow: { display: 'flex', justifyContent: 'space-between', color: '#475569', padding: '2px 0' },
  previewTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    color: '#0f172a',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },

  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' },
  secondaryBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    borderRadius: '8px',
    padding: '9px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  submitBtn: {
    border: 'none',
    background: '#0f172a',
    color: '#fff',
    borderRadius: '8px',
    padding: '9px 16px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },

  sectionDivider: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '6px',
    marginBottom: '14px',
    marginTop: '4px',
  },
};

// ─── Page component ───────────────────────────────────────────────────────────

export default function RABillsPage() {
  const { activeEmployee, activeProject, hasRight } = usePermissions();
  const canTool = name => !activeEmployee || (!!activeProject && hasRight(employeeToolCode('Contracting', name)));
  const canCreate = canTool('RA Bill Generation');
  const canView = canTool('RA Bill Browse');
  const canEdit = false;
  const canApprove = canTool('RA Bill Approval');
  const canList = canView || canEdit || canApprove;
  // ── Data ──────────────────────────────────────────────────────────────────
  const [bills, setBills]             = useState([]);
  const [workOrders, setWorkOrders]   = useState([]);

  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingWO, setLoadingWO]       = useState(true);

  // ── Work-completion sync state ────────────────────────────────────────────
  const [workCompletionTasks, setWorkCompletionTasks] = useState([]);
  const [loadingWCTasks, setLoadingWCTasks]           = useState(false);
  const [syncedFromWC, setSyncedFromWC]               = useState(false);

  // ── UI feedback ───────────────────────────────────────────────────────────
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus]           = useState('');
  const [filterWorkOrderId, setFilterWorkOrderId] = useState('');

  // ── Modal / form ──────────────────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId]   = useState(null);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterWorkOrderId]);

  // ─── Fetch helpers ───────────────────────────────────────────────────────────

  async function fetchWorkOrders() {
    setLoadingWO(true);
    try {
      const res = await fetch(WORK_ORDERS_ENDPOINT, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        throw new Error(
          (typeof data === 'object' && data?.error) ? data.error :
          (typeof data === 'string' && data.trim()) ? data :
          `Failed to load work orders (${res.status} ${res.statusText})`
        );
      }
      if (!Array.isArray(data)) throw new Error('Work orders API returned an invalid response.');
      setWorkOrders(data);
    } catch (err) {
      console.error('fetchWorkOrders error:', err);
      setWorkOrders([]);
      setError(`Work orders could not be loaded.\n\n${err.message || 'Unknown error'}\n\nAPI: ${WORK_ORDERS_ENDPOINT}`);
    } finally {
      setLoadingWO(false);
    }
  }

  async function fetchBills() {
    setLoadingBills(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterWorkOrderId) params.set('workOrderId', filterWorkOrderId);
      const query = params.toString();
      const url = query ? `${RA_BILLS_ENDPOINT}?${query}` : RA_BILLS_ENDPOINT;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        throw new Error(
          (typeof data === 'object' && data?.error) ? data.error :
          (typeof data === 'string' && data.trim()) ? data :
          `Failed to load RA bills (${res.status} ${res.statusText})`
        );
      }
      if (!Array.isArray(data)) throw new Error('RA bills API returned an invalid response.');
      setBills(data);
    } catch (err) {
      console.error('fetchBills error:', err);
      setBills([]);
      setError(err.message || 'Failed to load RA bills');
    } finally {
      setLoadingBills(false);
    }
  }

  // ─── Work-order change handler (with WC sync) ─────────────────────────────

  async function handleWorkOrderChange(woId) {
    updateField('workOrderId', woId);
    setSyncedFromWC(false);
    setWorkCompletionTasks([]);
    if (!woId) return;

    setLoadingWCTasks(true);
    try {
      const res = await fetch(`/api/contracting/ra-bills/pending?workOrderId=${woId}`);
      if (res.ok) {
        const data = await res.json();
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        setWorkCompletionTasks(tasks);

        // Use all tasks with progress — not just Quality Approved
        const billableTasks = tasks.filter(t => (t.qty || 0) > 0);
        const sourceTasks = billableTasks.length > 0 ? billableTasks : tasks;

        if (sourceTasks.length > 0) {
          const approvedAmt = (data.approvedTasks || []).reduce((s, t) => s + (t.amount || 0), 0);
          const allAmt = sourceTasks.reduce((s, t) => s + (t.amount || 0), 0);
          const totalMeasured = approvedAmt > 0 ? approvedAmt : allAmt;

          const taskLines = sourceTasks.map(t => ({
            description: t.description || '',
            qty:         String(t.qty || ''),
            rate:        String(t.rate || ''),
            amount:      String(t.amount || ''),
          }));

          setForm(f => ({
            ...f,
            measuredValue: totalMeasured > 0 ? String(totalMeasured.toFixed(2)) : f.measuredValue,
            taskLines: taskLines.length > 0 ? taskLines : [emptyTaskLine()],
          }));
          setSyncedFromWC(true);
        }
        if (data.message) console.warn('Work completion sync:', data.message);
      }
    } catch (err) {
      console.error('Failed to load work completion tasks', err);
    } finally {
      setLoadingWCTasks(false);
    }
  }

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const selectedWO = useMemo(
    () => workOrders.find(w => String(w.id) === String(form.workOrderId)) || null,
    [workOrders, form.workOrderId]
  );

  const preview = useMemo(() => {
    const current  = parseFloat(form.measuredValue) || 0;
    const retPct   = form.retentionPercent !== '' ? parseFloat(form.retentionPercent) || 0 : (selectedWO?.retentionPercent ?? 0);
    const retAmt   = (current * retPct) / 100;
    const advRec   = parseFloat(form.advanceRecovery) || 0;
    const otherDed = parseFloat(form.otherDeductions) || 0;
    const tdsPct   = parseFloat(form.tdsPercent) || 0;
    const beforeTds = current - retAmt - advRec - otherDed;
    const tdsAmt   = (beforeTds * tdsPct) / 100;
    const netPayable = beforeTds - tdsAmt;
    return { current, retPct, retAmt, advRec, otherDed, tdsPct, tdsAmt, netPayable };
  }, [form, selectedWO]);

  function updateField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function updateTaskLine(index, field, value) {
    setForm(f => {
      const taskLines = [...f.taskLines];
      const line = { ...taskLines[index], [field]: value };
      if (field === 'qty' || field === 'rate') {
        const qty  = parseFloat(field === 'qty'  ? value : line.qty)  || 0;
        const rate = parseFloat(field === 'rate' ? value : line.rate) || 0;
        if (qty && rate) line.amount = String(qty * rate);
      }
      taskLines[index] = line;
      return { ...f, taskLines };
    });
  }

  function addTaskLine() {
    setForm(f => ({ ...f, taskLines: [...f.taskLines, emptyTaskLine()] }));
  }

  function removeTaskLine(index) {
    setForm(f => {
      const next = f.taskLines.filter((_, i) => i !== index);
      return { ...f, taskLines: next.length > 0 ? next : [emptyTaskLine()] };
    });
  }

  function openForm() {
    setForm(emptyForm());
    setWorkCompletionTasks([]);
    setSyncedFromWC(false);
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function closeForm() {
    if (submitting) return;
    setShowForm(false);
    setForm(emptyForm());
    setWorkCompletionTasks([]);
    setSyncedFromWC(false);
  }

  // ─── API actions ──────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canCreate) { setError('You do not have permission to create RA bills for this project.'); return; }
    setError('');
    setSuccess('');

    if (!form.workOrderId) { setError('Please select a work order.'); return; }
    if (!form.measuredValue || parseFloat(form.measuredValue) <= 0) {
      setError('Measured value must be greater than zero.'); return;
    }
    if (preview.netPayable < 0) {
      setError('Net payable cannot be negative. Please check the deductions.'); return;
    }

    setSubmitting(true);
    try {
      const cleanTaskLines = form.taskLines.filter(l => l.description || l.qty || l.rate || l.amount);
      const res = await fetch(RA_BILLS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, taskLines: cleanTaskLines, editedBy: getClientActor() }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        throw new Error(
          (typeof data === 'object' && data?.error) ? data.error :
          (typeof data === 'string' && data.trim()) ? data :
          `Failed to generate RA bill (${res.status} ${res.statusText})`
        );
      }
      setShowForm(false);
      setForm(emptyForm());
      setWorkCompletionTasks([]);
      setSyncedFromWC(false);
      setSuccess('RA bill generated successfully.');
      await fetchBills();
    } catch (err) {
      console.error('handleSubmit error:', err);
      setError(err.message || 'Failed to generate RA bill');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    if (!canApprove) { setError('You do not have permission to approve RA bills for this project.'); return; }
    setActionId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(RA_BILLS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id, status, editedBy: getClientActor() }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        throw new Error(
          (typeof data === 'object' && data?.error) ? data.error :
          (typeof data === 'string' && data.trim()) ? data :
          `Failed to update RA bill (${res.status} ${res.statusText})`
        );
      }
      setSuccess(`RA bill status changed to ${status}.`);
      await fetchBills();
    } catch (err) {
      console.error('handleStatusChange error:', err);
      setError(err.message || 'Failed to update RA bill');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id) {
    if (activeEmployee && !canEdit) { setError('You do not have permission to edit RA bills for this project.'); return; }
    if (!window.confirm('Delete this RA bill? This cannot be undone.')) return;
    setActionId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${RA_BILLS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        throw new Error(
          (typeof data === 'object' && data?.error) ? data.error :
          (typeof data === 'string' && data.trim()) ? data :
          `Failed to delete RA bill (${res.status} ${res.statusText})`
        );
      }
      setSuccess('RA bill deleted successfully.');
      await fetchBills();
    } catch (err) {
      console.error('handleDelete error:', err);
      setError(err.message || 'Failed to delete RA bill');
    } finally {
      setActionId(null);
    }
  }

  // ─── Work-completion summary (inside modal) ───────────────────────────────

  const approvedCount = workCompletionTasks.filter(t => t.verificationStatus === 'Quality Approved').length;
  const tasksWithProgress = workCompletionTasks.filter(t => t.qty > 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.headerRow}>
        <h1 style={s.h1}>RA Bills</h1>
        {canCreate && <button type="button" style={s.primaryBtn} onClick={openForm}>+ Generate RA Bill</button>}
      </div>
      <p style={s.subtitle}>
        Generate, review, and approve running-account bills for work orders.
      </p>

      {/* ── Feedback ── */}
      {error   && <div style={s.errorBox}>{error}</div>}
      {success && !error && <div style={s.successBox}>{success}</div>}

      {/* ── Filters ── */}
      <div style={s.filterRow}>
        <select
          style={s.select}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Approved">Approved</option>
          <option value="Paid">Paid</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          style={{ ...s.select, minWidth: '240px', maxWidth: '320px' }}
          value={filterWorkOrderId}
          onChange={e => setFilterWorkOrderId(e.target.value)}
        >
          <option value="">All work orders</option>
          {workOrders.map(w => (
            <option key={w.id} value={w.id}>
              {w.woNo || w.workOrderNo || w.id} — {w.contractorName || 'Unknown contractor'}
            </option>
          ))}
        </select>

        {(filterStatus || filterWorkOrderId) && (
          <button
            type="button"
            style={s.clearLink}
            onClick={() => { setFilterStatus(''); setFilterWorkOrderId(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Bills table ── */}
      {!canList ? <div style={s.emptyCell}>RA Bill View access is required to browse bills.</div> : <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Bill No</th>
              <th style={s.th}>Work Order</th>
              <th style={s.th}>Bill Date</th>
              <th style={s.th}>Last edited by</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Current Bill</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Cumulative</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Retention</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Net Payable</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingBills ? (
              <tr><td colSpan={10} style={s.emptyCell}>Loading…</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={10} style={s.emptyCell}>No RA bills found.</td></tr>
            ) : bills.map(b => {
              const c = STATUS_COLORS[b.status] || { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
              return (
                <tr key={b.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{b.billNo || '—'}</td>

                  <td style={s.td}>
                    <div>{b.workOrder?.woNo || b.workOrder?.workOrderNo || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {b.workOrder?.contractorName || '—'}
                    </div>
                  </td>

                  <td style={{ ...s.td, fontSize: '12px', color: '#64748b' }}>
                    {formatDate(b.date)}
                  </td>
                  <td style={{ ...s.td, fontSize: '12px', color: '#64748b' }}>
                    {b.editedBy ? <>{b.editedBy}<div>{b.editedAt ? formatDate(b.editedAt) : ''}</div></> : '—'}
                  </td>

                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {inr.format(Number(b.currentBill) || 0)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {inr.format(Number(b.cumulative) || 0)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {inr.format(Number(b.retentionAmount) || 0)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>
                    {inr.format(Number(b.netPayable) || 0)}
                  </td>

                  <td style={s.td}>
                    <span style={{ ...s.badge, background: c.bg, color: c.text, borderColor: c.border }}>
                      {b.status || 'Unknown'}
                    </span>
                  </td>

                  <td style={s.td}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                      {canView && <button
                        type="button"
                        style={{ ...s.actionBtn, color: '#475569' }}
                        onClick={() => window.open(`/contracting/ra-bills/${b.id}/print`, '_blank')}
                      >
                        Print
                      </button>}
                      {b.status === 'Submitted' && canApprove && (
                        <>
                          <button
                            type="button"
                            style={{ ...s.actionBtn, color: '#1d4ed8' }}
                            disabled={actionId === b.id}
                            onClick={() => handleStatusChange(b.id, 'Approved')}
                          >
                            {actionId === b.id ? '…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            style={{ ...s.actionBtn, color: '#dc2626' }}
                            disabled={actionId === b.id}
                            onClick={() => handleStatusChange(b.id, 'Rejected')}
                          >
                            {actionId === b.id ? '…' : 'Reject'}
                          </button>
                      {!activeEmployee && <button
                            type="button"
                            style={{ ...s.actionBtn, color: '#64748b' }}
                            disabled={actionId === b.id}
                            onClick={() => handleDelete(b.id)}
                          >
                            {actionId === b.id ? '…' : 'Delete'}
                      </button>}
                        </>
                      )}
                      {b.status === 'Approved' && canApprove && (
                        <button
                          type="button"
                          style={{ ...s.actionBtn, color: '#15803d' }}
                          disabled={actionId === b.id}
                          onClick={() => handleStatusChange(b.id, 'Paid')}
                        >
                          {actionId === b.id ? '…' : 'Mark Paid'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>}

      {/* ── Generate RA Bill modal ── */}
      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            {/* Modal header */}
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Generate RA Bill</h2>
              <button type="button" style={s.closeBtn} onClick={closeForm} disabled={submitting}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>

              {/* Work Order selector */}
              <div style={s.fieldStack}>
                <label style={s.label}>Work Order *</label>
                <select
                  required
                  style={s.input}
                  value={form.workOrderId}
                  onChange={e => handleWorkOrderChange(e.target.value)}
                  disabled={loadingWO}
                >
                  <option value="">{loadingWO ? 'Loading…' : 'Select work order'}</option>
                  {workOrders.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.woNo || w.workOrderNo || w.id} — {w.contractorName || 'Unknown contractor'}
                    </option>
                  ))}
                </select>
                {selectedWO && (
                  <div style={s.hint}>
                    Contract value: {inr.format(Number(selectedWO.contractValue) || 0)}
                    {' · '}Default retention: {selectedWO.retentionPercent ?? 0}%
                  </div>
                )}
              </div>

              {/* Work Completion sync loading indicator */}
              {loadingWCTasks && (
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Fetching work completion data…
                </div>
              )}

              {/* Work Completion Summary box */}
              {workCompletionTasks.length > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: approvedCount > 0 ? '#166534' : '#92400e' }}>
                      {approvedCount > 0
                        ? `✅ ${approvedCount} Quality Approved task${approvedCount !== 1 ? 's' : ''} — auto-filled`
                        : `⚠️ ${tasksWithProgress.length} task${tasksWithProgress.length !== 1 ? 's' : ''} with progress — none yet Quality Approved`}
                    </span>
                    {syncedFromWC && (
                      <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '999px' }}>
                        Auto-filled
                      </span>
                    )}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#dcfce7' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left',   color: '#166534' }}>Material / Task</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right',  color: '#166534' }}>Completed</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right',  color: '#166534' }}>%</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right',  color: '#166534' }}>Amount</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', color: '#166534' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workCompletionTasks.filter(t => t.percentComplete > 0).map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #d1fae5' }}>
                          <td style={{ padding: '5px 8px' }}>{t.description || t.materialName || t.taskName}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{t.qty ?? t.completedQty} {t.unit}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{t.percentComplete}%</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                            ₹{Number(t.amount ?? t.cumulativeAmount ?? (t.qty || 0) * (t.rate || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: t.verificationStatus === 'Quality Approved' ? '#dcfce7' : '#fef3c7',
                              color:      t.verificationStatus === 'Quality Approved' ? '#166534' : '#92400e',
                            }}>
                              {t.verificationStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sync summary badge (when auto-filled) */}
              {syncedFromWC && (
                <div style={{ fontSize: '12px', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 10px', marginBottom: '16px' }}>
                  🔄 Synced from Work Completion — {approvedCount} tasks · Total Measured Value auto-filled from Quality Approved tasks
                </div>
              )}

              {/* No tasks found notice */}
              {!loadingWCTasks && workCompletionTasks.length === 0 && form.workOrderId && (
                <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' }}>
                  ℹ️ No work completion tasks found for this work order. You can enter task lines manually below.
                </div>
              )}

              {/* Bill Date */}
              <div style={{ marginBottom: '16px' }}>
                <label style={s.label}>Bill Processed Date</label>
                <input
                  type="date"
                  required
                  style={s.input}
                  value={form.date}
                  onChange={e => updateField('date', e.target.value)}
                />
              </div>

              {/* Measured value */}
              <div style={s.fieldStack}>
                <label style={s.label}>
                  Measured Value (₹) *
                  {syncedFromWC && (
                    <span style={{ marginLeft: '6px', fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '999px', fontWeight: 400 }}>
                      🔄 Synced
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  style={s.input}
                  value={form.measuredValue}
                  onChange={e => { updateField('measuredValue', e.target.value); setSyncedFromWC(false); }}
                  placeholder="0.00"
                />
                {syncedFromWC && (
                  <div style={s.hint}>Auto-filled from Quality Approved tasks. You can override this value.</div>
                )}
              </div>

              {/* Retention / TDS / Advance / Other */}
              <div style={{ ...s.grid2, marginBottom: '16px' }}>
                <div>
                  <label style={s.label}>
                    Retention %{selectedWO ? ` (default ${selectedWO.retentionPercent ?? 0}%)` : ''}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={s.input}
                    value={form.retentionPercent}
                    onChange={e => updateField('retentionPercent', e.target.value)}
                    placeholder={String(selectedWO?.retentionPercent ?? 0)}
                  />
                </div>
                <div>
                  <label style={s.label}>TDS %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={s.input}
                    value={form.tdsPercent}
                    onChange={e => updateField('tdsPercent', e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>Advance Recovery</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={s.input}
                    value={form.advanceRecovery}
                    onChange={e => updateField('advanceRecovery', e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>Other Deductions</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={s.input}
                    value={form.otherDeductions}
                    onChange={e => updateField('otherDeductions', e.target.value)}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div style={s.fieldStack}>
                <label style={s.label}>Remarks</label>
                <textarea
                  style={{ ...s.input, resize: 'vertical' }}
                  rows={2}
                  value={form.remarks}
                  onChange={e => updateField('remarks', e.target.value)}
                />
              </div>

              {/* Task lines section */}
              <div style={s.sectionDivider}>Task / Measurement Lines</div>
              <div style={{ ...s.fieldStack }}>
                <div style={s.taskHeader}>
                  <span style={s.taskHeaderCell}>Description</span>
                  <span style={s.taskHeaderCell}>Qty</span>
                  <span style={s.taskHeaderCell}>Rate</span>
                  <span style={s.taskHeaderCell}>Amount</span>
                  <span />
                </div>

                {form.taskLines.map((line, i) => (
                  <div key={i} style={s.taskRow}>
                    <input
                      style={s.taskInput}
                      placeholder="Description"
                      value={line.description}
                      onChange={e => updateTaskLine(i, 'description', e.target.value)}
                    />
                    <input
                      style={s.taskInput}
                      type="number"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={e => updateTaskLine(i, 'qty', e.target.value)}
                    />
                    <input
                      style={s.taskInput}
                      type="number"
                      placeholder="Rate"
                      value={line.rate}
                      onChange={e => updateTaskLine(i, 'rate', e.target.value)}
                    />
                    <input
                      style={s.taskInput}
                      type="number"
                      placeholder="Amount"
                      value={line.amount}
                      onChange={e => updateTaskLine(i, 'amount', e.target.value)}
                    />
                    <button type="button" style={s.removeLineBtn} onClick={() => removeTaskLine(i)} title="Remove line">
                      ✕
                    </button>
                  </div>
                ))}

                <button type="button" style={s.addLineBtn} onClick={addTaskLine}>
                  + Add line
                </button>
              </div>

              {/* Preview section */}
              <div style={s.sectionDivider}>Preview</div>
              <div style={s.previewBox}>
                <div style={s.previewRow}>
                  <span>Current Bill</span>
                  <span>{inr.format(preview.current)}</span>
                </div>
                <div style={s.previewRow}>
                  <span>Retention ({preview.retPct}%)</span>
                  <span>−{inr.format(preview.retAmt)}</span>
                </div>
                <div style={s.previewRow}>
                  <span>Advance Recovery</span>
                  <span>−{inr.format(preview.advRec)}</span>
                </div>
                <div style={s.previewRow}>
                  <span>Other Deductions</span>
                  <span>−{inr.format(preview.otherDed)}</span>
                </div>
                <div style={{ ...s.previewRow, color: '#94a3b8', fontSize: '12px', borderTop: '1px dashed #e2e8f0', marginTop: '6px', paddingTop: '6px' }}>
                  <span>Before TDS</span>
                  <span>{inr.format(preview.current - preview.retAmt - preview.advRec - preview.otherDed)}</span>
                </div>
                <div style={s.previewRow}>
                  <span>TDS ({preview.tdsPct}%)</span>
                  <span>−{inr.format(preview.tdsAmt)}</span>
                </div>
                <div style={s.previewTotal}>
                  <span>Net Payable</span>
                  <span style={{ color: preview.netPayable < 0 ? '#dc2626' : '#0f172a' }}>
                    {inr.format(preview.netPayable)}
                  </span>
                </div>
              </div>

              {/* Footer buttons */}
              <div style={s.modalFooter}>
                <button type="button" style={s.secondaryBtn} onClick={closeForm} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Generating…' : 'Generate RA Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
