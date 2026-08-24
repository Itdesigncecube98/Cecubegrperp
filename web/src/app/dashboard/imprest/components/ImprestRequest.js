'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import { getEmployees } from '../../../../lib/data';

const emptyForm = {
  employeeId: '',
  imprestHead: '',
  imprestType: '',
  projectSite: '',
  amountRequested: '',
  requiredDate: '',
  purpose: '',
};

export default function ImprestRequest() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [imprestHeads, setImprestHeads] = useState([]);
  const [imprestTypes, setImprestTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    async function load() {
      try {
        const data = await getEmployees();
        if (Array.isArray(data)) setEmployees(data);

        const headsRes = await fetch('/api/synchronization?type=imprestheads');
        if (headsRes.ok) setImprestHeads(await headsRes.json());
        
        const typesRes = await fetch('/api/synchronization?type=impresttypes');
        if (typesRes.ok) setImprestTypes(await typesRes.json());
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }
    load();
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleEmployeeChange = async (e) => {
    const empId = e.target.value;
    if (!empId) {
      setSelectedEmp(null);
      setCurrentBalance(0);
      setForm(f => ({ ...f, employeeId: '', projectSite: '' }));
      return;
    }
    const emp = employees.find(emp => emp.id === empId);
    setSelectedEmp(emp || null);
    setForm(f => ({ ...f, employeeId: empId, projectSite: emp?.siteOffice || '' }));

    // Fetch live balance
    try {
      const balRes = await fetch(`/api/imprest/balance?employeeId=${empId}`);
      if (balRes.ok) {
        const balData = await balRes.json();
        setCurrentBalance(balData.currentBalance || 0);
      }
    } catch (e) {
      console.error('Failed to fetch balance', e);
    }
  };

  const handleChange = (field, value) => {
    if (field === 'imprestHead') {
      setForm(f => ({ ...f, imprestHead: value, imprestType: '' }));
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
  };

  const validate = () => {
    if (!form.employeeId) return 'Please select an employee.';
    if (!form.amountRequested || isNaN(parseFloat(form.amountRequested)) || parseFloat(form.amountRequested) <= 0)
      return 'Please enter a valid amount.';
    if (!form.requiredDate) return 'Please select a required date.';
    if (!form.purpose.trim()) return 'Please enter the purpose.';
    return null;
  };

  const submitRequest = async (asDraft = false) => {
    if (!asDraft) {
      const err = validate();
      if (err) { showToast('error', err); return; }
    } else {
      if (!form.employeeId) { showToast('error', 'Please select an employee to save a draft.'); return; }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        amountRequested: parseFloat(form.amountRequested) || 0,
        isDraft: asDraft,
      };

      const res = await fetch('/api/imprest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        showToast('success', asDraft
          ? `Draft saved! ID: ${saved.requestId}`
          : `Request submitted successfully! ID: ${saved.requestId}`
        );
        // Reset form
        setForm(emptyForm);
        setSelectedEmp(null);
        setCurrentBalance(0);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast('error', errData.error || 'Failed to submit request. Please try again.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">New Imprest Request</h2>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '10px', marginBottom: '1.25rem',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
          color: toast.type === 'success' ? '#15803d' : '#be123c',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}><X size={16} /></button>
        </div>
      )}

      <div className="form-grid">
        {/* Request Date */}
        <div className="form-group">
          <label>Request Date</label>
          <input type="date" value={new Date().toISOString().split('T')[0]} disabled style={{ backgroundColor: '#f8fafc' }} />
        </div>

        {/* Employee Name */}
        <div className="form-group">
          <label>Employee Name *</label>
          <select value={form.employeeId} onChange={handleEmployeeChange}>
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Employee Code */}
        <div className="form-group">
          <label>Employee Code (Auto-fetch)</label>
          <input type="text" value={selectedEmp?.empId || ''} disabled style={{ backgroundColor: '#f8fafc' }} placeholder="Auto-fetched" />
        </div>

        {/* Imprest Head */}
        <div className="form-group">
          <label>Imprest Head</label>
          <select value={form.imprestHead} onChange={e => handleChange('imprestHead', e.target.value)}>
            <option value="">Select Imprest Head</option>
            {imprestHeads.map(head => (
              <option key={head.id} value={head.name}>{head.name}</option>
            ))}
          </select>
        </div>

        {/* Imprest Type */}
        <div className="form-group">
          <label>Imprest Type</label>
          <select value={form.imprestType} onChange={e => handleChange('imprestType', e.target.value)} disabled={!form.imprestHead}>
            <option value="">Select Imprest Type</option>
            {imprestTypes
              .filter(type => type.imprestHead === form.imprestHead)
              .map(type => (
              <option key={type.id} value={type.name}>{type.name}</option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div className="form-group">
          <label>Department (Auto-fetch)</label>
          <input type="text" value={selectedEmp?.department || ''} disabled style={{ backgroundColor: '#f8fafc' }} placeholder="Auto-fetched" />
        </div>

        {/* Project / Site */}
        <div className="form-group">
          <label>Project / Site</label>
          <input
            type="text"
            value={form.projectSite}
            onChange={e => handleChange('projectSite', e.target.value)}
            style={{ backgroundColor: '#fff' }}
            placeholder="Auto-fetched or enter manually"
          />
        </div>

        {/* Amount */}
        <div className="form-group">
          <label>Amount(₹) *</label>
          <input
            type="number"
            min="1"
            value={form.amountRequested}
            onChange={e => handleChange('amountRequested', e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        {/* Required Date */}
        <div className="form-group">
          <label>Required Date *</label>
          <input
            type="date"
            value={form.requiredDate}
            onChange={e => handleChange('requiredDate', e.target.value)}
          />
        </div>

        {/* Previous Balance */}
        <div className="form-group">
          <label>Available Imprest Balance (₹)</label>
          <input type="text" value={`₹ ${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} disabled style={{ backgroundColor: '#f8fafc', color: '#16a34a', fontWeight: 700 }} />
        </div>

        {/* Supporting Document */}
        <div className="form-group">
          <label>Supporting Document</label>
          <input type="file" />
        </div>
      </div>

      {/* Purpose */}
      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label>Purpose *</label>
        <textarea
          value={form.purpose}
          onChange={e => handleChange('purpose', e.target.value)}
          placeholder="Describe the purpose of this imprest request..."
          rows={3}
        />
      </div>

      <div className="action-buttons">
        <button
          className="btn-secondary"
          onClick={() => submitRequest(true)}
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: submitting ? 0.6 : 1 }}
        >
          <Save size={16} /> {submitting ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          className="btn-primary"
          onClick={() => submitRequest(false)}
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: submitting ? 0.6 : 1 }}
        >
          <PlusCircle size={18} /> {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
