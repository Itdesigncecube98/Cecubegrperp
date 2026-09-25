'use client';
import React, { useEffect, useState } from 'react';
import { AlertCircle, Save, Tag, X } from 'lucide-react';
import { createBrand, updateBrand } from './brandApi';

const EMPTY_FORM = { name: '', status: 'Active' };

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  backdropFilter: 'blur(4px)',
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px'
};

const CARD_STYLE = {
  background: '#fff',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden'
};

export default function BrandFormModal({ isOpen, brand, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const isEditing = Boolean(brand?.id);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ name: brand?.name || '', status: brand?.status || 'Active' });
    setFormError('');
    setSaving(false);
  }, [isOpen, brand]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      setFormError('Brand name is required.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (isEditing) {
        await updateBrand({ id: brand.id, name, status: form.status });
      } else {
        await createBrand({ name, status: form.status });
      }

      onSaved(isEditing ? `Brand "${name}" updated successfully.` : `Brand "${name}" created successfully.`);
    } catch (error) {
      setFormError(error.message || 'Unable to save the brand. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div style={CARD_STYLE} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="pur-section-title" style={{ margin: 0, fontSize: '1.05rem' }}>
            <Tag size={18} color="#f59e0b" />
            {isEditing ? 'Edit Brand' : 'Add New Brand'}
          </h2>
          <button type="button" onClick={onClose} className="pur-icon-btn" title="Close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {formError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.82rem',
              fontWeight: 500
            }}>
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          <div className="pur-form-group">
            <label className="pur-label" htmlFor="brand-name">
              Brand Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="brand-name"
              type="text"
              name="name"
              autoFocus
              className="pur-input"
              placeholder="e.g. Havells"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="pur-form-group" style={{ marginBottom: 0 }}>
            <label className="pur-label" htmlFor="brand-status">Status</label>
            <select
              id="brand-status"
              name="status"
              className="pur-select"
              value={form.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <button type="button" onClick={onClose} className="pur-btn pur-btn-outline" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b' }} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : isEditing ? 'Update Brand' : 'Save Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
