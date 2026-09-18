'use client';
import React from 'react';
import { Pencil, Tag, Trash2 } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function BrandTable({ brands, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="pur-loading">
        <div className="pur-spinner"></div>
      </div>
    );
  }

  return (
    <div className="pur-table-wrapper">
      <table className="pur-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>#</th>
            <th>Brand Name</th>
            <th style={{ width: '140px' }}>Status</th>
            <th style={{ width: '180px' }}>Created On</th>
            <th className="pur-text-right" style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand, index) => (
            <tr key={brand.id}>
              <td className="pur-text-muted">{index + 1}</td>
              <td>
                <div className="pur-flex pur-items-center pur-gap-2">
                  <Tag size={15} color="#f59e0b" />
                  <span className="pur-font-medium">{brand.name}</span>
                </div>
              </td>
              <td>
                <span className={`pur-badge ${brand.status === 'Inactive' ? 'pur-badge-slate' : 'pur-badge-emerald'}`}>
                  {brand.status || 'Active'}
                </span>
              </td>
              <td className="pur-text-muted">{formatDate(brand.createdAt)}</td>
              <td className="pur-text-right">
                <button
                  type="button"
                  className="pur-icon-btn"
                  title={`Edit ${brand.name}`}
                  aria-label={`Edit ${brand.name}`}
                  onClick={() => onEdit(brand)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="pur-icon-btn pur-text-danger"
                  title={`Delete ${brand.name}`}
                  aria-label={`Delete ${brand.name}`}
                  onClick={() => onDelete(brand)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {brands.length === 0 && (
            <tr>
              <td colSpan="5">
                <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                  <Tag size={32} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <div className="pur-font-medium" style={{ color: '#334155' }}>No brands found</div>
                  <div className="pur-text-xs pur-text-muted" style={{ marginTop: '4px' }}>
                    Add your first brand to start building the brand master.
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
