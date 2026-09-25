'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Users } from 'lucide-react';
import TopHeader from '@/components/TopHeader';
import MultiSelect from '@/components/MultiSelect';

export default function ContractorGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [form, setForm] = useState({ name: '', contractorIds: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, contractorsRes] = await Promise.all([
        fetch('/api/contractor-groups'),
        fetch('/api/contractors')
      ]);
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (contractorsRes.ok) setContractors(await contractorsRes.json());
    } catch (error) {
      console.error(error);
      showToast('Error loading data', 'error');
    }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Group name is required', 'error');

    try {
      const isEditing = !!editingGroup;
      const res = await fetch('/api/contractor-groups', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...form, id: editingGroup.id } : form)
      });
      
      if (!res.ok) throw new Error('Failed to save group');
      
      showToast(isEditing ? 'Group updated successfully!' : 'Group added successfully!');
      setShowModal(false);
      fetchData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      const res = await fetch(`/api/contractor-groups?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      showToast('Group deleted successfully');
      fetchData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const openAddModal = () => {
    setEditingGroup(null);
    setForm({ name: '', contractorIds: [] });
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setForm({ 
      name: group.name, 
      contractorIds: group.contractors?.map(c => c.id) || [] 
    });
    setShowModal(true);
  };

  // Convert contractors to format expected by MultiSelect
  const contractorOptions = contractors.map(c => c.companyName || c.contactPerson || c.id);

  const handleContractorSelect = (selectedNames) => {
    const selectedIds = selectedNames.map(name => {
      const contractor = contractors.find(c => (c.companyName || c.contactPerson || c.id) === name);
      return contractor ? contractor.id : null;
    }).filter(Boolean);
    
    setForm(prev => ({ ...prev, contractorIds: selectedIds }));
  };

  const getSelectedContractorNames = () => {
    return form.contractorIds.map(id => {
      const c = contractors.find(c => c.id === id);
      return c ? (c.companyName || c.contactPerson || c.id) : '';
    }).filter(Boolean);
  };

  return (
    <div className="main-content">
      <TopHeader title="Contractor Groups" />
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Contractor Groups</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Manage contractor groups and assignments</p>
          </div>
          <button 
            onClick={openAddModal}
            style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Add Group
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading groups...</div>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Group Name</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Contractors Assigned</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No groups found.</td></tr>
                ) : (
                  groups.map((group, idx) => (
                    <tr key={group.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={16} color="#64748b" />
                          {group.name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(group.contractors || []).slice(0, 3).map(c => (
                            <span key={c.id} style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                              {c.companyName || c.contactPerson || 'Contractor'}
                            </span>
                          ))}
                          {group.contractors?.length > 3 && (
                            <span style={{ padding: '4px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                              +{group.contractors.length - 3} more
                            </span>
                          )}
                          {(!group.contractors || group.contractors.length === 0) && (
                            <span style={{ color: '#94a3b8' }}>None</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openEditModal(group)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }} title="Edit"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(group.id)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {editingGroup ? 'Edit Group' : 'Add New Group'}
                </h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Group Name *</label>
                  <input 
                    type="text" 
                    required
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                    placeholder="e.g. Electrical Contractors"
                  />
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Assign Contractors</label>
                  <MultiSelect
                    options={contractorOptions}
                    selected={getSelectedContractorNames()}
                    onChange={handleContractorSelect}
                    placeholder="Search and select contractors..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, color: '#475569' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={16} /> Save Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
