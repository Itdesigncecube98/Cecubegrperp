'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    industry: '',
    address: '',
    gstNo: '',
    companyPan: '',
    nationality: '',
    state: '',
    previousBusinessHistory: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'companyPan' ? value.toUpperCase() : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push('/marketing/clients');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create customer');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">Add New Customer</h1>
          <p className="mkt-subtitle">Register a new client in the master database</p>
        </div>
        <Link href="/marketing/clients" className="mkt-btn mkt-btn-outline">
          <ArrowLeft size={16} /> Back to Master
        </Link>
      </div>

      <div className="mkt-card">
        <form onSubmit={handleSubmit}>
          <div className="mkt-form-section">
            <h2 className="mkt-section-title"><Building2 size={20} className="mkt-text-indigo-600" /> Company Details</h2>
            <div className="mkt-grid-3">
              <div className="mkt-form-group">
                <label className="mkt-label">Company Name *</label>
                <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} className="mkt-input" placeholder="e.g. Acme Corp" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Industry</label>
                <select name="industry" value={formData.industry} onChange={handleChange} className="mkt-select">
                  <option value="">Select Industry</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="IT/Technology">IT/Technology</option>
                  <option value="Construction">Construction</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">GST No.</label>
                <input type="text" name="gstNo" value={formData.gstNo} onChange={handleChange} className="mkt-input" placeholder="GSTIN" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Company PAN No.</label>
                <input type="text" name="companyPan" value={formData.companyPan} onChange={handleChange} className="mkt-input" placeholder="e.g. ABCDE1234F" maxLength={10} />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Nationality</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="mkt-input" placeholder="e.g. Indian" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} className="mkt-input" placeholder="State / Province" />
              </div>
            </div>
          </div>

          <div className="mkt-form-section">
            <h2 className="mkt-section-title">Contact Information</h2>
            <div className="mkt-grid-3">
              <div className="mkt-form-group">
                <label className="mkt-label">Contact Person</label>
                <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mkt-input" placeholder="Full Name" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Mobile</label>
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="mkt-input" placeholder="+91..." />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="mkt-input" placeholder="email@company.com" />
              </div>
            </div>
            <div className="mkt-form-group mkt-mt-4">
              <label className="mkt-label">Address</label>
              <textarea name="address" rows="2" value={formData.address} onChange={handleChange} className="mkt-textarea" placeholder="Full address..." />
            </div>
          </div>

          <div className="mkt-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="mkt-btn mkt-btn-primary">
              <Save size={16} /> {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
