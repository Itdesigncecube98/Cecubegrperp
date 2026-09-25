'use client';
import React, { useState, useEffect } from 'react';
import { Search, Save, FileText, Lock, Unlock, Plus, Trash2 } from 'lucide-react';

export default function ContractScope() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    woLoaNo: '',
    contractValue: '',
    scopeNotes: '',
    inclusions: '',
    exclusions: '',
    boqLocked: false,
    activities: [] // BOQ Items
  });

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/engineering/projects');
        if (res.ok) setProjects(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    async function loadScope() {
      if (!selectedProjectId) {
        setFormData({ woLoaNo: '', contractValue: '', scopeNotes: '', inclusions: '', exclusions: '', boqLocked: false, activities: [] });
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/engineering/projects/${selectedProjectId}/scope`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            woLoaNo: data.woLoaNo || '',
            contractValue: data.contractValue || '',
            scopeNotes: data.scopeNotes || '',
            inclusions: data.inclusions || '',
            exclusions: data.exclusions || '',
            boqLocked: data.boqLocked || false,
            activities: data.activities || []
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadScope();
  }, [selectedProjectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addBoqItem = () => {
    setFormData(prev => ({
      ...prev,
      activities: [...prev.activities, { boqItemRef: '', name: '', quantity: '', unit: '' }]
    }));
  };

  const handleBoqChange = (index, e) => {
    const { name, value } = e.target;
    const newAct = [...formData.activities];
    newAct[index][name] = value;
    setFormData(prev => ({ ...prev, activities: newAct }));
  };

  const removeBoqItem = (index) => {
    const newAct = formData.activities.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, activities: newAct }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return alert('Select a project first');
    setLoading(true);
    try {
      const res = await fetch(`/api/engineering/projects/${selectedProjectId}/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) alert('Contract & Scope saved successfully');
      else alert('Failed to save');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = () => {
    if (formData.boqLocked && !confirm('Are you sure you want to unlock the baseline? This could affect existing billing calculations.')) return;
    setFormData(prev => ({ ...prev, boqLocked: !prev.boqLocked }));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Contract & Scope</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Establish the legal and technical boundary of the project</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Select Project *</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Choose Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
            </select>
          </div>
        </div>

        {selectedProjectId && (
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>WO / LOA No.</label>
                <input type="text" name="woLoaNo" value={formData.woLoaNo} onChange={handleInputChange} disabled={formData.boqLocked} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: formData.boqLocked ? '#f1f5f9' : '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Contract Value (₹)</label>
                <input type="number" step="any" name="contractValue" value={formData.contractValue} onChange={handleInputChange} disabled={formData.boqLocked} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: formData.boqLocked ? '#f1f5f9' : '#fff' }} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Project Scope</label>
              <textarea name="scopeNotes" value={formData.scopeNotes} onChange={handleInputChange} disabled={formData.boqLocked} rows="3" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', background: formData.boqLocked ? '#f1f5f9' : '#fff' }} placeholder="Briefly describe the overall scope of work..."></textarea>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Inclusions</label>
                <textarea name="inclusions" value={formData.inclusions} onChange={handleInputChange} disabled={formData.boqLocked} rows="4" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', background: formData.boqLocked ? '#f1f5f9' : '#fff' }} placeholder="Explicitly list what is included..."></textarea>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Exclusions</label>
                <textarea name="exclusions" value={formData.exclusions} onChange={handleInputChange} disabled={formData.boqLocked} rows="4" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', background: formData.boqLocked ? '#f1f5f9' : '#fff' }} placeholder="Explicitly list what is NOT included..."></textarea>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Bill of Quantities (BOQ)</h2>
              {!formData.boqLocked && (
                <button type="button" onClick={addBoqItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
                  <Plus size={14} /> Add BOQ Item
                </button>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0', width: '150px' }}>Item Code / Ref</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0' }}>Description</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0', width: '150px' }}>Quantity</th>
                  <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0', width: '120px' }}>Unit</th>
                  {!formData.boqLocked && <th style={{ padding: '8px', width: '50px', border: '1px solid #e2e8f0' }}></th>}
                </tr>
              </thead>
              <tbody>
                {formData.activities.map((act, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="text" name="boqItemRef" value={act.boqItemRef} onChange={(e) => handleBoqChange(index, e)} disabled={formData.boqLocked} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: formData.boqLocked ? 'transparent' : '#fff' }} />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="text" name="name" value={act.name} onChange={(e) => handleBoqChange(index, e)} disabled={formData.boqLocked} required style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: formData.boqLocked ? 'transparent' : '#fff' }} />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="number" step="any" name="quantity" value={act.quantity} onChange={(e) => handleBoqChange(index, e)} disabled={formData.boqLocked} required style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: formData.boqLocked ? 'transparent' : '#fff' }} />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="text" name="unit" value={act.unit} onChange={(e) => handleBoqChange(index, e)} disabled={formData.boqLocked} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: formData.boqLocked ? 'transparent' : '#fff' }} />
                    </td>
                    {!formData.boqLocked && (
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeBoqItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {formData.activities.length === 0 && (
                  <tr>
                    <td colSpan={formData.boqLocked ? 4 : 5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No BOQ items uploaded.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
              <button type="button" onClick={toggleLock} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: formData.boqLocked ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                {formData.boqLocked ? <><Unlock size={16} /> Unlock Baseline</> : <><Lock size={16} /> Lock Baseline</>}
              </button>
              
              <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                <Save size={16} /> {loading ? 'Saving...' : 'Save Contract & Scope'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
