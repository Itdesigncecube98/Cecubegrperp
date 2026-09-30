'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Save, X, Star, Edit2, Trash2, Mail } from 'lucide-react';
import Dialog from '@/components/Dialog';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';
import { getClientActor } from '@/lib/clientActor';

export default function VendorMaster() {
  const { activeEmployee, activeProject, hasRight } = usePermissions();
  const can = name => !activeEmployee || (!!activeProject && hasRight(employeeToolCode('Purchase', name)));
  const canViewVendors = can('Vendor Master View') || can('Vendor Master Create') || can('Vendor Master Edit') || can('Vendor Master Approve') || can('Send Vendor Master by Email');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deletingVendor, setDeletingVendor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState('');

  const sendVendorEmail = async vendor => {
    setSendingId(vendor.id);
    try {
      const response = await fetch('/api/documents/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentType: 'vendor-master', id: vendor.id, sentBy: getClientActor() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to email vendor details.');
      alert(result.mocked ? `Email is configured in demo mode for ${result.recipient}.` : `Vendor details emailed to ${result.recipient}.`);
    } catch (error) { alert(error.message); }
    finally { setSendingId(''); }
  };

  const approveVendor = async vendor => {
    const response = await fetch('/api/purchase/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vendor.id, action: 'approve' }) });
    if (!response.ok) { const result = await response.json(); alert(result.error || 'Unable to approve vendor.'); return; }
    fetchData();
  };

  const [formData, setFormData] = useState({
    name: '', type: 'Supplier', contactPerson: '', mobile: '', email: '',
    whatsappNo: '', address: '', godownAddress: '', city: '', state: '', gstin: '', pan: '', msmeStatus: false,
    bankName: '', accountName: '', accountNo: '', ifsc: '', paymentTerms: '', creditDays: 0, category: '', fixedGroup: '', documents: []
  });
  const [documentFiles, setDocumentFiles] = useState([]);

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

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'Supplier', contactPerson: '', mobile: '', email: '',
      whatsappNo: '', address: '', godownAddress: '', city: '', state: '', gstin: '', pan: '', msmeStatus: false,
      bankName: '', accountName: '', accountNo: '', ifsc: '', paymentTerms: '', creditDays: 0, category: '', fixedGroup: '', documents: []
    });
    setDocumentFiles([]);
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
      whatsappNo: vendor.whatsappNo || '', godownAddress: vendor.godownAddress || '', city: vendor.city || '', state: vendor.state || '', gstin: vendor.gstin || '', pan: vendor.pan || '',
      msmeStatus: Boolean(vendor.msmeStatus), bankName: vendor.bankName || '', accountNo: vendor.accountNo || '',
      accountName: vendor.accountName || '', ifsc: vendor.ifsc || '', paymentTerms: vendor.paymentTerms || '', creditDays: vendor.creditDays || 0,
      category: vendor.category || '', fixedGroup: vendor.fixedGroup || '', documents: Array.isArray(vendor.documents) ? vendor.documents : []
    });
    setDocumentFiles([]);
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const uploadedDocuments = await Promise.all(documentFiles.map(async file => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const result = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(result.error || `Failed to upload ${file.name}`);
        return { name: file.name, type: file.type, url: result.url };
      }));
      const documents = [...(formData.documents || []), ...uploadedDocuments];
      const payload = { ...formData, documents, status: editingVendor?.status || (activeEmployee ? 'Pending Approval' : 'Active') };
      const res = await fetch('/api/purchase/vendors', {
        method: editingVendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVendor ? { ...payload, id: editingVendor.id } : payload)
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
        {can('Vendor Master Create') && <button onClick={openCreateModal} className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
          <Plus size={16} /> New Vendor
        </button>}
      </div>

      {canViewVendors ? <div className="pur-card">
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
                      {can('Vendor Master Edit') && <button type="button" className="pur-icon-btn" title="Edit vendor" onClick={() => openEditModal(v)}>
                        <Edit2 size={16} />
                      </button>}
                      {can('Send Vendor Master by Email') && <button type="button" className="pur-icon-btn" title="Email vendor details" disabled={sendingId === v.id || !v.email} onClick={() => sendVendorEmail(v)}><Mail size={15} /></button>}
                      {can('Vendor Master Approve') && v.status === 'Pending Approval' && <button type="button" className="pur-btn pur-btn-outline" onClick={() => approveVendor(v)}>Approve</button>}
                      {can('Vendor Master Edit') && <button type="button" className="pur-icon-btn pur-text-danger" title="Delete vendor" onClick={() => setDeletingVendor(v)}>
                        <Trash2 size={16} />
                      </button>}
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
      </div> : <div className="pur-card pur-text-center pur-text-muted pur-py-8">You need Vendor Master View access to see vendor records.</div>}

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
                  <label className="pur-label">WhatsApp No.</label>
                  <input type="text" name="whatsappNo" value={formData.whatsappNo} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="pur-input" />
                </div>
              </div>

              <div className="pur-grid-2">
                <div className="pur-form-group">
                  <label className="pur-label">Registered Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="pur-input" rows={3} />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Godown Address</label>
                  <textarea name="godownAddress" value={formData.godownAddress} onChange={handleChange} className="pur-input" rows={3} />
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
                  <label className="pur-label">Account Name</label>
                  <input type="text" name="accountName" value={formData.accountName} onChange={handleChange} className="pur-input" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Standard Payment Terms</label>
                  <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="pur-input" placeholder="E.g. 30 Days after GRN" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Credit Days</label>
                  <input type="number" name="creditDays" value={formData.creditDays} onChange={handleChange} className="pur-input" />
                </div>
              </div>

              <div className="pur-grid-2">
                <div className="pur-form-group">
                  <label className="pur-label">Fixed Group</label>
                  <input type="text" name="fixedGroup" value={formData.fixedGroup} onChange={handleChange} className="pur-input" placeholder="e.g. Electrical Vendors" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Documents</label>
                  <input type="file" multiple onChange={e => setDocumentFiles(Array.from(e.target.files || []))} className="pur-input" />
                  {formData.documents?.length > 0 && <div className="pur-text-xs pur-text-muted">{formData.documents.length} document(s) already uploaded</div>}
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
