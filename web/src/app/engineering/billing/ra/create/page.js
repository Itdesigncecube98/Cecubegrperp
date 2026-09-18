'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function CreateRABill() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);

  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    
    previousCertified: 0,
    currentBill: 0,
    cumulative: 0,
    
    retentionPercent: 5, // Default 5%
    retentionAmount: 0,
    advanceRecovery: 0,
    otherDeductions: 0,
    
    netPayable: 0
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

  // Fetch RA Stats when project changes
  useEffect(() => {
    async function fetchStats() {
      if (!formData.projectId) {
        setFormData(prev => ({ ...prev, previousCertified: 0, currentBill: 0, cumulative: 0 }));
        return;
      }
      try {
        const res = await fetch(`/api/engineering/projects/${formData.projectId}/ra-stats`);
        if (res.ok) {
          const stats = await res.json();
          setFormData(prev => ({
            ...prev,
            previousCertified: stats.previousCertified || 0,
            currentBill: stats.currentBill || 0,
            cumulative: stats.cumulative || 0
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchStats();
  }, [formData.projectId]);

  // Recalculate Net Payable whenever deductions or cumulative changes
  useEffect(() => {
    const cumulative = parseFloat(formData.cumulative) || 0;
    const previous = parseFloat(formData.previousCertified) || 0;
    
    const currentGross = cumulative - previous; // The gross amount being billed in this cycle
    const retentionAmt = (cumulative * (parseFloat(formData.retentionPercent) || 0)) / 100;
    
    // Actually, usually Retention is kept on the cumulative work. 
    // And Advance Recovery is subtracted.
    // Net Payable = Cumulative - Previous Certified - Retention - Advance Recovery - Other Deductions
    
    const adv = parseFloat(formData.advanceRecovery) || 0;
    const other = parseFloat(formData.otherDeductions) || 0;
    
    let net = cumulative - previous - retentionAmt - adv - other;
    if (net < 0) net = 0;

    setFormData(prev => ({
      ...prev,
      retentionAmount: retentionAmt,
      netPayable: net,
      currentBill: currentGross
    }));
  }, [formData.cumulative, formData.previousCertified, formData.retentionPercent, formData.advanceRecovery, formData.otherDeductions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId) return alert('Please select a project');

    setLoading(true);
    try {
      const res = await fetch('/api/engineering/billing/ra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push('/engineering/billing/ra');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create RA Bill');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Create RA Bill</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Auto-calculate deductions and net payable from certified MBs</p>
        </div>
        <Link href="/engineering/billing/ra" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>1. Select Project</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Project *</label>
              <select name="projectId" required value={formData.projectId} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="">-- Select Project --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>RA Bill Date *</label>
              <input type="date" name="date" required value={formData.date} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>2. Valuation of Work (Auto-fetched from MBs)</h2>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#475569' }}>Total Cumulative Certified Work Done</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(formData.cumulative)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#475569' }}>Less: Previous Certified Amount</span>
              <span style={{ fontWeight: '600', color: '#ef4444' }}>- {formatCurrency(formData.previousCertified)}</span>
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '12px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600', color: '#1e293b' }}>Current Gross Bill Amount</span>
              <span style={{ fontWeight: '600', color: '#3b82f6' }}>{formatCurrency(formData.currentBill)}</span>
            </div>
          </div>

          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>3. Deductions & Recoveries</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Retention (%)</label>
              <input type="number" step="any" name="retentionPercent" value={formData.retentionPercent} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Amount: {formatCurrency(formData.retentionAmount)}</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Mobilization Advance Recovery (₹)</label>
              <input type="number" step="any" name="advanceRecovery" value={formData.advanceRecovery} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Other Deductions (₹)</label>
              <input type="number" step="any" name="otherDeductions" value={formData.otherDeductions} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ background: '#ecfdf5', padding: '20px', borderRadius: '8px', border: '1px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calculator size={24} color="#059669" />
              <div>
                <div style={{ fontSize: '0.875rem', color: '#047857', fontWeight: '500' }}>Final Output</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#065f46' }}>Net Payable Amount</div>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
              {formatCurrency(formData.netPayable)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button type="button" onClick={() => router.push('/engineering/billing/ra')} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading || !formData.projectId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
              <Save size={16} /> {loading ? 'Saving...' : 'Generate RA Bill'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
