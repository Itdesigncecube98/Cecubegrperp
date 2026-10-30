'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
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
  replacementFor: ''
};

const POSITION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const uniqueOptions = options => [...new Set(options.filter(option => option != null).map(option => String(option)))];

export default function PositionIndent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  
  const [options, setOptions] = useState({
    companies: [],
    branches: [],
    positions: [],
    departments: [],
    employees: [],
    grades: []
  });

  const fetchSyncData = useCallback(async () => {
    try {
      const res = await fetch('/api/recruitment/position-indent/sync-data');
      if (res.ok) {
        const json = await res.json();
        setOptions({
          companies: ['Select All', ...json.organizations],
          branches: ['Select All', ...json.branches],
          positions: ['Select', ...json.positions],
          departments: ['Select', ...json.departments],
          employees: ['Select', ...json.employees],
          grades: ['Select', ...json.grades]
        });
      }
    } catch (error) {
      console.error('Failed to fetch sync data', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recruitment/position-indent');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    void fetchSyncData();
  }, [fetchData, fetchSyncData]);

  const handleAddSubmit = async () => {
    if (!form.positionName || !form.department || !form.raisedBy) {
      alert("Position, Department, and Raised By are required.");
      return;
    }

    try {
      const res = await fetch('/api/recruitment/position-indent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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

  const handleStatusChange = async (row, status) => {
    if (String(row.status).trim().toLowerCase() === 'approved') return;
    if (status === row.status) return;
    setUpdatingStatusId(row.id);
    try {
      const response = await fetch('/api/recruitment/position-indent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update requirement status.');
      setData(previous => previous.map(item => item.id === row.id ? { ...item, status: result.status } : item));
    } catch (error) {
      alert(error.message || 'Failed to update requirement status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div>
      {/* Requirement table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Position Requirements</h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>Review requests and update their status.</p>
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={14} /> Add
          </button>
        </div>

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
                    <td style={{ padding: '0.75rem' }}>{row.approvedBy || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.handledBy || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        aria-label={`Change status for ${row.positionName}`}
                        value={row.status || 'pending'}
                        disabled={isApproved || updatingStatusId === row.id}
                        onChange={event => handleStatusChange(row, event.target.value)}
                        style={{ padding: '0.4rem 0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: isApproved || updatingStatusId === row.id ? '#f1f5f9' : '#fff', color: '#334155', fontSize: '0.82rem', cursor: isApproved ? 'not-allowed' : updatingStatusId === row.id ? 'wait' : 'pointer' }}
                      >
                        {!POSITION_STATUSES.some(status => status.value === row.status) && (
                          <option value={row.status}>{row.status}</option>
                        )}
                        {POSITION_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>-</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal isOpen={modalOpen} title="Raise Position Indent" onClose={() => setModalOpen(false)} onConfirm={handleAddSubmit} confirmLabel="Submit" size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <F label="Designation *" field="positionName" form={form} setForm={setForm} options={options.positions.length ? options.positions : undefined} />
          <F label="Department *" field="department" form={form} setForm={setForm} options={options.departments.length ? options.departments : undefined} />
          <F label="Raised By *" field="raisedBy" form={form} setForm={setForm} options={options.employees.length ? options.employees : ['Select']} />
          <F label="Raise Date" field="raisedDate" type="date" form={form} setForm={setForm} />
          <F label="Emp Type" field="empType" options={['Full-time', 'Part-time', 'Contract']} form={form} setForm={setForm} />
          <F label="Indent Type" field="indentType" options={['New Requirement', 'Replacement']} form={form} setForm={setForm} />
          
          {form.indentType === 'Replacement' && (
            <F label="Replacement For *" field="replacementFor" form={form} setForm={setForm} options={options.employees.length ? options.employees : ['Select']} />
          )}
          
          <F label="Req. From Date" field="reqFromDate" type="date" form={form} setForm={setForm} />
        </div>
      </AppModal>
    </div>
  );
}

const F = ({ label, field, type = 'text', options, form, setForm }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
    {options
      ? <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
          {uniqueOptions(options).map((option, index) => <option key={`${option}-${index}`} value={option}>{option}</option>)}
        </select>
      : <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} />
    }
  </div>
);
