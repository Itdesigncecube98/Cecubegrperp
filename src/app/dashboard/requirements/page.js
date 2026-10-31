'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import AppModal from '@/components/AppModal';

const EMPTY_FORM = {
  positionName: '',
  department: '',
  raisedBy: 'Select',
  raisedDate: '',
  empType: 'Full-time',
  indentType: 'New Requirement',
  reqFromDate: '',
  status: 'pending',
  replacementFor: '',
  raisedByEmployeeId: '',
  approverIds: [],
  handlerIds: [],
  handledByHr: false,
};

const POSITION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const uniqueOptions = options => [...new Set(options.filter(option => option != null).map(option => String(option)))];

export default function PositionIndent() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  
  const [options, setOptions] = useState({
    companies: [],
    branches: [],
    positions: [],
    departments: [],
    employees: [],
    approvers: [],
    grades: []
  });

  const fetchSyncData = useCallback(async (raisedByEmployeeId = '') => {
    try {
      const query = raisedByEmployeeId ? `?raisedByEmployeeId=${encodeURIComponent(raisedByEmployeeId)}` : '';
      const res = await fetch(`/api/recruitment/position-indent/sync-data${query}`);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setApiError('Your sign-in session is missing or expired. Sign in again to load Position Requirements.');
          return;
        }
        throw new Error(json.error || 'Failed to load employee and approver options.');
      }
      setOptions({
        companies: ['Select All', ...json.organizations],
        branches: ['Select All', ...json.branches],
        positions: ['Select', ...json.positions],
        departments: ['Select', ...json.departments],
        employees: json.employees,
        approvers: json.approvers,
        grades: ['Select', ...json.grades]
      });
    } catch (error) {
      console.error('Failed to fetch sync data', error);
      setApiError(error.message || 'Failed to load employee and approver options.');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recruitment/position-indent');
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setApiError('Your sign-in session is missing or expired. Sign in again to load Position Requirements.');
          return;
        }
        throw new Error(json.error || 'Failed to load Position Requirements.');
      }
      setApiError('');
      setData(json);
    } catch (error) {
      console.error('Failed to fetch data', error);
      setApiError(error.message || 'Failed to load Position Requirements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The fetch callbacks start async work and update loading/data state after the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);
  useEffect(() => {
    // The candidate list is synchronized with the selected requester.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSyncData(form.raisedByEmployeeId);
  }, [fetchSyncData, form.raisedByEmployeeId]);

  const handleAddSubmit = async () => {
    if (!form.positionName || !form.department || !form.raisedByEmployeeId || !form.approverIds.length) {
      alert("Position, Department, Raised By, and at least one eligible approver are required.");
      return;
    }

    try {
      const method = form.id ? 'PUT' : 'POST';
      const payload = { ...form };
      delete payload.status;
      const res = await fetch('/api/recruitment/position-indent', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchData();
        setModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create indent');
      }
    } catch (error) {
      console.error('Failed to create indent', error);
    }
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleEdit = row => {
    if (String(row.status).trim().toLowerCase() === 'approved') return;
    setForm({
      ...row,
      raisedByEmployeeId: row.raisedByEmployeeId || options.employees.find(employee => employee.name === row.raisedBy)?.id || '',
      approverIds: row.approvals?.map(approval => approval.employeeId) || [],
      handlerIds: row.handlerAssignments?.map(assignment => assignment.employeeId) || [],
      handledByHr: Boolean(row.handledByHr),
    });
    setModalOpen(true);
  };

  const handleDelete = async id => {
    if (!confirm('Are you sure you want to delete this position requirement?')) return;
    try {
      const response = await fetch(`/api/recruitment/position-indent?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete requirement.');
      await fetchData();
    } catch (error) {
      alert(error.message || 'Failed to delete requirement.');
    }
  };

  return (
    <div>
      {/* Requirement table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Position Requirements</h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>Assign HR or org-chart approvers and recruitment handlers. All assigned approvers must approve.</p>
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={14} /> Add
          </button>
        </div>

        {apiError && (
          <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: '1rem', padding: '0.75rem 1rem', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', color: '#991b1b', fontSize: '0.85rem' }}>
            <span>{apiError}</span>
            {apiError.includes('session') && <button type="button" onClick={() => router.push('/login')} style={{ border: 0, borderRadius: 5, padding: '0.4rem 0.7rem', color: '#fff', background: '#b91c1c', cursor: 'pointer' }}>Sign in</button>}
          </div>
        )}

        <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: 'white', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem' }}>Designation</th>
                <th style={{ padding: '0.75rem' }}>Department</th>
                <th style={{ padding: '0.75rem' }}>Raise By</th>
                <th style={{ padding: '0.75rem' }}>Raise Date</th>
                <th style={{ padding: '0.75rem' }}>Emp Type</th>
                <th style={{ padding: '0.75rem' }}>Indent Type</th>
                <th style={{ padding: '0.75rem' }}>Req. From</th>
                <th style={{ padding: '0.75rem' }}>Approved By</th>
                <th style={{ padding: '0.75rem' }}>Handled By</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11" style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: 'center', padding: '1rem', color: '#64748b', background: '#f8fafc' }}>No Details Found</td></tr>
              ) : (
                data.map(row => {
                  const isApproved = String(row.status).trim().toLowerCase() === 'approved';
                  return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.75rem' }}>{row.positionName}</td>
                    <td style={{ padding: '0.75rem' }}>{row.department}</td>
                    <td style={{ padding: '0.75rem' }}>{row.raisedBy}</td>
                    <td style={{ padding: '0.75rem' }}>{row.raisedDate}</td>
                    <td style={{ padding: '0.75rem' }}>{row.empType}</td>
                    <td style={{ padding: '0.75rem' }}>{row.indentType}</td>
                    <td style={{ padding: '0.75rem' }}>{row.reqFromDate || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.approvals?.length ? row.approvals.map(approval => `${approval.employee.name} (${approval.status})`).join(', ') : row.approvedBy || 'Awaiting assignment'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.handledBy || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {POSITION_STATUSES.find(status => status.value === row.status)?.label || row.status}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isApproved && <>
                          <button onClick={() => handleEdit(row)} aria-label="Edit position requirement" style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer' }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(row.id)} aria-label="Delete position requirement" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal isOpen={modalOpen} title={form.id ? "Edit Position Requirement" : "Raise Position Indent"} onClose={() => setModalOpen(false)} onConfirm={handleAddSubmit} confirmLabel={form.id ? "Save" : "Submit"} size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <F label="Designation *" field="positionName" form={form} setForm={setForm} options={options.positions.length ? options.positions : undefined} />
          <F label="Department *" field="department" form={form} setForm={setForm} options={options.departments.length ? options.departments : undefined} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            Raised By *
            <select value={form.raisedByEmployeeId || ''} onChange={event => {
              const employee = options.employees.find(item => item.id === event.target.value);
              setForm(previous => ({
                ...previous,
                raisedByEmployeeId: employee?.id || '',
                raisedBy: employee?.name || '',
                approverIds: [],
              }));
            }} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
              <option value="">Select</option>
              {options.employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </label>
          <F label="Raise Date" field="raisedDate" type="date" form={form} setForm={setForm} />
          <F label="Emp Type" field="empType" options={['Full-time', 'Part-time', 'Contract']} form={form} setForm={setForm} />
          <F label="Indent Type" field="indentType" options={['New Requirement', 'Replacement']} form={form} setForm={setForm} />
          
          {form.indentType === 'Replacement' && (
            <F label="Replacement For *" field="replacementFor" form={form} setForm={setForm} options={['Select', ...options.employees.map(employee => employee.name)]} />
          )}
          
          <F label="Req. From Date" field="reqFromDate" type="date" form={form} setForm={setForm} />
          <MultiSelectField label="Approvers * (all must approve)" field="approverIds" options={options.approvers} form={form} setForm={setForm} />
          <MultiSelectField label="Handled By employees" field="handlerIds" options={options.employees} form={form} setForm={setForm} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155' }}>
            <input type="checkbox" checked={form.handledByHr} onChange={event => setForm(previous => ({ ...previous, handledByHr: event.target.checked }))} />
            Handled by HR
          </label>
        </div>
      </AppModal>
    </div>
  );
}

const F = ({ label, field, type = 'text', options, form, setForm }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
    {options
      ? <select value={form[field] ?? ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
          {uniqueOptions(options).map((option, index) => <option key={`${option}-${index}`} value={option}>{option}</option>)}
        </select>
      : <input type={type} value={form[field] ?? ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} />
    }
  </div>
);

const MultiSelectField = ({ label, field, options, form, setForm }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
    {label}
    <select multiple value={form[field] || []} onChange={event => {
      const values = Array.from(event.target.selectedOptions, option => option.value);
      setForm(previous => ({ ...previous, [field]: values }));
    }} style={{ minHeight: 76, padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
      {options.map(employee => <option key={employee.id} value={employee.id}>{employee.name} — {employee.designation || employee.department}</option>)}
    </select>
  </label>
);
