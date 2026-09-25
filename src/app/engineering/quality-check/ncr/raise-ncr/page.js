'use client';
import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RaiseNCR() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    projectId: '',
    ncrNo: '',
    raisedBy: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    tradeCategory: '',
    nonConformanceDescription: '',
    severity: 'Medium',
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    responsiblePerson: '',
    targetCloseDate: '',
    status: 'Open',
    remarks: '',
  });

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/engineering/projects');
      if (res.ok) setProjects(await res.json());
    }
    loadProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.raisedBy || !formData.nonConformanceDescription) {
      alert('Project, Raised By, and Non-conformance Description are required!');
      return;
    }

    try {
      const res = await fetch('/api/engineering/ncr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert('NCR raised successfully!');
        router.push('/engineering/quality-check/inspection-report');
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to raise NCR');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '8px', color: '#dc2626' }}>
            <AlertTriangle size={20} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Raise Non-Conformance Report (NCR)</h1>
        </div>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Project *
            </label>
            <select 
              required
              value={formData.projectId}
              onChange={(e) => setFormData({...formData, projectId: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              NCR No
            </label>
            <input 
              type="text"
              value={formData.ncrNo}
              onChange={(e) => setFormData({...formData, ncrNo: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              placeholder="Auto-generated"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Raised By *
            </label>
            <input 
              type="text" 
              required
              value={formData.raisedBy}
              onChange={(e) => setFormData({...formData, raisedBy: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Date
            </label>
            <input 
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Location
            </label>
            <input 
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              placeholder="e.g., Block A - Floor 3"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Trade Category
            </label>
            <input 
              type="text"
              value={formData.tradeCategory}
              onChange={(e) => setFormData({...formData, tradeCategory: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              placeholder="e.g., Concrete, Electrical, Plumbing"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Non-Conformance Description *
            </label>
            <textarea 
              required
              value={formData.nonConformanceDescription}
              onChange={(e) => setFormData({...formData, nonConformanceDescription: e.target.value})}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="Describe the non-conformance in detail..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Severity
            </label>
            <select 
              value={formData.severity}
              onChange={(e) => setFormData({...formData, severity: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Status
            </label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Root Cause
            </label>
            <textarea 
              value={formData.rootCause}
              onChange={(e) => setFormData({...formData, rootCause: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="Identify the root cause..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Corrective Action
            </label>
            <textarea 
              value={formData.correctiveAction}
              onChange={(e) => setFormData({...formData, correctiveAction: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="Describe corrective actions taken..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Preventive Action
            </label>
            <textarea 
              value={formData.preventiveAction}
              onChange={(e) => setFormData({...formData, preventiveAction: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="Describe preventive measures..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Responsible Person
            </label>
            <input 
              type="text"
              value={formData.responsiblePerson}
              onChange={(e) => setFormData({...formData, responsiblePerson: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Target Close Date
            </label>
            <input 
              type="date"
              value={formData.targetCloseDate}
              onChange={(e) => setFormData({...formData, targetCloseDate: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Remarks
            </label>
            <textarea 
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            <Save size={16} /> Raise NCR
          </button>
        </div>
      </form>
    </div>
  );
}
