'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, Download, Eye } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';
import { downloadPayrollGovernmentForms } from '@/lib/payrollGovernmentForms';
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

export default function GovtForms() {
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

  useEffect(() => {
    fetchDropdownData();
  }, []);

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

  const handleGenerateForms = () => {
    if (!showPreview) {
      alert("Please click 'Preview Editable Form' first, then use 'Download PDF'.");
      return;
    }
    handlePrint();
  };


  const handlePreviewForms = () => {
    if (data.filter(r => selectedRows.has(r.id)).length === 0) {
      alert("Please select at least one record to preview forms.");
      return;
    }
    setShowPreview(true);
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
            renderFooter={previewForm === 'FORM_XVI' ? (c, borderColor) => (
              <tr style={{ backgroundColor: '#ffffff', fontWeight: 'bold' }}>
                <td colSpan="4" style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'right' }}></td>
                {Array.from({length: 31}, (_, i) => (
                  <td key={i} contentEditable suppressContentEditableWarning style={{ border: `1px solid ${borderColor}`, padding: '6px', textAlign: 'center' }}>
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
      `}} />
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
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={previewForm}
            onChange={(e) => setPreviewForm(e.target.value)}
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
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#3b82f6' }}
            onClick={handlePreviewForms}
          >
            <Eye size={16} /> Preview Editable Form
          </button>

          {showPreview && (
            <button 
              className="btn-primary" 
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0f766e' }}
              onClick={handlePrint}
            >
              <Printer size={16} /> Print Preview
            </button>
          )}

          <button 
            className="btn-primary" 
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#d97706' }}
            onClick={handleGenerateForms}
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
                        onChange={(e) => {
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
          {renderPreviews()}
        </div>
      )}
    </div>
  );
}
