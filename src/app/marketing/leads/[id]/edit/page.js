'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, UserCircle, Building2, Briefcase } from 'lucide-react';

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    leadSource: 'Website',
    leadType: 'Cold',
    leadOwnerId: '',
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    location: '',
    industry: 'Construction',
    gstNo: '',
    projectName: '',
    projectLocation: '',
    projectType: 'Commercial',
    requirement: '',
    estimatedProjectValue: '',
    expectedClosingDate: '',
    competitor: '',
    remarks: '',
    documents: []
  });

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const uploaded = await Promise.all(files.map(async (file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      data: await toBase64(file),
      uploadedAt: new Date().toISOString()
    })));

    setFormData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), ...uploaded]
    }));

    e.target.value = '';
  };

  const removeDocument = (docId) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(doc => doc.id !== docId)
    }));
  };

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        const [empRes, leadRes] = await Promise.all([
          fetch('/api/employees'),
          fetch(`/api/marketing/leads/${id}`)
        ]);

        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(Array.isArray(empData) ? empData : []);
        }

        if (leadRes.ok) {
          const lead = await leadRes.json();
          setFormData({
            leadSource: lead.leadSource || 'Website',
            leadType: lead.leadType || 'Cold',
            leadOwnerId: lead.leadOwnerId || '',
            companyName: lead.companyName || '',
            contactPerson: lead.contactPerson || '',
            mobile: lead.mobile || '',
            email: lead.email || '',
            location: lead.location || '',
            industry: lead.industry || 'Construction',
            gstNo: lead.gstNo || '',
            projectName: lead.projectName || '',
            projectLocation: lead.projectLocation || '',
            projectType: lead.projectType || 'Commercial',
            requirement: lead.requirement || '',
            estimatedProjectValue: lead.estimatedProjectValue ?? '',
            expectedClosingDate: lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toISOString().split('T')[0] : '',
            competitor: lead.competitor || '',
            remarks: lead.remarks || '',
            documents: Array.isArray(lead.documents) ? lead.documents : []
          });
        }
      } catch (error) {
        console.error('Failed to load lead for editing', error);
      } finally {
        setFetching(false);
      }
    }

    loadData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/marketing/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update lead');
      }

      router.push('/marketing/leads');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to update lead');
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
          <h1 className="mkt-title">Edit Lead</h1>
          <p className="mkt-subtitle">Update lead information and attach supporting client files.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mkt-card">
        <div className="mkt-form-section">
          <h2 className="mkt-section-title"><UserCircle color="#4f46e5" size={20} /> Basic Information</h2>
          <div className="mkt-grid-3">
            <div className="mkt-form-group">
              <label className="mkt-label">Lead Source <span className="mkt-text-danger">*</span></label>
              <select name="leadSource" value={formData.leadSource} onChange={handleChange} className="mkt-select" required>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Tender Portal">Tender Portal</option>
                <option value="Existing Client">Existing Client</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Lead Type</label>
              <select name="leadType" value={formData.leadType} onChange={handleChange} className="mkt-select">
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Lead Owner <span className="mkt-text-danger">*</span></label>
              <select name="leadOwnerId" value={formData.leadOwnerId} onChange={handleChange} className="mkt-select" required>
                <option value="">Select Owner</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mkt-form-section" style={{ backgroundColor: '#f8fafc' }}>
          <h2 className="mkt-section-title"><Building2 color="#059669" size={20} /> Client Information</h2>
          <div className="mkt-grid-3">
            <div className="mkt-form-group">
              <label className="mkt-label">Company Name <span className="mkt-text-danger">*</span></label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="mkt-input" required />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Contact Person</label>
              <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Mobile</label>
              <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Location / Address</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Industry</label>
              <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="mkt-input" />
            </div>
          </div>
        </div>

        <div className="mkt-form-section">
          <h2 className="mkt-section-title"><Briefcase color="#0284c7" size={20} /> Project Information</h2>
          <div className="mkt-grid-2">
            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Project Name <span className="mkt-text-danger">*</span></label>
              <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} className="mkt-input" required />
            </div>
            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Requirement Overview</label>
              <textarea name="requirement" value={formData.requirement} onChange={handleChange} rows="3" className="mkt-textarea"></textarea>
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Project Location</label>
              <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Project Type</label>
              <input type="text" name="projectType" value={formData.projectType} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Est. Value (₹)</label>
              <input type="number" name="estimatedProjectValue" value={formData.estimatedProjectValue} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Exp. Closing Date</label>
              <input type="date" name="expectedClosingDate" value={formData.expectedClosingDate} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Remarks</label>
              <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} className="mkt-input" />
            </div>

            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Client Documents</label>
              <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleDocumentUpload} className="mkt-input" />
              {formData.documents?.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.documents.map((doc, index) => (
                    <span key={doc.id || `${doc.name || 'document'}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#0f172a', borderRadius: '999px', padding: '4px 10px', fontSize: '12px' }}>
                      {doc.name}
                      {doc.data || doc.url ? (
                        <button type="button" onClick={() => window.open(doc.data || doc.url, '_blank')} style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '12px' }}>View</button>
                      ) : null}
                      <button type="button" onClick={() => removeDocument(doc.id || `${doc.name || 'document'}-${index}`)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mkt-toolbar" style={{ justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={() => router.back()} className="mkt-btn mkt-btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="mkt-btn mkt-btn-primary">
            {loading ? 'Saving...' : <><Save size={16} /> Save Lead</>}
          </button>
        </div>
      </form>
    </div>
  );
}
