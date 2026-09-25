'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function formatIndianAmount(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function POPrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/purchase/po?id=${id}`)
        .then(res => res.json())
        .then(data => {
          setPo(Array.isArray(data) ? data[0] : data);
          setLoading(false);
          setTimeout(() => {
            window.print();
          }, 1000);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Purchase Order...</div>;
  }

  if (!po) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Purchase Order not found.</div>;
  }

  let extra = { discount: 0, freight: 0, otherCharges: 0 };
  if (po.remarks) {
    try {
      const parsed = JSON.parse(po.remarks);
      if (typeof parsed === 'object') {
        extra = parsed;
        if (typeof parsed.remarks === 'string') {
          const nested = JSON.parse(parsed.remarks);
          if (nested && typeof nested === 'object') extra = { ...extra, ...nested };
        }
      }
    } catch(e) {}
  }
  const siteContactPerson = po.deliveryContact || extra.siteContactPerson || '-';
  const siteContactDetail = po.deliveryPhone || extra.siteContactDetail || '-';

  // Calculate totals matching the table
  const totalBasicAmt = po.items?.reduce((sum, item) => sum + (item.taxableAmount || 0), 0) || 0;
  const totalGstAmt = po.items?.reduce((sum, item) => sum + (item.gstAmount || 0), 0) || 0;
  const totalItemAmt = po.items?.reduce((sum, item) => sum + (item.totalAmount || 0), 0) || 0;

  return (
    <div className="po-print-root" style={{ maxWidth: '210mm', margin: '0 auto', padding: '10mm', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '11px', lineHeight: '1.4', boxSizing: 'border-box' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body, body > div { width: 100% !important; min-width: 0 !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          html::-webkit-scrollbar, body::-webkit-scrollbar, .po-print-root::-webkit-scrollbar { display: none !important; width: 0 !important; }
          html, body, .po-print-root { scrollbar-width: none !important; -ms-overflow-style: none !important; }
          .po-print-root { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
        }
        .po-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .po-table th, .po-table td { border: 1px solid #000; padding: 4px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
        .po-table th { background-color: #f3f4f6; font-weight: bold; text-align: center; font-size: 10px; }
        .po-grid-table { width: 100%; border-collapse: collapse; }
        .po-grid-table td { border: 1px solid #000; padding: 4px; vertical-align: top; }
        .header-title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
        .header-sub { font-size: 11px; text-align: center; }
        .section-header { font-weight: bold; text-align: center; background-color: #e5e7eb; border-bottom: 1px solid #000; padding: 4px; }
        .val-col { width: 120px; }
      `}</style>
      
      <div className="no-print" style={{ marginBottom: '1rem', textAlign: 'right' }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Print / Save PDF</button>
      </div>

      <div style={{ border: '1px solid #000' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '8px' }}>
          <div style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="header-title">CeCube Engineering India Private Limited</div>
            <div className="header-sub">A-121-122, Phase II, New Palam Vihar, Near St. Soldier School, Gurugram,</div>
            <div className="header-sub">Haryana-122017,</div>
            <div className="header-sub">Phone No-0124-4946490, contact@cecubeindia.com</div>
            <div className="header-sub">GST No.-06AAJCC2203M1ZT, PAN No.-AAJCC2203M</div>
          </div>
          <div style={{ width: '80px', textAlign: 'right', fontSize: '9px' }}>
            Page 1 of 1
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', padding: '4px', backgroundColor: '#f3f4f6' }}>
          Purchase Order
        </div>

        {/* Supplier & PO Details */}
        <table className="po-grid-table">
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: 0, borderBottom: 'none', borderLeft: 'none', borderTop: 'none' }}>
                <div className="section-header">Supplier Details</div>
                <div style={{ padding: '6px' }}>
                  <table style={{ border: 'none', width: '100%', fontSize: '11px' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', padding: '2px', width: '100px', fontWeight: 'bold' }}>Supplier Name</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierName}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>Address</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierAddress}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>Contact Person</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierContact || '-'}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>Mobile No.</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierPhone || '-'}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>Email ID</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierEmail || '-'}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>PAN No.</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierPan || '-'}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>GST No.</td><td style={{ border: 'none', padding: '2px' }}>: {po.supplierGstin || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </td>
              <td style={{ width: '50%', padding: 0, borderBottom: 'none', borderRight: 'none', borderTop: 'none' }}>
                <div className="section-header">PO Details</div>
                <div style={{ padding: '6px' }}>
                  <table style={{ border: 'none', width: '100%', fontSize: '11px' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', padding: '2px', width: '100px', fontWeight: 'bold' }}>PO No.</td><td style={{ border: 'none', padding: '2px' }}>: {po.poNumber}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>PO Date</td><td style={{ border: 'none', padding: '2px' }}>: {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : '-'}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>PO Valid Till</td><td style={{ border: 'none', padding: '2px' }}>: {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-GB') : '-'}</td></tr>
                      <tr><td style={{ border: 'none', padding: '2px', fontWeight: 'bold' }}>Project Name</td><td style={{ border: 'none', padding: '2px' }}>: {po.projectName || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Communication & Delivery Address */}
        <table className="po-grid-table">
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: 0, borderLeft: 'none' }}>
                <div className="section-header">Communication/Billing Address</div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CeCube Engineering India Private Limited</div>
                  <div style={{ marginBottom: '8px' }}>A 121-122 Near St. Soldier School, Phase-II, New Palam Vihar<br/>Sector-110 Gurgaon-122017</div>
                  <table style={{ border: 'none', width: '100%', fontSize: '11px' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', padding: '1px', width: '80px', fontWeight: 'bold' }}>Phone No.</td><td style={{ border: 'none', padding: '1px' }}>: 0124 4946490</td></tr>
                      <tr><td style={{ border: 'none', padding: '1px', fontWeight: 'bold' }}>Email ID</td><td style={{ border: 'none', padding: '1px' }}>: contact@cecubeindia.com</td></tr>
                      <tr><td style={{ border: 'none', padding: '1px', fontWeight: 'bold' }}>GST No.</td><td style={{ border: 'none', padding: '1px' }}>: 06AAJCC2203M1ZT</td></tr>
                      <tr><td style={{ border: 'none', padding: '1px', fontWeight: 'bold' }}>PAN No.</td><td style={{ border: 'none', padding: '1px' }}>: AAJCC2203M</td></tr>
                    </tbody>
                  </table>
                </div>
              </td>
              <td style={{ width: '50%', padding: 0, borderRight: 'none' }}>
                <div className="section-header">Delivery Address</div>
                <div style={{ padding: '6px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CeCube Engineering India Private Limited</div>
                  <div style={{ marginBottom: '8px', minHeight: '30px' }}>{po.deliveryAddress || '-'}</div>
                  <div style={{ marginBottom: '2px' }}>Site Contact: {siteContactDetail}</div>
                  <div>Contact Person: {siteContactPerson}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* List of goods */}
        <div style={{ padding: '4px', fontSize: '11px', borderBottom: '1px solid #000' }}>
          List of goods as follow :
        </div>

        <table className="po-table" style={{ borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
          <thead>
            <tr>
              <th style={{ width: '30px', borderLeft: 'none', borderTop: 'none' }}>S.No</th>
              <th style={{ width: '220px', borderTop: 'none' }}>Description Of Goods</th>
              <th style={{ width: '40px', borderTop: 'none' }}>Unit</th>
              <th style={{ width: '60px', borderTop: 'none' }}>Qty</th>
              <th style={{ width: '60px', borderTop: 'none' }}>Rate<br/>(INR)</th>
              <th style={{ width: '40px', borderTop: 'none' }}>Disc.<br/>(%)</th>
              <th style={{ width: '70px', borderTop: 'none' }}>Basic Amt<br/>(INR)</th>
              <th style={{ width: '40px', borderTop: 'none' }}>GST<br/>%</th>
              <th style={{ width: '70px', borderTop: 'none' }}>GST Amt<br/>(INR)</th>
              <th style={{ width: '80px', borderRight: 'none', borderTop: 'none' }}>Total<br/>(INR)</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center', borderLeft: 'none' }}>{idx + 1}</td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                  {item.specifications && <div style={{ fontSize: '10px' }}>{item.specifications}</div>}
                  <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>HSN Code -{item.hsnCode || '0'}</div>
                </td>
                <td style={{ textAlign: 'center' }}>{item.unit}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{formatIndianAmount(item.rate)}</td>
                <td style={{ textAlign: 'right' }}>{item.discountPercent?.toFixed(2) || '0.00'}</td>
                <td style={{ textAlign: 'right' }}>{formatIndianAmount(item.taxableAmount)}</td>
                <td style={{ textAlign: 'right' }}>{item.gstPercent.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{formatIndianAmount(item.gstAmount)}</td>
                <td style={{ textAlign: 'right', borderRight: 'none' }}>{formatIndianAmount(item.totalAmount)}</td>
              </tr>
            ))}
            
            {/* Total Row */}
            <tr>
              <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold', borderLeft: 'none' }}>Total :</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatIndianAmount(totalBasicAmt)}</td>
              <td></td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatIndianAmount(totalGstAmt)}</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', borderRight: 'none' }}>{formatIndianAmount(totalItemAmt)}</td>
            </tr>
          </tbody>
        </table>

        {/* Taxes and Totals Section */}
        <table className="po-table" style={{ borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', borderLeft: 'none', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: 'none', padding: '6px', borderBottom: '1px solid #000' }}>CGST {(po.cgstPercent || 0)}%</td>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right', borderBottom: '1px solid #000', borderLeft: '1px solid #000', width: '100px' }}>{formatIndianAmount(po.cgstAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', padding: '6px', borderBottom: '1px solid #000' }}>SGST {(po.sgstPercent || 0)}%</td>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right', borderBottom: '1px solid #000', borderLeft: '1px solid #000', width: '100px' }}>{formatIndianAmount(po.sgstAmount)}</td>
                    </tr>
                    {po.igstAmount > 0 && (
                      <tr>
                        <td style={{ border: 'none', padding: '6px', borderBottom: '1px solid #000' }}>IGST {(po.igstPercent || 0)}%</td>
                        <td style={{ border: 'none', padding: '6px', textAlign: 'right', borderBottom: '1px solid #000', borderLeft: '1px solid #000', width: '100px' }}>{formatIndianAmount(po.igstAmount)}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>Total Tax Amount</td>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right', borderLeft: '1px solid #000', fontWeight: 'bold' }}>{formatIndianAmount(po.totalTaxAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ width: '50%', borderRight: 'none', padding: 0, verticalAlign: 'top' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right' }}>Transport:</td>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right', width: '100px' }}>{formatIndianAmount(extra.freight)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right' }}>Transport & Other Charges:</td>
                      <td style={{ border: 'none', padding: '6px', textAlign: 'right', width: '100px' }}>{formatIndianAmount(extra.otherCharges)}</td>
                    </tr>
                    {extra.discount > 0 && (
                      <tr>
                        <td style={{ border: 'none', padding: '6px', textAlign: 'right' }}>Discount:</td>
                        <td style={{ border: 'none', padding: '6px', textAlign: 'right', width: '100px' }}>- {formatIndianAmount(extra.discount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Terms and Conditions (if any) */}
        {(po.paymentTerms || po.deliverySchedule || po.scopeOfWork || po.otherTerms) && (
          <div style={{ padding: '8px', borderTop: '1px solid #000', borderBottom: '1px solid #000', fontSize: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>Terms & Conditions:</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {po.paymentTerms && <li><strong>Payment Terms:</strong> {po.paymentTerms}</li>}
              {po.deliverySchedule && <li><strong>Delivery Schedule:</strong> {po.deliverySchedule}</li>}
              {po.scopeOfWork && <li><strong>Scope Of Work/Warranty:</strong> {po.scopeOfWork}</li>}
              {po.otherTerms && <li><strong>Other Terms:</strong> {po.otherTerms}</li>}
            </ul>
          </div>
        )}

        {/* Footer Area for signatures */}
        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: '80px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '30px' }}>Prepared By</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{po.preparedByName || 'Purchase Manager'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '30px' }}>Approve By</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{po.approvedByName || 'Director'}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#4b5563', alignSelf: 'flex-end' }}>
            {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })} Page 1 of 1
          </div>
        </div>

      </div>
    </div>
  );
}

export default function POPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Purchase Order...</div>}>
      <POPrintContent />
    </Suspense>
  );
}
