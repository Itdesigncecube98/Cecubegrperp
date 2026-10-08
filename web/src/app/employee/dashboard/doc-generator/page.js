'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Save, Send, Download, Plus, Trash2, ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getEmployees } from '../../../../lib/data';

// ---------------------------------------------------------------------------
// Hardcoded templates
// ---------------------------------------------------------------------------
const TEMPLATES = [
  {
    id: 'ACCOMMODATION',
    formName: 'Accommodation Reimbursement Form',
    subtitle: 'Applicable for Employees Stationed Outside Gurgaon Region',
    columns: [
      { id: 'stayPeriod', name: 'Stay Period' },
      { id: 'location', name: 'Accommodation Location / Hotel' },
      { id: 'billNo', name: 'Bill / Invoice No.' },
      { id: 'amount', name: 'Amount Claimed' },
      { id: 'projectCostCenter', name: 'Project Cost Center' },
    ],
    eligibility: [
      'I confirm that I am currently stationed outside Gurgaon region for official company work during the above-mentioned period.',
      'I confirm that the accommodation reimbursement claimed below is as per company policy communicated through HR.',
      'I understand that submission of incorrect information may lead to rejection of claim and disciplinary action as per company policy.',
    ],
    notes: [
      'Accommodation reimbursement is applicable only for employees stationed outside Gurgaon region, as per company policy.',
      'Claim must be submitted on a monthly basis.',
      'Supporting bills / invoices must be attached with the claim, wherever applicable.',
      'Reimbursement shall be processed subject to approval from Reporting Manager / Project Head.',
      'Incomplete forms or unsupported claims may be kept on hold.',
      'Company reserves the right to verify deployment details before processing reimbursement.',
    ],
  },
  {
    id: 'FOOD',
    formName: 'Food Allowance Reimbursement Form',
    subtitle: 'Applicable for Employees Stationed Outside Gurgaon Region',
    columns: [
      { id: 'period', name: 'Period' },
      { id: 'eligibleAmount', name: 'Eligible Monthly Allowance' },
      { id: 'amount', name: 'Amount Claimed' },
      { id: 'projectCostCenter', name: 'Project Cost Center' },
    ],
    eligibility: [
      'I confirm that I am currently stationed outside Gurgaon region for official company work during the above-mentioned period.',
      'I confirm that the reimbursement claimed below is as per company policy communicated through HR circular dated 05 May 2026.',
      'I understand that submission of incorrect information may lead to rejection of claim and disciplinary action as per company policy.',
    ],
    notes: [
      'Food allowance reimbursement is applicable only for employees stationed outside Gurgaon region.',
      'Claim must be submitted on monthly basis.',
      'Reimbursement shall be processed subject to approval from Reporting Manager / Project Head.',
      'Incomplete forms or unsupported claims may be kept on hold.',
      'Company reserves the right to verify deployment details before processing reimbursement.',
    ],
  },
];

// HOD list (used in print + track view)
const HODS = ['Sanjay Arora', 'Raj Kumar'];

// Approval stages in order
const STAGES = [
  { key: 'PENDING_SUPERVISOR', label: 'Pending Supervisor Approval', next: 'PENDING_HR' },
  { key: 'PENDING_HR', label: 'Pending HR Verification', next: 'PENDING_ACCOUNTS' },
  { key: 'PENDING_ACCOUNTS', label: 'Pending Accounts Processing', next: 'PENDING_HOD' },
  { key: 'PENDING_HOD', label: 'Pending HOD Approval', next: 'APPROVED' },
  { key: 'APPROVED', label: 'Approved', next: null },
  { key: 'REJECTED', label: 'Rejected', next: null },
  { key: 'DRAFT', label: 'Draft', next: null },
];

function statusColor(status) {
  if (status === 'APPROVED') return { bg: '#dcfce7', color: '#166534' };
  if (status === 'REJECTED') return { bg: '#fee2e2', color: '#991b1b' };
  if (status === 'DRAFT') return { bg: '#f1f5f9', color: '#475569' };
  return { bg: '#fef9c3', color: '#854d0e' };
}

function statusLabel(status) {
  const stage = STAGES.find(s => s.key === status);
  return stage ? stage.label : status;
}

export default function EmployeeDocGenerator() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewSub, setViewSub] = useState(null); // read-only view of a submitted form

  // Form fields
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [projectName, setProjectName] = useState('');
  const [monthYear, setMonthYear] = useState('');
  const [reportingManager, setReportingManager] = useState('');
  const [location, setLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [supportingDocs, setSupportingDocs] = useState([]); // [{name, size, dataUrl}]
  const [empSignature, setEmpSignature] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [certified, setCertified] = useState(false);
  const [tableRows, setTableRows] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const emp = JSON.parse(empData);
      setEmployee(emp);
      setEmpName(emp.name || '');
      setEmpCode(emp.empId || '');
      setDesignation(emp.designation || '');
      setDepartment(emp.department || '');
    }
    loadSubmissions();
    const fetchEmps = async () => {
      try {
        const data = await getEmployees();
        setEmployeesList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load employees:', e);
      }
    };
    fetchEmps();
  }, []);

  const loadSubmissions = () => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) return;
    const emp = JSON.parse(empData);
    const saved = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    setSubmissions(saved.filter(s => s.employeeId === emp.id));
  };

  const emptyRow = (template) => {
    const row = { id: Date.now() + Math.random() };
    template.columns.forEach(c => (row[c.id] = ''));
    return row;
  };

  const startNew = (template) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setEditingId(null);
    setCertified(false);
    setEmpSignature('');
    setPlace('');
    setDate('');
    setProjectName('');
    setMonthYear('');
    setReportingManager('');
    setLocation('');
    setRemarks('');
    setSupportingDocs([]);
    // pre-fill from employee
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const emp = JSON.parse(empData);
      setEmpName(emp.name || '');
      setEmpCode(emp.empId || '');
      setDesignation(emp.designation || '');
      setDepartment(emp.department || '');
    }
    setTableRows([emptyRow(template), emptyRow(template), emptyRow(template)]);
  };

  const editDraft = (sub) => {
    const tmpl = TEMPLATES.find(t => t.id === sub.templateId);
    if (!tmpl) return alert('Template not found');
    setSelectedTemplate(tmpl);
    setIsEditing(true);
    setEditingId(sub.id);
    setEmpName(sub.fields.empName || '');
    setEmpCode(sub.fields.empCode || '');
    setDesignation(sub.fields.designation || '');
    setDepartment(sub.fields.department || '');
    setProjectName(sub.fields.projectName || '');
    setMonthYear(sub.fields.monthYear || '');
    setReportingManager(sub.fields.reportingManager || '');
    setLocation(sub.fields.location || '');
    setRemarks(sub.fields.remarks || '');
    setSupportingDocs(sub.supportingDocs || []);
    setEmpSignature(sub.fields.empSignature || '');
    setPlace(sub.fields.place || '');
    setDate(sub.fields.date || '');
    setCertified(sub.certified || false);
    setTableRows(sub.tableRows || [emptyRow(tmpl)]);
  };

  const deleteDraft = (id) => {
    if (!confirm('Delete this draft?')) return;
    const saved = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    localStorage.setItem('docgen_submissions', JSON.stringify(saved.filter(s => s.id !== id)));
    loadSubmissions();
  };

  const buildSub = (status) => ({
    id: editingId || Date.now().toString(),
    employeeId: employee?.id,
    employeeName: empName,
    templateId: selectedTemplate.id,
    templateName: selectedTemplate.formName,
    status,
    createdAt: new Date().toISOString(),
    certified,
    fields: { empName, empCode, designation, department, projectName, monthYear, reportingManager, location, empSignature, place, date, remarks },
    tableRows,
    supportingDocs,
  });

  const handleSupportingDocs = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSupportingDocs(prev => [...prev, { name: file.name, size: file.size, dataUrl: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const removeDoc = (idx) => setSupportingDocs(prev => prev.filter((_, i) => i !== idx));

  const handleSaveDraft = () => {
    const sub = buildSub('DRAFT');
    const saved = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    const updated = editingId ? saved.map(s => (s.id === editingId ? sub : s)) : [...saved, sub];
    localStorage.setItem('docgen_submissions', JSON.stringify(updated));
    alert('Draft saved!');
    setIsEditing(false);
    loadSubmissions();
  };

  const handleSubmit = () => {
    if (!certified) return alert('Please check the Employee Declaration box before submitting.');
    if (!confirm('Submit this form for approval? It will go to your Supervisor first.')) return;
    const sub = buildSub('PENDING_SUPERVISOR');
    const saved = JSON.parse(localStorage.getItem('docgen_submissions') || '[]');
    const updated = editingId ? saved.map(s => (s.id === editingId ? sub : s)) : [...saved, sub];
    localStorage.setItem('docgen_submissions', JSON.stringify(updated));
    alert('Form submitted successfully! Your supervisor will review it.');
    setIsEditing(false);
    loadSubmissions();
  };

  const handleAddRow = () => setTableRows([...tableRows, emptyRow(selectedTemplate)]);
  const handleDeleteRow = (id) => setTableRows(tableRows.filter(r => r.id !== id));
  const handleCellChange = (id, colId, val) => setTableRows(tableRows.map(r => (r.id === id ? { ...r, [colId]: val } : r)));

  // HOD helpers: hodApproval = { approvedBy, approved (true/false), signature, date, remarks }
  const hodState = (hod, name) => {
    if (hod && hod.approvedBy === name) {
      if (hod.approved === false) return 'REJECTED';
      return 'APPROVED';
    }
    return 'NONE';
  };

  const handlePrint = (sub) => {
    const tmpl = TEMPLATES.find(t => t.id === sub.templateId);
    if (!tmpl) return;
    const sa = sub.supervisorApproval || {};
    const ha = sub.hrApproval || {};
    const aa = sub.accountsApproval || {};
    const hod = sub.hodApproval || {};

    const hodCell = (name) => {
      const st = hodState(hod, name);
      const approved = st === 'APPROVED';
      const rejected = st === 'REJECTED';
      return `<td>${approved ? '&#9745;' : '&#9744;'} Approved &nbsp;&nbsp; ${rejected ? '&#9745;' : '&#9744;'} Not Approved<br/><br/>
        Approved By: ${st !== 'NONE' ? hod.approvedBy : ''}<br/>
        Signature: ${st !== 'NONE' ? (hod.signature || hod.approvedBy) : '__________________'}<br/>
        Date: ${st !== 'NONE' ? (hod.date || '') : '________________________'}
        ${st !== 'NONE' && hod.remarks ? `<br/>Remarks: ${hod.remarks}` : ''}</td>`;
    };

    const pw = window.open('', '_blank', 'width=1200,height=900');
    pw.document.write(`<!DOCTYPE html><html><head><title>${tmpl.formName}</title>
    <style>
      *{box-sizing:border-box} body{font-family:'Times New Roman',serif;margin:0;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4;margin:15mm} table{width:100%;border-collapse:collapse;margin-bottom:15px}
      td,th{border:1.5px solid #000;padding:6px;font-size:13px;text-align:left}
      th{font-weight:bold;background:#e6f2ff}
      .logo-area{text-align:center;margin-bottom:20px} .logo-area img{height:70px;object-fit:contain}
      .sub-header h2{margin:0;font-size:14px} .sub-header h3{margin:0;font-size:12px}
      h1.form-title{font-size:16px;margin:0 0 4px 0} p.form-sub{font-size:12px;font-style:italic;margin:0 0 15px 0}
      h4{margin:5px 0;font-size:13px} ul{margin:0 0 10px 0;padding-left:20px;font-size:12px} li{margin-bottom:3px}
      .sig-row{display:flex;justify-content:space-between;font-size:13px;margin:20px 0}
      .notes-sec{font-size:11px} .approval th{background:#e6f2ff}
      .approval td{vertical-align:top;min-height:100px}
      .status-badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:bold}
    </style></head><body>
    <div class="logo-area"><img src="/logo.png" onerror="this.style.display='none'" /></div>
    <div class="sub-header"><h2>CeCube Engineering India Pvt. Ltd.</h2><h3>CeCube Green Energy Pvt. Ltd.</h3></div>
    <h1 class="form-title">${tmpl.formName.toUpperCase()}</h1>
    <p class="form-sub">${tmpl.subtitle}</p>
    <h4>Employee Details</h4>
    <table><tbody>
      <tr><td style="width:20%;font-weight:bold">Employee Name</td><td style="width:30%">${sub.fields.empName}</td><td style="width:20%;font-weight:bold">Employee Code</td><td style="width:30%">${sub.fields.empCode}</td></tr>
      <tr><td style="font-weight:bold">Designation</td><td>${sub.fields.designation}</td><td style="font-weight:bold">Department</td><td>${sub.fields.department}</td></tr>
      <tr><td style="font-weight:bold">Project / Site Name</td><td>${sub.fields.projectName}</td><td style="font-weight:bold">Month & Year of Claim</td><td>${sub.fields.monthYear}</td></tr>
      <tr><td style="font-weight:bold">Reporting Manager</td><td>${sub.fields.reportingManager}</td><td style="font-weight:bold">Location of Deployment</td><td>${sub.fields.location}</td></tr>
    </tbody></table>
    <h4>Eligibility Declaration</h4>
    <ul>${tmpl.eligibility.map(e => `<li>${e}</li>`).join('')}</ul>
    <h4>${sub.templateId === 'FOOD' ? 'Food Allowance Claim Details' : 'Accommodation Reimbursement Claim Details'}</h4>
    <table><thead><tr><th style="width:8%">Sr.No.</th>${tmpl.columns.map(c => `<th>${c.name}</th>`).join('')}</tr></thead>
    <tbody>${(sub.tableRows || []).map((row, i) => `<tr><td style="text-align:center">${i + 1}</td>${tmpl.columns.map(c => `<td>${row[c.id] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
    ${sub.fields.remarks ? `<h4>Remarks / Description</h4><p style="font-size:13px;border:1px solid #ccc;padding:10px;min-height:50px">${sub.fields.remarks}</p>` : ''}
    <h4>Employee Declaration</h4>
    <p style="font-size:13px">I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.</p>
    <div class="sig-row">
      <span>Employee Signature: ${sub.fields.empSignature || '______________________'}</span>
      <span>Place: ${sub.fields.place || '______________________'}</span>
      <span>Date: ${sub.fields.date || '______________________'}</span>
    </div>
    <h4>Approval Workflow</h4>
    <table class="approval"><thead><tr>
      <th style="width:33%">Reporting Manager</th>
      <th style="width:33%">HR Verification</th>
      <th style="width:34%">Accounts Processing</th>
    </tr></thead><tbody><tr>
      <td>${sa.approved === true ? '&#9745;' : '&#9744;'} Approved &nbsp;&nbsp; ${sa.approved === false ? '&#9745;' : '&#9744;'} Not Approved<br/><br/>Name: ${sa.name || ''}<br/>Designation: ${sa.designation || ''}<br/>Signature: ${sa.signature || '__________________'}<br/>Date: ${sa.date || '________________________'}</td>
      <td>${ha.verifiedBy ? '&#9745;' : '&#9744;'} Eligibility Verified<br/>${ha.verifiedBy ? '&#9745;' : '&#9744;'} Policy Compliance Checked<br/><br/>Verified By: ${ha.verifiedBy || ''}<br/>Signature: ${ha.signature || '__________________'}<br/>Date: ${ha.date || '________________________'}</td>
      <td>${aa.processedBy ? '&#9745;' : '&#9744;'} Processed for the Month of ${aa.processedFor || '______'}<br/><br/>Processed By: ${aa.processedBy || ''}<br/>Signature: ${aa.signature || '__________________'}<br/>Date: ${aa.date || '________________________'}</td>
    </tr></tbody></table>
    <h4>HOD Approval</h4>
    <table class="approval"><thead><tr>
      <th style="width:50%">${HODS[0]} (HOD)</th>
      <th style="width:50%">${HODS[1]} (HOD)</th>
    </tr></thead><tbody><tr>
      ${hodCell(HODS[0])}
      ${hodCell(HODS[1])}
    </tr></tbody></table>
    <div class="notes-sec"><strong>Important Notes</strong><ol style="padding-left:20px;margin:5px 0">${tmpl.notes.map(n => `<li>${n}</li>`).join('')}</ol></div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
    pw.document.close();
  };

  const inputSt = { border: 'none', width: '100%', outline: 'none', background: 'transparent', fontSize: '13px' };
  const cellSt = { border: '1.5px solid #000', padding: '6px', fontSize: '13px' };
  const thSt = { ...cellSt, background: '#e6f2ff', fontWeight: 'bold' };

  // ---- FORM VIEW ----
  if (isEditing && selectedTemplate) {
    return (
      <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setIsEditing(false)} style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={20} color="#475569" />
            </button>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{selectedTemplate.formName}</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveDraft} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <Save size={16} /> Save Draft
            </button>
            <button onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <Send size={16} /> Submit for Approval
            </button>
          </div>
        </div>

        <div style={{ background: 'white', padding: '30px', border: '1px solid #e2e8f0', maxWidth: '900px', margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img src="/logo.png" alt="CeCube" style={{ height: '65px', objectFit: 'contain' }} onError={e => (e.target.style.display = 'none')} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>CeCube Engineering India Pvt. Ltd.</div>
            <div style={{ fontSize: '12px' }}>CeCube Green Energy Pvt. Ltd.</div>
          </div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{selectedTemplate.formName.toUpperCase()}</h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontStyle: 'italic', color: '#555' }}>{selectedTemplate.subtitle}</p>

          <h4 style={{ margin: '0 0 8px 0' }}>Employee Details</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
            <tbody>
              <tr>
                <td style={{ ...cellSt, width: '20%', fontWeight: 'bold' }}>Employee Name</td>
                <td style={{ ...cellSt, width: '30%' }}>
                  <input
                    style={{ ...inputSt, backgroundColor: '#f8fafc', color: '#334155', fontWeight: 500 }}
                    value={empName}
                    disabled
                  />
                </td>
                <td style={{ ...cellSt, width: '20%', fontWeight: 'bold' }}>Employee Code</td>
                <td style={{ ...cellSt, width: '30%' }}><input style={inputSt} value={empCode} onChange={e => setEmpCode(e.target.value)} /></td>
              </tr>
              <tr>
                <td style={{ ...cellSt, fontWeight: 'bold' }}>Designation</td>
                <td style={cellSt}><input style={inputSt} value={designation} onChange={e => setDesignation(e.target.value)} /></td>
                <td style={{ ...cellSt, fontWeight: 'bold' }}>Department</td>
                <td style={cellSt}><input style={inputSt} value={department} onChange={e => setDepartment(e.target.value)} /></td>
              </tr>
              <tr>
                <td style={{ ...cellSt, fontWeight: 'bold' }}>Project / Site Name</td>
                <td style={cellSt}><input style={inputSt} value={projectName} onChange={e => setProjectName(e.target.value)} /></td>
                <td style={{ ...cellSt, fontWeight: 'bold' }}>Month & Year of Claim</td>
                <td style={cellSt}><input style={inputSt} value={monthYear} onChange={e => setMonthYear(e.target.value)} /></td>
              </tr>
              <tr>
                <td style={{ ...cellSt, fontWeight: 'bold' }}>Reporting Manager</td>
                <td style={cellSt}><input style={inputSt} value={reportingManager} onChange={e => setReportingManager(e.target.value)} /></td>
                <td style={{ ...cellSt, fontWeight: 'bold' }}>Location of Deployment</td>
                <td style={cellSt}><input style={inputSt} value={location} onChange={e => setLocation(e.target.value)} /></td>
              </tr>
            </tbody>
          </table>

          <h4 style={{ margin: '0 0 8px 0' }}>Eligibility Declaration</h4>
          <ul style={{ fontSize: '13px', paddingLeft: '20px', marginBottom: '15px' }}>
            {selectedTemplate.eligibility.map((e, i) => <li key={i}>{e}</li>)}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0 }}>{selectedTemplate.id === 'FOOD' ? 'Food Allowance Claim Details' : 'Accommodation Reimbursement Claim Details'}</h4>
            <button onClick={handleAddRow} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              <Plus size={14} /> Add Row
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
            <thead>
              <tr>
                <th style={{ ...thSt, width: '8%' }}>Sr. No.</th>
                {selectedTemplate.columns.map(c => <th key={c.id} style={thSt}>{c.name}</th>)}
                <th style={{ ...thSt, width: '32px' }}></th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={row.id}>
                  <td style={{ ...cellSt, textAlign: 'center' }}>{i + 1}</td>
                  {selectedTemplate.columns.map(c => (
                    <td key={c.id} style={cellSt}><input style={inputSt} value={row[c.id] || ''} onChange={e => handleCellChange(row.id, c.id, e.target.value)} /></td>
                  ))}
                  <td style={{ ...cellSt, textAlign: 'center', padding: '2px' }}>
                    <button onClick={() => handleDeleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Remarks / Description</h4>
            <textarea style={{ ...inputSt, width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="Enter any additional remarks or description here..." value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Supporting Documents</h4>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0284c7', marginBottom: '10px' }}>
              <Plus size={14} /> Attach Files
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={handleSupportingDocs} />
            </label>
            {supportingDocs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {supportingDocs.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}>
                    <FileText size={13} color="#0ea5e9" />
                    <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                    <span style={{ color: '#94a3b8' }}>({(doc.size / 1024).toFixed(1)} KB)</span>
                    <button onClick={() => removeDoc(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {supportingDocs.length === 0 && (
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>No documents attached. Please attach bills / invoices / receipts as required.</p>
            )}
          </div>

          <h4 style={{ margin: '0 0 8px 0' }}>Employee Declaration</h4>
          <p style={{ fontSize: '13px', margin: '0 0 12px 0' }}>I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Employee Signature: <input value={empSignature} onChange={e => setEmpSignature(e.target.value)} style={{ borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none', width: '140px', outline: 'none', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Place: <input value={place} onChange={e => setPlace(e.target.value)} style={{ borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none', width: '100px', outline: 'none', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Date: <input value={date} onChange={e => setDate(e.target.value)} style={{ borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', borderRight: 'none', width: '100px', outline: 'none', fontSize: '13px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <input type="checkbox" id="certify" checked={certified} onChange={e => setCertified(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="certify" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 500, color: '#334155' }}>I agree and certify the above statement.</label>
          </div>

          {/* Important Notes */}
          <div style={{ marginTop: '20px', padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: '#92400e' }}>Important Notes</strong>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              {selectedTemplate.notes.map((note, i) => (
                <li key={i} style={{ fontSize: '12px', color: '#78350f', marginBottom: '4px' }}>{note}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ---- READ-ONLY TRACK STATUS VIEW ----
  if (viewSub) {
    const tmpl = TEMPLATES.find(t => t.id === viewSub.templateId);
    const sa = viewSub.supervisorApproval || {};
    const ha = viewSub.hrApproval || {};
    const aa = viewSub.accountsApproval || {};
    const hod = viewSub.hodApproval || {};
    const { bg, color } = statusColor(viewSub.status);
    return (
      <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => setViewSub(null)} style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
            <ArrowLeft size={20} color="#475569" />
          </button>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{viewSub.templateName}</h1>
          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: bg, color }}>{statusLabel(viewSub.status)}</span>
          <button onClick={() => handlePrint(viewSub)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            <Download size={14} /> Print/PDF
          </button>
        </div>

        {/* Approval Status Timeline */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#374151' }}>Approval Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {[
              { label: 'Submitted', done: true },
              { label: 'Supervisor', done: viewSub.supervisorApproval?.approved === true || ['PENDING_HR', 'PENDING_ACCOUNTS', 'PENDING_HOD', 'APPROVED'].includes(viewSub.status), active: viewSub.status === 'PENDING_SUPERVISOR' },
              { label: 'HR Verify', done: viewSub.hrApproval?.approved !== false && ['PENDING_ACCOUNTS', 'PENDING_HOD', 'APPROVED'].includes(viewSub.status), active: viewSub.status === 'PENDING_HR' },
              { label: 'Accounts', done: viewSub.accountsApproval?.processedBy && ['PENDING_HOD', 'APPROVED'].includes(viewSub.status), active: viewSub.status === 'PENDING_ACCOUNTS' },
              { label: 'HOD', done: viewSub.status === 'APPROVED', active: viewSub.status === 'PENDING_HOD' },
              { label: 'Approved', done: viewSub.status === 'APPROVED' },
            ].map((step, i, arr) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px',
                    background: step.done ? '#22c55e' : step.active ? '#f59e0b' : '#e2e8f0',
                    color: step.done || step.active ? 'white' : '#94a3b8',
                  }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: step.done ? '#16a34a' : step.active ? '#d97706' : '#94a3b8', whiteSpace: 'nowrap' }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && <div style={{ flex: 1, height: '2px', background: step.done ? '#22c55e' : '#e2e8f0', minWidth: '30px' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Read-only form */}
        <div style={{ background: 'white', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px', maxWidth: '900px', margin: '0 auto', opacity: 0.95 }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img src="/logo.png" alt="CeCube" style={{ height: '60px', objectFit: 'contain' }} onError={e => (e.target.style.display = 'none')} />
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>CeCube Engineering India Pvt. Ltd.</div>
          <div style={{ fontSize: '12px', marginBottom: '12px' }}>CeCube Green Energy Pvt. Ltd.</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>{viewSub.templateName?.toUpperCase()}</h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ ...cellSt, width: '20%', fontWeight: 'bold', background: '#e6f2ff' }}>Employee Name</td><td style={cellSt}>{viewSub.fields?.empName}</td>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Employee Code</td><td style={cellSt}>{viewSub.fields?.empCode}</td>
              </tr>
              <tr>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Designation</td><td style={cellSt}>{viewSub.fields?.designation}</td>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Department</td><td style={cellSt}>{viewSub.fields?.department}</td>
              </tr>
              <tr>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Project / Site Name</td><td style={cellSt}>{viewSub.fields?.projectName}</td>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Month & Year</td><td style={cellSt}>{viewSub.fields?.monthYear}</td>
              </tr>
              <tr>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Reporting Manager</td><td style={cellSt}>{viewSub.fields?.reportingManager}</td>
                <td style={{ ...cellSt, fontWeight: 'bold', background: '#e6f2ff' }}>Location</td><td style={cellSt}>{viewSub.fields?.location}</td>
              </tr>
            </tbody>
          </table>

          {tmpl && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead><tr>
                <th style={{ ...thSt, width: '8%' }}>Sr. No.</th>
                {tmpl.columns.map(c => <th key={c.id} style={thSt}>{c.name}</th>)}
              </tr></thead>
              <tbody>
                {(viewSub.tableRows || []).map((row, i) => (
                  <tr key={i}>
                    <td style={{ ...cellSt, textAlign: 'center' }}>{i + 1}</td>
                    {tmpl.columns.map(c => <td key={c.id} style={cellSt}>{row[c.id] || ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewSub.fields?.remarks && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Remarks / Description</h4>
              <div style={{ ...inputSt, minHeight: '60px', background: '#f8fafc' }}>
                {viewSub.fields.remarks}
              </div>
            </div>
          )}

          <div style={{ fontSize: '13px', marginBottom: '12px' }}>
            <strong>Employee Declaration</strong>
            <p style={{ margin: '4px 0 12px' }}>I hereby certify that the above claim is true and correct to the best of my knowledge.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Employee Signature: <strong>{viewSub.fields?.empSignature || '—'}</strong></span>
              <span>Place: <strong>{viewSub.fields?.place || '—'}</strong></span>
              <span>Date: <strong>{viewSub.fields?.date || '—'}</strong></span>
            </div>
          </div>

          <strong style={{ fontSize: '13px' }}>Approval Workflow</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <thead><tr>
              <th style={thSt}>Reporting Manager</th>
              <th style={thSt}>HR Verification</th>
              <th style={thSt}>Accounts Processing</th>
            </tr></thead>
            <tbody><tr>
              <td style={cellSt}>
                {sa.approved === true ? '✅ Approved' : sa.approved === false ? '❌ Not Approved' : '⏳ Pending'}
                {sa.name && <div><strong>{sa.name}</strong>{sa.designation && ` (${sa.designation})`}</div>}
                {sa.date && <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {sa.date}</div>}
              </td>
              <td style={cellSt}>
                {ha.verifiedBy ? (
                  <div>✅ Verified by <strong>{ha.verifiedBy}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>Date: {ha.date}</div></div>
                ) : '⏳ Pending'}
              </td>
              <td style={cellSt}>
                {aa.processedBy ? (
                  <div>✅ Processed by <strong>{aa.processedBy}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>For: {aa.processedFor} · Date: {aa.date}</div></div>
                ) : '⏳ Pending'}
              </td>
            </tr></tbody>
          </table>

          <strong style={{ fontSize: '13px', display: 'block', marginTop: '16px' }}>HOD Approval</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <thead><tr>
              {HODS.map(name => <th key={name} style={thSt}>{name} (HOD)</th>)}
            </tr></thead>
            <tbody><tr>
              {HODS.map(name => {
                const st = hodState(hod, name);
                return (
                  <td key={name} style={cellSt}>
                    {st === 'APPROVED' && (
                      <div>
                        ✅ Approved
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {hod.date}</div>
                        {hod.remarks && <div style={{ fontSize: '11px', color: '#64748b' }}>Remarks: {hod.remarks}</div>}
                      </div>
                    )}
                    {st === 'REJECTED' && (
                      <div>
                        ❌ Not Approved
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {hod.date}</div>
                        {hod.remarks && <div style={{ fontSize: '11px', color: '#64748b' }}>Remarks: {hod.remarks}</div>}
                      </div>
                    )}
                    {st === 'NONE' && '⏳ Pending'}
                  </td>
                );
              })}
            </tr></tbody>
          </table>

          {/* Important Notes */}
          {tmpl && (
            <div style={{ marginTop: '20px', padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: '#92400e' }}>Important Notes</strong>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {tmpl.notes.map((note, i) => (
                  <li key={i} style={{ fontSize: '12px', color: '#78350f', marginBottom: '4px' }}>{note}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="#475569" />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>My Applications</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Create and track your document requests.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Templates Sidebar */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Available Forms</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => startNew(tmpl)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              >
                <FileText size={20} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{tmpl.formName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{tmpl.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Form Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(sub => {
                const { bg, color } = statusColor(sub.status);
                return (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{sub.templateName}</td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>{new Date(sub.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: bg, color }}>{statusLabel(sub.status)}</span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {sub.status === 'DRAFT' && (
                          <>
                            <button onClick={() => editDraft(sub)} style={{ padding: '6px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>Edit</button>
                            <button onClick={() => deleteDraft(sub.id)} style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>Delete</button>
                          </>
                        )}
                        {sub.status !== 'DRAFT' && (
                          <button onClick={() => setViewSub(sub)} style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Track Status</button>
                        )}
                        <button onClick={() => handlePrint(sub)} style={{ padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Download size={14} /> Print/PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    You haven't submitted any applications yet. Select a form from the left to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}