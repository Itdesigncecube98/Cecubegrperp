'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import './payslip.css';

function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return; let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str;
}

export default function PayslipsPage() {
  const router = useRouter();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      fetchPayslips(parsed.id);
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchPayslips = async (empId) => {
    try {
      const res = await fetch(`/api/payroll/my-records?employeeId=${empId}`);
      const data = await res.json();
      if (Array.isArray(data)) setPayslips(data);
    } catch (e) {
      console.error('Failed to load payslips', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading payslips...</div>;

  /* ── LIST VIEW ── */
  if (!selectedSlip) {
    return (
      <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' }}>
        <button onClick={() => router.back()} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '24px', fontWeight: 500 }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '20px' }}>My Payslips</h1>

        {payslips.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <FileText size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#475569', fontSize: '1.1rem' }}>No payslips generated yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {payslips.map(slip => (
              <div
                key={slip.id}
                onClick={() => setSelectedSlip(slip)}
                style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1rem' }}>{slip.payCycle?.name || 'Unknown Month'}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>Net Pay: ₹{slip.netPay?.toFixed(2)}</p>
                </div>
                <div style={{ background: '#f1f5f9', padding: '8px 14px', borderRadius: '8px', color: '#334155', fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap' }}>
                  View →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── DETAIL / PRINT VIEW ── */
  const emp = selectedSlip.employee;
  const cycleName = selectedSlip.payCycle?.name || 'Month';
  const ytdIncome = (selectedSlip.grossPay || 0) * 6;
  const ytdPf    = (selectedSlip.pfEmployee || 0) * 6;
  const ytdTax   = (selectedSlip.tds || 0) * 6;

  const cell = { padding: '7px 10px', fontSize: '0.83rem' };
  const borderR = { borderRight: '1px solid #000' };
  const borderT = { borderTop: '1px solid #000' };

  return (
    <div style={{ padding: '1rem', maxWidth: '960px', margin: '0 auto', boxSizing: 'border-box' }}>
      <style>{`
        @media (max-width: 600px) {
          .ps-topbar { flex-direction: column !important; }
          .ps-topbar button { width: 100%; justify-content: center !important; }
        }
        @media print {
          .no-print { display: none !important; }
          .ps-scroll { overflow: visible !important; border: none !important; }
          body { margin: 0; background: #fff; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print ps-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedSlip(null)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 500 }}>
          <ArrowLeft size={18} /> Back to List
        </button>
        <button onClick={handlePrint} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
          <Printer size={16} /> Print / Download PDF
        </button>
      </div>

      {/* Horizontal-scroll wrapper — the payslip never wraps below 620px */}
      <div className="ps-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
        <div style={{ minWidth: '620px', padding: '24px 20px', fontFamily: 'serif', color: '#000' }}>

          {/* Month badge */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ background: '#bae6fd', padding: '4px 20px', fontWeight: 'bold', fontSize: '1.05rem', display: 'inline-block' }}>
              {cycleName}
            </span>
          </div>

          {/* Header: Company info + Logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #000' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem' }}>
              <div><strong>Company :</strong> CeCube Engineering India Private Limited</div>
              <div><strong>Employee Name :</strong> {emp?.name || 'N/A'}</div>
              <div><strong>Employee Code :</strong> {emp?.empId || 'N/A'}</div>
            </div>
            <img src="/logo.png" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
          </div>

          {/* Attendance summary */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 0 }}>
            <tbody>
              <tr style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.82rem' }}>
                <td style={{ ...cell, ...borderR }}>Working Days<br /><span style={{ fontWeight: 400 }}>{selectedSlip.workingDays?.toFixed(2)}</span></td>
                <td style={{ ...cell, ...borderR }}>Present Days<br /><span style={{ fontWeight: 400 }}>{selectedSlip.presentDays?.toFixed(2)}</span></td>
                <td style={{ ...cell, ...borderR }}>Paid Leaves<br /><span style={{ fontWeight: 400 }}>0.00</span></td>
                <td style={{ ...cell, ...borderR }}>Absent<br /><span style={{ fontWeight: 400 }}>{selectedSlip.absentDays?.toFixed(2)}</span></td>
                <td style={{ ...cell }}>Payable<br /><span style={{ fontWeight: 400 }}>{selectedSlip.workingDays?.toFixed(2)}</span></td>
              </tr>
            </tbody>
          </table>

          {/* YTD */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', marginBottom: 0 }}>
            <tbody>
              <tr style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>
                <td style={{ ...cell, ...borderR }}>IncomeY.T.D : {ytdIncome.toFixed(2)}</td>
                <td style={{ ...cell }}>I/TaxY.T.D : {ytdTax.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Employee details: left / right columns */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: '0.81rem', marginBottom: 0 }}>
            <tbody>
              <tr>
                <td style={{ ...cell, ...borderR, verticalAlign: 'top', width: '50%' }}>
                  {[
                    ['Location', emp?.branch],
                    ['Department', emp?.department],
                    ['Designation', emp?.designation],
                    ['Grade', emp?.grade],
                    ['Bank Account No.', emp?.bankAccountNo],
                    ['Bank Name', emp?.bankName],
                    ['Pan Card', emp?.pan],
                  ].map(([label, val]) => (
                    <div key={label} style={{ marginBottom: '4px' }}>
                      <strong style={{ minWidth: '120px', display: 'inline-block' }}>{label} :</strong> {val || ''}
                    </div>
                  ))}
                </td>
                <td style={{ ...cell, verticalAlign: 'top', width: '50%' }}>
                  {[
                    ['PF Memb Cont.(YTD)', ytdPf.toFixed(2)],
                    ['Payment Mode', 'Money Transfer'],
                    ['P.F. A/c No.', emp?.pfEmployee],
                    ['E.S.I.C A/c No.', emp?.esicNo],
                    ['UAN', emp?.uan],
                  ].map(([label, val]) => (
                    <div key={label} style={{ marginBottom: '4px' }}>
                      <strong style={{ minWidth: '130px', display: 'inline-block' }}>{label} :</strong> {val || ''}
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Salary table: Earnings + Deductions side-by-side */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', background: '#f8fafc' }}>
                <th style={{ ...cell, ...borderR, width: '35%', textAlign: 'left' }}>Earnings</th>
                <th style={{ ...cell, ...borderR, width: '13%' }}>Info(E)</th>
                <th style={{ ...cell, ...borderR, width: '13%' }}>Actual(E)</th>
                <th style={{ ...cell, ...borderR, width: '26%', textAlign: 'left' }}>Deductions</th>
                <th style={{ ...cell, width: '13%' }}>Actual(D)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { earn: ['Basic', selectedSlip.basicPay], deduct: selectedSlip.pfEmployee > 0 ? ['Provident Fund', selectedSlip.pfEmployee] : null },
                { earn: ['HRA', selectedSlip.hra], deduct: selectedSlip.professionalTax > 0 ? ['Professional Tax', selectedSlip.professionalTax] : null },
                ...(selectedSlip.medical > 0 ? [{ earn: ['Medical', selectedSlip.medical], deduct: selectedSlip.tds > 0 ? ['TDS', selectedSlip.tds] : null }] : []),
                ...(selectedSlip.conveyance > 0 ? [{ earn: ['Transport Allow.', selectedSlip.conveyance], deduct: selectedSlip.otherDeductions > 0 ? ['Other Deductions', selectedSlip.otherDeductions] : null }] : []),
                ...(selectedSlip.specialAllow > 0 ? [{ earn: ['Special Allow.', selectedSlip.specialAllow], deduct: null }] : []),
              ].map(({ earn, deduct }, i) => (
                <tr key={i}>
                  <td style={{ ...cell, ...borderR }}>{earn[0]}</td>
                  <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{earn[1]?.toFixed(2)}</td>
                  <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{earn[1]?.toFixed(2)}</td>
                  <td style={{ ...cell, ...borderR }}>{deduct ? deduct[0] : ''}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{deduct ? deduct[1]?.toFixed(2) : ''}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr style={{ fontWeight: 'bold', ...borderT }}>
                <td style={{ ...cell, ...borderR }}>Total Earnings</td>
                <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{selectedSlip.grossPay?.toFixed(2)}</td>
                <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{selectedSlip.grossPay?.toFixed(2)}</td>
                <td style={{ ...cell, ...borderR }}>Total Deductions</td>
                <td style={{ ...cell, textAlign: 'right' }}>{selectedSlip.totalDeductions?.toFixed(2)}</td>
              </tr>
              {/* Net pay */}
              <tr style={{ fontWeight: 'bold', ...borderT, background: '#f0fdf4' }}>
                <td colSpan={3} style={{ ...cell, ...borderR, textAlign: 'right' }}>Net Payable :</td>
                <td colSpan={2} style={{ ...cell, textAlign: 'right', color: '#16a34a', fontSize: '0.95rem' }}>₹{selectedSlip.netPay?.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in words */}
          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '10px 12px', fontSize: '0.85rem' }}>
            <strong>Net Salary (In Words):</strong> {numberToWords(Math.round(selectedSlip.netPay || 0))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.72rem', marginTop: '12px', color: '#64748b' }}>
            This is a system generated payslip and does not require signature.
          </div>

        </div>
      </div>
    </div>
  );
}
