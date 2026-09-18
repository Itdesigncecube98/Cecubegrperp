'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Save, X, Star, Edit2, Trash2 } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function VendorMaster() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deletingVendor, setDeletingVendor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'Supplier', contactPerson: '', mobile: '', email: '',
    address: '', city: '', state: '', gstin: '', pan: '', msmeStatus: false,
    bankName: '', accountNo: '', ifsc: '', paymentTerms: '', creditDays: 0, category: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/purchase/vendors');
      if (res.ok) setVendors(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'Supplier', contactPerson: '', mobile: '', email: '',
      address: '', city: '', state: '', gstin: '', pan: '', msmeStatus: false,
      bankName: '', accountNo: '', ifsc: '', paymentTerms: '', creditDays: 0, category: ''
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingVendor(null);
    setShowAddModal(true);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '', type: vendor.type || 'Supplier', contactPerson: vendor.contactPerson || '',
      mobile: vendor.mobile || '', email: vendor.email || '', address: vendor.address || '',
      city: vendor.city || '', state: vendor.state || '', gstin: vendor.gstin || '', pan: vendor.pan || '',
      msmeStatus: Boolean(vendor.msmeStatus), bankName: vendor.bankName || '', accountNo: vendor.accountNo || '',
      ifsc: vendor.ifsc || '', paymentTerms: vendor.paymentTerms || '', creditDays: vendor.creditDays || 0,
      category: vendor.category || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchase/vendors', {
        method: editingVendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVendor ? { ...formData, id: editingVendor.id } : formData)
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchData(); // Refresh list
        setEditingVendor(null);
        resetForm();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save vendor');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVendor) return;
    try {
      const res = await fetch('/api/purchase/vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingVendor.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete vendor');
      }
      setDeletingVendor(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete vendor');
      setDeletingVendor(null);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.vendorCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Vendor Master</h1>
          <p className="pur-subtitle">Manage suppliers and service providers</p>
        </div>
        <button onClick={openCreateModal} className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
          <Plus size={16} /> New Vendor
        </button>
      </div>

      <div className="pur-card">
        <div className="pur-toolbar">
          <div className="pur-search">
            <Search className="pur-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search vendors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pur-search-input"
            />
          </div>
        </div>

        <div className="pur-table-wrapper">
          {loading ? (
            <div className="pur-loading"><div className="pur-spinner"></div></div>
          ) : (
            <table className="pur-table">
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Name & Contact</th>
                  <th>Category</th>
                  <th>Payment Terms</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th className="pur-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map(v => (
                  <tr key={v.id}>
                    <td className="pur-font-semibold">{v.vendorCode}</td>
                    <td>
                      <div className="pur-font-medium">{v.name}</div>
                      <div className="pur-text-xs pur-text-muted">{v.contactPerson} | {v.mobile}</div>
                    </td>
                    <td>{v.category || '-'}</td>
                    <td>
                      <div>{v.paymentTerms || '-'}</div>
                      <div className="pur-text-xs pur-text-muted">{v.creditDays} days credit</div>
                    </td>
                    <td>
                      <div className="pur-flex pur-items-center pur-gap-2">
                        <Star size={14} className={v.rating > 0 ? "pur-text-amber-500" : "pur-text-slate-300"} fill={v.rating > 0 ? "#f59e0b" : "none"} />
                        <span className="pur-font-medium">{v.rating > 0 ? v.rating.toFixed(1) : 'New'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pur-badge ${v.status === 'Active' ? 'pur-badge-emerald' : 'pur-badge-red'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="pur-text-right">
                      <button type="button" className="pur-icon-btn" title="Edit vendor" onClick={() => openEditModal(v)}>
                        <Edit2 size={16} />
                      </button>
                      <button type="button" className="pur-icon-btn pur-text-danger" title="Delete vendor" onClick={() => setDeletingVendor(v)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan="7" className="pur-text-center pur-text-muted pur-py-8">No vendors found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
              <h2 className="pur-section-title" style={{ margin: 0 }}>{editingVendor ? 'Edit Vendor' : 'Register New Vendor'}</h2>
              <button onClick={() => setShowAddModal(false)} className="pur-icon-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              
              <h3 className="pur-font-semibold pur-mb-4 pur-text-indigo-600">Basic Information</h3>
              <div className="pur-grid-3">
                <div className="pur-form-group">
                  <label className="pur-label">Company Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Vendor Type</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="pur-select">
                    <option value="Supplier">Supplier</option>
                    <option value="Service Provider">Service Provider</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Consultant">Consultant</option>
                  </select>
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="pur-select">
                    <option value="">Select Category</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil">Civil</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="IT">IT</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="pur-grid-3">
                <div className="pur-form-group">
                  <label className="pur-label">Contact Person</label>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Mobile No *</label>
                  <input type="text" name="mobile" required value={formData.mobile} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="pur-input" />
                </div>
              </div>

              <h3 className="pur-font-semibold pur-mb-4 pur-text-indigo-600 pur-mt-1">Compliance & Commercial</h3>
              <div className="pur-grid-3">
                <div className="pur-form-group">
                  <label className="pur-label">GSTIN</label>
                  <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">PAN</label>
                  <input type="text" name="pan" value={formData.pan} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group pur-flex pur-items-center" style={{ paddingTop: '28px' }}>
                  <input type="checkbox" name="msmeStatus" checked={formData.msmeStatus} onChange={handleChange} style={{ marginRight: '8px' }} />
                  <label className="pur-label" style={{ marginBottom: 0 }}>Registered under MSME</label>
                </div>
              </div>

              <div className="pur-grid-2">
                <div className="pur-form-group">
                  <label className="pur-label">Standard Payment Terms</label>
                  <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="pur-input" placeholder="E.g. 30 Days after GRN" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Credit Days</label>
                  <input type="number" name="creditDays" value={formData.creditDays} onChange={handleChange} className="pur-input" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="pur-btn pur-btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                  <Save size={16} /> {submitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog
        isOpen={Boolean(deletingVendor)}
        type="confirm"
        title="Delete Vendor"
        message={`Are you sure you want to delete ${deletingVendor?.name || 'this vendor'}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingVendor(null)}
      />
    </div>
  );
}
