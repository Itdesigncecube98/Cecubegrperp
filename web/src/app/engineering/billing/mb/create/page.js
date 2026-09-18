'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateMB() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);

  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    periodFrom: '',
    periodTo: ''
  });

  const [items, setItems] = useState([
    { description: '', unit: '', quantity: '', contractRate: '' }
  ]);

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

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index][name] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', unit: '', quantity: '', contractRate: '' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.contractRate || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId) return alert('Please select a project');

    setLoading(true);
    try {
      const payload = { ...formData, items };
      const res = await fetch('/api/engineering/billing/mb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/engineering/billing/mb');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create MB');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Create Measurement Book</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Log site measurements against BOQ</p>
        </div>
        <Link href="/engineering/billing/mb" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Basic Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Project *</label>
              <select name="projectId" required value={formData.projectId} onChange={handleHeaderChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="">-- Select Project --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>MB Date *</label>
              <input type="date" name="date" required value={formData.date} onChange={handleHeaderChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Measurement Period</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" name="periodFrom" value={formData.periodFrom} onChange={handleHeaderChange} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} title="From" />
                <input type="date" name="periodTo" value={formData.periodTo} onChange={handleHeaderChange} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} title="To" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Measured Items (BOQ)</h2>
            <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
              <Plus size={14} /> Add Row
            </button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '8px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0' }}>Item Description (BOQ) *</th>
                <th style={{ padding: '8px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0', width: '120px' }}>Unit *</th>
                <th style={{ padding: '8px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0', width: '150px' }}>Quantity *</th>
                <th style={{ padding: '8px', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0', width: '150px' }}>Contract Rate (₹) *</th>
                <th style={{ padding: '8px', fontWeight: '600', textAlign: 'right', border: '1px solid #e2e8f0', width: '150px' }}>Amount (₹)</th>
                <th style={{ padding: '8px', width: '50px', border: '1px solid #e2e8f0' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const amount = (parseFloat(item.quantity || 0) * parseFloat(item.contractRate || 0));
                return (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="text" name="description" required value={item.description} onChange={(e) => handleItemChange(index, e)} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="E.g. Excavation" />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="text" name="unit" required value={item.unit} onChange={(e) => handleItemChange(index, e)} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Cum" />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="number" step="any" name="quantity" required value={item.quantity} onChange={(e) => handleItemChange(index, e)} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                      <input type="number" step="any" name="contractRate" required value={item.contractRate} onChange={(e) => handleItemChange(index, e)} style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '500' }}>
                      ₹{amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>Total Measured Amount:</td>
                <td style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#7c3aed' }}>₹{totalAmount.toFixed(2)}</td>
                <td style={{ border: '1px solid #e2e8f0' }}></td>
              </tr>
            </tfoot>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button type="button" onClick={() => router.push('/engineering/billing/mb')} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Draft MB'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
