'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Edit2, Trash2, Building2, MapPin, Briefcase, Building, Network, Save } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function SynchronizationPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('departments');
  const [items, setItems] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    organization: '',
    description: '',
    department: '',
    grade: '',
    designation: '',
    imprestHead: '',
    textColor: '#1f2937',
    bgColor: '#f3f4f6'
  });

  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [imprestHeads, setImprestHeads] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [workflowConfig, setWorkflowConfig] = useState({
    projectsHeadId: '',
    projectsHeadId2: '',
    accountsId: ''
  });
  const [workflowSaving, setWorkflowSaving] = useState(false);

  // Sync tab from URL ?tab= param
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'imprestworkflow') {
      fetchWorkflowConfig();
      fetchEmployees();
    } else {
      fetchItems();
      fetchOrganizations();
      if (activeTab === 'grades') fetchDesignations();
      if (activeTab === 'impresttypes') fetchImprestHeads();
    }
  }, [activeTab]);

  const fetchWorkflowConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/synchronization/imprest-workflow');
      if (res.ok) {
        const data = await res.json();
        setWorkflowConfig({
          projectsHeadId: data.projectsHeadId || '',
          projectsHeadId2: data.projectsHeadId2 || '',
          accountsId: data.accountsId || ''
        });
      }
    } catch (err) {
      console.error('Failed to load workflow config', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const saveWorkflowConfig = async () => {
    try {
      setWorkflowSaving(true);
      const res = await fetch('/api/synchronization/imprest-workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowConfig)
      });
      if (res.ok) {
        setInfoDialog({ isOpen: true, type: 'info', title: 'Success', message: 'Imprest workflow configuration saved successfully!' });
      } else {
        setInfoDialog({ isOpen: true, type: 'info', title: 'Error', message: 'Failed to save configuration' });
      }
    } catch (err) {
      console.error('Failed to save config', err);
      setInfoDialog({ isOpen: true, type: 'info', title: 'Error', message: 'Error saving configuration' });
    } finally {
      setWorkflowSaving(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    setItems([]); // Clear items before fetching new ones
    try {
      const res = await fetch(`/api/synchronization?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/synchronization?type=organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/synchronization?type=departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/synchronization?type=grades');
      if (res.ok) {
        const data = await res.json();
        setGrades(data);
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await fetch('/api/synchronization?type=designations');
      if (res.ok) {
        const data = await res.json();
        setDesignations(data);
      }
    } catch (err) {
      console.error('Error fetching designations:', err);
    }
  };

  const fetchImprestHeads = async () => {
    try {
      const res = await fetch('/api/synchronization?type=imprestheads');
      if (res.ok) {
        const data = await res.json();
        setImprestHeads(data);
      }
    } catch (err) {
      console.error('Error fetching imprest heads:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch('/api/synchronization', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: activeTab,
          id: editingItem?.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ name: '', code: '', organization: '', description: '', department: '', grade: '', designation: '', imprestHead: '', textColor: '#1f2937', bgColor: '#f3f4f6' });
        fetchItems();
      }
    } catch (err) {
      console.error('Error saving item:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      const res = await fetch(`/api/synchronization?id=${deleteConfirm.id}&type=${activeTab}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchItems();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      organization: item.organization || '',
      description: item.description || '',
      department: item.department || '',
      grade: item.grade || '',
      designation: item.designation || '',
      imprestHead: item.imprestHead || '',
      textColor: item.textColor || '#1f2937',
      bgColor: item.bgColor || '#f3f4f6'
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', code: '', organization: '', description: '', department: '', grade: '', designation: '', imprestHead: '', textColor: '#1f2937', bgColor: '#f3f4f6' });
    setIsModalOpen(true);
  };

  const tabs = [
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'branches', label: 'Branches', icon: Building },
    { id: 'siteoffices', label: 'Site Offices', icon: MapPin },
    { id: 'organizations', label: 'Organizations', icon: Briefcase },
    { id: 'imprestheads', label: 'Imprest Heads', icon: Briefcase },
    { id: 'impresttypes', label: 'Imprest Types', icon: Briefcase },
    { id: 'grades', label: 'Grades', icon: Briefcase },
    { id: 'designations', label: 'Designations', icon: Briefcase },
    { id: 'imprestworkflow', label: 'Imprest Workflow', icon: Network }
  ];

  const getLabel = () => {
    const labels = {
      departments: 'Department',
      branches: 'Branch',
      siteoffices: 'Site Office',
      organizations: 'Organization',
      imprestheads: 'Imprest Head',
      impresttypes: 'Imprest Type',
      grades: 'Grade',
      designations: 'Designation',
      imprestworkflow: 'Imprest Workflow'
    };
    return labels[activeTab];
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Add Button */}
      {activeTab !== 'imprestworkflow' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.target.style.background = '#2563eb'}
            onMouseOut={e => e.target.style.background = '#3b82f6'}
          >
            <Plus size={18} />
            Add {getLabel()}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'imprestworkflow' ? (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem' }}>Imprest Approval Workflow Configuration</h2>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Select the employees responsible for each step in the Imprest Management approval process.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
            {/* Step 1: Supervisor - dynamic */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#334155' }}>Supervisor (Level 1)</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Dynamic — employee's direct supervisor from org structure</div>
              </div>
            </div>

            {/* Step 2: Accounts */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Accounts Department (Level 2)</div>
                <select 
                  value={workflowConfig.accountsId} 
                  onChange={e => setWorkflowConfig({...workflowConfig, accountsId: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Raj Kumar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Approver — Raj Kumar (Level 3)</div>
                <select 
                  value={workflowConfig.projectsHeadId} 
                  onChange={e => setWorkflowConfig({...workflowConfig, projectsHeadId: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 4: Sanjay Arora */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>4</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Approver — Sanjay Arora (Level 4)</div>
                <select 
                  value={workflowConfig.projectsHeadId2} 
                  onChange={e => setWorkflowConfig({...workflowConfig, projectsHeadId2: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={saveWorkflowConfig}
              disabled={workflowSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '1rem',
                opacity: workflowSaving ? 0.7 : 1
              }}
            >
              <Save size={20} />
              {workflowSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No {getLabel().toLowerCase()}s found. Click "Add {getLabel()}" to create one.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Name
                  </th>
                  {activeTab !== 'organizations' && activeTab !== 'imprestheads' && activeTab !== 'grades' && activeTab !== 'designations' && activeTab !== 'impresttypes' && (
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Organization
                    </th>
                  )}
                  {activeTab === 'grades' && (
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Designation
                    </th>
                  )}
                  {activeTab === 'impresttypes' && (
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Imprest Head
                    </th>
                  )}
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', width: '150px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: index < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '1rem', fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>
                      {activeTab === 'organizations' ? (
                        <span style={{ 
                          background: item.bgColor || '#f3f4f6', 
                          color: item.textColor || '#1f2937', 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '13px', 
                          fontWeight: 600 
                        }}>
                          {item.name}
                        </span>
                      ) : (
                        item.name
                      )}
                    </td>
                    {activeTab !== 'organizations' && activeTab !== 'imprestheads' && activeTab !== 'grades' && activeTab !== 'designations' && activeTab !== 'impresttypes' && (
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                        {item.organization || '—'}
                      </td>
                    )}
                    {activeTab === 'grades' && (
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                          {item.designation || '—'}
                        </span>
                      </td>
                    )}
                    {activeTab === 'impresttypes' && (
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                          {item.imprestHead || '—'}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6b7280', maxWidth: '400px' }}>
                      {item.description || '—'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(item)}
                          style={{
                            padding: '0.5rem',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          style={{
                            padding: '0.5rem',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                {editingItem ? 'Edit' : 'Add'} {getLabel()}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              {/* For Imprest Types: Imprest Head selector first */}
              {activeTab === 'impresttypes' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                    Imprest Head *
                  </label>
                  <select
                    required
                    value={formData.imprestHead}
                    onChange={e => setFormData({ ...formData, imprestHead: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Select Imprest Head --</option>
                    {imprestHeads.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* For Grades: Designation selector first */}
              {activeTab === 'grades' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                    Designation *
                  </label>
                  <select
                    required
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Select Designation --</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                  {activeTab === 'grades' ? 'Grade Name *' : activeTab === 'designations' ? 'Designation Name *' : 'Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                  placeholder={`Enter ${getLabel().toLowerCase()} name`}
                />
              </div>

              {activeTab === 'organizations' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                    Employee Code Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                    placeholder="e.g. CEIPL or CGEPL"
                  />
                  <div style={{ marginTop: '0.35rem', color: '#6b7280', fontSize: '0.8rem' }}>New employees will receive the next number under this prefix.</div>
                </div>
              )}

              {activeTab !== 'organizations' && activeTab !== 'imprestheads' && activeTab !== 'grades' && activeTab !== 'designations' && activeTab !== 'impresttypes' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                    Organization(s)
                  </label>
                  <select
                    multiple
                    value={formData.organization ? formData.organization.split(',').map(o => o.trim()) : []}
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                      setFormData({ ...formData, organization: selected.join(', ') });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border 0.2s',
                      minHeight: '120px'
                    }}
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.name}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple organizations
                  </p>
                </div>
              )}

              {activeTab === 'organizations' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                      Text Color
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #d1d5db', background: 'conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: '4px', background: formData.textColor || '#1f2937', pointerEvents: 'none', border: '1px solid rgba(0,0,0,0.1)' }} />
                        <input
                          type="color"
                          value={formData.textColor || '#1f2937'}
                          onChange={e => setFormData({ ...formData, textColor: e.target.value })}
                          style={{ position: 'absolute', top: -10, left: -10, width: '60px', height: '60px', opacity: 0, cursor: 'pointer' }}
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.textColor || '#1f2937'}
                        onChange={e => setFormData({ ...formData, textColor: e.target.value })}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                      Background Color
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #d1d5db', background: 'conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: '4px', background: formData.bgColor || '#f3f4f6', pointerEvents: 'none', border: '1px solid rgba(0,0,0,0.1)' }} />
                        <input
                          type="color"
                          value={formData.bgColor || '#f3f4f6'}
                          onChange={e => setFormData({ ...formData, bgColor: e.target.value })}
                          style={{ position: 'absolute', top: -10, left: -10, width: '60px', height: '60px', opacity: 0, cursor: 'pointer' }}
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.bgColor || '#f3f4f6'}
                        onChange={e => setFormData({ ...formData, bgColor: e.target.value })}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border 0.2s'
                  }}
                  placeholder="Enter description"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                    setFormData({ name: '', code: '', organization: '', description: '', textColor: '#1f2937', bgColor: '#f3f4f6' });
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog 
        isOpen={!!deleteConfirm}
        type="confirm"
        title={`Delete ${getLabel()}`}
        message={deleteConfirm ? `Are you sure you want to delete the ${getLabel().toLowerCase()} '${deleteConfirm.name}'?` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <Dialog 
        isOpen={infoDialog.isOpen}
        type={infoDialog.type}
        title={infoDialog.title}
        message={infoDialog.message}
        onConfirm={() => setInfoDialog({ ...infoDialog, isOpen: false })}
        onCancel={() => setInfoDialog({ ...infoDialog, isOpen: false })}
      />
    </div>
  );
}
