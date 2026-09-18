'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileSpreadsheet, Calendar, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import ActionToolbar from '@/components/ActionToolbar';
import AppModal from '@/components/AppModal';

const INITIAL_FILTERS = {
  company: 'Select All',
  branch: 'Select All',
  position: 'Select',
  raiseBy: 'Select',
  raiseFrom: '2026-07-27',
  raiseTo: '2026-08-27',
  status: 'All',
  type: 'All'
};

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

export default function PositionIndent() {
  const router = useRouter();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  
  const [options, setOptions] = useState({
    companies: [],
    branches: [],
    positions: [],
    departments: [],
    employees: [],
    grades: []
  });

  useEffect(() => {
    fetchData();
    fetchSyncData();
  }, []);

  const fetchSyncData = async () => {
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
  };

  const getEmpName = () => {
    if (typeof window !== 'undefined') {
      const empData = localStorage.getItem('employeeData');
      if (empData) return JSON.parse(empData).name;
    }
    return '';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const empName = getEmpName();
      const params = new URLSearchParams();
      if (empName) params.append('raiseBy', empName);

      const res = await fetch(`/api/recruitment/position-indent?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch indents', error);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleAddSubmit = async () => {
    if (!form.positionName) {
      alert("Please enter Position Name");
      return;
    }

    try {
      const empName = getEmpName();
      const payload = { ...form, raisedBy: empName };
      
      const method = payload.id ? 'PUT' : 'POST';
      
      const res = await fetch('/api/recruitment/position-indent', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchData();
        setModalOpen(false);
        setForm(EMPTY_FORM);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save indent');
      }
    } catch (error) {
      console.error('Failed to save indent', error);
    }
  };

  const handleEdit = (row) => {
    setForm(row);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this indent?')) return;
    try {
      const res = await fetch(`/api/recruitment/position-indent?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete indent');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  return (
    <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 500, padding: '0.4rem 0.8rem', background: '#e2e8f0', borderRadius: '6px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Position Indent</h1>
      </div>

      {/* Data Table Area */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={openAddModal}>
              <Plus size={14} /> Add
            </button>
          </div>
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
                data.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.75rem' }}>{row.positionName}</td>
                    <td style={{ padding: '0.75rem' }}>{row.department}</td>
                    <td style={{ padding: '0.75rem' }}>{row.raisedBy}</td>
                    <td style={{ padding: '0.75rem' }}>{row.raisedDate}</td>
                    <td style={{ padding: '0.75rem' }}>{row.empType}</td>
                    <td style={{ padding: '0.75rem' }}>{row.indentType}</td>
                    <td style={{ padding: '0.75rem' }}>{row.reqFromDate || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.approvedBy || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.handledBy || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{row.status}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer' }} title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal isOpen={modalOpen} title="Raise Position Indent" onClose={() => setModalOpen(false)} onConfirm={handleAddSubmit} confirmLabel="Submit" size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <F label="Designation *" field="positionName" form={form} setForm={setForm} options={options.positions.length ? options.positions : undefined} />
          <F label="Department *" field="department" form={form} setForm={setForm} options={options.departments.length ? options.departments : undefined} />
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

const FilterSelect = ({ label, value, onChange, options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0ea5e9' }}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.85rem' }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const FilterInput = ({ label, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0ea5e9' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
    </div>
  </div>
);

const F = ({ label, field, type = 'text', options, form, setForm }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
    {options
      ? <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      : <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} />
    }
  </div>
);
