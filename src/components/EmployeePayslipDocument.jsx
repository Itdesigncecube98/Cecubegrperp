'use client';

import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1] !== '00' ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += n[2] !== '00' ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += n[3] !== '00' ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += n[4] !== '0' ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += n[5] !== '00'
    ? (str !== '' ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only'
    : 'Rupees Only';
  return str;
}

const money = value => Number(value || 0).toFixed(2);

export default function EmployeePayslipDocument({ slip, onBack, backLabel = 'Back to List' }) {
  const employee = slip.employee || {};
  const cycleName = slip.payCycle?.name || 'Month';
  const grossPay = Number(slip.grossPay) || 0;
  const ytdIncome = grossPay * 6;
  const ytdPf = (Number(slip.pfEmployee) || 0) * 6;
  const ytdTax = (Number(slip.tds) || 0) * 6;
  const cell = { padding: '7px 10px', fontSize: '0.83rem' };
  const borderR = { borderRight: '1px solid #000' };
  const borderT = { borderTop: '1px solid #000' };

  const earnings = [
    ['Basic', slip.basicPay],
    ['HRA', slip.hra],
    ['Medical', slip.medical],
    ['Transport Allow.', slip.conveyance],
    ['Special Allow.', slip.specialAllow],
    ['Bonus', slip.bonus],
    ['Arrears', slip.arrears],
    ['Leave Encashment', slip.leaveEncashment],
  ].filter(([label, amount]) => ['Basic', 'HRA'].includes(label) || Number(amount) > 0);
  const deductions = [
    ['Provident Fund', slip.pfEmployee],
    ['Professional Tax', slip.professionalTax],
    ['TDS', slip.tds],
    ['Other Deductions', slip.otherDeductions],
  ].filter(([, amount]) => Number(amount) > 0);

  return (
    <div style={{ padding: '1rem', maxWidth: '960px', margin: '0 auto', boxSizing: 'border-box' }}>
      <style>{`
        @media (max-width: 600px) {
          .ps-topbar { flex-direction: column !important; }
          .ps-topbar button { width: 100%; justify-content: center !important; }
        }
        @media print {
          .no-print, .hr-reports-sidebar { display: none !important; }
          .ps-scroll { overflow: visible !important; border: none !important; }
          .hr-reports-content { width: 100% !important; padding: 0 !important; }
          body { margin: 0; background: #fff; }
        }
      `}</style>

      <div className="no-print ps-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 500 }}>
          <ArrowLeft size={18} /> {backLabel}
        </button>
        <button onClick={() => window.print()} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
          <Printer size={16} /> Print / Download PDF
        </button>
      </div>

      <div className="ps-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
        <div style={{ minWidth: '620px', padding: '24px 20px', fontFamily: 'serif', color: '#000' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ background: '#bae6fd', padding: '4px 20px', fontWeight: 'bold', fontSize: '1.05rem', display: 'inline-block' }}>
              {cycleName}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #000' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem' }}>
              <div><strong>Company :</strong> CeCube Engineering India Private Limited</div>
              <div><strong>Employee Name :</strong> {employee.name || 'N/A'}</div>
              <div><strong>Employee Code :</strong> {employee.empId || 'N/A'}</div>
            </div>
            <img src="/logo.png" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} onError={event => { event.currentTarget.style.display = 'none'; }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 0 }}>
            <tbody>
              <tr style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.82rem' }}>
                <td style={{ ...cell, ...borderR }}>Working Days<br /><span style={{ fontWeight: 400 }}>{money(slip.workingDays)}</span></td>
                <td style={{ ...cell, ...borderR }}>Present Days<br /><span style={{ fontWeight: 400 }}>{money(slip.presentDays)}</span></td>
                <td style={{ ...cell, ...borderR }}>Paid Leaves<br /><span style={{ fontWeight: 400 }}>0.00</span></td>
                <td style={{ ...cell, ...borderR }}>Absent<br /><span style={{ fontWeight: 400 }}>{money(slip.absentDays)}</span></td>
                <td style={cell}>Payable<br /><span style={{ fontWeight: 400 }}>{money(slip.workingDays)}</span></td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', marginBottom: 0 }}>
            <tbody>
              <tr style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>
                <td style={{ ...cell, ...borderR }}>IncomeY.T.D : {ytdIncome.toFixed(2)}</td>
                <td style={cell}>I/TaxY.T.D : {ytdTax.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: '0.81rem', marginBottom: 0 }}>
            <tbody>
              <tr>
                <td style={{ ...cell, ...borderR, verticalAlign: 'top', width: '50%' }}>
                  {[
                    ['Location', employee.branch],
                    ['Department', employee.department],
                    ['Designation', employee.designation],
                    ['Grade', employee.grade],
                    ['Bank Account No.', employee.bankAccountNo],
                    ['Bank Name', employee.bankName],
                    ['Pan Card', employee.pan],
                  ].map(([label, value]) => (
                    <div key={label} style={{ marginBottom: '4px' }}>
                      <strong style={{ minWidth: '120px', display: 'inline-block' }}>{label} :</strong> {value || ''}
                    </div>
                  ))}
                </td>
                <td style={{ ...cell, verticalAlign: 'top', width: '50%' }}>
                  {[
                    ['PF Memb Cont.(YTD)', ytdPf.toFixed(2)],
                    ['Payment Mode', 'Money Transfer'],
                    ['P.F. A/c No.', employee.pfEmployee],
                    ['E.S.I.C A/c No.', employee.esicNo],
                    ['UAN', employee.uan],
                  ].map(([label, value]) => (
                    <div key={label} style={{ marginBottom: '4px' }}>
                      <strong style={{ minWidth: '130px', display: 'inline-block' }}>{label} :</strong> {value || ''}
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

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
              {Array.from({ length: Math.max(earnings.length, deductions.length) }, (_, index) => (
                <tr key={index}>
                  <td style={{ ...cell, ...borderR }}>{earnings[index]?.[0] || ''}</td>
                  <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{earnings[index] ? money(earnings[index][1]) : ''}</td>
                  <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{earnings[index] ? money(earnings[index][1]) : ''}</td>
                  <td style={{ ...cell, ...borderR }}>{deductions[index]?.[0] || ''}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{deductions[index] ? money(deductions[index][1]) : ''}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', ...borderT }}>
                <td style={{ ...cell, ...borderR }}>Total Earnings</td>
                <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{money(slip.grossPay)}</td>
                <td style={{ ...cell, ...borderR, textAlign: 'right' }}>{money(slip.grossPay)}</td>
                <td style={{ ...cell, ...borderR }}>Total Deductions</td>
                <td style={{ ...cell, textAlign: 'right' }}>{money(slip.totalDeductions)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold', ...borderT, background: '#f0fdf4' }}>
                <td colSpan={3} style={{ ...cell, ...borderR, textAlign: 'right' }}>Net Payable :</td>
                <td colSpan={2} style={{ ...cell, textAlign: 'right', color: '#16a34a', fontSize: '0.95rem' }}>₹{money(slip.netPay)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '10px 12px', fontSize: '0.85rem' }}>
            <strong>Net Salary (In Words):</strong> {numberToWords(Math.round(Number(slip.netPay) || 0))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.72rem', marginTop: '12px', color: '#64748b' }}>
            This is a system generated payslip and does not require signature.
          </div>
        </div>
      </div>
    </div>
  );
}
