'use client';
import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AddActivity() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    projectId: '',
    activityCode: '',
    activityName: '',
    wbsCode: '',
    startDate: '',
    endDate: '',
    duration: '',
    plannedQty: '',
    unit: 'LS',
    responsiblePerson: '',
    status: 'Not Started',
    isMilestone: false,
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
    if (!formData.projectId || !formData.activityName) {
      alert('Project and Activity Name are required!');
      return;
    }

    try {
      const res = await fetch('/api/engineering/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert('Activity created successfully!');
        router.push('/engineering/planning/dashboard');
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to create activity');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '8px', color: '#15803d' }}>
            <Activity size={20} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Add Activity</h1>
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
              Activity Code
            </label>
            <input 
              type="text"
              value={formData.activityCode}
              onChange={(e) => setFormData({...formData, activityCode: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              placeholder="ACT-001"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Activity Name *
            </label>
            <input 
              type="text" 
              required
              value={formData.activityName}
              onChange={(e) => setFormData({...formData, activityName: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              WBS Code
            </label>
            <input 
              type="text"
              value={formData.wbsCode}
              onChange={(e) => setFormData({...formData, wbsCode: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
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
              Start Date
            </label>
            <input 
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              End Date
            </label>
            <input 
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Duration (Days)
            </label>
            <input 
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Planned Qty
            </label>
            <input 
              type="number"
              value={formData.plannedQty}
              onChange={(e) => setFormData({...formData, plannedQty: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Unit
            </label>
            <select 
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="LS">LS</option>
              <option value="Cum">Cum</option>
              <option value="Sqm">Sqm</option>
              <option value="RM">RM</option>
              <option value="Nos">Nos</option>
              <option value="MT">MT</option>
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
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '1 / -1' }}>
            <input 
              type="checkbox"
              checked={formData.isMilestone}
              onChange={(e) => setFormData({...formData, isMilestone: e.target.checked})}
              style={{ width: '16px', height: '16px' }}
            />
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>
              Mark as Milestone
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            <Save size={16} /> Save Activity
          </button>
        </div>
      </form>
    </div>
  );
}
