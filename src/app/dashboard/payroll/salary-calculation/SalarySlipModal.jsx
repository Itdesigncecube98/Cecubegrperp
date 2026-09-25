'use client';
import React, { useState, useEffect } from 'react';
import { X, Printer, Save, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function numberToWords(num) {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str;
}

export default function SalarySlipModal({ record, cycleName, bonusIncentives = [], onClose, onSaveSuccess }) {
  const emp = record?.employee || {};

  // Find existing bonus, incentive, arrears from bonusIncentives
  const empBonusIncentives = (bonusIncentives || []).filter(b => b.employeeId === record.employeeId);
  const arrearsRecord = empBonusIncentives.find(b => b.type === 'arrears');
  const existingArrears = arrearsRecord?.amount || 0;
  
  let initialArrearsBreakdown = null;
  if (arrearsRecord?.message) {
    try { initialArrearsBreakdown = JSON.parse(arrearsRecord.message); } catch(e) {}
  }

  const existingBonus = empBonusIncentives.find(b => b.type === 'bonus')?.amount || 0;
  const existingIncentive = empBonusIncentives.find(b => b.type === 'incentive')?.amount || 0;

  // Fallback if record.bonus has value but bonusIncentives is empty
  const initialBonus = existingBonus || (existingIncentive === 0 && record?.bonus ? record.bonus : 0);
  const initialIncentive = existingIncentive;
  const initialArrears = existingArrears;

  // Attendance, shifts & offs
  const existingWOff = empBonusIncentives.find(b => b.type === 'woff')?.amount ?? record?.attendanceSummary?.wOff ?? 0;
  const existingHolidays = empBonusIncentives.find(b => b.type === 'holiday')?.amount ?? record?.attendanceSummary?.holidays ?? 0;
  const existingNightShift = empBonusIncentives.find(b => b.type === 'night_shift')?.amount ?? record?.attendanceSummary?.nightShift ?? 0;
  const existingCoff = empBonusIncentives.find(b => b.type === 'coff')?.amount ?? record?.attendanceSummary?.coff ?? 0;
  const paidLeavesCount = record?.attendanceSummary?.paidLeaves ?? 0;

  const wOff = empBonusIncentives.find(b => b.type === 'woff')?.amount ?? record?.attendanceSummary?.wOff ?? 0;
  const holidays = empBonusIncentives.find(b => b.type === 'holiday')?.amount ?? record?.attendanceSummary?.holidays ?? 0;
  const coff = empBonusIncentives.find(b => b.type === 'coff')?.amount ?? record?.attendanceSummary?.coff ?? 0;
  
  // Total Days in Month = Wage Days (workingDays) + Unpaid Days (absentDays)
  const totalDaysInMonth = (record?.workingDays || 0) + (record?.absentDays || 0);

  // Changeable fields
  const [arrears, setArrears] = useState(initialArrears);
  const [arrearsBreakdown, setArrearsBreakdown] = useState(initialArrearsBreakdown);
  const [calculatingArrears, setCalculatingArrears] = useState(false);
  const [downloadingArrearsPDF, setDownloadingArrearsPDF] = useState(false);

  const [bonus, setBonus] = useState(initialBonus);
  const [incentive, setIncentive] = useState(initialIncentive);

  const [pfEmployee, setPfEmployee] = useState(record?.pfEmployee || 0);
  const [professionalTax, setProfessionalTax] = useState(record?.professionalTax || 0);
  const [tds, setTds] = useState(record?.tds || 0);
  const [otherDeductions, setOtherDeductions] = useState(record?.otherDeductions || 0);

  const [leaveEncashmentState, setLeaveEncashmentState] = useState(record?.leaveEncashment || 0);
  const existingGratuity = empBonusIncentives.find(b => b.type === 'gratuity')?.amount || 0;
  const [gratuity, setGratuity] = useState(existingGratuity);

  // Earnings
  const basicPay = record?.basicPay || 0;
  const hra = record?.hra || 0;
  const conveyance = record?.conveyance || 0;
  const medical = record?.medical || 0;
  const specialAllow = record?.specialAllow || 0;

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Live Calculations
  const numArrears = parseFloat(arrears) || 0;
  const numBonus = parseFloat(bonus) || 0;
  const numIncentive = parseFloat(incentive) || 0;

  const numLeaveEncashment = parseFloat(leaveEncashmentState) || 0;
  const numGratuity = parseFloat(gratuity) || 0;

  const numPf = parseFloat(pfEmployee) || 0;
  const numPt = parseFloat(professionalTax) || 0;
  const numTds = parseFloat(tds) || 0;
  const numOtherDed = parseFloat(otherDeductions) || 0;

  const grossPay = Math.round((basicPay + hra + conveyance + medical + specialAllow + numLeaveEncashment + numArrears + numBonus + numIncentive + numGratuity) * 100) / 100;
  const totalDeductions = Math.round((numPf + numPt + numTds + numOtherDed) * 100) / 100;
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  const handleDownloadPDF = async () => {
    const element = document.getElementById('payslip-sheet-content');
    if (!element) return;

    setDownloadingPDF(true);
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${emp.name ? emp.name.replace(/\s+/g, '_') : 'Employee'}_Salary_Slip.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const loadApprovedArrears = async () => {
    setCalculatingArrears(true);
    try {
      const res = await fetch(`/api/payroll/records/${record.id}/calculate-arrears`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.total > 0) {
        setArrears(data.total);
        setArrearsBreakdown({
          ...data.breakdown,
          fromDate: data.fromDate,
          toDate: data.toDate,
          overlapDays: data.overlapDays
        });
      }
    } catch(err) {
      console.error('Error loading approved arrears', err);
    } finally {
      setCalculatingArrears(false);
    }
  };

  useEffect(() => {
    // Only load if arrears haven't been manually set or loaded yet
    if (!arrears || arrears === 0) {
      loadApprovedArrears();
    }
  }, []);

  const handleDownloadArrearsPDF = async () => {
    const element = document.getElementById('arrears-payslip-sheet-content');
    if (!element) return;

    setDownloadingArrearsPDF(true);
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${emp.name ? emp.name.replace(/\s+/g, '_') : 'Employee'}_Arrears_Payslip.pdf`);
    } catch (err) {
      console.error('Failed to generate Arrears PDF:', err);
    } finally {
      setDownloadingArrearsPDF(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicPay,
          hra,
          conveyance,
          medical,
          specialAllow,
          leaveEncashment: numLeaveEncashment,
          arrears: numArrears,
          arrearsBreakdown,
          bonus: numBonus,
          incentive: numIncentive,
          gratuity: numGratuity,
          pfEmployee: numPf,
          professionalTax: numPt,
          tds: numTds,
          otherDeductions: numOtherDed,
          wOff: parseFloat(wOff) || 0,
          holidays: parseFloat(holidays) || 0,
          nightShift: 0,
          coff: parseFloat(coff) || 0,
          grossPay,
          totalDeductions,
          netPay,
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save salary slip');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSaveSuccess) {
        onSaveSuccess(json.record, json.bonusIncentives);
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="salary-slip-modal-overlay">
      <style>{`
        .salary-slip-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1.5rem;
          overflow-y: auto;
        }
        .salary-slip-modal-container {
          background: #ffffff;
          border-radius: 16px;
          max-width: 960px;
          width: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: slipFadeIn 0.25s ease-out;
        }
        @keyframes slipFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .salary-slip-topbar {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }
        .salary-slip-content-body {
          padding: 1.5rem;
          overflow-y: auto;
          background: #f8fafc;
        }
        .payslip-sheet {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 28px 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }
        .changeable-input {
          width: 105px;
          padding: 4px 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: right;
          border: 1.5px solid #0284c7;
          border-radius: 6px;
          background-color: #f0f9ff;
          color: #0369a1;
          outline: none;
          transition: all 0.2s ease;
        }
        .changeable-input:focus {
          border-color: #2563eb;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
        }
        .changeable-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 1px 6px;
          border-radius: 4px;
          background: #e0f2fe;
          color: #0284c7;
          margin-left: 6px;
        }
        .deduction-input {
          border-color: #f87171 !important;
          background-color: #fef2f2 !important;
          color: #b91c1c !important;
        }
        .deduction-input:focus {
          border-color: #dc2626 !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
        }
        .deduction-badge {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 600px) {
          .salary-slip-modal-overlay {
            padding: 0.5rem;
            align-items: flex-start;
          }
          .salary-slip-modal-container {
            border-radius: 10px;
            max-height: 98vh;
          }
          .salary-slip-topbar {
            padding: 0.75rem 1rem;
            flex-wrap: wrap;
            gap: 8px;
          }
          .salary-slip-topbar h2 {
            font-size: 0.95rem !important;
          }
          .salary-slip-topbar p {
            font-size: 0.7rem !important;
          }
          .salary-slip-topbar > div:last-child {
            flex-wrap: wrap;
            gap: 6px !important;
          }
          .salary-slip-topbar button {
            font-size: 0.72rem !important;
            padding: 5px 8px !important;
          }
          .salary-slip-content-body {
            padding: 0.75rem;
          }
          .payslip-sheet {
            padding: 14px 12px;
            font-size: 0.78rem;
            overflow-x: auto;
          }
          .changeable-input {
            width: 80px !important;
            font-size: 0.75rem !important;
          }
          .changeable-badge {
            display: none !important;
          }
        }

        /* PRINT STYLES */
        @media print {
          body * {
            visibility: hidden;
          }
          .salary-slip-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            backdrop-filter: none !important;
          }
          .salary-slip-modal-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .salary-slip-topbar, .modal-no-print {
            display: none !important;
          }
          .salary-slip-content-body {
            padding: 0 !important;
            background: #ffffff !important;
          }
          .payslip-sheet, .payslip-sheet * {
            visibility: visible;
          }
          .payslip-sheet {
            border: 1px solid #000 !important;
            padding: 15px !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          .changeable-input {
            border: none !important;
            background: none !important;
            text-align: right !important;
            padding: 0 !important;
            font-size: 0.9rem !important;
            color: #000 !important;
          }
          .changeable-badge {
            display: none !important;
          }
        }
      `}</style>

      <div className="salary-slip-modal-container">
        {/* Modal Top Header */}
        <div className="salary-slip-topbar modal-no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              ₹
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Salary Slip & Adjustments
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>
                {emp.name} ({emp.empId}) • {cycleName || 'Current Pay Cycle'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {saveSuccess && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                <CheckCircle2 size={15} /> Saved Successfully
              </span>
            )}
            {error && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                <AlertCircle size={15} /> {error}
              </span>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: downloadingPDF ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              title="Download as PDF"
            >
              {downloadingPDF ? <RefreshCw className="spin" size={16} /> : <Download size={16} />}
              {downloadingPDF ? 'Generating...' : 'Download PDF'}
            </button>

            {arrearsBreakdown && (
              <button
                onClick={handleDownloadArrearsPDF}
                disabled={downloadingArrearsPDF}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: downloadingArrearsPDF ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: downloadingArrearsPDF ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
                title="Download Arrears Payslip"
              >
                {downloadingArrearsPDF ? <RefreshCw className="spin" size={16} /> : <Download size={16} />}
                Arrears PDF
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: saving ? '#94a3b8' : '#10b981',
                color: '#fff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '6px'
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="salary-slip-content-body">
          <div className="payslip-sheet" id="payslip-sheet-content">
            {/* Cycle Header Badge */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 20px', borderRadius: '4px', fontWeight: 700, fontSize: '1.05rem', display: 'inline-block' }}>
                {cycleName || 'Salary Payslip'}
              </span>
            </div>

            {/* Company & Employee Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', paddingBottom: '14px', borderBottom: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                <div><strong style={{ color: '#0369a1' }}>Company:</strong> CeCube Engineering India Private Limited</div>
                <div><strong>Employee Name:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>{emp.name || 'N/A'}</span></div>
                <div><strong>Employee Code:</strong> {emp.empId || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <img src="/logo.png" alt="CeCube Logo" style={{ height: '65px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            </div>

            {/* Attendance & Shift Summary Box */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', background: '#ffffff' }}>
              {/* Row 1: Core Attendance Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Days</div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>{totalDaysInMonth}</div>
                </div>
                <div style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Present Days</div>
                  <div style={{ fontSize: '1rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>{(record?.presentDays || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Paid Leaves (CL/EL)</div>
                  <div style={{ fontSize: '1rem', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>{(paidLeavesCount || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Absent Days</div>
                  <div style={{ fontSize: '1rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>{(record?.absentDays || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '8px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Payable Days</div>
                  <div style={{ fontSize: '1rem', color: '#0284c7', fontWeight: 800, marginTop: '2px' }}>{(record?.workingDays || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Row 2: W-off, Holidays, and C-off */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, background: '#f8fafc' }}>
                <div style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>Weekly Off (W-off)</span>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#4338ca', fontWeight: 700, marginTop: '2px' }}>
                    {wOff}
                  </div>
                </div>

                <div style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>Holidays (H)</span>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                    {holidays}
                  </div>
                </div>

                <div style={{ padding: '8px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>Comp Off (C-off)</span>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                    {coff}
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Column Employee Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', fontSize: '0.82rem', marginBottom: '16px', background: '#ffffff' }}>
              {/* Left Column */}
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px', borderRight: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Location / Branch:</span> <span style={{ fontWeight: 600 }}>{emp.branch || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Department:</span> <span>{emp.department || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Designation:</span> <span>{emp.designation || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Grade:</span> <span>{emp.grade || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Bank Account No:</span> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.bankAccountNo || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Bank Name:</span> <span>{emp.bankName || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Pan Card:</span> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.pan || '-'}</span></div>
              </div>
              {/* Right Column */}
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px', background: '#fcfdfd' }}>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>Payment Mode:</span> <span>Bank Transfer</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>P.F. A/c No:</span> <span>{emp.pfEmployee || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>E.S.I.C A/c No:</span> <span>{emp.esicNo || '-'}</span></div>
                <div style={{ display: 'flex' }}><span style={{ width: '135px', color: '#64748b', fontWeight: 600 }}>UAN:</span> <span>{emp.uan || '-'}</span></div>
              </div>
            </div>

            {/* Editable Notice Bar */}
            <div className="modal-no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px 12px', fontSize: '0.8rem', color: '#1e40af', marginBottom: '14px' }}>
              <Sparkles size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>
                <strong>Changeable Fields:</strong> Arrears, Bonus, Incentive, Gratuity, Leave Encashment, and Deductions can be directly edited below. Totals recalculate instantly.
              </span>
            </div>

            {/* Earnings & Deductions Tables */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', fontSize: '0.85rem', minWidth: '480px' }}>
              {/* EARNINGS COLUMN */}
              <div style={{ borderRight: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', fontWeight: 700, padding: '8px 12px', background: '#e0f2fe', color: '#0369a1', borderBottom: '1px solid #cbd5e1' }}>
                  <div>Earnings Head</div>
                  <div style={{ textAlign: 'right' }}>Amount (₹)</div>
                </div>

                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center' }}>
                    <div style={{ color: '#334155' }}>Basic Pay</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>₹{basicPay.toFixed(2)}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center' }}>
                    <div style={{ color: '#334155' }}>HRA</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>₹{hra.toFixed(2)}</div>
                  </div>

                  {medical > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center' }}>
                      <div style={{ color: '#334155' }}>Medical Allowance</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>₹{medical.toFixed(2)}</div>
                    </div>
                  )}

                  {conveyance > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center' }}>
                      <div style={{ color: '#334155' }}>Transport / Conveyance</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>₹{conveyance.toFixed(2)}</div>
                    </div>
                  )}

                  {specialAllow > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center' }}>
                      <div style={{ color: '#334155' }}>Special Allowance</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>₹{specialAllow.toFixed(2)}</div>
                    </div>
                  )}

                  {/* CHANGEABLE: Leave Encashment */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #7dd3fc', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#0369a1', fontWeight: 600 }}>
                      <span>Leave Encashment</span>
                      <span className="changeable-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={leaveEncashmentState}
                        onChange={(e) => setLeaveEncashmentState(e.target.value)}
                        className="changeable-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>

                  {/* CHANGEABLE: Arrears */}
                  <div style={{ background: '#f0f9ff', padding: '6px 8px', borderRadius: '4px', border: '1px dashed #7dd3fc', marginBottom: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#0369a1', fontWeight: 600 }}>
                        <span>Arrears</span>
                        <span className="changeable-badge">Changeable</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="any"
                          value={arrears}
                          onChange={(e) => setArrears(e.target.value)}
                          className="changeable-input"
                          placeholder="0.00"
                          disabled={record?.status === 'APPROVED'}
                        />
                      </div>
                    </div>
                    {arrearsBreakdown && (
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#0369a1', padding: '6px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '4px', border: '1px solid rgba(2, 132, 199, 0.15)' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Arrears Breakdown:</strong> 
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '4px' }}>
                          {Object.entries(arrearsBreakdown).filter(([k]) => !['fromDate', 'toDate'].includes(k)).map(([k, v]) => (
                            <span key={k}>{k}: ₹{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CHANGEABLE: Bonus */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #7dd3fc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#0369a1', fontWeight: 600 }}>
                      <span>Bonus</span>
                      <span className="changeable-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={bonus}
                        onChange={(e) => setBonus(e.target.value)}
                        className="changeable-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>

                  {/* CHANGEABLE: Incentive */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #7dd3fc', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#0369a1', fontWeight: 600 }}>
                      <span>Incentive</span>
                      <span className="changeable-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={incentive}
                        onChange={(e) => setIncentive(e.target.value)}
                        className="changeable-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>

                  {/* CHANGEABLE: Gratuity */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #7dd3fc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#0369a1', fontWeight: 600 }}>
                      <span>Gratuity</span>
                      <span className="changeable-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={gratuity}
                        onChange={(e) => setGratuity(e.target.value)}
                        className="changeable-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>
                </div>

                {/* Total Gross Earnings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', fontWeight: 700, padding: '10px 12px', borderTop: '1px solid #cbd5e1', background: '#f8fafc' }}>
                  <div style={{ color: '#0f172a' }}>Total Earnings (Gross)</div>
                  <div style={{ textAlign: 'right', color: '#0284c7', fontSize: '0.95rem' }}>₹{grossPay.toFixed(2)}</div>
                </div>
              </div>

              {/* DEDUCTIONS COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', fontWeight: 700, padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderBottom: '1px solid #cbd5e1' }}>
                  <div>Deductions Head</div>
                  <div style={{ textAlign: 'right' }}>Amount (₹)</div>
                </div>

                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                  {/* CHANGEABLE: PF */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#fef2f2', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #fca5a5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#b91c1c', fontWeight: 600 }}>
                      <span>Provident Fund (PF)</span>
                      <span className="changeable-badge deduction-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={pfEmployee}
                        onChange={(e) => setPfEmployee(e.target.value)}
                        className="changeable-input deduction-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* CHANGEABLE: Professional Tax */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#fef2f2', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #fca5a5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#b91c1c', fontWeight: 600 }}>
                      <span>Professional Tax (PT)</span>
                      <span className="changeable-badge deduction-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={professionalTax}
                        onChange={(e) => setProfessionalTax(e.target.value)}
                        className="changeable-input deduction-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>

                  {/* CHANGEABLE: TDS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#fef2f2', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #fca5a5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#b91c1c', fontWeight: 600 }}>
                      <span>TDS / Income Tax</span>
                      <span className="changeable-badge deduction-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={tds}
                        onChange={(e) => setTds(e.target.value)}
                        className="changeable-input deduction-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>

                  {/* CHANGEABLE: Other Deductions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', alignItems: 'center', background: '#fef2f2', padding: '4px 6px', borderRadius: '4px', border: '1px dashed #fca5a5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#b91c1c', fontWeight: 600 }}>
                      <span>Other Deductions</span>
                      <span className="changeable-badge deduction-badge">Changeable</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        value={otherDeductions}
                        onChange={(e) => setOtherDeductions(e.target.value)}
                        className="changeable-input deduction-input"
                        placeholder="0.00"
                        disabled={record?.status === 'APPROVED'}
                      />
                    </div>
                  </div>
                </div>

                {/* Total Deductions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', fontWeight: 700, padding: '10px 12px', borderTop: '1px solid #cbd5e1', background: '#fef2f2' }}>
                  <div style={{ color: '#b91c1c' }}>Total Deductions</div>
                  <div style={{ textAlign: 'right', color: '#dc2626', fontSize: '0.95rem' }}>₹{totalDeductions.toFixed(2)}</div>
                </div>
              </div>
            </div>
            </div>

            {/* Net Salary Payable Summary Banner */}
            <div style={{ marginTop: '14px', border: '1.5px solid #059669', borderRadius: '6px', background: '#ecfdf5', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#065f46' }}>
                  Net Payable Salary
                </div>
                <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '2px' }}>
                  (Gross Earnings - Total Deductions)
                </div>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669' }}>
                ₹{netPay.toFixed(2)}
              </div>
            </div>

            {/* Amount In Words */}
            <div style={{ marginTop: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 14px', fontSize: '0.85rem', background: '#ffffff' }}>
              <strong>Net Salary (In Words): </strong>
              <span style={{ color: '#0284c7', fontWeight: 600 }}>{numberToWords(Math.round(netPay))}</span>
            </div>

            {/* Note & Footer */}
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '18px' }}>
              This is a system generated salary slip and does not require signature. CeCube Engineering India Pvt. Ltd.
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="salary-slip-topbar modal-no-print" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', color: '#0f172a', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            <span>Status: </span>
            <span style={{ fontWeight: 700, color: record?.status === 'PROCESSED' ? '#16a34a' : '#d97706' }}>
              {record?.status || 'PENDING'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Close
            </button>
            {record?.status === 'APPROVED' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 600, padding: '8px 12px', background: '#dcfce3', borderRadius: '8px', border: '1px solid #16a34a' }}>
                <span>🔒 Approved & Locked</span>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: saving ? '#94a3b8' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)'
                }}
              >
                {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save & Update Salary'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* HIDDEN ARREARS PAYSLIP TEMPLATE */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="arrears-payslip-sheet-content" style={{ width: '800px', background: 'white', color: 'black', padding: '30px', fontFamily: 'Arial, sans-serif' }}>
          
          {/* Header Box */}
          <div style={{ border: '2px solid black', textAlign: 'center', padding: '10px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold', color: '#0369a1' }}>Arrears Payslip For Salary Revision</h3>
            <div style={{ fontSize: '14px' }}>
              From Date: {arrearsBreakdown?.fromDate ? new Date(arrearsBreakdown.fromDate).toLocaleDateString('en-GB') : '-'} &nbsp;&nbsp;&nbsp; 
              To Date: {arrearsBreakdown?.toDate ? new Date(arrearsBreakdown.toDate).toLocaleDateString('en-GB') : '-'}
            </div>
          </div>

          {/* Company & Employee Details Box */}
          <div style={{ border: '2px solid black', display: 'grid', gridTemplateColumns: '65% 35%', marginBottom: '10px' }}>
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div><strong>Company :</strong> CeCube Engineering India Private Limited</div>
              <div><strong>Employee Name :</strong> {emp.name || '-'}</div>
              <div><strong>Employee Code :</strong> {emp.empId || '-'}</div>
            </div>
            <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid black' }}>
              <img src="/logo.png" alt="CeCube Logo" style={{ height: '60px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          </div>

          {/* Dummy Attendance / YTD rows (from screenshot) */}
          <div style={{ border: '2px solid black', padding: '10px', marginBottom: '10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <div>Working Days : {(record?.workingDays || 0).toFixed(2)}</div>
            <div>Present Days : {(record?.presentDays || 0).toFixed(2)}</div>
            <div>Paid Leaves : {(paidLeavesCount || 0).toFixed(2)}</div>
            <div>Absent : {(record?.absentDays || 0).toFixed(2)}</div>
            <div>Wage Days : {(record?.workingDays || 0).toFixed(2)}</div>
          </div>
          <div style={{ border: '2px solid black', padding: '10px', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}>
            Income Y.T.D : 0.00 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; I/Tax Y.T.D : 0.00
          </div>

          {/* Employee Extended Details */}
          <div style={{ border: '2px solid black', display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '12px', marginBottom: '10px' }}>
            <div style={{ padding: '10px', borderRight: '1px solid black', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Location :</strong> <span>{emp.branch || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Department :</strong> <span>{emp.department || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Designation :</strong> <span>{emp.designation || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Grade :</strong> <span>{emp.grade || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Pan Card :</strong> <span>{emp.pan || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Joining Date :</strong> <span>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB') : '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Arrears Paid Date :</strong> <span>{cycleName || '-'}</span></div>
            </div>
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>PF Memb Cont.(YTD) :</strong> <span>0.00</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>Payment Mode :</strong> <span>Money Transfer</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>P.F. A/c No. :</strong> <span>{emp.pfEmployee || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>E.S.I.C A/c No. :</strong> <span>{emp.esicNo || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>UAN :</strong> <span>{emp.uan || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>Bank Account No. :</strong> <span>{emp.bankAccountNo || '-'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>Bank Name :</strong> <span>{emp.bankName || '-'}</span></div>
            </div>
          </div>

          {/* Earnings and Deductions Table */}
          <div style={{ border: '2px solid black', display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '13px' }}>
            {/* EARNINGS */}
            <div style={{ borderRight: '1px solid black', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold', padding: '6px 10px', borderBottom: '1px solid black' }}>
                <div>EARNINGS</div>
                <div style={{ textAlign: 'right' }}>Amount (₹)</div>
              </div>
              <div style={{ padding: '10px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {arrearsBreakdown && Object.entries(arrearsBreakdown).filter(([k]) => !['fromDate', 'toDate'].includes(k)).map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold' }}>
                    <div>{k}</div>
                    <div style={{ textAlign: 'right' }}>{v.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold', padding: '6px 10px', borderTop: '1px solid black' }}>
                <div>Total Earnings</div>
                <div style={{ textAlign: 'right' }}>{numArrears.toFixed(2)}</div>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold', padding: '6px 10px', borderBottom: '1px solid black' }}>
                <div>DEDUCTIONS</div>
                <div style={{ textAlign: 'right' }}>Amount (₹)</div>
              </div>
              <div style={{ padding: '10px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Normally arrears payslips only show earnings unless there are specific arrears deductions */}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold', padding: '6px 10px', borderTop: '1px solid black' }}>
                <div>Total Deductions</div>
                <div style={{ textAlign: 'right' }}>0.00</div>
              </div>
            </div>
          </div>

          {/* Net Payable Row */}
          <div style={{ border: '2px solid black', borderTop: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '14px', fontWeight: 'bold', padding: '8px 10px' }}>
            <div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px' }}>
              <div>Net Payable :</div>
              <div style={{ textAlign: 'right' }}>{numArrears.toFixed(2)}</div>
            </div>
          </div>

          {/* Words Row */}
          <div style={{ border: '2px solid black', borderTop: 'none', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
            Net Salary (In Words): {numberToWords(Math.round(numArrears))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '15px' }}>
            This is a system generated payslip and does not require signature.
          </div>

        </div>
      </div>
    </div>
  );
}
