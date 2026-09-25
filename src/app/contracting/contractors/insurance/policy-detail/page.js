"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Save, Plus, RotateCcw, Printer, ChevronDown, ChevronUp, Home, ChevronRight } from 'lucide-react';
import '../../../contracting.css';

const COMPANY_ID = "demo-company-id";
const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  id: null,
  contractorId: "",
  projectId: "",
  policyTypeId: "",
  policyNo: "",
  startDate: today,
  endDate: today,
  noOfPersonsInsured: 0,
  contractorWorkingStatus: "Working",
  location: "",
  remark: "",
};

export default function InsurancePolicyDetailPage() {
  const router = useRouter();
  const [lookups, setLookups] = useState({ contractors: [], projects: [], policyTypes: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [reportMode, setReportMode] = useState("start"); 
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);
  const [reportPolicyStatus, setReportPolicyStatus] = useState("All");
  const [reportWorkingStatus, setReportWorkingStatus] = useState("All");
  const [reportRows, setReportRows] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Accordion state
  const [sections, setSections] = useState({
    policyDetail: true,
    documentUpload: false,
    report: true
  });

  const toggleSection = (section) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // In a real app, you might want to dynamically pass companyId based on the user session
    fetch(`/api/masters/lookups`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setLookups(json.data);
      })
      .catch(() => {});
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = { companyId: COMPANY_ID, ...form };
      const res = await fetch(
        form.id ? `/api/insurance/policies/${form.id}` : "/api/insurance/policies",
        {
          method: form.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setForm({ ...form, id: json.data.id });
      alert("Policy saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const runReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams({
        mode: reportMode,
        fromDate: reportFrom,
        toDate: reportTo,
        policyStatus: reportPolicyStatus,
        contractorWorkingStatus: reportWorkingStatus,
      });
      const res = await fetch(`/api/insurance/policies?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Report failed");
      setReportRows(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReport(false);
    }
  }, [reportMode, reportFrom, reportTo, reportPolicyStatus, reportWorkingStatus]);

  return (
    <div className="contracting-container" style={{ background: '#f5f7fa', minHeight: '100vh', padding: '16px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'white', padding: '12px 20px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>
          <span style={{ color: '#0ea5e9' }}>📄</span> Insurance Policy Detail
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Insurance Policy Detail
        </div>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

      {/* Accordion Container */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        
        {/* Policy Detail Section */}
        <div 
          onClick={() => toggleSection('policyDetail')}
          style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
        >
          {sections.policyDetail ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          Policy Detail
        </div>
        
        {sections.policyDetail && (
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div>
                <label className="contracting-label">Contractor <span style={{color:'red'}}>*</span></label>
                <select value={form.contractorId} onChange={(e) => setForm({ ...form, contractorId: e.target.value })} className="contracting-input" style={{ width: '100%' }}>
                  <option value="">--Select--</option>
                  {lookups.contractors?.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="contracting-label">Project <span style={{color:'red'}}>*</span></label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="contracting-input" style={{ width: '100%' }}>
                  <option value="">--Select--</option>
                  {lookups.projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="contracting-label">Policy Type <span style={{color:'red'}}>*</span></label>
                <select value={form.policyTypeId} onChange={(e) => setForm({ ...form, policyTypeId: e.target.value })} className="contracting-input" style={{ width: '100%' }}>
                  <option value="">--Select--</option>
                  {lookups.policyTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="contracting-label">Policy No <span style={{color:'red'}}>*</span></label>
                <input value={form.policyNo} onChange={(e) => setForm({ ...form, policyNo: e.target.value })} className="contracting-input" style={{ width: '100%' }} />
              </div>

              <div>
                <label className="contracting-label">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="contracting-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label className="contracting-label">End Date</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="contracting-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label className="contracting-label">No of Persons Insured</label>
                <input type="number" value={form.noOfPersonsInsured} onChange={(e) => setForm({ ...form, noOfPersonsInsured: e.target.value })} className="contracting-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label className="contracting-label">Contractor Working Status</label>
                <select value={form.contractorWorkingStatus} onChange={(e) => setForm({ ...form, contractorWorkingStatus: e.target.value })} className="contracting-input" style={{ width: '100%' }}>
                  <option>Working</option>
                  <option>Not Working</option>
                  <option>Left</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="contracting-label">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="contracting-input" style={{ width: '100%' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="contracting-label">Remark</label>
                <input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="contracting-input" style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={resetForm} className="btn-secondary">
                <RotateCcw size={16} /> Reset
              </button>
              <button onClick={resetForm} className="btn-secondary">
                <Plus size={16} /> New
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                <Save size={16} /> {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Document Upload Section */}
        <div 
          onClick={() => toggleSection('documentUpload')}
          style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
        >
          {sections.documentUpload ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          Document Upload
        </div>
        {sections.documentUpload && (
          <div style={{ padding: '20px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
            Document upload functionality goes here.
          </div>
        )}

        {/* Report Section */}
        <div 
          onClick={() => toggleSection('report')}
          style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: sections.report ? '1px solid #e2e8f0' : 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
        >
          {sections.report ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          Report
        </div>
        
        {sections.report && (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155', fontWeight: 500, fontSize: '0.9rem' }}>
                  <input type="radio" checked={reportMode === "start"} onChange={() => setReportMode("start")} style={{ accentColor: '#3b82f6' }} /> Policy Start Date
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155', fontWeight: 500, fontSize: '0.9rem' }}>
                  <input type="radio" checked={reportMode === "end"} onChange={() => setReportMode("end")} style={{ accentColor: '#3b82f6' }} /> Policy End Date
                </label>
              </div>

              <div style={{ flex: '1', minWidth: '150px' }}>
                <label className="contracting-label">From</label>
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="contracting-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label className="contracting-label">To</label>
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="contracting-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label className="contracting-label">Policy Status</label>
                <select value={reportPolicyStatus} onChange={(e) => setReportPolicyStatus(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                  <option>All</option>
                  <option>Active</option>
                  <option>Expired</option>
                </select>
              </div>
              
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', maxWidth: '300px' }}>
                <label className="contracting-label">Contractor Working Status</label>
                <select value={reportWorkingStatus} onChange={(e) => setReportWorkingStatus(e.target.value)} className="contracting-input" style={{ width: '100%' }}>
                  <option>All</option>
                  <option>Working</option>
                  <option>Not Working</option>
                  <option>Left</option>
                </select>
              </div>
              <button onClick={runReport} className="btn-primary">
                <Printer size={16} /> Print
              </button>
            </div>

            <div style={{ marginTop: '24px', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="contracting-table" style={{ margin: 0 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th>Policy No</th>
                    <th>Contractor / Project</th>
                    <th>Policy Type</th>
                    <th>Start / End Date</th>
                    <th style={{ textAlign: 'right' }}>Persons Insured</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReport ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading report data...</td></tr>
                  ) : reportRows.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No records found</td></tr>
                  ) : (
                    reportRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.policyNo}</td>
                        <td>{r.contractor?.companyName || r.contractor?.name} / {r.project?.name}</td>
                        <td>{r.policyType?.name}</td>
                        <td>{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>{r.noOfPersonsInsured}</td>
                        <td>
                           <span className={`status-badge ${r.computedStatus === 'Active' ? 'status-active' : 'status-blacklisted'}`}>
                             {r.computedStatus}
                           </span>
                           <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{r.contractorWorkingStatus}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
