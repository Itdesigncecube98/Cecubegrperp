'use client';
import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, FileText, Paperclip, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewDPR() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [projectsError, setProjectsError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'Day',
    preparedBy: '',
    weather: 'Clear',
    workDescription: '',
    activitiesExecuted: '',
    skilledLabour: '',
    unskilledLabour: '',
    equipmentUsed: '',
    materialConsumed: '',
    safetyIncidents: 'None',
    remarks: '',
    status: 'Draft',
  });

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load your permitted projects.');
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        setProjectsError(error.message || 'Unable to load your permitted projects.');
      }
    }
    loadProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.preparedBy) {
      alert('Project and Prepared By are required!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/engineering/dpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, attachments })
      });
      
      if (res.ok) {
        alert('DPR submitted successfully!');
        router.push('/site/dpr');
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to submit DPR');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachments = event => {
    const files = Array.from(event.target.files || []);
    if (files.length + attachments.length > 10) {
      alert('You can attach up to 10 documents.');
      event.target.value = '';
      return;
    }
    Promise.all(files.map(file => new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error(`${file.name} is larger than 5 MB.`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type || 'application/octet-stream', data: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }))).then(newFiles => setAttachments(previous => [...previous, ...newFiles]))
      .catch(error => alert(error.message || 'Failed to read attachment.'));
    event.target.value = '';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#dbeafe', padding: '8px', borderRadius: '8px', color: '#1e40af' }}>
            <FileText size={20} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>New Daily Progress Report</h1>
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
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectId || p.id} - {p.name}</option>)}
            </select>
            {projectsError && <p style={{ color: '#b91c1c', fontSize: '13px', margin: '6px 0 0' }}>{projectsError}</p>}
            {!projectsError && projects.length === 0 && <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0' }}>No projects have been assigned to your account.</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Date *
            </label>
            <input 
              type="date" 
              required
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Shift
            </label>
            <select 
              value={formData.shift}
              onChange={(e) => setFormData({...formData, shift: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="Day">Day</option>
              <option value="Night">Night</option>
              <option value="Both">Both</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Prepared By *
            </label>
            <input 
              type="text" 
              required
              value={formData.preparedBy}
              onChange={(e) => setFormData({...formData, preparedBy: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Weather
            </label>
            <select 
              value={formData.weather}
              onChange={(e) => setFormData({...formData, weather: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="Clear">Clear</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Rainy">Rainy</option>
              <option value="Hot">Hot</option>
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
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Work Description
            </label>
            <textarea 
              value={formData.workDescription}
              onChange={(e) => setFormData({...formData, workDescription: e.target.value})}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="Describe the work performed today..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Supporting Documents
            </label>
            <input type="file" multiple onChange={handleAttachments} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }} />
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '6px' }}>Attach up to 10 files, maximum 5 MB each.</div>
            {attachments.length > 0 && <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>{attachments.map((attachment, index) => <div key={`${attachment.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.875rem' }}><Paperclip size={14} />{attachment.name}</span><button type="button" onClick={() => setAttachments(previous => previous.filter((_, attachmentIndex) => attachmentIndex !== index))} aria-label={`Remove ${attachment.name}`} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button></div>)}</div>}
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Activities Executed
            </label>
            <textarea 
              value={formData.activitiesExecuted}
              onChange={(e) => setFormData({...formData, activitiesExecuted: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="List activities completed..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Skilled Labour
            </label>
            <input 
              type="number"
              value={formData.skilledLabour}
              onChange={(e) => setFormData({...formData, skilledLabour: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Unskilled Labour
            </label>
            <input 
              type="number"
              value={formData.unskilledLabour}
              onChange={(e) => setFormData({...formData, unskilledLabour: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Equipment Used
            </label>
            <textarea 
              value={formData.equipmentUsed}
              onChange={(e) => setFormData({...formData, equipmentUsed: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="List equipment and machinery..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Material Consumed
            </label>
            <textarea 
              value={formData.materialConsumed}
              onChange={(e) => setFormData({...formData, materialConsumed: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="List materials consumed..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Safety Incidents
            </label>
            <input 
              type="text"
              value={formData.safetyIncidents}
              onChange={(e) => setFormData({...formData, safetyIncidents: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Remarks
            </label>
            <input 
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: submitting ? '#94a3b8' : '#1e40af', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            <Save size={16} /> {submitting ? 'Submitting...' : 'Submit DPR'}
          </button>
        </div>
      </form>
    </div>
  );
}
