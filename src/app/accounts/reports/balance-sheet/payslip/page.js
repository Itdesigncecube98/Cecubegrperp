'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';

const money = value => {
  const amount = Number(value);
  return (Number.isFinite(amount) ? amount : 0).toFixed(2);
};

function underHundred(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  return value < 20 ? ones[value] : `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ''}`;
}

function underThousand(value) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return `${hundreds ? `${underHundred(hundreds)} Hundred${remainder ? ' ' : ''}` : ''}${remainder ? underHundred(remainder) : ''}`;
}

function amountInWords(value) {
  let remaining = Math.round(Number(value) || 0);
  if (remaining <= 0) return 'Zero Rupees Only';
  const parts = [];
  for (const [unit, label] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']]) {
    const count = Math.floor(remaining / unit);
    if (count) {
      parts.push(`${underThousand(count)} ${label}`);
      remaining %= unit;
    }
  }
  if (remaining) parts.push(underHundred(remaining));
  return `${parts.join(' ')} Rupees Only`;
}

function displayDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
}

export default function AccountsPayslipPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const recordId = new URLSearchParams(window.location.search).get('recordId');
    if (!recordId) {
      setError('Posted salary record ID is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadPayslip = async () => {
      try {
        const response = await fetch(
          `/api/accounts/balance-sheet/posted-salaries/${encodeURIComponent(recordId)}/payslip`,
          { cache: 'no-store' }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load payslip.');
        if (!cancelled) setData(result.data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Could not load payslip.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPayslip();
    return () => { cancelled = true; };
  }, []);

  const monthDate = data?.payCycle?.startDate
    ? new Date(`${String(data.payCycle.startDate).slice(0, 10)}T00:00:00`)
    : null;
  const monthLabel = monthDate && !Number.isNaN(monthDate.getTime())
    ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthDate).toUpperCase()
    : data?.payCycle?.name || 'SALARY PAYSLIP';
  const record = data?.record || {};
  const employee = data?.employee || {};
  const deductions = data?.employeeDeductions || [];
  const earnings = data?.earnings || [];
  const rowCount = Math.max(earnings.length, deductions.length, 1);
  const totalDeductions = Number(record.totalDeductions) || 0;
  const netPay = Number(record.netPay) || 0;

  return (
    <main className="accounts-payslip-page">
      <div className="payslip-actions">
        <button type="button" onClick={() => router.back()}><ArrowLeft size={16} /> Back</button>
        <button type="button" onClick={() => window.print()} disabled={!data}><Printer size={16} /> Print / Save PDF</button>
      </div>

      {loading ? (
        <div className="payslip-message"><Loader2 className="animate-spin" size={22} /> Loading payslip...</div>
      ) : error ? (
        <div className="payslip-message payslip-error" role="alert">{error}</div>
      ) : (
        <article className="accounts-payslip">
          <div className="payslip-month">{monthLabel}</div>

          <header className="payslip-identity">
            <div className="payslip-identity-details">
              <div><strong>Company :</strong> CeCube Engineering India Private Limited</div>
              <div><strong>Employee Name :</strong> {employee.name || '-'}</div>
              <div><strong>Employee Code :</strong> {employee.empId || '-'}</div>
            </div>
            <img src="/logo.png" alt="CeCube Group" />
          </header>

          <div className="attendance-summary">
            {[
              ['Working Days', (Number(record.workingDays) || 0) + (Number(record.absentDays) || 0)],
              ['Present Days', record.presentDays],
              ['Paid Leaves', data.paidLeaves],
              ['Absent', record.absentDays],
              ['Payable', record.workingDays],
            ].map(([label, value]) => (
              <div key={label}><strong>{label}</strong><span className="numeric-value">{Number(value || 0).toFixed(2)}</span></div>
            ))}
          </div>

          <div className="ytd-summary">
            <strong>Income Y.T.D : <span className="numeric-value">{money(data.yearToDate?.income)}</span></strong>
            <strong>I/Tax Y.T.D : <span className="numeric-value">{money(data.yearToDate?.incomeTax)}</span></strong>
          </div>

          <div className="employee-details">
            <div>
              <Detail label="Location" value={employee.branch || employee.siteOffice} />
              <Detail label="Department" value={employee.department} />
              <Detail label="Designation" value={employee.designation} />
              <Detail label="Grade" value={employee.grade} />
              <Detail label="Bank Account No." value={employee.bankAccountNo} />
              <Detail label="Bank Name" value={employee.bankName} />
              <Detail label="PAN Card" value={employee.pan} />
            </div>
            <div>
              <Detail label="PF Memb. Cont. (YTD)" value={money(data.yearToDate?.pf)} />
              <Detail label="Payment Mode" value="Money Transfer" />
              <Detail label="P.F. A/c No." value={employee.pfEmployee} />
              <Detail label="E.S.I.C A/c No." value={employee.esicNo} />
              <Detail label="UAN" value={employee.uan} />
              <Detail label="Joining Date" value={displayDate(employee.joinedDate)} />
            </div>
          </div>

          <table className="payslip-amounts">
            <thead>
              <tr>
                <th>EARNINGS</th>
                <th>INFO(E)</th>
                <th>ACTUAL(E)</th>
                <th>DEDUCTIONS</th>
                <th>ACTUAL(D)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, index) => (
                <tr key={index}>
                  <td>{earnings[index]?.name || ''}</td>
                  <td className="amount">{earnings[index] ? money(earnings[index].infoAmount) : ''}</td>
                  <td className="amount">{earnings[index] ? money(earnings[index].amount) : ''}</td>
                  <td>{deductions[index]?.name || ''}</td>
                  <td className="amount">{deductions[index] ? money(deductions[index].amount) : ''}</td>
                </tr>
              ))}
              <tr className="totals-row">
                <td>Total Earnings</td>
                <td />
                <td className="amount">{money(record.grossPay)}</td>
                <td>Total Deductions</td>
                <td className="amount">{money(totalDeductions)}</td>
              </tr>
              <tr className="net-row">
                <td colSpan={3}>Net Payable :</td>
                <td colSpan={2} className="amount">₹{money(netPay)}</td>
              </tr>
            </tbody>
          </table>

          {(data.employerContributions?.length > 0 || data.employerArrears?.length > 0) && (
            <div className="employer-contributions">
              <strong>Employer contributions (informational; not included in net payable)</strong>
              {[...(data.employerContributions || []), ...(data.employerArrears || []).map(item => ({
                name: `${item.name} Arrear`,
                amount: item.amount,
              }))].map((item, index) => (
                <span key={`${item.name}-${index}`}>{item.name}: {money(item.amount)}</span>
              ))}
            </div>
          )}

          <div className="amount-in-words"><strong>Net Salary (In Words):</strong> {amountInWords(netPay)}</div>
          <footer>This is a system generated payslip and does not require signature.</footer>
        </article>
      )}

      <style jsx global>{`
        .accounts-payslip-page {
          min-height: 100vh;
          padding: 20px;
          background: #f1f5f9;
          color: #1e293b;
          font-family: Arial, sans-serif;
        }
        .payslip-actions {
          display: flex;
          justify-content: space-between;
          max-width: 1180px;
          margin: 0 auto 14px;
        }
        .payslip-actions button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 13px;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          background: white;
          color: #334155;
          cursor: pointer;
        }
        .payslip-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .payslip-message {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 40px;
          color: #64748b;
        }
        .payslip-error { color: #b91c1c; }
        .accounts-payslip {
          max-width: 1180px;
          margin: 0 auto;
          padding: 26px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #1e293b;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
        }
        .payslip-month {
          width: fit-content;
          margin: 0 auto 22px;
          padding: 7px 28px;
          background: #bae6fd;
          color: #0f172a;
          font-size: 18px;
          font-weight: 700;
          text-align: center;
        }
        .payslip-identity {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding-bottom: 18px;
          margin-bottom: 18px;
          border-bottom: 1px solid #334155;
        }
        .payslip-identity-details { display: grid; gap: 6px; }
        .payslip-identity img { max-width: 230px; max-height: 75px; object-fit: contain; }
        .attendance-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          border: 1px solid #334155;
        }
        .attendance-summary div {
          display: grid;
          gap: 3px;
          padding: 8px 5px;
          border-right: 1px solid #334155;
          text-align: center;
        }
        .attendance-summary div:last-child { border-right: 0; }
        .numeric-value,
        .payslip-amounts .amount,
        .employee-detail span {
          font-family: Arial, sans-serif;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }
        .numeric-value,
        .payslip-amounts .amount { font-weight: 600; }
        .ytd-summary {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 9px 12px;
          border: 1px solid #334155;
          border-top: 0;
        }
        .employee-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #e0f2fe;
          border: 1px solid #334155;
          border-top: 0;
        }
        .employee-details > div { display: grid; gap: 8px; padding: 12px; }
        .employee-details > div + div { border-left: 1px solid #334155; }
        .employee-detail {
          display: grid;
          grid-template-columns: minmax(130px, 42%) 1fr;
          gap: 8px;
        }
        .employee-detail strong { white-space: nowrap; }
        .payslip-amounts {
          width: 100%;
          margin-top: 10px;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .payslip-amounts th, .payslip-amounts td {
          padding: 8px 9px;
          border: 1px solid #475569;
          text-align: left;
          overflow-wrap: anywhere;
        }
        .payslip-amounts th {
          background: #e0f2fe;
          color: #0369a1;
          text-align: center;
        }
        .payslip-amounts th:nth-child(1) { width: 30%; }
        .payslip-amounts th:nth-child(2),
        .payslip-amounts th:nth-child(3),
        .payslip-amounts th:nth-child(5) { width: 12%; }
        .payslip-amounts th:nth-child(4) { width: 34%; }
        .payslip-amounts .amount { text-align: right; white-space: nowrap; font-size: 13px; }
        .totals-row { font-weight: 700; }
        .net-row { background: #f8fafc; font-weight: 700; }
        .net-row td:first-child { text-align: right; }
        .net-row .amount { color: #16a34a; font-size: 16px; }
        .employer-contributions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          padding: 9px 12px;
          border: 1px solid #334155;
          border-top: 0;
          font-size: 12px;
        }
        .employer-contributions strong { flex-basis: 100%; }
        .amount-in-words {
          padding: 10px 12px;
          border: 1px solid #334155;
          border-top: 0;
        }
        .accounts-payslip footer {
          padding-top: 15px;
          color: #64748b;
          text-align: center;
          font-size: 12px;
        }
        @media (max-width: 700px) {
          .accounts-payslip-page { padding: 10px; }
          .accounts-payslip { padding: 12px; font-size: 12px; }
          .payslip-identity img { max-width: 130px; }
          .employee-detail { grid-template-columns: 1fr; gap: 2px; }
          .payslip-amounts th, .payslip-amounts td { padding: 6px 4px; font-size: 11px; }
          .payslip-amounts .amount { font-size: 12px; }
        }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { background: white !important; }
          .accounts-payslip-page { min-height: 0; padding: 0; background: white; }
          .payslip-actions { display: none !important; }
          .accounts-payslip { max-width: none; margin: 0; padding: 0; border: 0; font-size: 12px; }
          .payslip-amounts .amount { font-size: 12px; }
          .payslip-month { margin-bottom: 12px; }
          .attendance-summary div, .ytd-summary, .employee-details, .payslip-amounts th {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </main>
  );
}

function Detail({ label, value }) {
  return (
    <div className="employee-detail">
      <strong>{label} :</strong>
      <span>{value || '-'}</span>
    </div>
  );
}
