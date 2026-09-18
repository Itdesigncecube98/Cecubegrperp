'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Home, ChevronRight, MessageSquare, Save, RefreshCw, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import '../../purchase.css';
import { createEnquiry, listIndents, listVendors } from '../rfqApi';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  rfqDate: today(),
  dueDate: '',
  expiryDate: '',
  paymentTerms: '',
  deliveryTerms: '',
  warranty: '',
  specialCond: ''
};

export default function EnquiryGeneration() {
  const [indents, setIndents] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [indentSearch, setIndentSearch] = useState('');
  const [selectedIndentId, setSelectedIndentId] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedRfq, setSavedRfq] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [indentList, vendorList] = await Promise.all([listIndents(), listVendors()]);
        if (!active) return;
        setIndents(indentList);
        setVendors(vendorList.filter((vendor) => vendor.status !== 'Inactive'));
      } catch (error) {
        if (active) setLoadError(error.message || 'Failed to load data.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedIndent = useMemo(
    () => indents.find((indent) => indent.id === selectedIndentId) || null,
    [indents, selectedIndentId]
  );

  const filteredIndents = useMemo(() => {
    const query = indentSearch.trim().toLowerCase();
    if (!query) return indents;
    return indents.filter((indent) =>
      [indent.prNo, indent.project, indent.department, indent.purpose]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [indents, indentSearch]);

  const toggleVendor = (vendorId) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selectedIndentId) {
      setSaveError('Select a purchase indent to raise the enquiry against.');
      return;
    }
    if (selectedVendorIds.length === 0) {
      setSaveError('Select at least one vendor to send this enquiry to.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSavedRfq(null);

    try {
      const rfq = await createEnquiry({
        indentId: selectedIndentId,
        project: selectedIndent?.project || '',
        vendorIds: selectedVendorIds,
        ...form
      });

      setSavedRfq(rfq);
      setSelectedVendorIds([]);
      setForm((prev) => ({ ...EMPTY_FORM, rfqDate: prev.rfqDate }));
    } catch (error) {
      setSaveError(error.message || 'Failed to save the enquiry.');
    } finally {
      setSaving(false);
    }
  };

  const materials = selectedIndent?.items || [];

  return (
    <div className="purchase-container">
      <div className="purchase-header">
        <div className="purchase-header-title">
          <MessageSquare size={18} />
          Enquiry Generation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry Generation
        </div>
      </div>

      {loadError && (
        <div className="purchase-card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertCircle size={16} /> {loadError}
          </div>
        </div>
      )}

      {savedRfq && (
        <div className="purchase-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
            <CheckCircle2 size={16} />
            Enquiry <strong>{savedRfq.rfqNo}</strong> created and sent to {savedRfq.vendors?.length || 0} vendor(s).
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="purchase-card" style={{ marginBottom: '24px' }}>
          <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronRight size={16} /> Purchase Indent (PR)
          </div>
          <div className="purchase-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Search PR
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="purchase-input"
                    placeholder="PR number, project..."
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={indentSearch}
                    onChange={(event) => setIndentSearch(event.target.value)}
                  />
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Purchase Indent <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="purchase-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={selectedIndentId}
                  onChange={(event) => setSelectedIndentId(event.target.value)}
                >
                  <option value="">{loading ? 'Loading indents...' : 'Select Purchase Indent'}</option>
                  {filteredIndents.map((indent) => (
                    <option key={indent.id} value={indent.id}>
                      {indent.prNo} — {indent.project || 'No project'} ({indent.items?.length || 0} items)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="purchase-card" style={{ marginBottom: '24px' }}>
          <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
            <MessageSquare size={16} /> Enquiry Details
          </div>
          <div className="purchase-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Enquiry No.</label>
                <input type="text" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value="Auto Generated" readOnly disabled />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Enquiry Date</label>
                <input type="date" name="rfqDate" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.rfqDate} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Due Date</label>
                <input type="date" name="dueDate" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.dueDate} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Expiry Date</label>
                <input type="date" name="expiryDate" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.expiryDate} onChange={handleChange} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Payment Terms</label>
                <input type="text" name="paymentTerms" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.paymentTerms} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Delivery Terms</label>
                <input type="text" name="deliveryTerms" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.deliveryTerms} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Warranty</label>
                <input type="text" name="warranty" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.warranty} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Special Conditions</label>
                <input type="text" name="specialCond" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.specialCond} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="purchase-card" style={{ marginBottom: '24px' }}>
          <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
            <MessageSquare size={16} /> Materials to Enquire ({materials.length})
          </div>
          <div className="purchase-card-body" style={{ padding: 0 }}>
            <div className="purchase-table-wrapper" style={{ marginTop: 0, border: 'none', borderRadius: 0 }}>
              <table className="purchase-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Sr.No.</th>
                    <th>Material</th>
                    <th>Unit</th>
                    <th>Specification</th>
                    <th style={{ textAlign: 'right' }}>Reqd Qty</th>
                    <th>Required By</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td style={{ color: '#0284c7', fontWeight: 500 }}>{item.item}</td>
                      <td>{item.unit}</td>
                      <td>{item.specification || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td>{item.requiredDate ? new Date(item.requiredDate).toLocaleDateString('en-IN') : '-'}</td>
                    </tr>
                  ))}
                  {!loading && materials.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
                        {selectedIndentId ? 'This indent has no materials.' : 'Select a purchase indent to list its materials.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="purchase-card">
          <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
            <MessageSquare size={16} /> Send Enquiry To ({selectedVendorIds.length} selected)
          </div>
          <div className="purchase-card-body">
            {vendors.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                No vendors available. Add vendors in Vendor Master first.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                {vendors.map((vendor) => (
                  <label
                    key={vendor.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: selectedVendorIds.includes(vendor.id) ? '1px solid #17a2b8' : '1px solid #e2e8f0',
                      background: selectedVendorIds.includes(vendor.id) ? '#f0f9ff' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ accentColor: '#17a2b8' }}
                      checked={selectedVendorIds.includes(vendor.id)}
                      onChange={() => toggleVendor(vendor.id)}
                    />
                    <span style={{ flex: 1 }}>
                      {vendor.name}
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                        {vendor.vendorCode} {vendor.category ? `• ${vendor.category}` : ''}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {saveError && (
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
                <AlertCircle size={15} /> {saveError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setSelectedIndentId('');
                  setSelectedVendorIds([]);
                  setSaveError('');
                  setSavedRfq(null);
                }}
              >
                <RefreshCw size={14} /> Reset
              </button>
              <button type="submit" className="btn-cyan" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px' }}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Enquiry'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
