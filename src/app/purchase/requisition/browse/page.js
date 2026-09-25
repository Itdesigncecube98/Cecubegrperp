'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, Search, FileText, Edit2, Trash2, Plus, Info } from 'lucide-react';
import '../../purchase.css';

export default function RequisitionBrowse() {
  const [requisitions, setRequisitions] = useState([]);
  const [apiProjects, setApiProjects] = useState([]);
  const [apiMaterials, setApiMaterials] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setApiProjects(data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
    const fetchMaterials = async () => {
      try {
        const res = await fetch('/api/materials');
        if (res.ok) {
          const data = await res.json();
          setApiMaterials(data);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };

    fetchProjects();
    fetchMaterials();
  }, []);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requisitions?projectId=${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data);
      }
    } catch (error) {
      console.error('Error fetching requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [selectedProjectId]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      projectId: apiProjects.length > 0 ? apiProjects[0].id : '',
      categoryId: '',
      material: '',
      unit: 'Nos',
      reqdDate: new Date().toISOString().split('T')[0],
      reqQty: '',
      appQty: '',
      status: 'Pending'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (req) => {
    setIsEditing(true);
    // Find the category based on the material name if possible
    let foundCategoryId = '';
    for (const lib of (apiMaterials || [])) {
      if (!lib) continue;
      const groups = Array.isArray(lib.groups) ? lib.groups : [lib];
      for (const group of groups) {
        if (!group || !Array.isArray(group.materials)) continue;
        if (group.materials.find(m => m && m.name === req.material)) {
          foundCategoryId = group.id;
          break;
        }
      }
      if (foundCategoryId) break;
    }

    setFormData({
      id: req.id,
      date: req.date,
      projectId: req.projectId || '',
      categoryId: foundCategoryId,
      material: req.material,
      unit: req.unit,
      reqdDate: req.reqdDate,
      reqQty: req.reqQty,
      appQty: req.appQty || '',
      status: req.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this requisition?")) {
      try {
        const res = await fetch(`/api/requisitions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchRequisitions();
        }
      } catch (error) {
        console.error('Error deleting requisition:', error);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await fetch(`/api/requisitions/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch(`/api/requisitions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      fetchRequisitions();
    } catch (error) {
      console.error('Error saving requisition:', error);
    }
  };

  // Extract all categories (groups) from libraries or root groups
  const allCategories = Array.isArray(apiMaterials)
    ? apiMaterials.flatMap(item => {
        if (!item) return [];
        if (Array.isArray(item.groups)) return item.groups;
        if (item.id && item.name) return [item];
        return [];
      }).filter(Boolean)
    : [];

  // Get materials for the currently selected category
  const currentCategory = allCategories.find(c => c?.id && c.id.toString() === formData.categoryId?.toString());
  const availableMaterials = currentCategory?.materials || [];

  const handleMaterialChange = (e) => {
    const matName = e.target.value;
    const selectedMat = availableMaterials.find(m => m?.name === matName);
    setFormData({
      ...formData,
      material: matName,
      unit: selectedMat ? selectedMat.unit : formData.unit
    });
  };

  return (
    <div className="purchase-container">
      
      {/* Header */}
      <div className="purchase-header">
        <div className="purchase-header-title">
          <FileText size={18} />
          Requisition Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Requisition Browse
        </div>
      </div>

      {/* Actions and Filter Bar */}
      <div className="purchase-actions-bar" style={{ marginTop: '24px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', background: 'white', border: '1px solid #e2e8f0', borderBottom: 'none', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Total Records : {requisitions.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Search by Project:</span>
              <div style={{ position: 'relative' }}>
                <select 
                  className="purchase-input" 
                  style={{ width: '300px', background: '#f8fafc', borderColor: '#e2e8f0' }}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {apiProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
          
          <button className="btn-cyan" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', borderRadius: '8px' }}>
            <Plus size={16} /> Add Requisition
          </button>
          
        </div>
      </div>

      {/* Table Section */}
      <div className="purchase-table-wrapper" style={{ marginTop: 0, borderRadius: '0 0 8px 8px', overflowX: 'auto', background: 'white', border: '1px solid #e2e8f0' }}>
        <table className="purchase-table" style={{ minWidth: '1400px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap', width: '100px' }}>Req Sr No.</th>
              <th style={{ whiteSpace: 'nowrap', width: '120px' }}>Req. Date</th>
              <th style={{ minWidth: '250px' }}>Project Name</th>
              <th style={{ minWidth: '300px' }}>Material Name</th>
              <th style={{ whiteSpace: 'nowrap', width: '80px' }}>Unit</th>
              <th style={{ whiteSpace: 'nowrap', width: '120px' }}>Reqd Date</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '100px' }}>Req Qty</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '120px' }}>Approved Qty</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '100px' }}>Status</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading requisitions...</td></tr>
            ) : requisitions.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No requisitions found. Click 'Add Requisition' to create one.</td></tr>
            ) : (
              requisitions.map((req, idx) => (
                <tr key={req.id || idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                  <td style={{ color: '#0ea5e9', fontWeight: 500, whiteSpace: 'nowrap' }}>{req.reqNo} ↓</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{req.date}</td>
                  <td style={{ color: '#475569' }}>{req.project ? req.project.name : '-'}</td>
                  <td style={{ color: '#0ea5e9', fontWeight: 500 }}>
                    {req.material} <Info size={14} style={{ verticalAlign: 'middle', marginLeft: '4px', color: '#cbd5e1' }} />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{req.unit}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{req.reqdDate}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{req.reqQty}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{req.appQty || '-'}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ 
                      background: req.status === 'Approved' ? '#22c55e' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b', 
                      color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Edit2 size={16} className="action-icon" style={{ color: '#0ea5e9', cursor: 'pointer' }} onClick={() => handleOpenEdit(req)} />
                      <Trash2 size={16} className="action-icon" style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleDelete(req.id)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add / Edit */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '600px', padding: '0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                {isEditing ? 'Edit Requisition' : 'Add New Requisition'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Project <span style={{ color: '#ef4444' }}>*</span></label>
                  <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} required>
                    <option value="" disabled>Select Project</option>
                    {apiProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Material Category <span style={{ color: '#ef4444' }}>*</span></label>
                  <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value, material: ''})} required>
                    <option value="" disabled>Select Category</option>
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Material Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.material || ''} onChange={handleMaterialChange} required disabled={!formData.categoryId}>
                    <option value="" disabled>Select Material</option>
                    {availableMaterials.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Requisition Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Required By Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.reqdDate} onChange={e => setFormData({...formData, reqdDate: e.target.value})} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Req Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" step="0.01" className="purchase-input" style={{ width: '60%', boxSizing: 'border-box' }} value={formData.reqQty} onChange={e => setFormData({...formData, reqQty: e.target.value})} required />
                    <input type="text" className="purchase-input" style={{ width: '40%', boxSizing: 'border-box', background: '#f1f5f9' }} value={formData.unit} readOnly />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {formData.status === 'Approved' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Approved Quantity</label>
                    <input type="number" step="0.01" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.appQty} onChange={e => setFormData({...formData, appQty: e.target.value})} />
                  </div>
                )}
                
              </div>
              
              <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-cyan" style={{ padding: '8px 20px', background: '#0ea5e9' }}>
                  {isEditing ? 'Update Requisition' : 'Save Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
