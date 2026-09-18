'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import Dialog from '../../../../components/Dialog';

export default function HrDocsPlaceholders() {
  const builtInPlaceholders = [
    ['grossSalary', 'Gross salary from the latest salary revision or salary components'],
    ['basicSalary', 'Basic salary'],
    ['hra', 'House rent allowance'],
    ['jobTitle', 'Job title or designation'],
    ['position', 'Employee position'],
    ['jobDescription', 'Job description'],
    ['employeeType', 'Permanent, Contract, or Trainee'],
    ['branch', 'Assigned branch'],
    ['siteOffice', 'Assigned site office'],
    ['grade', 'Employee grade'],
    ['employmentStatus', 'Working, Resigned, or other status'],
    ['organisation', 'Organisation name'],
    ['joinedDate', 'Date of joining']
  ];
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const saved = localStorage.getItem('hrDocs_customPlaceholdersConfig');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Placeholder name is required");
      return;
    }
    
    // Ensure placeholder is alphanumeric, no spaces
    const cleanName = formData.name.trim().replace(/[^a-zA-Z0-9]/g, '');

    let updatedItems;
    if (editingId) {
      updatedItems = items.map(item => 
        item.id === editingId ? { ...item, name: cleanName, description: formData.description } : item
      );
    } else {
      updatedItems = [...items, { 
        id: Date.now().toString(), 
        name: cleanName, 
        description: formData.description 
      }];
    }

    setItems(updatedItems);
    localStorage.setItem('hrDocs_customPlaceholdersConfig', JSON.stringify(updatedItems));
    resetForm();
  };

  const handleEdit = (item) => {
    setFormData({ name: item.name, description: item.description || '' });
    setEditingId(item.id);
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Placeholder',
      message: 'Are you sure you want to delete this custom placeholder?',
      onConfirm: () => {
        const updatedItems = items.filter(item => item.id !== id);
        setItems(updatedItems);
        localStorage.setItem('hrDocs_customPlaceholdersConfig', JSON.stringify(updatedItems));
        setDialogConfig({ isOpen: false });
      }
    });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setIsEditing(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>HR Docs Placeholders</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Define custom placeholders that will appear in the HR Letters Template Builder.</p>
        </div>
        {!isEditing && (
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            <Plus size={18} /> Add Placeholder
          </button>
        )}
      </div>

      {isEditing && (
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>
            {editingId ? 'Edit Placeholder' : 'Add New Placeholder'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>Placeholder Name (e.g. bonusAmount)</label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="No spaces allowed"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>Description (Optional)</label>
              <input
                type="text"
                className="input-field"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this used for?"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>
              <Save size={18} /> Save
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Built-in Salary &amp; Job Placeholders</h3>
        <table style={{ marginBottom: '24px' }}>
          <thead><tr><th>Placeholder</th><th>Preview Format</th><th>Description</th></tr></thead>
          <tbody>
            {builtInPlaceholders.map(([name, description]) => (
              <tr key={name}>
                <td style={{ fontWeight: 600 }}>{name}</td>
                <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>{`{{${name}}}`}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Custom Placeholders</h3>
        <table>
          <thead>
            <tr>
              <th>Placeholder Name</th>
              <th>Preview Format</th>
              <th>Description</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">No custom placeholders defined.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>
                      {`{{${item.name}}}`}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{item.description || '-'}</td>
                  <td className="text-right">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="icon-btn edit-btn" onClick={() => handleEdit(item)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn delete-btn" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog 
        isOpen={dialogConfig.isOpen} 
        type={dialogConfig.type} 
        title={dialogConfig.title} 
        message={dialogConfig.message} 
        onConfirm={dialogConfig.onConfirm} 
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })} 
      />
    </div>
  );
}
