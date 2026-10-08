'use client';
/**
 * Shared Doc Approvals Panel
 * role: 'SUPERVISOR' | 'HR' | 'ACCOUNTS' | 'HOD'
 * currentEmployee: the logged-in employee object (from localStorage)
 *
 * HOD detection:
 *   - If role === 'HOD' (explicit HOD dashboard), always show HOD actions.
 *   - If role === 'SUPERVISOR', we ALSO check whether this supervisor is
 *     the designated HOD for the submitter via /api/doc-workflow.
 *     If yes, HOD approval section is shown inline for PENDING_HOD submissions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, FileText, Download, ShieldCheck } from 'lucide-react';

const TEMPLATES = {
  ACCOMMODATION: {
    formName: 'Accommodation Reimbursement Form',
    columns: [
      { id: 'stayPeriod', name: 'Stay Period' },
      { id: 'location', name: 'Accommodation Location / Hotel' },
      { id: 'billNo', name: 'Bill / Invoice No.' },
      { id: 'amount', name: 'Amount Claimed' },
      { id: 'projectCostCenter', name: 'Project Cost Center' },
    ],
  },
  FOOD: {
    formName: 'Food Allowance Reimbursement Form',
    columns: [
      { id: 'period', name: 'Period' },
      { id: 'eligibleAmount', name: 'Eligible Monthly Allowance' },
      { id: 'amount', name: 'Amount Claimed' },
      { id: 'projectCostCenter', name: 'Project Cost Center' },
    ],
  },
};

const STATUS_FILTER = {
  SUPERVISOR: 'PENDING_SUPERVISOR',
  HR: 'PENDING_HR',
  ACCOUNTS: 'PENDING_ACCOUNTS',
  HOD: 'PENDING_HOD',
};

const STATUS_NEXT = {
  SUPERVISOR: 'PENDING_HR',
  HR: 'PENDING_ACCOUNTS',
  ACCOUNTS: 'PENDING_HOD',
  HOD: 'APPROVED',
};

function statusBadge(status) {
  const map = {
    DRAFT: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    PENDING_SUPERVISOR: { bg: '#fef9c3', color: '#854d0e', label: 'With Supervisor' },
    PENDING_HR: { bg: '#fef3c7', color: '#92400e', label: 'With HR' },
    PENDING_ACCOUNTS: { bg: '#dbeafe', color: '#1e40af', label: 'With Accounts' },
    PENDING_HOD: { bg: '#fce7f3', color: '#9d174d', label: 'With HOD' },
    APPROVED: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
    REJECTED: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569', label: status };
  return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

export default function DocApprovalsPanel({ role, currentEmployee }) {
  const pendingStatus = STATUS_FILTER[role];

  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [approvalData, setApprovalData] = useState({});
  const [hodApprovalData, setHodApprovalData] = useState({});
  const [activeTab, setActiveTab] = useState('pending');

  // Map of employeeId → true/false for whether currentEmployee is their HOD
  const [hodEmpIds, setHodEmpIds] = useState(new Set());
  const [hodCheckDone, setHodCheckDone] = useState(false);

  // ── Load HOD mappings from DB ──────────────────────────────────────────────
  const loadHodMappings = useCallback(async () => {
    if (!currentEmployee?.id) { setHodCheckDone(true); return; }
    try {
      const res = await fetch(`/api/doc-workflow?hodId=${currentEmployee.id}`);
      if (res.ok) {
        const mappings = await res.json();
        setHodEmpIds(new Set((Array.isArray(mappings) ? mappings : []).map(m => m.employeeId)));
      }
    } catch { /* DB may be offline – fallback to empty */ }
    finally { setHodCheckDone(true); }
  }, [currentEmployee?.id]);

  // ── Load submissions from localStorage ────────────────────────────────────
  const load = useCallback(() => {
    const all = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    setSubmissions(all);
  }, []);

  useEffect(() => {
    load();
    loadHodMappings();
  }, [load, loadHodMappings]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pendingSubs = submissions.filter(s => s.status === pendingStatus);

  // HOD also sees PENDING_HOD submissions where this supervisor is mapped as HOD
  const hodPendingSubs = (role === 'SUPERVISOR' && hodCheckDone)
    ? submissions.filter(s => s.status === 'PENDING_HOD' && hodEmpIds.has(s.employeeId))
    : [];

  const otherSubs = submissions.filter(s => s.status !== 'DRAFT' && s.status !== pendingStatus);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isHodForSelected = selected && hodEmpIds.has(selected.employeeId);
  const selectedIsPendingForMe = selected?.status === pendingStatus;
  const selectedIsPendingHOD = selected?.status === 'PENDING_HOD';

  const selectSub = (sub) => {
    setSelected(sub);
    const existing = sub[`${role.toLowerCase()}Approval`] || {};
    setApprovalData(existing);
    const existingHod = sub.hodApproval || {};
    setHodApprovalData(existingHod);
  };

  // ── Approve (supervisor / HR / accounts / explicit HOD) ───────────────────
  const handleApprove = () => {
    if (!confirm('Approve this document?')) return;
    const all = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    const updated = all.map(s => {
      if (s.id !== selected.id) return s;
      return {
        ...s,
        status: STATUS_NEXT[role],
        [`${role.toLowerCase()}Approval`]: { ...approvalData, approved: true, date: new Date().toLocaleDateString() },
      };
    });
    localStorage.setItem('docgen_submissions', JSON.stringify(updated));
    alert('Approved successfully!');
    setSelected(null);
    load();
  };

  const handleReject = () => {
    if (!confirm('Reject this document?')) return;
    const all = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    const updated = all.map(s => {
      if (s.id !== selected.id) return s;
      return {
        ...s,
        status: 'REJECTED',
        [`${role.toLowerCase()}Approval`]: { ...approvalData, approved: false, date: new Date().toLocaleDateString() },
      };
    });
    localStorage.setItem('docgen_submissions', JSON.stringify(updated));
    alert('Rejected.');
    setSelected(null);
    load();
  };

  // ── HOD Approve (inline from SUPERVISOR dashboard) ────────────────────────
  const handleHodApprove = () => {
    if (!confirm('Approve as HOD? This will mark the document as APPROVED.')) return;
    const all = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    const updated = all.map(s => {
      if (s.id !== selected.id) return s;
      return {
        ...s,
        status: 'APPROVED',
        hodApproval: {
          ...hodApprovalData,
          approved: true,
          approvedBy: currentEmployee?.name || 'HOD',
          date: new Date().toLocaleDateString(),
        },
      };
    });
    localStorage.setItem('docgen_submissions', JSON.stringify(updated));
    alert('HOD Approval done! Document marked APPROVED.');
    setSelected(null);
    load();
  };

  const handleHodReject = () => {
    if (!confirm('Reject as HOD?')) return;
    const all = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    const updated = all.map(s => {
      if (s.id !== selected.id) return s;
      return {
        ...s,
        status: 'REJECTED',
        hodApproval: {
          ...hodApprovalData,
          approved: false,
          approvedBy: currentEmployee?.name || 'HOD',
          date: new Date().toLocaleDateString(),
        },
      };
    });
    localStorage.setItem('docgen_submissions', JSON.stringify(updated));
    alert('Rejected as HOD.');
    setSelected(null);
    load();
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = (sub) => {
    const tmpl = TEMPLATES[sub.templateId];
    if (!tmpl) return;
    const sa = sub.supervisorApproval || {};
    const ha = sub.hrApproval || {};
    const aa = sub.accountsApproval || {};
    const hod = sub.hodApproval || {};
    const pw = window.open('', '_blank', 'width=1200,height=900');
    pw.document.write(`<!DOCTYPE html><html><head><title>${tmpl.formName}</title>
    <style>*{box-sizing:border-box}body{font-family:'Times New Roman',serif;margin:0;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:15mm}table{width:100%;border-collapse:collapse;margin-bottom:15px}td,th{border:1.5px solid #000;padding:6px;font-size:13px}th{background:#e6f2ff;font-weight:bold}.logo{text-align:center;margin-bottom:16px}.logo img{height:65px;object-fit:contain}</style>
    </head><body>
    <div class="logo"><img src="/logo.png" onerror="this.style.display='none'"/></div>
    <div style="font-weight:bold;font-size:13px">CeCube Engineering India Pvt. Ltd.</div>
    <div style="font-size:12px;margin-bottom:12px">CeCube Green Energy Pvt. Ltd.</div>
    <h2 style="font-size:16px;margin:0 0 4px 0">${tmpl.formName.toUpperCase()}</h2>
    <table><tbody>
      <tr><td style="width:20%;font-weight:bold">Employee Name</td><td style="width:30%">${sub.fields?.empName||''}</td><td style="width:20%;font-weight:bold">Employee Code</td><td>${sub.fields?.empCode||''}</td></tr>
      <tr><td style="font-weight:bold">Designation</td><td>${sub.fields?.designation||''}</td><td style="font-weight:bold">Department</td><td>${sub.fields?.department||''}</td></tr>
      <tr><td style="font-weight:bold">Project / Site Name</td><td>${sub.fields?.projectName||''}</td><td style="font-weight:bold">Month &amp; Year</td><td>${sub.fields?.monthYear||''}</td></tr>
      <tr><td style="font-weight:bold">Reporting Manager</td><td>${sub.fields?.reportingManager||''}</td><td style="font-weight:bold">Location</td><td>${sub.fields?.location||''}</td></tr>
    </tbody></table>
    <table><thead><tr><th>Sr.No.</th>${tmpl.columns.map(c=>`<th>${c.name}</th>`).join('')}</tr></thead>
    <tbody>${(sub.tableRows||[]).map((r,i)=>`<tr><td style="text-align:center">${i+1}</td>${tmpl.columns.map(c=>`<td>${r[c.id]||''}</td>`).join('')}</tr>`).join('')}</tbody></table>
    ${sub.fields?.remarks ? `<div style="margin-bottom:12px;font-size:13px"><strong>Remarks:</strong> ${sub.fields.remarks}</div>` : ''}
    ${sub.supportingDocs && sub.supportingDocs.length > 0 ? `<div style="margin-bottom:12px;font-size:13px"><strong>Supporting Documents:</strong> ${sub.supportingDocs.map(d=>`<span style="display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;background:#e0f2fe;border-radius:4px">${d.name}</span>`).join('')}</div>` : ''}
    <strong style="font-size:13px">Approval Workflow</strong>
    <table style="margin-top:6px"><thead><tr><th style="width:33%">Reporting Manager</th><th style="width:33%">HR Verification</th><th style="width:34%">Accounts Processing</th></tr></thead>
    <tbody><tr>
    <td style="vertical-align:top;min-height:80px">
      ${sa.approved ? '☑ Approved' : sa.approved === false ? '☑ Not Approved' : '☐ Approved &nbsp; ☐ Not Approved'}<br/><br/>
      Name: ${sa.name||''}<br/>Designation: ${sa.designation||''}<br/>Signature: ${sa.signature||'__________________'}<br/>Date: ${sa.date||''}
    </td>
    <td style="vertical-align:top">
      ${ha.eligibilityVerified ? '☑' : '☐'} Eligibility Verified<br/>
      ${ha.policyChecked ? '☑' : '☐'} Policy Compliance Checked<br/><br/>
      Verified By: ${ha.verifiedBy||''}<br/>Signature: ${ha.signature||'__________________'}<br/>Date: ${ha.date||''}
    </td>
    <td style="vertical-align:top">
      ${aa.processedBy ? '☑' : '☐'} Processed for the Month of ${aa.processedFor||'______'}<br/><br/>
      Processed By: ${aa.processedBy||''}<br/>Signature: ${aa.signature||'__________________'}<br/>Date: ${aa.date||''}
    </td>
    </tr></tbody></table>
    <br/>
    <strong style="font-size:13px">HOD Approval</strong>
    <table style="margin-top:6px;width:100%;border-collapse:collapse"><thead><tr><th style="width:100%">HOD Approval</th></tr></thead>
    <tbody><tr>
      <td style="vertical-align:top;min-height:80px">
        ${hod.approved === true ? '☑' : '☐'} Approved &nbsp;&nbsp; ${hod.approved === false ? '☑' : '☐'} Not Approved<br/><br/>
        Name: ${hod.name||hod.approvedBy||''}<br/>Designation: ${hod.designation||''}<br/>Signature: ${hod.signature||(hod.approved !== undefined ? (hod.approvedBy||'') : '__________________')}<br/>Date: ${hod.date||''}${hod.remarks ? `<br/>Remarks: ${hod.remarks}` : ''}
      </td>
    </tr></tbody></table>
    <script>window.onload=()=>window.print();</script></body></html>`);
    pw.document.close();
  };

  const inputSt = { padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', width: '100%' };
  const cellSt = { border: '1.5px solid #000', padding: '8px', fontSize: '13px', verticalAlign: 'top' };
  const thSt = { ...cellSt, background: '#e6f2ff', fontWeight: 'bold' };

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (selected) {
    const tmpl = TEMPLATES[selected.templateId];
    const sa = selected.supervisorApproval || {};
    const ha = selected.hrApproval || {};
    const aa = selected.accountsApproval || {};
    const hod = selected.hodApproval || {};

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setSelected(null)} style={{ padding: '7px 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>← Back</button>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{selected.employeeName} — {selected.templateName}</h3>
          {statusBadge(selected.status)}

          {/* Normal role approve buttons */}
          {selectedIsPendingForMe && role !== 'HOD' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button onClick={handleReject} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <XCircle size={16} /> Reject
              </button>
              <button onClick={handleApprove} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <CheckCircle size={16} /> Approve &amp; Forward
              </button>
            </div>
          )}

          {/* HOD approve buttons — shown when: explicit HOD role OR supervisor who is mapped HOD */}
          {((role === 'HOD' && selectedIsPendingForMe) || (role === 'SUPERVISOR' && isHodForSelected && selectedIsPendingHOD)) && (
            <div style={{ marginLeft: role === 'HOD' ? 'auto' : '0', display: 'flex', gap: '10px', padding: '8px 12px', background: 'linear-gradient(135deg,#fdf4ff,#f0fdf4)', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
              <ShieldCheck size={16} color="#7c3aed" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#7c3aed' }}>HOD Action:</span>
              <button onClick={handleHodReject} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                <XCircle size={14} /> Reject
              </button>
              <button onClick={handleHodApprove} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                <CheckCircle size={14} /> Approve (HOD)
              </button>
            </div>
          )}

          <button onClick={() => handlePrint(selected)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            <Download size={14} /> Print
          </button>
        </div>

        <div style={{ background: 'white', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img src="/logo.png" alt="CeCube" style={{ height: '60px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>CeCube Engineering India Pvt. Ltd.</div>
          <div style={{ fontSize: '12px', marginBottom: '12px' }}>CeCube Green Energy Pvt. Ltd.</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>{selected.templateName?.toUpperCase()}</h2>

          {/* Employee fields — read-only */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ ...thSt, width: '20%' }}>Employee Name</td><td style={{ ...cellSt, width: '30%' }}>{selected.fields?.empName}</td>
                <td style={{ ...thSt, width: '20%' }}>Employee Code</td><td style={cellSt}>{selected.fields?.empCode}</td>
              </tr>
              <tr>
                <td style={thSt}>Designation</td><td style={cellSt}>{selected.fields?.designation}</td>
                <td style={thSt}>Department</td><td style={cellSt}>{selected.fields?.department}</td>
              </tr>
              <tr>
                <td style={thSt}>Project / Site Name</td><td style={cellSt}>{selected.fields?.projectName}</td>
                <td style={thSt}>Month &amp; Year of Claim</td><td style={cellSt}>{selected.fields?.monthYear}</td>
              </tr>
              <tr>
                <td style={thSt}>Reporting Manager</td><td style={cellSt}>{selected.fields?.reportingManager}</td>
                <td style={thSt}>Location of Deployment</td><td style={cellSt}>{selected.fields?.location}</td>
              </tr>
            </tbody>
          </table>

          {/* Claim table */}
          {tmpl && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width: '8%' }}>Sr. No.</th>
                  {tmpl.columns.map(c => <th key={c.id} style={thSt}>{c.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {(selected.tableRows || []).map((row, i) => (
                  <tr key={i}>
                    <td style={{ ...cellSt, textAlign: 'center' }}>{i + 1}</td>
                    {tmpl.columns.map(c => <td key={c.id} style={cellSt}>{row[c.id] || ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Remarks */}
          {selected.fields?.remarks && (
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '13px' }}>Remarks / Description</strong>
              <p style={{ margin: '6px 0', fontSize: '13px', padding: '8px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{selected.fields.remarks}</p>
            </div>
          )}

          {/* Supporting Documents */}
          {selected.supportingDocs && selected.supportingDocs.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '13px' }}>Supporting Documents ({selected.supportingDocs.length})</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {selected.supportingDocs.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.dataUrl}
                    download={doc.name}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '12px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}
                  >
                    <FileText size={13} />
                    <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                    <span style={{ color: '#94a3b8' }}>({(doc.size / 1024).toFixed(1)} KB)</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Declaration */}
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>
            <strong>Employee Declaration</strong>
            <p style={{ margin: '4px 0' }}>I hereby certify that the above claim is true and correct to the best of my knowledge.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span>Employee Signature: <strong>{selected.fields?.empSignature || '_____________'}</strong></span>
              <span>Place: <strong>{selected.fields?.place || '_____________'}</strong></span>
              <span>Date: <strong>{selected.fields?.date || '_____________'}</strong></span>
            </div>
          </div>

          {/* ── Approval Workflow table ── */}
          <strong style={{ fontSize: '13px' }}>Approval Workflow</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ ...thSt, width: '33%' }}>Reporting Manager</th>
                <th style={{ ...thSt, width: '33%' }}>HR Verification</th>
                <th style={{ ...thSt, width: '34%' }}>Accounts Processing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* SUPERVISOR */}
                <td style={cellSt}>
                  {role === 'SUPERVISOR' && selectedIsPendingForMe ? (
                    <div>
                      <div style={{ marginBottom: '8px', display: 'flex', gap: '16px' }}>
                        <label style={{ cursor: 'pointer', fontSize: '13px' }}>
                          <input type="radio" name="sup_approved" checked={approvalData.approved === true} onChange={() => setApprovalData(p => ({ ...p, approved: true }))} /> Approved
                        </label>
                        <label style={{ cursor: 'pointer', fontSize: '13px' }}>
                          <input type="radio" name="sup_approved" checked={approvalData.approved === false} onChange={() => setApprovalData(p => ({ ...p, approved: false }))} /> Not Approved
                        </label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px' }}>Name</label>
                        <input style={inputSt} value={approvalData.name || ''} onChange={e => setApprovalData(p => ({ ...p, name: e.target.value }))} />
                        <label style={{ fontSize: '12px' }}>Designation</label>
                        <input style={inputSt} value={approvalData.designation || ''} onChange={e => setApprovalData(p => ({ ...p, designation: e.target.value }))} />
                        <label style={{ fontSize: '12px' }}>Signature</label>
                        <input style={inputSt} value={approvalData.signature || ''} onChange={e => setApprovalData(p => ({ ...p, signature: e.target.value }))} placeholder="Type signature here" />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: sa.approved === undefined ? '#94a3b8' : undefined }}>
                      {sa.approved === true ? '✅ Approved' : sa.approved === false ? '❌ Not Approved' : '⏳ Pending'}
                      {sa.name && <div style={{ marginTop: '6px' }}>Name: <strong>{sa.name}</strong></div>}
                      {sa.designation && <div>Designation: <strong>{sa.designation}</strong></div>}
                      {sa.signature && <div>Signature: <strong>{sa.signature}</strong></div>}
                      {sa.date && <div>Date: <strong>{sa.date}</strong></div>}
                    </div>
                  )}
                </td>

                {/* HR */}
                <td style={cellSt}>
                  {role === 'HR' && selectedIsPendingForMe ? (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={approvalData.eligibilityVerified || false} onChange={e => setApprovalData(p => ({ ...p, eligibilityVerified: e.target.checked }))} />
                        Eligibility Verified
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={approvalData.policyChecked || false} onChange={e => setApprovalData(p => ({ ...p, policyChecked: e.target.checked }))} />
                        Policy Compliance Checked
                      </label>
                      <label style={{ fontSize: '12px' }}>Verified By</label>
                      <input style={{ ...inputSt, marginTop: '4px' }} value={approvalData.verifiedBy || ''} onChange={e => setApprovalData(p => ({ ...p, verifiedBy: e.target.value }))} />
                      <label style={{ fontSize: '12px', marginTop: '6px' }}>Signature</label>
                      <input style={inputSt} value={approvalData.signature || ''} onChange={e => setApprovalData(p => ({ ...p, signature: e.target.value }))} placeholder="Type signature here" />
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: ha.verifiedBy === undefined ? '#94a3b8' : undefined }}>
                      {ha.eligibilityVerified ? '☑ Eligibility Verified' : '☐ Eligibility Verified'}<br />
                      {ha.policyChecked ? '☑ Policy Compliance Checked' : '☐ Policy Compliance Checked'}
                      {ha.verifiedBy && <div style={{ marginTop: '6px' }}>Verified By: <strong>{ha.verifiedBy}</strong></div>}
                      {ha.signature && <div>Signature: <strong>{ha.signature}</strong></div>}
                      {ha.date && <div>Date: <strong>{ha.date}</strong></div>}
                    </div>
                  )}
                </td>

                {/* ACCOUNTS */}
                <td style={cellSt}>
                  {role === 'ACCOUNTS' && selectedIsPendingForMe ? (
                    <div>
                      <label style={{ fontSize: '12px' }}>Processed for Month of</label>
                      <input style={{ ...inputSt, marginBottom: '8px', marginTop: '4px' }} value={approvalData.processedFor || ''} onChange={e => setApprovalData(p => ({ ...p, processedFor: e.target.value }))} />
                      <label style={{ fontSize: '12px' }}>Processed By</label>
                      <input style={{ ...inputSt, marginTop: '4px' }} value={approvalData.processedBy || ''} onChange={e => setApprovalData(p => ({ ...p, processedBy: e.target.value }))} />
                      <label style={{ fontSize: '12px', marginTop: '6px' }}>Signature</label>
                      <input style={inputSt} value={approvalData.signature || ''} onChange={e => setApprovalData(p => ({ ...p, signature: e.target.value }))} placeholder="Type signature here" />
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: aa.processedBy === undefined ? '#94a3b8' : undefined }}>
                      {aa.processedFor ? `Processed for: ${aa.processedFor}` : '⏳ Pending'}
                      {aa.processedBy && <div style={{ marginTop: '6px' }}>By: <strong>{aa.processedBy}</strong></div>}
                      {aa.signature && <div>Signature: <strong>{aa.signature}</strong></div>}
                      {aa.date && <div>Date: <strong>{aa.date}</strong></div>}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── HOD Approval Section ── */}
          <strong style={{ fontSize: '13px' }}>HOD Approval</strong>
          <div style={{
            marginTop: '8px',
            padding: '16px',
            border: (role === 'HOD' && selectedIsPendingForMe) || (role === 'SUPERVISOR' && isHodForSelected && selectedIsPendingHOD)
              ? '2px solid #7c3aed'
              : '1px solid #e2e8f0',
            borderRadius: '8px',
            background: (role === 'HOD' && selectedIsPendingForMe) || (role === 'SUPERVISOR' && isHodForSelected && selectedIsPendingHOD)
              ? 'linear-gradient(135deg,#fdf4ff,#f5f3ff)'
              : '#f8fafc',
          }}>
            {/* HOD entry fields — shown when: explicit HOD role pending OR supervisor who is mapped HOD and doc is PENDING_HOD */}
            {((role === 'HOD' && selectedIsPendingForMe) || (role === 'SUPERVISOR' && isHodForSelected && selectedIsPendingHOD)) ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ShieldCheck size={18} color="#7c3aed" />
                  <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '14px' }}>
                    HOD Review &amp; Approval
                    {role === 'SUPERVISOR' && isHodForSelected && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '20px' }}>
                        Org Structure
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>HOD Name</label>
                    <input
                      style={{ ...inputSt, marginTop: '4px', borderColor: '#a78bfa' }}
                      value={hodApprovalData.name || currentEmployee?.name || ''}
                      onChange={e => setHodApprovalData(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Designation</label>
                    <input
                      style={{ ...inputSt, marginTop: '4px', borderColor: '#a78bfa' }}
                      value={hodApprovalData.designation || currentEmployee?.designation || ''}
                      onChange={e => setHodApprovalData(p => ({ ...p, designation: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Signature</label>
                    <input
                      style={{ ...inputSt, marginTop: '4px', borderColor: '#a78bfa' }}
                      value={hodApprovalData.signature || ''}
                      onChange={e => setHodApprovalData(p => ({ ...p, signature: e.target.value }))}
                      placeholder="Type or enter signature"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Remarks</label>
                    <input
                      style={{ ...inputSt, marginTop: '4px', borderColor: '#a78bfa' }}
                      value={hodApprovalData.remarks || ''}
                      onChange={e => setHodApprovalData(p => ({ ...p, remarks: e.target.value }))}
                      placeholder="Optional remarks"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                  <button
                    onClick={handleHodReject}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    onClick={handleHodApprove}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: 'linear-gradient(135deg,#7c3aed,#9333ea)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}
                  >
                    <CheckCircle size={16} /> Approve as HOD
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px' }}>
                {hod.approved === true ? (
                  <div>
                    <span style={{ color: '#166534', fontWeight: 600 }}>✅ Approved by HOD</span>
                    {hod.approvedBy && <div style={{ marginTop: '6px' }}>Name: <strong>{hod.approvedBy}</strong></div>}
                    {hod.name && hod.name !== hod.approvedBy && <div>HOD: <strong>{hod.name}</strong></div>}
                    {hod.designation && <div>Designation: <strong>{hod.designation}</strong></div>}
                    {hod.signature && <div>Signature: <strong>{hod.signature}</strong></div>}
                    {hod.date && <div>Date: <strong>{hod.date}</strong></div>}
                    {hod.remarks && <div>Remarks: <em>{hod.remarks}</em></div>}
                  </div>
                ) : hod.approved === false ? (
                  <div>
                    <span style={{ color: '#991b1b', fontWeight: 600 }}>❌ Rejected by HOD</span>
                    {hod.approvedBy && <div style={{ marginTop: '6px' }}>By: <strong>{hod.approvedBy}</strong></div>}
                    {hod.date && <div>Date: <strong>{hod.date}</strong></div>}
                    {hod.remarks && <div>Remarks: <em>{hod.remarks}</em></div>}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>⏳ Pending HOD Approval</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const pendingCount = pendingSubs.length + hodPendingSubs.length;
  return (
    <div>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>
        Document Approvals
        {pendingCount > 0 && (
          <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#fef9c3', color: '#854d0e', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            {pendingCount} pending
          </span>
        )}
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
        {role === 'SUPERVISOR' && 'Documents awaiting your approval — and HOD approvals based on org structure.'}
        {role === 'HR' && 'HR verification queue and all document history.'}
        {role === 'ACCOUNTS' && 'Documents pending accounts processing.'}
        {role === 'HOD' && 'Final document reviews for HOD.'}
      </p>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{ padding: '8px 4px', border: 'none', background: 'none', color: activeTab === 'pending' ? '#0ea5e9' : '#64748b', borderBottom: activeTab === 'pending' ? '2px solid #0ea5e9' : '2px solid transparent', marginBottom: '-2px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
        >
          Pending Approvals {pendingSubs.length > 0 && `(${pendingSubs.length})`}
        </button>
        {hodPendingSubs.length > 0 && (
          <button
            onClick={() => setActiveTab('hod')}
            style={{ padding: '8px 4px', border: 'none', background: 'none', color: activeTab === 'hod' ? '#7c3aed' : '#64748b', borderBottom: activeTab === 'hod' ? '2px solid #7c3aed' : '2px solid transparent', marginBottom: '-2px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldCheck size={14} color="#7c3aed" />
            HOD Pending ({hodPendingSubs.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('history')}
          style={{ padding: '8px 4px', border: 'none', background: 'none', color: activeTab === 'history' ? '#0ea5e9' : '#64748b', borderBottom: activeTab === 'history' ? '2px solid #0ea5e9' : '2px solid transparent', marginBottom: '-2px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
        >
          History / All
        </button>
      </div>

      {/* HOD pending banner */}
      {hodPendingSubs.length > 0 && activeTab !== 'hod' && (
        <div
          onClick={() => setActiveTab('hod')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'linear-gradient(135deg,#fdf4ff,#f5f3ff)', border: '1px solid #e9d5ff', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' }}
        >
          <ShieldCheck size={18} color="#7c3aed" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#7c3aed' }}>
            {hodPendingSubs.length} document{hodPendingSubs.length > 1 ? 's' : ''} awaiting your HOD approval (org structure)
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9333ea' }}>View →</span>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Employee</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Form</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Submitted</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'pending' ? pendingSubs : activeTab === 'hod' ? hodPendingSubs : otherSubs).map(sub => (
              <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 500 }}>{sub.employeeName}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{sub.templateName}</td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b' }}>{new Date(sub.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px 14px' }}>{statusBadge(sub.status)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <button
                    onClick={() => selectSub(sub)}
                    style={{
                      padding: '6px 14px',
                      background: activeTab === 'hod' ? '#7c3aed' : sub.status === pendingStatus ? '#0ea5e9' : '#f8fafc',
                      color: (activeTab === 'hod' || sub.status === pendingStatus) ? 'white' : '#475569',
                      border: (activeTab === 'hod' || sub.status === pendingStatus) ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {activeTab === 'hod' ? <><ShieldCheck size={13} /> HOD Review</> : sub.status === pendingStatus ? <><FileText size={13} /> Review &amp; Approve</> : <><FileText size={13} /> View</>}
                  </button>
                </td>
              </tr>
            ))}
            {(activeTab === 'pending' ? pendingSubs : activeTab === 'hod' ? hodPendingSubs : otherSubs).length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  {activeTab === 'pending' ? 'No documents currently waiting for your review.' : activeTab === 'hod' ? 'No HOD approvals pending.' : 'No document history found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}