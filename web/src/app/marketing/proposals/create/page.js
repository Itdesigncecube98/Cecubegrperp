'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateProposal() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [opportunities, setOpportunities] = useState([]);

  const [formData, setFormData] = useState({
    opportunityId: '',
    estimatedCost: '',
    quotedAmount: '',
    margin: '',
    discountType: 'amount',
    discount: '',
    finalAmount: '',
    paymentTerms: '',
    deliveryTerms: '',
    validity: '',
    status: 'Draft'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/marketing/opportunities?status=Open');
        if (res.ok) {
            const data = await res.json();
            // Filter out those that already have an approved proposal if needed, or just show Open ones
            setOpportunities(data);
        }
      } catch (err) {
        console.error('Failed to load opportunities', err);
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateFinal = () => {
    const q = parseFloat(formData.quotedAmount) || 0;
    const est = parseFloat(formData.estimatedCost) || 0;
    const d = parseFloat(formData.discount) || 0;
    
    const calculatedMargin = q - est;
    
    let final = q;
    if (formData.discountType === 'percentage') {
      final = q - (q * (d / 100));
    } else {
      final = q - d;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      margin: calculatedMargin.toString(),
      finalAmount: final.toString() 
    }));
  };

  useEffect(() => {
    calculateFinal();
  }, [formData.quotedAmount, formData.estimatedCost, formData.discount, formData.discountType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push('/marketing/proposals');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create proposal');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="mkt-page-container"><div className="mkt-loading"><div className="mkt-spinner"></div></div></div>;
  }

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">Create Proposal</h1>
          <p className="mkt-subtitle">Draft a new proposal or quotation for an opportunity</p>
        </div>
        <Link href="/marketing/proposals" className="mkt-btn mkt-btn-outline">
          <ArrowLeft size={16} /> Back to Proposals
        </Link>
      </div>

      <div className="mkt-card">
        <form onSubmit={handleSubmit}>
          <div className="mkt-form-section">
            <h2 className="mkt-section-title"><FileText size={20} className="mkt-text-indigo-600" /> General Info</h2>
            <div className="mkt-grid-2">
              <div className="mkt-form-group">
                <label className="mkt-label">Select Opportunity *</label>
                <select name="opportunityId" required value={formData.opportunityId} onChange={handleChange} className="mkt-select">
                  <option value="">-- Select Opportunity --</option>
                  {opportunities.map(opp => (
                    <option key={opp.id} value={opp.id}>
                      {opp.lead?.projectName || 'No Project Name'} - {opp.client?.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="mkt-select">
                  <option value="Draft">Draft</option>
                  <option value="Sent to Client">Sent to Client</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mkt-form-section">
            <h2 className="mkt-section-title">Financials</h2>
            <div className="mkt-grid-3">
              <div className="mkt-form-group">
                <label className="mkt-label">Internal Estimated Cost (₹) *</label>
                <input type="number" required name="estimatedCost" value={formData.estimatedCost} onChange={handleChange} className="mkt-input" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Quoted Amount to Client (₹) *</label>
                <input type="number" required name="quotedAmount" value={formData.quotedAmount} onChange={handleChange} className="mkt-input" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Expected Margin (₹)</label>
                <input type="number" name="margin" value={formData.margin} readOnly className="mkt-input" style={{ backgroundColor: '#f1f5f9' }} />
              </div>
            </div>
            <div className="mkt-grid-2">
              <div className="mkt-form-group">
                <label className="mkt-label">Discount</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="discountType" value={formData.discountType || 'amount'} onChange={handleChange} className="mkt-select" style={{ width: '130px' }}>
                    <option value="amount">Amount (₹)</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                  <input type="number" name="discount" value={formData.discount} onChange={handleChange} className="mkt-input" placeholder="0" style={{ flex: 1 }} />
                </div>
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Final Amount (₹) *</label>
                <input type="number" required name="finalAmount" value={formData.finalAmount} readOnly className="mkt-input" style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
              </div>
            </div>
          </div>

          <div className="mkt-form-section">
            <h2 className="mkt-section-title">Terms & Validity</h2>
            <div className="mkt-grid-2">
              <div className="mkt-form-group">
                <label className="mkt-label">Payment Terms</label>
                <textarea name="paymentTerms" rows="2" value={formData.paymentTerms} onChange={handleChange} className="mkt-textarea" placeholder="e.g. 50% advance, 50% on delivery" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Delivery Terms</label>
                <textarea name="deliveryTerms" rows="2" value={formData.deliveryTerms} onChange={handleChange} className="mkt-textarea" placeholder="e.g. Delivered within 4 weeks" />
              </div>
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Validity Date</label>
              <input type="date" name="validity" value={formData.validity} onChange={handleChange} className="mkt-input" style={{ maxWidth: '250px' }} />
            </div>
          </div>

          <div className="mkt-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="mkt-btn mkt-btn-primary">
              <Save size={16} /> {loading ? 'Saving...' : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
