'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateTender() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    tenderNo: '',
    referenceNo: '',
    title: '',
    tenderDate: '',
    source: '',
    authority: '',
    clientName: '',
    projectName: '',
    projectLocation: '',
    tenderType: '',
    tenderValue: '',
    publishedDate: '',
    preBidMeeting: '',
    bidSubLastDate: '',
    ownerId: ''
  });

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : data.employees || []);
        }
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    }
    loadEmployees();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/tender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newTender = await res.json();
        router.push(`/tender/${newTender.id}/evaluation`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create tender');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tnd-page-container">
      <div className="tnd-header">
        <div>
          <h1 className="tnd-title">New Tender</h1>
          <p className="tnd-subtitle">Register a new tender for evaluation</p>
        </div>
        <Link href="/tender/register" className="tnd-btn tnd-btn-outline">
          <ArrowLeft size={16} /> Back to Register
        </Link>
      </div>

      <div className="tnd-card">
        <form onSubmit={handleSubmit}>
          
          <div className="tnd-form-section">
            <h2 className="tnd-section-title"><FileText size={20} className="tnd-text-emerald-600" /> Basic Details</h2>
            <div className="tnd-grid-3">
              <div className="tnd-form-group">
                <label className="tnd-label">Tender Title *</label>
                <input type="text" name="title" required value={formData.title} onChange={handleChange} className="tnd-input" placeholder="e.g. Substation Construction" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Tender Reference No</label>
                <input type="text" name="referenceNo" value={formData.referenceNo} onChange={handleChange} className="tnd-input" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Tender Source</label>
                <input type="text" name="source" value={formData.source} onChange={handleChange} className="tnd-input" placeholder="e.g. E-Procurement Portal" />
              </div>
            </div>

            <div className="tnd-grid-3">
              <div className="tnd-form-group">
                <label className="tnd-label">Client Name *</label>
                <input type="text" name="clientName" required value={formData.clientName} onChange={handleChange} className="tnd-input" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Project Name *</label>
                <input type="text" name="projectName" required value={formData.projectName} onChange={handleChange} className="tnd-input" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Tender Type</label>
                <select name="tenderType" value={formData.tenderType} onChange={handleChange} className="tnd-select">
                  <option value="">Select Type</option>
                  <option value="Government">Government</option>
                  <option value="PSU">PSU</option>
                  <option value="Private">Private</option>
                  <option value="EPC">EPC</option>
                  <option value="Supply">Supply</option>
                  <option value="O&M">O&M</option>
                </select>
              </div>
            </div>
            
            <div className="tnd-grid-3">
              <div className="tnd-form-group">
                <label className="tnd-label">Estimated Value (₹)</label>
                <input type="number" name="tenderValue" value={formData.tenderValue} onChange={handleChange} className="tnd-input" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Owner (Assigned To)</label>
                <select name="ownerId" value={formData.ownerId} onChange={handleChange} className="tnd-select">
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Project Location</label>
                <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleChange} className="tnd-input" />
              </div>
            </div>
          </div>

          <div className="tnd-form-section">
            <h2 className="tnd-section-title">Critical Dates</h2>
            <div className="tnd-grid-3">
              <div className="tnd-form-group">
                <label className="tnd-label">Published Date</label>
                <input type="date" name="publishedDate" value={formData.publishedDate} onChange={handleChange} className="tnd-input" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Pre-Bid Meeting Date</label>
                <input type="date" name="preBidMeeting" value={formData.preBidMeeting} onChange={handleChange} className="tnd-input" />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Bid Submission Last Date *</label>
                <input type="date" name="bidSubLastDate" required value={formData.bidSubLastDate} onChange={handleChange} className="tnd-input" />
              </div>
            </div>
          </div>

          <div className="tnd-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="tnd-btn tnd-btn-primary">
              <Save size={16} /> {loading ? 'Saving...' : 'Register Tender'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
