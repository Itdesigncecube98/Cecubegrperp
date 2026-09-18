"use client";

import { useEffect, useState, useCallback } from "react";

const COMPANY_ID = "demo-company-id";

const EMPTY_FORM = {
  id: null,
  categoryName: "",
  gstRate: "",
  gstMasterCode: "CGST",
  supplyType: "INTRA_STATE",
  active: true,
};

export default function GstCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gst/categories?companyId=${COMPANY_ID}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load categories");
      setCategories(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function selectCategory(cat) {
    setForm({
      id: cat.id,
      categoryName: cat.categoryName,
      gstRate: cat.gstRate,
      gstMasterCode: cat.gstMasterCode,
      supplyType: cat.supplyType,
      active: cat.active,
    });
    setSuccess(null);
    setError(null);
  }

  function newCategory() {
    setForm(EMPTY_FORM);
    setSuccess(null);
    setError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        companyId: COMPANY_ID,
        categoryName: form.categoryName,
        gstRate: form.gstRate,
        gstMasterCode: form.gstMasterCode,
        supplyType: form.supplyType,
        active: form.active,
      };

      const res = await fetch(
        form.id ? `/api/gst/categories/${form.id}` : "/api/gst/categories",
        {
          method: form.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      setSuccess(form.id ? "✓ Category updated successfully" : "✓ Category created successfully");
      setTimeout(() => setSuccess(null), 3000);
      await loadCategories();
      selectCategory(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!confirm(`Delete category "${form.categoryName}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/gst/categories/${form.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setSuccess("✓ Category deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
      await loadCategories();
      newCategory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 32,
        paddingBottom: 20,
        borderBottom: '2px solid #e2e8f0'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: 28, 
          fontWeight: 600, 
          color: '#0f172a',
          marginBottom: 8 
        }}>
          GST Categories
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          Configure GST rates and tax categories
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          padding: 14, 
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ 
          padding: 14, 
          background: '#dcfce7',
          color: '#166534',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid #bbf7d0'
        }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar List */}
        <div style={{ 
          width: 320, 
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flexShrink: 0,
          maxHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            borderRadius: '12px 12px 0 0'
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              All Categories ({categories.length})
            </span>
            <button 
              onClick={newCategory} 
              style={{
                fontSize: 13,
                color: '#3b82f6',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                padding: '4px 8px',
                borderRadius: 4
              }}
              onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              + New
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                Loading...
              </div>
            ) : categories.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>No categories yet</div>
              </div>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 20px',
                    fontSize: 14,
                    borderBottom: '1px solid #f1f5f9',
                    background: form.id === cat.id ? '#eff6ff' : 'white',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => form.id !== cat.id && (e.target.style.background = '#f8fafc')}
                  onMouseLeave={(e) => form.id !== cat.id && (e.target.style.background = 'white')}
                >
                  <div style={{ 
                    fontWeight: form.id === cat.id ? 600 : 500, 
                    color: form.id === cat.id ? '#1e40af' : '#0f172a',
                    marginBottom: 4
                  }}>
                    {cat.categoryName}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {cat.gstRate}% • {cat.gstMasterCode} • {cat.supplyType === 'INTRA_STATE' ? 'Intra State' : 'Inter State'}
                    {!cat.active && <span style={{ marginLeft: 8, color: '#ef4444' }}>• Inactive</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ 
          flex: 1,
          background: 'white',
          borderRadius: 12,
          padding: 32,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            margin: '0 0 24px 0', 
            fontSize: 20, 
            fontWeight: 600,
            color: '#0f172a',
            paddingBottom: 16,
            borderBottom: '2px solid #e2e8f0'
          }}>
            {form.id ? 'Edit Category' : 'New Category'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#475569',
                marginBottom: 8 
              }}>
                Category Name *
              </label>
              <input
                required
                value={form.categoryName}
                onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                placeholder="e.g., GST 18%"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#475569',
                marginBottom: 8 
              }}>
                GST Rate (%) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.gstRate}
                onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                placeholder="18.00"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#475569',
                marginBottom: 8 
              }}>
                GST Master Code *
              </label>
              <select
                value={form.gstMasterCode}
                onChange={(e) => setForm({ ...form, gstMasterCode: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="CGST">CGST (Central GST)</option>
                <option value="SGST">SGST (State GST)</option>
                <option value="IGST">IGST (Integrated GST)</option>
                <option value="CESS">CESS</option>
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#475569',
                marginBottom: 8 
              }}>
                Supply Type *
              </label>
              <select
                value={form.supplyType}
                onChange={(e) => setForm({ ...form, supplyType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="INTRA_STATE">Intra State</option>
                <option value="INTER_STATE">Inter State</option>
              </select>
            </div>
          </div>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            fontSize: 14,
            color: '#475569',
            marginBottom: 24,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>Active</span>
          </label>

          <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            {form.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 8,
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !saving && (e.target.style.background = '#dc2626')}
                onMouseLeave={(e) => (e.target.style.background = '#ef4444')}
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !saving && (e.target.style.background = '#2563eb')}
              onMouseLeave={(e) => (e.target.style.background = '#3b82f6')}
            >
              {saving ? 'Saving...' : form.id ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
