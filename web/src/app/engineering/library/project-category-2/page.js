'use client';
import React, { useState } from 'react';
import { 
  FolderTree, Search, Edit, Trash2, Plus, Save, X, Home, ChevronRight
} from 'lucide-react';
import '../../../accounts/company/company.css';

export default function ProjectCategory2() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([
    { id: 1, name: 'High Rise', code: 'HR', description: 'Buildings above 15 floors', status: 'Active' },
    { id: 2, name: 'Low Rise', code: 'LR', description: 'Buildings up to 4 floors', status: 'Active' },
    { id: 3, name: 'Township', code: 'TS', description: 'Large scale integrated township', status: 'Inactive' },
    { id: 4, name: 'Warehouse', code: 'WH', description: 'Storage and logistics facilities', status: 'Active' }
  ]);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', status: 'Active' });

  const handleEdit = (category) => {
    setIsEditing(true);
    setEditingId(category.id);
    setFormData({ name: category.name, code: category.code, description: category.description, status: category.status });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this Category 2?")) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      alert("Category Name is required!");
      return;
    }
    
    if (isEditing) {
      setCategories(categories.map(c => c.id === editingId ? { ...c, ...formData } : c));
      setIsEditing(false);
      setEditingId(null);
    } else {
      setCategories([...categories, { id: Date.now(), ...formData }]);
    }
    setFormData({ name: '', code: '', description: '', status: 'Active' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', code: '', description: '', status: 'Active' });
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="company-container">
      {/* Header Area */}
      <div className="page-header">
        <h2 className="page-title">
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', display: 'flex', color: '#0ea5e9' }}>
            <FolderTree size={24} />
          </div>
          Project Category 2
        </h2>
        <div className="breadcrumb">
          <Home size={14} /> Home <ChevronRight size={14} /> Library <ChevronRight size={14} /> Project Category 2
        </div>
      </div>

      <div className="modern-card" style={{ padding: '24px' }}>
        
        {/* Form Section */}
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? 'Edit Category 2' : 'Add New Category 2'}
          </h3>
          
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div>
              <label className="modern-label" style={{ color: '#0ea5e9' }}>Category Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                className="modern-input" 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter category name" 
              />
            </div>
            <div>
              <label className="modern-label" style={{ color: '#0ea5e9' }}>Category Code</label>
              <input 
                className="modern-input" 
                type="text" 
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="Enter code" 
              />
            </div>
            <div>
              <label className="modern-label" style={{ color: '#0ea5e9' }}>Description</label>
              <input 
                className="modern-input" 
                type="text" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter description" 
              />
            </div>
            <div>
              <label className="modern-label" style={{ color: '#0ea5e9' }}>Status</label>
              <select 
                className="modern-input modern-select"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            {isEditing && (
              <button className="btn-outline" onClick={handleCancel}>
                <X size={16} /> Cancel
              </button>
            )}
            <button className="btn-primary" style={{ background: '#0ea5e9' }} onClick={handleSave}>
              <Save size={16} /> {isEditing ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </div>

        {/* List Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>Category 2 List</h3>
            <div className="search-wrapper" style={{ position: 'relative', width: '300px' }}>
              <input 
                type="text" 
                className="modern-input" 
                placeholder="Search Categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: '32px', width: '100%' }} 
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="modern-table" style={{ width: '100%' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ color: '#64748b', fontWeight: 600 }}>S.No</th>
                  <th style={{ color: '#64748b', fontWeight: 600 }}>Category Name</th>
                  <th style={{ color: '#64748b', fontWeight: 600 }}>Code</th>
                  <th style={{ color: '#64748b', fontWeight: 600 }}>Description</th>
                  <th style={{ color: '#64748b', fontWeight: 600 }}>Status</th>
                  <th style={{ color: '#64748b', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No categories found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c, index) => (
                    <tr key={c.id}>
                      <td style={{ color: '#64748b' }}>{index + 1}</td>
                      <td style={{ fontWeight: 500, color: '#334155' }}>{c.name}</td>
                      <td>{c.code}</td>
                      <td>{c.description}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          background: c.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                          color: c.status === 'Active' ? '#16a34a' : '#64748b'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                          <div onClick={() => handleEdit(c)} style={{ padding: '6px', background: '#e0f2fe', borderRadius: '6px', color: '#0ea5e9', cursor: 'pointer' }}>
                            <Edit size={16} />
                          </div>
                          <div onClick={() => handleDelete(c.id)} style={{ padding: '6px', background: '#fee2e2', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
