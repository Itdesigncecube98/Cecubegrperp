'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateOpportunity() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    leadId: '',
    clientId: '',
    estimatedValue: '',
    probabilityPercent: '50',
    expectedClosingDate: '',
    salesStage: 'Initial',
    competitor: '',
    ownerId: '',
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

  const removeDocument = (id) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(doc => doc.id !== id)
    }));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [leadsRes, clientsRes, empRes] = await Promise.all([
          fetch('/api/marketing/leads'),
          fetch('/api/marketing/clients'),
          fetch('/api/employees')
        ]);
        
        if (leadsRes.ok) setLeads(await leadsRes.json());
        if (clientsRes.ok) setClients(await clientsRes.json());
        if (empRes.ok) {
            const data = await empRes.json();
            // Assuming data is an array or has an employees array
            setEmployees(Array.isArray(data) ? data : data.employees || []);
        }
      } catch (err) {
        console.error('Failed to load dropdown data', err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push('/marketing/opportunities');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create opportunity');
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
          <h1 className="mkt-title">Create Opportunity</h1>
          <p className="mkt-subtitle">Convert a lead into an active sales opportunity</p>
        </div>
        <Link href="/marketing/opportunities" className="mkt-btn mkt-btn-outline">
          <ArrowLeft size={16} /> Back to Pipeline
        </Link>
      </div>

      <div className="mkt-card">
        <form onSubmit={handleSubmit}>
          <div className="mkt-form-section">
            <h2 className="mkt-section-title"><Briefcase size={20} className="mkt-text-indigo-600" /> Link Record</h2>
            <div className="mkt-grid-2">
              <div className="mkt-form-group">
                <label className="mkt-label">Select Source Lead</label>
                <select name="leadId" value={formData.leadId} onChange={handleChange} className="mkt-select">
                  <option value="">-- Optional: Link to a Lead --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.leadId} - {lead.projectName}</option>
                  ))}
                </select>
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Select Client (Customer) *</label>
                <select name="clientId" required value={formData.clientId} onChange={handleChange} className="mkt-select">
                  <option value="">-- Select Client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mkt-form-section">
            <h2 className="mkt-section-title">Opportunity Details</h2>
            <div className="mkt-grid-3">
              <div className="mkt-form-group">
                <label className="mkt-label">Estimated Value (₹) *</label>
                <input type="number" required name="estimatedValue" value={formData.estimatedValue} onChange={handleChange} className="mkt-input" placeholder="e.g. 500000" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Probability (%)</label>
                <input type="number" min="0" max="100" name="probabilityPercent" value={formData.probabilityPercent} onChange={handleChange} className="mkt-input" />
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Expected Closing Date *</label>
                <input type="date" required name="expectedClosingDate" value={formData.expectedClosingDate} onChange={handleChange} className="mkt-input" />
              </div>
            </div>

            <div className="mkt-grid-3">
              <div className="mkt-form-group">
                <label className="mkt-label">Sales Stage</label>
                <select name="salesStage" value={formData.salesStage} onChange={handleChange} className="mkt-select">
                  <option value="Initial">Initial Contact</option>
                  <option value="Needs Analysis">Needs Analysis</option>
                  <option value="Proposal/Quote">Proposal/Quote</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Owner</label>
                <select name="ownerId" value={formData.ownerId} onChange={handleChange} className="mkt-select">
                  <option value="">-- Select Owner --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="mkt-form-group">
                <label className="mkt-label">Competitor</label>
                <input type="text" name="competitor" value={formData.competitor} onChange={handleChange} className="mkt-input" placeholder="Known competitors..." />
              </div>
            </div>

            <div className="mkt-form-group" style={{ marginTop: '16px' }}>
              <label className="mkt-label">Client Documents</label>
              <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleDocumentUpload} className="mkt-input" />
              {formData.documents?.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.documents.map(doc => (
                    <span key={doc.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#0f172a', borderRadius: '999px', padding: '4px 10px', fontSize: '12px' }}>
                      {doc.name}
                      <button type="button" onClick={() => removeDocument(doc.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mkt-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="mkt-btn mkt-btn-primary">
              <Save size={16} /> {loading ? 'Saving...' : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
