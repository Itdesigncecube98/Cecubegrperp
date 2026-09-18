'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import Dialog from '@/components/Dialog';
import BrandFormModal from './BrandFormModal';
import BrandTable from './BrandTable';
import BrandToast from './BrandToast';
import { listBrands, removeBrand } from './brandApi';

export default function BrandMaster() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState({ open: false, brand: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setBrands(await listBrands());
    } catch (error) {
      setLoadError(error.message || 'Failed to load brands.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dismissToast = useCallback(() => setToast(null), []);

  const filteredBrands = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return brands;

    return brands.filter((brand) =>
      (brand.name || '').toLowerCase().includes(query) ||
      (brand.status || '').toLowerCase().includes(query)
    );
  }, [brands, searchTerm]);

  const closeForm = useCallback(() => setFormState({ open: false, brand: null }), []);

  const handleSaved = useCallback((message) => {
    setFormState({ open: false, brand: null });
    setToast({ type: 'success', message });
    load();
  }, [load]);

  const closeDeleteDialog = useCallback(() => {
    setDeleting((isDeleting) => {
      if (!isDeleting) setDeleteTarget(null);
      return isDeleting;
    });
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await removeBrand(deleteTarget.id);
      setToast({ type: 'success', message: `Brand "${deleteTarget.name}" deleted successfully.` });
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Failed to delete brand.' });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Brand Master</h1>
          <p className="pur-subtitle">Manage product brands used across purchase and inventory</p>
        </div>
        <button
          type="button"
          className="pur-btn pur-btn-primary"
          style={{ backgroundColor: '#f59e0b' }}
          onClick={() => setFormState({ open: true, brand: null })}
        >
          <Plus size={16} /> New Brand
        </button>
      </div>

      <div className="pur-card">
        <div className="pur-toolbar">
          <div className="pur-search">
            <Search className="pur-search-icon" size={16} />
            <input
              type="text"
              className="pur-search-input"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="pur-flex pur-items-center pur-gap-2">
            <span className="pur-text-xs pur-text-muted">
              Showing {filteredBrands.length} of {brands.length}
            </span>
            <button type="button" className="pur-icon-btn" title="Refresh list" onClick={load}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {loadError ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p className="pur-text-danger pur-font-medium" style={{ marginBottom: '14px' }}>{loadError}</p>
            <button type="button" className="pur-btn pur-btn-outline" onClick={load}>
              <RefreshCw size={15} /> Try Again
            </button>
          </div>
        ) : (
          <BrandTable
            brands={filteredBrands}
            loading={loading}
            onEdit={(brand) => setFormState({ open: true, brand })}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      <BrandFormModal
        isOpen={formState.open}
        brand={formState.brand}
        onClose={closeForm}
        onSaved={handleSaved}
      />

      <Dialog
        isOpen={Boolean(deleteTarget)}
        type="confirm"
        title="Delete Brand"
        message={
          deleting
            ? 'Deleting brand...'
            : `Are you sure you want to delete "${deleteTarget?.name || ''}"? This action cannot be undone.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
      />

      <BrandToast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
