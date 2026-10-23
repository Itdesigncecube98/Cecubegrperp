'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, Download, Eye, History, Send, Lock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';
import PreviewTable from './PreviewTable';

const FORMS = {
  FORM_XVII: {
    title: 'FORM- XVII',
    rule: '[See Rule 78 (1) (A) (i)]\nREGISTER OF WAGES',
    cols: ['Sl.No.', 'Name of Workman', 'UAN NO.', 'DATE OF ENTRY INTO SERVICE', 'Designation/ Nature of Work Man', 'CATEGORY', 'No. of Days Work-ed', 'Total Days for wages payment', 'Daily Rate of Wages/Piece Rate', 'Basic Wages', 'HRA', 'Other Allowance', 'Overtime', 'Other Cash Payment (Nature of payment to be indicated)', 'Total', 'PF @ 12%', 'ESI @ 0.75%', 'Other', 'Deduction if any (indicate nature)', 'Net Amount Paid', 'Signature/\nThumb impression of workman']
  },
  FORM_10: {
    title: 'FORM-10',
    rule: '[Prescribed Under Factory Rules 78]\nOVERTIME MUSTER ROLL FOR EXEMPTED WORKER',
    cols: ['Sl.No.', 'Name', 'Department', 'Date on which Overtime has been worked', 'Extent of Overtime on each Occasion', 'Total Overtime worked or production in case of piece workers', 'Normal Hours', 'Normal Rate or Pay', 'Overtime Rate or Pay', 'Normal Earning', 'Overtime Earning', 'Cash Equivalent of Advantage Accruing through the concessional sale of food against and other articles', 'Total Earning', 'Remarks']
  },
  FORM_XIII: {
    title: 'FORM- XIII',
    rule: '[See Rule 75]\nREGISTER OF WORKMEN EMPLOYED BY CONTRACTOR',
    cols: ['Sl.No.', 'Name and Surname of workman', 'Age and Sex', "Father's / Husband's Name", 'Nature of Employment /Designation', 'Permanent Home Address of Workmen (Village and Tehsil, Taluk, and District)', 'Local Address', 'Date of Commencement of Employment', 'Signature or Thumb Impression of Workman', 'Date of Termination of Employment', 'Reasons for Termination', 'Remarks']
  },
  FORM_I: {
    title: 'FORM- I',
    rule: '[See Rule 21] (Under Minimum Wages Rules)\nREGISTER OF FINES',
    cols: ['Sl.No.', 'Name', "father's / Husband's Name", 'Sex', 'Department', 'Nature and Date of Offence for which fine Imposed', 'Whether Worker Showed Caused against fine or not', 'Rate of Wages', 'Date of fine imposed', 'Amount of fine imposed (Rs.)', 'Date on which fine Realised', 'Remarks']
  },
  FORM_III: {
    title: 'FORM-III',
    rule: 'REGISTER OF ADVANCE MADE TO EMPLOYED PERSON',
    cols: ['Sl.No.', 'Name', "Father's Name", 'Department', 'Date and Amount of Advance Made', 'Purpose (s) for which Advance Made', 'No. of Instalment by Which Advance to be repaid', 'Postponement Granted', 'Date on which Total Amount Repaid', 'Remarks']
  },
  FORM_XVI: {
    title: 'FORM- XVI',
    rule: '[See Rule 78 (1) (A) (i)]\nMuster Roll',
    cols: ['Sl.No.', 'Name of Workman', "Father's Name", 'Sex', ...Array.from({length: 31}, (_, i) => String(i+1)), 'H/ WO/ L', 'P', 'Pay Day', 'Remarks']
  },
  FORM_II: {
    title: 'FORM- II',
    rule: '[See Rule 21] (Under Minimum Wages Rules 1962)\nREGISTER OF DEDUCTION FOR DAMAGE OF LOSS CAUSED TO THE EMPLOYER\nBY THE NEGLECT OR DEFAULT OF THE EMPLOYED PERSON',
    cols: ['Sl.No.', 'Name', "Father's / Husband's Name", 'Sex', 'Department', 'Damage or Loss Caused with Date', 'Whether Worker Showed Caused against Deduction Y/No.', 'Date and Amount of fine imposed - Enter Date', 'Date and Amount of fine imposed - Rs.', 'No. Of Instalments, if any', 'Date as which total Amount Realised', 'Remarks']
  }
};

function resolveOrganisation(value) {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase();
  const isGreen = normalized.includes('green energy') || normalized.includes('cgepl');
  if (isGreen) return 'CeCube Green Energy Pvt. Ltd.';
  return 'CeCube Engineering India Pvt. Ltd.';
}

function fmtDateTime(val) {
  if (!val) return '-';
  return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GovtForms() {
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'history'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ department: 'Select Here', location: 'Select Here', employeeId: 'Select Here', payCycleId: 'Select Here' });
  
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);

  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  const [previewForm, setPreviewForm] = useState('FORM_III');
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef(null);

  // Submission / locking state
  const [submissions, setSubmissions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedInfo, setLockedInfo] = useState(null);
  const [markSentLoading, setMarkSentLoading] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Check lock status whenever payCycleId or previewForm changes
  useEffect(() => {
    if (filters.payCycleId && filters.payCycleId !== 'Select Here') {
      checkLockStatus(filters.payCycleId, previewForm);
    } else {
      setIsLocked(false);
      setLockedInfo(null);
    }
  }, [filters.payCycleId, previewForm]);

  const fetchDropdownData = async () => {
    try {
      const [deptRes, locRes, empRes, cyclesRes] = await Promise.all([
        fetch('/api/synchronization?type=departments'),
        fetch('/api/synchronization?type=siteoffices'),
        fetch('/api/employees'),
        fetch('/api/payroll/cycles')
      ]);
      
      if (deptRes.ok) {
        const json = await deptRes.json();
        setDepartments(json);
        setSelectedDepartments(json.map(d => d.name || d));
      }
      if (locRes.ok) {
        const json = await locRes.json();
        setLocations(json);
        setSelectedBranches(json.map(l => l.name || l));
      }
      if (empRes.ok) {
        const json = await empRes.json();
        setEmployees(json);
        setSelectedEmployees(json.map(e => `${e.name} (${e.empId})`));
      }
      if (cyclesRes.ok) {
        const json = await cyclesRes.json();
        setCycles(json);
        if (json.length > 0) {
          setFilters(prev => ({ ...prev, payCycleId: json[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching dropdown data', err);
    }
  };

  const checkLockStatus = async (payCycleId, formType) => {
    try {
      const res = await fetch(`/api/payroll/govt-form-submissions?payCycleId=${payCycleId}`);
      if (res.ok) {
        const subs = await res.json();
        // Check if this specific form type or ALL forms for this cycle are locked
        const lockedSub = subs.find(s => 
          s.status === 'SENT_TO_GOVT' && 
          (s.formType === formType || s.formType === 'ALL')
        );
        setIsLocked(!!lockedSub);
        setLockedInfo(lockedSub || null);
      }
    } catch (err) {
      console.error('Error checking lock status', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setShowPreview(false);
    try {
      const params = new URLSearchParams();
      if (filters.department && filters.department !== 'Select Here') params.append('department', filters.department);
      if (filters.location && filters.location !== 'Select Here') params.append('location', filters.location);
      if (filters.employeeId && filters.employeeId !== 'Select Here') params.append('employeeId', filters.employeeId);
      if (filters.payCycleId && filters.payCycleId !== 'Select Here') params.append('payCycleId', filters.payCycleId);
      params.append('status', 'Posted'); 

      const res = await fetch(`/api/payroll/post-salary?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setSelectedRows(new Set(json.map(r => r.id)));
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/payroll/govt-form-submissions');
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json);
      }
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handlePreviewForms = async () => {
    if (isLocked) {
      alert('These government forms have been sent to the government and are locked. No edits allowed.');
      return;
    }
    if (data.filter(r => selectedRows.has(r.id)).length === 0) {
      alert('Please select at least one record to preview forms.');
      return;
    }

    setShowPreview(true);

    // Log this generation event
    if (filters.payCycleId && filters.payCycleId !== 'Select Here') {
      try {
        await fetch('/api/payroll/govt-form-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'GENERATE',
            payCycleId: filters.payCycleId,
            formType: previewForm,
            recordCount: data.filter(r => selectedRows.has(r.id)).length,
            organisation: [...new Set(data.filter(r => selectedRows.has(r.id)).map(r => resolveOrganisation(r.organisation)))].join(', ')
          })
        });
      } catch (err) {
        console.error('Failed to log generation', err);
      }
    }
  };

  const handleMarkSentToGovt = async () => {
    if (!filters.payCycleId || filters.payCycleId === 'Select Here') {
      alert('Please select a pay cycle first.');
      return;
    }
    const cycleName = cycles.find(c => c.id === filters.payCycleId)?.name || filters.payCycleId;
    const confirmed = window.confirm(
      `⚠️ WARNING: This action will permanently LOCK all government forms for:\n\nPay Cycle: ${cycleName}\nForm: ${FORMS[previewForm]?.title || previewForm}\n\nOnce locked, these forms CANNOT be edited.\n\nAre you sure?`
    );
    if (!confirmed) return;

    setMarkSentLoading(true);
    try {
      const res = await fetch('/api/payroll/govt-form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_SENT',
          payCycleId: filters.payCycleId,
          formType: previewForm,
          sentBy: 'Admin'
        })
      });
      if (res.ok) {
        alert('✅ Government forms marked as sent. They are now locked permanently.');
        setIsLocked(true);
        setShowPreview(false);
        await checkLockStatus(filters.payCycleId, previewForm);
        if (activeTab === 'history') fetchHistory();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to mark as sent'));
      }
    } catch (err) {
      console.error('Error marking as sent', err);
      alert('Failed to mark as sent to government.');
    } finally {
      setMarkSentLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-area');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Government Form</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page { 
              size: landscape; 
              margin: 8mm; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              table-layout: auto;
            }
            td, th { 
              border: 1px solid #99ccff;
              padding: 4px 6px; 
              word-wrap: break-word; 
              white-space: normal;
            }
            tr { page-break-inside: avoid; }
            .preview-table-container { 
              overflow: visible;
              width: 100%;
              margin-bottom: 30px;
            }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleExportExcel = async () => {
    const printContent = document.getElementById('print-area');
    if (!printContent) {
      alert('Please preview the forms first to export.');
      return;
    }
    
    const tables = printContent.querySelectorAll('.preview-table-container');
    if (tables.length === 0) {
      alert('No data to export.');
      return;
    }

    const formDef = FORMS[previewForm];
    const isBlue = previewForm === 'FORM_I';

    for (let i = 0; i < tables.length; i++) {
      const container = tables[i];
      const org = container.getAttribute('data-org') || 'Organisation';
      const address = container.getAttribute('data-address') || '';
      const monthStr = container.getAttribute('data-month') || '';
      const location = container.getAttribute('data-location') || '';
      const woNo = container.getAttribute('data-wono') || '';

      const trs = container.querySelectorAll('tbody tr:not(.no-print)');
      const rows = [];
      
      trs.forEach(tr => {
        const rowData = [];
        const tds = tr.querySelectorAll('td');
        tds.forEach(td => {
          rowData.push(td.innerText || '');
        });
        rows.push(rowData);
      });

      const res = await fetch('/api/payroll/govt-forms-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formTitle: formDef.title,
          formRule: formDef.rule,
          cols: formDef.cols,
          rows,
          contractorName: org,
          contractorAddress: address,
          monthStr,
          location,
          woNo,
          theme: isBlue ? 'blue' : 'yellow'
        })
      });

      if (!res.ok) { alert('Excel export failed'); continue; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formDef.title.replace(/\s+/g, '_')}_${org.replace(/\s+/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getGroupedRecords = () => {
    const selectedRecords = data.filter(r => selectedRows.has(r.id));
    const groups = {};
    selectedRecords.forEach(r => {
      const org = resolveOrganisation(r.organisation);
      if (!groups[org]) groups[org] = [];
      groups[org].push(r);
    });
    return groups;
  };

  const fmtDate = (val) => val ? new Date(val).toLocaleDateString('en-IN') : '';

  const getMappers = (r, idx) => {
    const basic = Number(r.basicPay || 0);
    const hra = Number(r.hra || 0);
    const pf = Number(r.pf || r.employeePf || 0);
    const esi = Number(r.esi || r.employeeEsi || 0);
    const otherDed = (Number(r.totalDeductions || 0) - pf - esi).toFixed(2);
    const otherAllow = (Number(r.grossPay || 0) - basic - hra).toFixed(2);
    const dailyRate = r.workingDays ? (Number(r.grossPay) / Number(r.workingDays)).toFixed(2) : '0';

    return {
      FORM_XVII: [
        idx + 1, r.name, r.uan || r.uanNumber || '', fmtDate(r.joinedDate), r.designation, r.category || 'Skilled',
        r.presentDays ?? r.workingDays, r.workingDays, dailyRate, basic.toFixed(2), hra > 0 ? hra.toFixed(2) : '0', 
        otherAllow > 0 ? otherAllow : '0', '0', '0', Number(r.grossPay || 0).toFixed(2), 
        pf > 0 ? pf.toFixed(2) : '0', esi > 0 ? esi.toFixed(2) : '0', 
        otherDed > 0 ? otherDed : '0', '', Number(r.netPay || 0).toFixed(2), ''
      ],
      FORM_XIII: [
        idx + 1, r.name, `${r.dateOfBirth ? r.dateOfBirth : ''} / ${r.gender ? r.gender.charAt(0).toUpperCase() : ''}`, 
        r.fatherName, r.designation, r.address, r.address, fmtDate(r.joinedDate), '', '', '', ''
      ],
      FORM_10: [idx + 1, r.name, r.department || '', '', '', '', '', '', '', '', '', '', '', ''],
      FORM_I: [idx + 1, r.name, r.fatherName, r.gender, r.department || '', '', '', dailyRate, '', '', '', ''],
      FORM_III: [idx + 1, r.name, r.fatherName, r.department || '', '', '', '', '', '', ''],
      FORM_XVI: [
        idx + 1, r.name, r.fatherName, r.gender,
        ...Array.from({length: 31}, (_, i) => (i + 1) % 7 === 0 ? 'W/O' : 'P'),
        '4', '25', '29', ''
      ],
      FORM_II: [idx + 1, r.name, r.fatherName, r.gender, r.department || '', '', '', '', '', '', '', '']
    };
  };

  const renderPreviews = () => {
    const groups = getGroupedRecords();
    return Object.entries(groups).map(([org, records]) => {
      const cycleInfo = records[0] || {};
      const monthStr = (cycleInfo.payCycleStartDate || cycleInfo.startDate) ? new Date(cycleInfo.payCycleStartDate || cycleInfo.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', "'") : '';
      const location = cycleInfo.location || 'SITC of 11KV External Electrical Work at Sector -41, Kurukshetra';
      const woNo = cycleInfo.woNumber || '4300199494';
      const address = org.includes('Green') ? 'Plot No 71, Sec-18, Gurugram, Haryana' : 'A121-122, New Palam Vihar, Gurugram, Haryana';

      return (
        <div key={org} style={{ marginBottom: '60px' }}>
          <PreviewTable 
            title={FORMS[previewForm].title}
            rule={FORMS[previewForm].rule}
            cols={FORMS[previewForm].cols}
            records={records}
            dataMapper={(r, idx) => getMappers(r, idx)[previewForm]}
            contractorName={org}
            contractorAddress={address}
            monthStr={monthStr}
            location={location}
            woNo={woNo}
            theme={previewForm === 'FORM_I' ? 'blue' : 'yellow'}
            locked={isLocked}
            renderFooter={previewForm === 'FORM_XVI' ? (c, borderColor) => (
              <tr style={{ backgroundColor: '#ffffff', fontWeight: 'bold' }}>
                <td colSpan="4" style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'right' }}></td>
                {Array.from({length: 31}, (_, i) => (
                  <td key={i} contentEditable={!isLocked} suppressContentEditableWarning style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'center' }}>
                    {(i + 1) % 7 === 0 ? '0' : '4'}
                  </td>
                ))}
                <td style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'center' }}>16</td>
                <td style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'center' }}>100</td>
                <td style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'center' }}>116</td>
                <td style={{ border: `1px solid ${borderColor}`, padding: '6px' }}></td>
              </tr>
            ) : null}
          />
        </div>
      );
    });
  };

  // Group history submissions by payCycleId
  const groupedHistory = submissions.reduce((acc, sub) => {
    const key = sub.payCycleId;
    if (!acc[key]) acc[key] = { payCycle: sub.payCycle, entries: [] };
    acc[key].entries.push(sub);
    return acc;
  }, {});

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
            font-size: 10px;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .preview-table-container {
            overflow: visible !important;
            overflow-x: visible !important;
            width: 100% !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          td, th {
            word-wrap: break-word;
            white-space: normal !important;
          }
        }

        .gf-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1.2rem;
          border: none;
          border-radius: 6px 6px 0 0;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .gf-tab-btn.active {
          background: #0f766e;
          color: white;
        }
        .gf-tab-btn:not(.active) {
          background: #f1f5f9;
          color: #475569;
        }
        .gf-tab-btn:not(.active):hover {
          background: #e2e8f0;
        }

        .lock-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 0.75rem 1.2rem;
          margin-bottom: 1rem;
          color: #92400e;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .lock-banner svg { color: #d97706; flex-shrink: 0; }

        .history-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .history-card-header {
          background: linear-gradient(135deg, #0f766e, #0d9488);
          color: white;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .history-entry {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 140px;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.875rem;
        }
        .history-entry:last-child { border-bottom: none; }
        .history-entry:nth-child(even) { background: #f8fafc; }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .status-sent { background: #dcfce7; color: #166534; }
        .status-generated { background: #dbeafe; color: #1e40af; }
        .mark-sent-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.85rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .mark-sent-btn:hover { background: #b91c1c; }
        .mark-sent-btn:disabled { background: #9ca3af; cursor: not-allowed; }
      `}} />

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '2px solid #0f766e', marginBottom: '1rem' }}>
        <button
          className={`gf-tab-btn ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
        >
          <Eye size={16} /> Generate Forms
        </button>
        <button
          className={`gf-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} /> Submission History
        </button>
      </div>

      {/* ── FORMS TAB ── */}
      {activeTab === 'forms' && (
        <>
          {/* Lock Banner */}
          {isLocked && lockedInfo && (
            <div className="lock-banner">
              <Lock size={20} />
              <div>
                <div>🔒 LOCKED — These forms were marked as <strong>Sent to Government</strong></div>
                <div style={{ fontSize: '0.78rem', fontWeight: 400, marginTop: '2px' }}>
                  Sent on: {fmtDateTime(lockedInfo.sentToGovtAt)} &nbsp;|&nbsp; By: {lockedInfo.sentBy || 'Unknown'}
                </div>
              </div>
            </div>
          )}

          <div className="filter-bar">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', width: '100%', marginBottom: '0.75rem' }}>
              <div className="filter-group">
                <label>Organization / Branch</label>
                <MultiSelect options={locations.map(l => l.name || l)} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
              </div>
              <div className="filter-group">
                <label>Department</label>
                <MultiSelect options={departments.map(d => d.name || d)} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
              </div>
              <div className="filter-group">
                <label>Employee</label>
                <MultiSelect options={employees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
              </div>
            </div>
            <div className="filter-group" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Pay Cycle</label>
                <select 
                  value={filters.payCycleId} 
                  onChange={(e) => setFilters({...filters, payCycleId: e.target.value})}
                  style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="Select Here">-- Select Pay Cycle --</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', height: '36px' }} onClick={fetchData}>
                <Search size={16} /> Search
              </button>
            </div>
          </div>

          <div className="summary-badges" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ color: '#0284c7', fontWeight: '600', backgroundColor: '#e0f2fe', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                Total Records: {data.length}
              </div>
              <div style={{ color: '#16a34a', fontWeight: '600', backgroundColor: '#dcfce7', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                Selected: {selectedRows.size}
              </div>
              {isLocked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#92400e', fontWeight: '600', backgroundColor: '#fef3c7', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                  <Lock size={14} /> Locked (Sent to Govt)
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                value={previewForm}
                onChange={(e) => { setPreviewForm(e.target.value); setShowPreview(false); }}
                style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="FORM_III">FORM-III (Register of Advance)</option>
                <option value="FORM_I">FORM-I (Register of Fines)</option>
                <option value="FORM_II">FORM-II (Register of Deduction for Damage/Loss)</option>
                <option value="FORM_XVII">FORM-XVII (Register of Wages)</option>
                <option value="FORM_10">FORM-10 (Overtime Muster Roll)</option>
                <option value="FORM_XIII">FORM-XIII (Register of Workmen)</option>
                <option value="FORM_XVI">FORM-XVI (Muster Roll)</option>
              </select>

              <button 
                className="btn-primary" 
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: isLocked ? '#9ca3af' : '#3b82f6' }}
                onClick={handlePreviewForms}
                disabled={isLocked}
                title={isLocked ? 'Forms are locked — sent to government' : ''}
              >
                {isLocked ? <Lock size={16} /> : <Eye size={16} />}
                {isLocked ? 'Locked' : 'Preview Editable Form'}
              </button>

              {showPreview && !isLocked && (
                <>
                  <button 
                    className="btn-primary" 
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0f766e' }}
                    onClick={handlePrint}
                  >
                    <Printer size={16} /> Print Preview
                  </button>

                  <button 
                    className="btn-primary" 
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#d97706' }}
                    onClick={handlePrint}
                  >
                    <Download size={16} /> Download PDF
                  </button>

                  <button 
                    className="btn-primary" 
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#16a34a' }}
                    onClick={handleExportExcel}
                  >
                    <Download size={16} /> Export Excel
                  </button>

                  {/* Mark as Sent to Govt button */}
                  <button 
                    style={{ 
                      display: 'flex', gap: '0.5rem', alignItems: 'center', 
                      backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px',
                      padding: '0.45rem 1rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                    }}
                    onClick={handleMarkSentToGovt}
                    disabled={markSentLoading}
                  >
                    <Send size={16} /> {markSentLoading ? 'Locking...' : 'Mark as Sent to Govt 🔒'}
                  </button>
                </>
              )}
            </div>
          </div>

          {!showPreview ? (
            <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f766e', color: 'white', textAlign: 'left', fontSize: '0.9rem' }}>
                    <th style={{ width: '40px', padding: '0.75rem' }}>
                      <input 
                        type="checkbox" 
                        checked={data.length > 0 && selectedRows.size === data.length}
                        onChange={(e) => setSelectedRows(e.target.checked ? new Set(data.map(r => r.id)) : new Set())}
                      />
                    </th>
                    <th style={{ padding: '0.75rem', fontWeight: '500' }}>Employee Name</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500' }}>Organization</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500' }}>Pay Cycle</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500' }}>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No posted records found. Please select a pay cycle and search.</td></tr>
                  ) : (
                    data.map((row, index) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedRows.has(row.id)}
                            disabled={isLocked}
                            onChange={(e) => {
                              if (isLocked) return;
                              const newSet = new Set(selectedRows);
                              if (e.target.checked) newSet.add(row.id);
                              else newSet.delete(row.id);
                              setSelectedRows(newSet);
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</div>
                          <div style={{ fontSize: '0.75rem' }}>{row.location}</div>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontWeight: 500 }}>{row.organisation || 'N/A'}</td>
                        <td style={{ padding: '0.75rem', color: '#0369a1', fontWeight: 600 }}>{row.payCycleName}</td>
                        <td style={{ padding: '0.75rem', color: '#16a34a', fontWeight: 700 }}>₹{row.netSalary}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div id="print-area" style={{ marginTop: '20px' }}>
              {isLocked && (
                <div style={{
                  background: '#fef3c7', border: '2px dashed #f59e0b', borderRadius: '8px',
                  padding: '0.75rem 1.2rem', marginBottom: '1rem', display: 'flex',
                  alignItems: 'center', gap: '0.5rem', color: '#92400e', fontWeight: 700
                }} className="no-print">
                  <Lock size={18} /> READ ONLY — These forms are locked (sent to government)
                </div>
              )}
              {renderPreviews()}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Government Form Submission History
            </h2>
            <button
              onClick={fetchHistory}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading history...</div>
          ) : Object.keys(groupedHistory).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
              <History size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 600 }}>No submission history yet.</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Generate and send government forms to see them here.</div>
            </div>
          ) : (
            Object.values(groupedHistory).map(({ payCycle, entries }) => (
              <div key={payCycle?.id} className="history-card">
                <div className="history-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📅 {payCycle?.name || 'Unknown Pay Cycle'}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 400, opacity: 0.8 }}>
                      ({payCycle?.startDate} – {payCycle?.endDate})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                    {entries.length} form{entries.length !== 1 ? 's' : ''} generated
                  </div>
                </div>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 140px', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Form Type</span>
                  <span>Generated At</span>
                  <span>Sent to Govt At</span>
                  <span>Sent By</span>
                  <span>Status</span>
                </div>
                {entries.map(entry => (
                  <div key={entry.id} className="history-entry">
                    <div>
                      <strong>{FORMS[entry.formType]?.title || entry.formType}</strong>
                      {entry.organisation && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{entry.organisation}</div>}
                      {entry.recordCount > 0 && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{entry.recordCount} records</div>}
                    </div>
                    <div style={{ color: '#475569' }}>{fmtDateTime(entry.generatedAt)}</div>
                    <div style={{ color: entry.sentToGovtAt ? '#166534' : '#94a3b8' }}>
                      {entry.sentToGovtAt ? fmtDateTime(entry.sentToGovtAt) : '—'}
                    </div>
                    <div style={{ color: '#475569' }}>{entry.sentBy || '—'}</div>
                    <div>
                      {entry.status === 'SENT_TO_GOVT' ? (
                        <span className="status-badge status-sent">
                          <CheckCircle size={12} /> Sent to Govt
                        </span>
                      ) : (
                        <span className="status-badge status-generated">
                          <AlertCircle size={12} /> Generated
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
