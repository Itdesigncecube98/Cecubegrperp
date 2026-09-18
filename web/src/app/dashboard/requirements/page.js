'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, FileSpreadsheet, Calendar } from 'lucide-react';
import ActionToolbar from '@/components/ActionToolbar';
import AppModal from '@/components/AppModal';

const INITIAL_FILTERS = {
  company: 'Select All',
  branch: 'Select All',
  position: 'Engineer',
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company) params.append('company', filters.company);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.position) params.append('position', filters.position);
      if (filters.status) params.append('status', filters.status);
      if (filters.raiseBy) params.append('raiseBy', filters.raiseBy);

      const res = await fetch(`/api/recruitment/position-indent?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

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

  return (
    <div>
      <ActionToolbar onReset={() => setFilters(INITIAL_FILTERS)} shareTitle="Position Indent" />

      {/* Filter Criteria */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', margin: 0 }}>Filter Criteria</h2>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={14} /> Add
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <FilterSelect label="Company *" value={filters.company} onChange={v => setFilters({ ...filters, company: v })} options={options.companies.length ? options.companies : ['Select All']} />
          <FilterSelect label="Branch *" value={filters.branch} onChange={v => setFilters({ ...filters, branch: v })} options={options.branches.length ? options.branches : ['Select All']} />
          <FilterSelect label="Designation" value={filters.position} onChange={v => setFilters({ ...filters, position: v })} options={options.positions.length ? options.positions : ['Select']} />
          <FilterSelect label="Raise By" value={filters.raiseBy} onChange={v => setFilters({ ...filters, raiseBy: v })} options={options.employees.length ? options.employees : ['Select']} />
          
          <FilterInput label="Raise From" type="date" value={filters.raiseFrom} onChange={v => setFilters({ ...filters, raiseFrom: v })} />
          <FilterInput label="Raise To" type="date" value={filters.raiseTo} onChange={v => setFilters({ ...filters, raiseTo: v })} />
          
          <FilterSelect label="Status" value={filters.status} onChange={v => setFilters({ ...filters, status: v })} options={['All', 'approved', 'non approved', 'pending', 'accepeted', 'not accepted', 'rejected']} />
          <FilterSelect label="Type" value={filters.type} onChange={v => setFilters({ ...filters, type: v })} options={['All', 'Internal', 'External']} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn-primary" style={{ background: '#0ea5e9' }} onClick={handleSearch}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {/* Data Table Area */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={14} /> Export To excel
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            <span>Show Rows:</span>
            <select style={{ padding: '0.2rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <option>40</option>
              <option>100</option>
            </select>
            <span>Page: 1 of 1</span>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '0.2rem 0.5rem' }}>Go</button>
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
                    <td style={{ padding: '0.75rem' }}>-</td>
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
