'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, FileText, ShoppingCart, IndianRupee } from 'lucide-react';
import Link from 'next/link';

export default function CreatePO() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [prs, setPrs] = useState([]);
  const [projects, setProjects] = useState([]);

  const [formData, setFormData] = useState({
    vendorId: '',
    indentId: '',
    project: '',
    site: '',
    currency: 'INR',
    deliveryLoc: '',
    expectedDate: '',
    paymentTerms: '',
    warranty: '',
    deliveryTerms: '',
    
    discount: 0,
    gstAmount: 0,
    freight: 0,
    otherCharges: 0
  });

  const [items, setItems] = useState([
    { item: '', specification: '', quantity: '', rate: '', itemDiscount: 0, gstPercent: 18 }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [vRes, pRes, projectRes] = await Promise.all([
          fetch('/api/purchase/vendors'),
          fetch('/api/purchase/pr'), // In a real app, only Approved PRs
          fetch('/api/projects')
        ]);
        if (vRes.ok) setVendors(await vRes.json());
        if (pRes.ok) setPrs(await pRes.json());
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProjects(Array.isArray(projectData) ? projectData : []);
        }
      } catch (err) {
        console.error('Failed to load dropdown data', err);
      }
    }
    loadData();
  }, []);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index][name] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { item: '', specification: '', quantity: '', rate: '', itemDiscount: 0, gstPercent: 18 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculate totals
  const basicTotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)), 0);
  const itemsDiscountTotal = items.reduce((sum, item) => sum + parseFloat(item.itemDiscount || 0), 0);
  const taxableTotal = basicTotal - itemsDiscountTotal - parseFloat(formData.discount || 0);
  
  // Calculate GST (simplistic approach based on header or items. Here we just use the formData.gstAmount directly as an input for MVP, or we can compute it)
  const gstCalculated = items.reduce((sum, item) => {
    const itemTaxable = (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)) - parseFloat(item.itemDiscount || 0);
    return sum + (itemTaxable * (parseFloat(item.gstPercent || 0) / 100));
  }, 0);

  const grandTotal = taxableTotal + gstCalculated + parseFloat(formData.freight || 0) + parseFloat(formData.otherCharges || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        gstAmount: gstCalculated.toFixed(2),
        items,
        createdById: JSON.parse(localStorage.getItem('employeeData'))?.id || null
      };

      const res = await fetch('/api/purchase/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/purchase/po');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create PO');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Create Purchase Order</h1>
          <p className="pur-subtitle">Generate a new commercial order</p>
        </div>
        <Link href="/purchase/po" className="pur-btn pur-btn-outline">
          <ArrowLeft size={16} /> Back to Register
        </Link>
      </div>

      <div className="pur-card">
        <form onSubmit={handleSubmit}>
          
          <div className="pur-form-section">
            <h2 className="pur-section-title"><ShoppingCart size={20} className="pur-text-amber-600" /> General Information</h2>
            
            <div className="pur-grid-3">
              <div className="pur-form-group">
                <label className="pur-label">Vendor / Supplier *</label>
                <select name="vendorId" required value={formData.vendorId} onChange={handleHeaderChange} className="pur-select">
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                  ))}
                </select>
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Link PR (Optional)</label>
                <select name="indentId" value={formData.indentId} onChange={handleHeaderChange} className="pur-select">
                  <option value="">Direct PO (No PR)</option>
                  {prs.map(pr => (
                    <option key={pr.id} value={pr.id}>{pr.prNo} - {pr.project}</option>
                  ))}
                </select>
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Engineering Project *</label>
                <select name="project" required value={formData.project} onChange={handleHeaderChange} className="pur-select">
                  <option value="">-- Select Engineering Project --</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.name}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pur-grid-3">
              <div className="pur-form-group">
                <label className="pur-label">Delivery Location</label>
                <input type="text" name="deliveryLoc" value={formData.deliveryLoc} onChange={handleHeaderChange} className="pur-input" placeholder="E.g. Site Store" />
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Expected Delivery Date</label>
                <input type="date" name="expectedDate" value={formData.expectedDate} onChange={handleHeaderChange} className="pur-input" />
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Payment Terms</label>
                <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleHeaderChange} className="pur-input" placeholder="E.g. 30 Days Credit" />
              </div>
            </div>
          </div>

          <div className="pur-form-section">
            <div className="pur-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="pur-section-title" style={{ margin: 0 }}>Line Items</h2>
              <button type="button" onClick={addItem} className="pur-btn pur-btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
            
            <div className="pur-table-wrapper" style={{ overflow: 'visible' }}>
              <table className="pur-table" style={{ border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th>Item Description *</th>
                    <th style={{ width: '100px' }}>Qty *</th>
                    <th style={{ width: '120px' }}>Rate (₹) *</th>
                    <th style={{ width: '100px' }}>Disc (₹)</th>
                    <th style={{ width: '100px' }}>GST %</th>
                    <th style={{ width: '120px' }}>Amount (₹)</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amt = (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)) - parseFloat(item.itemDiscount || 0);
                    return (
                      <tr key={index}>
                        <td style={{ padding: '8px' }}>
                          <input type="text" name="item" required value={item.item} onChange={(e) => handleItemChange(index, e)} className="pur-input" placeholder="Name" />
                          <input type="text" name="specification" value={item.specification} onChange={(e) => handleItemChange(index, e)} className="pur-input" placeholder="Spec/Make" style={{ marginTop: '4px', fontSize: '0.75rem' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="number" step="any" name="quantity" required value={item.quantity} onChange={(e) => handleItemChange(index, e)} className="pur-input" />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="number" step="any" name="rate" required value={item.rate} onChange={(e) => handleItemChange(index, e)} className="pur-input" />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="number" step="any" name="itemDiscount" value={item.itemDiscount} onChange={(e) => handleItemChange(index, e)} className="pur-input" />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select name="gstPercent" value={item.gstPercent} onChange={(e) => handleItemChange(index, e)} className="pur-select">
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px', verticalAlign: 'middle', fontWeight: '500' }}>
                          ₹{amt.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="pur-icon-btn pur-text-danger">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pur-form-section">
            <h2 className="pur-section-title"><IndianRupee size={20} className="pur-text-amber-600" /> Commercials & Totals</h2>
            <div className="pur-flex" style={{ gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <div className="pur-form-group">
                  <label className="pur-label">Warranty Terms</label>
                  <textarea name="warranty" rows="2" value={formData.warranty} onChange={handleHeaderChange} className="pur-textarea" />
                </div>
                <div className="pur-form-group">
                  <label className="pur-label">Delivery Terms / Other Conditions</label>
                  <textarea name="deliveryTerms" rows="2" value={formData.deliveryTerms} onChange={handleHeaderChange} className="pur-textarea" />
                </div>
              </div>
              
              <div style={{ width: '350px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div className="pur-flex" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="pur-text-muted">Basic Value:</span>
                  <span className="pur-font-medium">₹{basicTotal.toFixed(2)}</span>
                </div>
                <div className="pur-flex" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="pur-text-muted">Item Discount:</span>
                  <span className="pur-font-medium pur-text-danger">- ₹{itemsDiscountTotal.toFixed(2)}</span>
                </div>
                <div className="pur-flex pur-items-center" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="pur-text-muted">Lumpsum Discount:</span>
                  <input type="number" step="any" name="discount" value={formData.discount} onChange={handleHeaderChange} className="pur-input" style={{ width: '100px', padding: '4px 8px', textAlign: 'right' }} />
                </div>
                <div className="pur-flex" style={{ justifyContent: 'space-between', marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <span className="pur-font-medium">Taxable Value:</span>
                  <span className="pur-font-semibold">₹{taxableTotal.toFixed(2)}</span>
                </div>
                <div className="pur-flex pur-items-center" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="pur-text-muted">GST Amount:</span>
                  <input type="number" step="any" name="gstAmount" value={formData.gstAmount} onChange={handleHeaderChange} className="pur-input" style={{ width: '100px', padding: '4px 8px', textAlign: 'right' }} />
                </div>
                <div className="pur-flex pur-items-center" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="pur-text-muted">Freight & P&F:</span>
                  <input type="number" step="any" name="freight" value={formData.freight} onChange={handleHeaderChange} className="pur-input" style={{ width: '100px', padding: '4px 8px', textAlign: 'right' }} />
                </div>
                <div className="pur-flex pur-items-center" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="pur-text-muted">Other Charges:</span>
                  <input type="number" step="any" name="otherCharges" value={formData.otherCharges} onChange={handleHeaderChange} className="pur-input" style={{ width: '100px', padding: '4px 8px', textAlign: 'right' }} />
                </div>
                
                <div className="pur-flex" style={{ justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #cbd5e1' }}>
                  <span className="pur-font-bold" style={{ fontSize: '1.1rem' }}>Grand Total:</span>
                  <span className="pur-font-bold pur-text-indigo-600" style={{ fontSize: '1.1rem' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pur-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => router.push('/purchase/po')} className="pur-btn pur-btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
              <Save size={16} /> {loading ? 'Saving...' : 'Create Draft PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
