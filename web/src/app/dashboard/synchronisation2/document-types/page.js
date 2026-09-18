'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileText, Save, X, Download } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function DocumentTypesPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterScope, setFilterScope] = useState('All');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/synchronisation2/document-types');
      if (response.ok) {
        const result = await response.json();
        setDocuments(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    type: '',
    remark: '',
    viewInPortal: true,
    uploadInPortal: true,
    category: 'EMPLOYEE',
    scope: 'Individual'
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });

  const resetForm = () => {
    setFormData({
      type: '',
      remark: '',
      viewInPortal: true,
      uploadInPortal: true,
      category: 'EMPLOYEE',
      scope: 'Individual'
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (doc) => {
    setFormData({
      type: doc.type,
      remark: doc.remark || '',
      viewInPortal: doc.viewInPortal,
      uploadInPortal: doc.uploadInPortal,
      category: doc.category,
      scope: doc.scope
    });
    setEditingId(doc.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/synchronisation2/document-types/${deleteDialog.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDocuments();
      } else {
        console.error('Failed to delete document type');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
    setDeleteDialog({ isOpen: false, id: null });
  };

  const toggleCheckbox = async (doc, field) => {
    try {
      const response = await fetch(`/api/synchronisation2/document-types/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...doc, [field]: !doc[field] })
      });
      if (response.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.type.trim()) {
      alert('Document Type is required');
      return;
    }

    try {
      if (editingId) {
        const response = await fetch(`/api/synchronisation2/document-types/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          fetchDocuments();
        } else {
          const err = await response.json();
          alert(err.error || 'Failed to update document type');
        }
      } else {
        const response = await fetch('/api/synchronisation2/document-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          fetchDocuments();
        } else {
          const err = await response.json();
          alert(err.error || 'Failed to add document type');
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const filteredDocs = filterScope === 'All' ? documents : documents.filter(d => d.scope === filterScope);

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#374151',
    outline: 'none',
    background: '#fff'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0ea5e9',
    marginBottom: '6px'
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '18px', fontWeight: 700 }}>
          <FileText size={24} />
          Document Types
        </div>
        {!isFormOpen && (
          <button
            onClick={handleAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: '#0ea5e9', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> New Document Type
          </button>
        )}
      </div>

      {!isFormOpen && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Document Scope:</label>
          <select 
            value={filterScope} 
            onChange={(e) => setFilterScope(e.target.value)}
            style={{ ...inputStyle, width: '250px' }}
          >
            <option value="All">All</option>
            <option value="Individual">Individual</option>
            <option value="Company">Company</option>
            <option value="Global">Global</option>
          </select>
        </div>
      )}

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>
              {editingId ? 'Edit Document Type' : 'Add Document Type'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Document Type <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Document Category</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={inputStyle} />
              </div>
              
              <div>
                <label style={labelStyle}>Document Scope</label>
                <select value={formData.scope} onChange={(e) => setFormData({...formData, scope: e.target.value})} style={inputStyle}>
                  <option value="Individual">Individual</option>
                  <option value="Company">Company</option>
                  <option value="Global">Global</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Remark</label>
                <input type="text" value={formData.remark} onChange={(e) => setFormData({...formData, remark: e.target.value})} style={inputStyle} />
              </div>
              
              <div style={{ display: 'flex', gap: '32px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.viewInPortal} onChange={(e) => setFormData({...formData, viewInPortal: e.target.checked})} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  View in Employee Portal
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.uploadInPortal} onChange={(e) => setFormData({...formData, uploadInPortal: e.target.checked})} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  Upload in Employee Portal
                </label>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', color: '#475569', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
              >
                <Save size={16} /> Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {!isFormOpen && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '600px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#0ea5e9', color: '#fff' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Document Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Remark</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>View in Employee Portal</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>Upload in Employee Portal</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Document Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Document Scope</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No Document Types found.
                  </td>
                </tr>
              ) : filteredDocs.map((doc, i) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{doc.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{doc.remark}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={doc.viewInPortal} 
                      onChange={() => toggleCheckbox(doc, 'viewInPortal')}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={doc.uploadInPortal} 
                      onChange={() => toggleCheckbox(doc, 'uploadInPortal')}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>
                    <div style={{ background: '#e5e7eb', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                      {doc.category}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{doc.scope}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(doc)} style={{ padding: '4px', color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(doc.id)} style={{ padding: '4px', color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                      <button style={{ padding: '4px', color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Document Type"
        message="Are you sure you want to delete this document type?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
}
