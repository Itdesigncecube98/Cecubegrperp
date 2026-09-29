import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

function toNum(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? fallback : n;
}

function amountToWords(amount) {
  if (amount === 0) return 'ZERO';
  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convert = (num) => {
    if (num === 0) return '';
    if (num < 20) return a[num] + ' ';
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + a[num % 10] : '') + ' ';
    return a[Math.floor(num / 100)] + ' HUNDRED ' + convert(num % 100);
  };

  let rupees = Math.floor(amount);
  let paise = Math.round((amount - rupees) * 100);

  if (rupees === 0) {
    return paise > 0 ? `PAISE ${convert(paise)}` : 'ZERO';
  }

  let res = '';
  if (rupees >= 10000000) {
    res += convert(Math.floor(rupees / 10000000)) + 'CRORE ';
    rupees %= 10000000;
  }
  if (rupees >= 100000) {
    res += convert(Math.floor(rupees / 100000)) + 'LAKH ';
    rupees %= 100000;
  }
  if (rupees >= 1000) {
    res += convert(Math.floor(rupees / 1000)) + 'THOUSAND ';
    rupees %= 1000;
  }
  res += convert(rupees);

  let finalStr = 'RUPEES ' + res.trim();
  if (paise > 0) {
    finalStr += ' AND PAISE ' + convert(paise).trim();
  }
  return finalStr + ' ONLY';
}

export default async function RABillPrintPage({ params }) {
  const { id } = await params;

  const bill = await prisma.workOrderRABill.findUnique({
    where: { id },
    include: {
      workOrder: true,
      project: true,
    },
  });

  if (!bill) {
    notFound();
  }

  // Parse task lines
  let taskLines = [];
  let remarksText = bill.remarks || '';
  if (remarksText.startsWith('__TASK_LINES__:')) {
    const newlineIdx = remarksText.indexOf('\n');
    if (newlineIdx !== -1) {
      const jsonStr = remarksText.substring('__TASK_LINES__:'.length, newlineIdx);
      try {
        taskLines = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse task lines', e);
      }
      remarksText = remarksText.substring(newlineIdx + 1).trim();
    }
  }

  const inr = new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <div id="print-container" style={{ padding: '40px', fontFamily: '"Times New Roman", Times, serif', fontSize: '12px', color: '#000', maxWidth: '1000px', margin: '0 auto', background: '#fff' }}>

      {/* Hide print button and app layout when printing */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; margin: 0; padding: 0; }
          @page { margin: 10mm; }
          
          /* Hide everything in the body */
          body * { visibility: hidden; }
          
          /* Show only our print container */
          #print-container, #print-container * {
            visibility: visible;
          }
          
          /* Position it at the top left of the page */
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
        th { font-weight: bold; text-align: center; background: #f0f0f0; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .grid-header { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; border-top: none; }
        .grid-col { padding: 8px; }
        .grid-col:first-child { border-right: 1px solid #000; }
        .row-kv { display: flex; margin-bottom: 4px; }
        .row-k { width: 120px; font-weight: normal; }
        .row-v { flex: 1; font-weight: normal; }
      `}} />

      <PrintButton billId={bill.id} />

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>CeCube Engineering India Private Limited</h2>
        <p style={{ margin: 0, fontSize: '11px' }}>A-121-122, Phase II, New Palam Vihar, Near St. Soldier School, Gurugram, Haryana-122017</p>
      </div>

      <div style={{ border: '1px solid #000', background: '#f0f0f0', textAlign: 'center', fontWeight: 'bold', padding: '4px 0' }}>
        RA Bill
      </div>

      <div className="grid-header">
        <div className="grid-col">
          <div className="row-kv"><div className="row-k">Project</div><div className="row-v">: {bill.project?.name || 'N/A'}</div></div>
          <div className="row-kv"><div className="row-k">Contractor</div><div className="row-v">: {bill.workOrder?.contractorName || 'N/A'}</div></div>
          <div className="row-kv">
            <div className="row-k">Address</div>
            <div className="row-v">: {bill.workOrder?.contractorAddress || ''}</div>
          </div>
          <div className="row-kv"><div className="row-k">Work Group</div><div className="row-v">: </div></div>
          <div className="row-kv"><div className="row-k">Phone</div><div className="row-v">: {bill.workOrder?.contractorPhone || ''}</div></div>
          <div className="row-kv"><div className="row-k">PAN</div><div className="row-v">: {bill.workOrder?.contractorPan || ''}</div></div>
          <div className="row-kv"><div className="row-k">ST No</div><div className="row-v">: </div></div>
          <div className="row-kv"><div className="row-k">VAT/TIN No</div><div className="row-v">: </div></div>
          <div className="row-kv"><div className="row-k">GST No</div><div className="row-v">: {bill.workOrder?.contractorGst || ''}</div></div>
          <div className="row-kv"><div className="row-k">Executed By</div><div className="row-v">: {bill.workOrder?.contractorName || 'N/A'}</div></div>
        </div>
        <div className="grid-col">
          <div className="row-kv"><div className="row-k">Work Order No</div><div className="row-v">: {bill.workOrder?.woNo || 'N/A'}</div></div>
          <div className="row-kv"><div className="row-k">Work Order Date</div><div className="row-v">: {formatDate(bill.workOrder?.createdAt)}</div></div>
          <div className="row-kv"><div className="row-k">Work Order Value</div><div className="row-v">: {inr.format(bill.workOrder?.contractValue || 0)}</div></div>
          <br />
          <div className="row-kv"><div className="row-k">Building Name</div><div className="row-v">: </div></div>
          <br />
          <div className="row-kv"><div className="row-k">RA Bill No</div><div className="row-v">: {bill.billNo}</div></div>
          <div className="row-kv"><div className="row-k">RA Bill Date</div><div className="row-v">: {formatDate(bill.date)}</div></div>
          <br />
          <div className="row-kv"><div className="row-k">Cont. Bill No</div><div className="row-v">: </div></div>
          <div className="row-kv"><div className="row-k">Cont. Bill Date</div><div className="row-v">: </div></div>

          <div style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px', color: bill.status === 'Approved' || bill.status === 'Paid' ? '#15803d' : '#991b1b' }}>
            {bill.status === 'Approved' || bill.status === 'Paid' ? '' : 'UNAPPROVED'}
          </div>
        </div>
      </div>

      <table style={{ marginTop: '10px' }}>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Description of items</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>WO Qty</th>
            <th>Previous Qty</th>
            <th>Current Qty</th>
            <th>Upto Date Qty</th>
            <th>Current Amt</th>
            <th>Cumulative Amt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="9" style={{ fontWeight: 'bold', background: '#f9f9f9' }}>Service charge installation and commissioning</td>
          </tr>
          {taskLines.map((line, idx) => {
            const qty = toNum(line.qty);
            const rate = toNum(line.rate);
            const amt = toNum(line.amount);
            return (
              <tr key={idx}>
                <td>{line.description}</td>
                <td className="text-center">Job</td>
                <td className="text-right">{inr.format(rate)}</td>
                <td className="text-right">{inr.format(qty)}</td>
                <td className="text-right">0.00</td>
                <td className="text-right">{inr.format(qty)}</td>
                <td className="text-right">{inr.format(qty)}</td>
                <td className="text-right">{inr.format(amt)}</td>
                <td className="text-right">{inr.format(amt)}</td>
              </tr>
            );
          })}
          {taskLines.length === 0 && (
            <tr>
              <td colSpan="9" className="text-center" style={{ color: '#666', padding: '15px' }}>No task lines recorded for this bill.</td>
            </tr>
          )}
          <tr>
            <td colSpan="7" className="text-right" style={{ fontWeight: 'bold' }}>Total Certified labour Amount :</td>
            <td className="text-right" style={{ fontWeight: 'bold' }}>{inr.format(bill.measuredValue)}</td>
            <td className="text-right" style={{ fontWeight: 'bold' }}>{inr.format(bill.cumulative)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ border: '1px solid #000', borderTop: 'none', background: '#f0f0f0', fontWeight: 'bold', padding: '4px 6px', fontSize: '11px', textTransform: 'uppercase' }}>
        Advance Details If Any
      </div>
      <table style={{ borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ width: '25%', borderTop: 'none' }}>Uptodate Advance Amount:</td>
            <td style={{ width: '25%', borderTop: 'none' }}>Uptodate Advance Recovery: {inr.format(bill.advanceRecovery)}</td>
            <td style={{ width: '25%', borderTop: 'none' }}>Balance Amount:</td>
            <td style={{ width: '25%', borderTop: 'none' }}>TDS : {inr.format(bill.tdsAmount)} ({bill.tdsPercent}%)</td>
          </tr>
        </tbody>
      </table>

      <div style={{ border: '1px solid #000', borderTop: 'none', background: '#f0f0f0', fontWeight: 'bold', padding: '4px 6px', fontSize: '11px', textTransform: 'uppercase' }}>
        Advance Recovery Details If Any
      </div>
      <div style={{ border: '1px solid #000', borderTop: 'none', padding: '10px 6px', minHeight: '80px' }}>
        <div style={{ marginBottom: '10px' }}><strong>Remark:</strong> {remarksText}</div>
        <div><strong>Narration :</strong></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
        <div style={{ fontSize: '10px' }}>{formatDate(bill.date)}</div>
        <div style={{ fontSize: '10px' }}>Page 1 of 2</div>
      </div>

      {/* PAGE 2 */}
      <div style={{ pageBreakBefore: 'always', marginTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>CeCube Engineering India Private Limited</h2>
          <p style={{ margin: 0, fontSize: '11px' }}>A-121-122, Phase II, New Palam Vihar, Near St. Soldier School, Gurugram, Haryana-122017</p>
        </div>

        <div style={{ border: '1px solid #000', background: '#f0f0f0', textAlign: 'center', fontWeight: 'bold', padding: '4px 0' }}>
          RA Bill
        </div>

        <div className="grid-header">
          <div className="grid-col">
            <div className="row-kv"><div className="row-k">Project</div><div className="row-v">: {bill.project?.name || 'N/A'}</div></div>
            <div className="row-kv"><div className="row-k">Contractor</div><div className="row-v">: {bill.workOrder?.contractorName || 'N/A'}</div></div>
            <div className="row-kv">
              <div className="row-k">Address</div>
              <div className="row-v">: {bill.workOrder?.contractorAddress || ''}</div>
            </div>
            <div className="row-kv"><div className="row-k">Work Group</div><div className="row-v">: </div></div>
            <div className="row-kv"><div className="row-k">Phone</div><div className="row-v">: {bill.workOrder?.contractorPhone || ''}</div></div>
            <div className="row-kv"><div className="row-k">PAN</div><div className="row-v">: {bill.workOrder?.contractorPan || ''}</div></div>
            <div className="row-kv"><div className="row-k">ST No</div><div className="row-v">: </div></div>
            <div className="row-kv"><div className="row-k">VAT/TIN No</div><div className="row-v">: </div></div>
            <div className="row-kv"><div className="row-k">GST No</div><div className="row-v">: {bill.workOrder?.contractorGst || ''}</div></div>
            <div className="row-kv"><div className="row-k">Executed By</div><div className="row-v">: {bill.workOrder?.contractorName || 'N/A'}</div></div>
          </div>
          <div className="grid-col">
            <div className="row-kv"><div className="row-k">Work Order No</div><div className="row-v">: {bill.workOrder?.woNo || 'N/A'}</div></div>
            <div className="row-kv"><div className="row-k">Work Order Date</div><div className="row-v">: {formatDate(bill.workOrder?.createdAt)}</div></div>
            <div className="row-kv"><div className="row-k">Work Order Value</div><div className="row-v">: {inr.format(bill.workOrder?.contractValue || 0)}</div></div>
            <br />
            <div className="row-kv"><div className="row-k">Building Name</div><div className="row-v">: </div></div>
            <br />
            <div className="row-kv"><div className="row-k">RA Bill No</div><div className="row-v">: {bill.billNo}</div></div>
            <div className="row-kv"><div className="row-k">RA Bill Date</div><div className="row-v">: {formatDate(bill.date)}</div></div>
            <br />
            <div className="row-kv"><div className="row-k">Cont. Bill No</div><div className="row-v">: </div></div>
            <div className="row-kv"><div className="row-k">Cont. Bill Date</div><div className="row-v">: </div></div>

            <div style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px', color: bill.status === 'Approved' || bill.status === 'Paid' ? '#15803d' : '#991b1b' }}>
              {bill.status === 'Approved' || bill.status === 'Paid' ? '' : 'UNAPPROVED'}
            </div>
          </div>
        </div>

        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th colSpan="4" style={{ textAlign: 'left', background: '#fff', borderBottom: 'none' }}>Payment Summary</th>
            </tr>
            <tr>
              <th style={{ width: '40%' }}>Description</th>
              <th style={{ width: '20%' }}>Upto previous bill Amount</th>
              <th style={{ width: '20%' }}>Current Bill</th>
              <th style={{ width: '20%' }}>Cumulative Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan="4" style={{ fontWeight: 'bold', background: '#f9f9f9' }}>A) Payments</td></tr>
            <tr>
              <td>1) Total Certified Amount</td>
              <td className="text-right">{inr.format(bill.previousCertified)}</td>
              <td className="text-right">{inr.format(bill.currentBill)}</td>
              <td className="text-right">{inr.format(bill.cumulative)}</td>
            </tr>
            <tr>
              <td>2) Service Tax</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td>3) VAT</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td>4) GST Provider Amt</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td>5) Other Charges</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td>6) Credits</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
              <td className="text-center">Sub total A</td>
              <td className="text-right">{inr.format(bill.previousCertified)}</td>
              <td className="text-right">{inr.format(bill.currentBill)}</td>
              <td className="text-right">{inr.format(bill.cumulative)}</td>
            </tr>

            <tr><td colSpan="4" style={{ fontWeight: 'bold', background: '#f9f9f9' }}>B) Recoveries</td></tr>
            <tr>
              <td>1) Retention {bill.retentionPercent} %</td>
              <td className="text-right">0.00</td>
              <td className="text-right">{inr.format(bill.retentionAmount)}</td>
              <td className="text-right">{inr.format(bill.retentionAmount)}</td>
            </tr>
            <tr>
              <td>2) TDS {bill.tdsPercent} %</td>
              <td className="text-right">0.00</td>
              <td className="text-right">{inr.format(bill.tdsAmount)}</td>
              <td className="text-right">{inr.format(bill.tdsAmount)}</td>
            </tr>
            <tr>
              <td>3) Advance Recovered</td>
              <td className="text-right">0.00</td>
              <td className="text-right">{inr.format(bill.advanceRecovery)}</td>
              <td className="text-right">{inr.format(bill.advanceRecovery)}</td>
            </tr>
            <tr>
              <td>4) Debit / Discount (Other)</td>
              <td className="text-right">0.00</td>
              <td className="text-right">{inr.format(bill.otherDeductions)}</td>
              <td className="text-right">{inr.format(bill.otherDeductions)}</td>
            </tr>

            <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
              <td className="text-center">Sub total B</td>
              <td className="text-right">0.00</td>
              <td className="text-right">{inr.format(bill.retentionAmount + bill.tdsAmount + bill.advanceRecovery + bill.otherDeductions)}</td>
              <td className="text-right">{inr.format(bill.retentionAmount + bill.tdsAmount + bill.advanceRecovery + bill.otherDeductions)}</td>
            </tr>

            <tr style={{ fontWeight: 'bold', background: '#e0e0e0' }}>
              <td>C) Total Payments ( A-B )</td>
              <td className="text-right">{inr.format(bill.previousCertified)}</td>
              <td className="text-right">{inr.format(bill.netPayable)}</td>
              <td className="text-right">{inr.format(bill.netPayable)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ border: '1px solid #000', borderTop: 'none', padding: '10px 6px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Net Payable Amount :</div>
          <div style={{ marginBottom: '10px' }}>Amount in words : <span style={{ textTransform: 'uppercase' }}>{amountToWords(bill.netPayable)}</span></div>
        </div>
        <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none' }}>
          <div style={{ flex: 1, padding: '4px 6px', borderRight: '1px solid #000' }}>Voucher No : </div>
          <div style={{ flex: 1, padding: '4px 6px' }}>Date : </div>
        </div>
        <div style={{ border: '1px solid #000', borderTop: 'none', padding: '4px 6px' }}>
          Remark :
        </div>

        <table style={{ borderTop: 'none', marginTop: '0' }}>
          <tbody>
            <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
              <td style={{ width: '25%', textAlign: 'center' }}>Prepared By</td>
              <td style={{ width: '25%', textAlign: 'center' }}>Checked By</td>
              <td style={{ width: '25%', textAlign: 'center' }}>Approved By</td>
              <td style={{ width: '25%', textAlign: 'center' }}>Contractor Signature</td>
            </tr>
            <tr>
              <td style={{ height: '80px', verticalAlign: 'bottom' }}></td>
              <td style={{ height: '80px' }}></td>
              <td style={{ height: '80px' }}></td>
              <td style={{ height: '80px', verticalAlign: 'bottom', textAlign: 'right' }}>{bill.workOrder?.contractorName?.toUpperCase() || ''}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
          <div style={{ fontSize: '10px' }}>{formatDate(bill.date)}</div>
          <div style={{ fontSize: '10px' }}>Page 2 of 2</div>
        </div>
      </div>
    </div>
  );
}
