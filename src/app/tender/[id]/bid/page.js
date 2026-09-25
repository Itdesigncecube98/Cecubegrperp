'use client';
import React, { useState, useEffect, use } from 'react';
import { Save, Briefcase } from 'lucide-react';

export default function TenderBid({ params }) {
  const unwrappedParams = use(params);
  const tenderId = unwrappedParams.id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    basicPrice: '',
    gstAmount: '',
    discount: '',
    freight: '',
    otherCharges: '',
    finalBidValue: '',
    paymentTerms: '',
    retention: '',
    ld: '',
    warranty: '',
    securityDeposit: '',
    performanceBg: '',
    emd: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/tender/${tenderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.bids) {
            setFormData({
              basicPrice: data.bids.basicPrice || '',
              gstAmount: data.bids.gstAmount || '',
              discount: data.bids.discount || '',
              freight: data.bids.freight || '',
              otherCharges: data.bids.otherCharges || '',
              finalBidValue: data.bids.finalBidValue || '',
              paymentTerms: data.bids.paymentTerms || '',
              retention: data.bids.retention || '',
              ld: data.bids.ld || '',
              warranty: data.bids.warranty || '',
              securityDeposit: data.bids.securityDeposit || '',
              performanceBg: data.bids.performanceBg || '',
              emd: data.bids.emd || ''
            });
          } else if (data.boqItems?.length > 0) {
              // Auto-fill basic price from BOQ client total if bid doesn't exist
              const total = data.boqItems.reduce((acc, item) => acc + (item.quantity * item.clientRate), 0);
              setFormData(prev => ({ ...prev, basicPrice: total }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [tenderId]);

  // Auto-calculate Final Bid Value
  useEffect(() => {
    const basic = parseFloat(formData.basicPrice) || 0;
    const gst = parseFloat(formData.gstAmount) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const freight = parseFloat(formData.freight) || 0;
    const other = parseFloat(formData.otherCharges) || 0;
    
    const final = (basic + gst + freight + other) - discount;
    setFormData(prev => ({ ...prev, finalBidValue: final.toString() }));
  }, [formData.basicPrice, formData.gstAmount, formData.discount, formData.freight, formData.otherCharges]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/tender/${tenderId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Bid Details Saved!');
      } else {
        alert('Failed to save bid details');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tnd-card">
      <form onSubmit={handleSubmit}>
        <div className="tnd-form-section">
          <h2 className="tnd-section-title"><Briefcase size={20} className="tnd-text-indigo-600" /> Commercial Bid Financials</h2>
          <div className="tnd-grid-3">
            <div className="tnd-form-group">
              <label className="tnd-label">Basic Price (₹) *</label>
              <input type="number" step="any" name="basicPrice" required value={formData.basicPrice} onChange={handleChange} className="tnd-input" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">GST Amount (₹)</label>
              <input type="number" step="any" name="gstAmount" value={formData.gstAmount} onChange={handleChange} className="tnd-input" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Discount (₹)</label>
              <input type="number" step="any" name="discount" value={formData.discount} onChange={handleChange} className="tnd-input" />
            </div>
          </div>
          <div className="tnd-grid-3">
            <div className="tnd-form-group">
              <label className="tnd-label">Freight (₹)</label>
              <input type="number" step="any" name="freight" value={formData.freight} onChange={handleChange} className="tnd-input" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Other Charges (₹)</label>
              <input type="number" step="any" name="otherCharges" value={formData.otherCharges} onChange={handleChange} className="tnd-input" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Final Bid Value (₹) *</label>
              <input type="number" step="any" name="finalBidValue" required readOnly value={formData.finalBidValue} className="tnd-input" style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', color: '#16a34a' }} />
            </div>
          </div>
        </div>

        <div className="tnd-form-section">
          <h2 className="tnd-section-title">Commercial Terms</h2>
          <div className="tnd-grid-2">
            <div className="tnd-form-group">
              <label className="tnd-label">Payment Terms</label>
              <textarea name="paymentTerms" rows="2" value={formData.paymentTerms} onChange={handleChange} className="tnd-textarea" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Retention Money</label>
              <textarea name="retention" rows="2" value={formData.retention} onChange={handleChange} className="tnd-textarea" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Liquidated Damages (LD)</label>
              <textarea name="ld" rows="2" value={formData.ld} onChange={handleChange} className="tnd-textarea" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Warranty / Defect Liability</label>
              <textarea name="warranty" rows="2" value={formData.warranty} onChange={handleChange} className="tnd-textarea" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Security Deposit / Performance BG</label>
              <textarea name="performanceBg" rows="2" value={formData.performanceBg} onChange={handleChange} className="tnd-textarea" />
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">EMD Details</label>
              <textarea name="emd" rows="2" value={formData.emd} onChange={handleChange} className="tnd-textarea" />
            </div>
          </div>
        </div>

        <div className="tnd-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} className="tnd-btn tnd-btn-primary">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Commercial Bid'}
          </button>
        </div>
      </form>
    </div>
  );
}
