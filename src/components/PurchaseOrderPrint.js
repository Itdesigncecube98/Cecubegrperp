"use client";

import React from 'react';

export default function PurchaseOrderPrint({ po }) {
  if (!po) return null;

  const styles = {
    page: {
      width: '210mm',
      minHeight: '297mm',
      padding: '10mm',
      margin: '0 auto',
      background: 'white',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10pt',
      color: '#000',
    },
    header: {
      textAlign: 'center',
      borderBottom: '2px solid #000',
      paddingBottom: '8px',
      marginBottom: '12px',
    },
    companyName: {
      fontSize: '14pt',
      fontWeight: 'bold',
      marginBottom: '4px',
    },
    companyAddress: {
      fontSize: '9pt',
      lineHeight: '1.4',
      marginBottom: '2px',
    },
    title: {
      fontSize: '12pt',
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: '8px',
      marginBottom: '12px',
      textDecoration: 'underline',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '10px',
      fontSize: '9pt',
    },
    th: {
      border: '1px solid #000',
      padding: '4px 6px',
      textAlign: 'left',
      backgroundColor: '#f0f0f0',
      fontWeight: 'bold',
      fontSize: '8pt',
    },
    td: {
      border: '1px solid #000',
      padding: '4px 6px',
      fontSize: '9pt',
    },
    sectionHeader: {
      fontSize: '10pt',
      fontWeight: 'bold',
      marginTop: '12px',
      marginBottom: '6px',
      textDecoration: 'underline',
    },
    twoColumn: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '12px',
    },
    box: {
      border: '1px solid #000',
      padding: '8px',
      minHeight: '80px',
    },
    boxTitle: {
      fontWeight: 'bold',
      fontSize: '9pt',
      marginBottom: '4px',
      textDecoration: 'underline',
    },
    termsBox: {
      border: '1px solid #000',
      padding: '10px',
      marginTop: '12px',
      fontSize: '8pt',
      lineHeight: '1.5',
    },
    signature: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '40px',
      marginTop: '40px',
    },
    signatureBox: {
      textAlign: 'center',
      borderTop: '1px solid #000',
      paddingTop: '4px',
      marginTop: '60px',
    },
  };

  const printStyles = `
    @media print {
      body { margin: 0; padding: 0; }
      @page { size: A4; margin: 0; }
      .no-print { display: none !important; }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '60px', height: '60px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '8pt' }}>LOGO</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.companyName}>{po.companyName}</div>
              <div style={styles.companyAddress}>{po.companyAddress}</div>
              <div style={styles.companyAddress}>Phone: {po.companyPhone}</div>
              <div style={styles.companyAddress}>Email: {po.companyEmail}</div>
              <div style={styles.companyAddress}>PAN NO: {po.companyPan} | GST NO: {po.companyGstin}</div>
            </div>
          </div>
        </div>

        <div style={styles.title}>Purchase Order</div>

        {/* Supplier and PO Details */}
        <div style={styles.twoColumn}>
          <div style={styles.box}>
            <div style={styles.boxTitle}>Supplier Details:</div>
            <div><strong>Vendor:</strong> {po.supplierName}</div>
            {po.supplierContact && <div><strong>Contact Person:</strong> {po.supplierContact}</div>}
            {po.supplierPhone && <div><strong>Phone No.:</strong> {po.supplierPhone}</div>}
            {po.supplierEmail && <div><strong>Email Id:</strong> {po.supplierEmail}</div>}
            {po.supplierGstin && <div><strong>GST No:</strong> {po.supplierGstin}</div>}
          </div>
          <div style={styles.box}>
            <div style={styles.boxTitle}>PO Details:</div>
            <div><strong>PO No:</strong> {po.poNumber}</div>
            <div><strong>PO Date:</strong> {new Date(po.poDate).toLocaleDateString('en-GB')}</div>
            {po.deliveryDate && <div><strong>Delivery Date:</strong> {new Date(po.deliveryDate).toLocaleDateString('en-GB')}</div>}
            {po.projectName && <div><strong>Project:</strong> {po.projectName}</div>}
          </div>
        </div>

        {/* Consignee Billing and Delivery Address */}
        <div style={styles.twoColumn}>
          <div style={styles.box}>
            <div style={styles.boxTitle}>Consignee Billing Address:</div>
            <div>{po.supplierAddress}</div>
            {po.supplierGstin && <div><strong>GSTIN:</strong> {po.supplierGstin}</div>}
          </div>
          <div style={styles.box}>
            <div style={styles.boxTitle}>Delivery Address:</div>
            <div>{po.deliveryAddress}</div>
            {po.deliveryGstin && <div><strong>GSTIN:</strong> {po.deliveryGstin}</div>}
          </div>
        </div>

        {/* Items Table */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '30px' }}>S.No</th>
              <th style={styles.th}>Description of Material</th>
              <th style={{ ...styles.th, width: '50px' }}>Qty</th>
              <th style={{ ...styles.th, width: '40px' }}>Unit</th>
              <th style={{ ...styles.th, width: '70px' }}>Rate</th>
              <th style={{ ...styles.th, width: '50px' }}>Disc%</th>
              <th style={{ ...styles.th, width: '90px' }}>Taxable Amount</th>
              <th style={{ ...styles.th, width: '50px' }}>GST%</th>
              <th style={{ ...styles.th, width: '80px' }}>GST Amount</th>
              <th style={{ ...styles.th, width: '90px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, index) => (
              <tr key={item.id}>
                <td style={{ ...styles.td, textAlign: 'center' }}>{item.sNo}</td>
                <td style={styles.td}>
                  {item.description}
                  {item.hsnCode && <div style={{ fontSize: '8pt', color: '#666' }}>HSN: {item.hsnCode}</div>}
                  {item.specifications && <div style={{ fontSize: '8pt', fontStyle: 'italic', marginTop: '2px' }}>{item.specifications}</div>}
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{item.unit}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{item.discountPercent.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{item.taxableAmount.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{item.gstPercent.toFixed(0)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{item.gstAmount.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{item.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
            {/* Totals */}
            <tr>
              <td colSpan="6" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Sub Total</td>
              <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>
                {po.subTotal.toFixed(2)}
              </td>
            </tr>
            {po.cgstAmount > 0 && (
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'right' }}>CGST ({po.cgstPercent}%)</td>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'right' }}>{po.cgstAmount.toFixed(2)}</td>
              </tr>
            )}
            {po.sgstAmount > 0 && (
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'right' }}>SGST ({po.sgstPercent}%)</td>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'right' }}>{po.sgstAmount.toFixed(2)}</td>
              </tr>
            )}
            {po.igstAmount > 0 && (
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'right' }}>IGST ({po.igstPercent}%)</td>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'right' }}>{po.igstAmount.toFixed(2)}</td>
              </tr>
            )}
            {po.roundOff !== 0 && (
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'right' }}>Round Off</td>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'right' }}>{po.roundOff.toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td colSpan="6" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                Total Amount
              </td>
              <td colSpan="4" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', fontSize: '11pt', backgroundColor: '#f0f0f0' }}>
                ₹ {po.totalAmount.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan="10" style={{ ...styles.td, fontStyle: 'italic' }}>
                <strong>Amount in Words:</strong> {po.totalAmountWords}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Terms and Conditions */}
        <div style={styles.termsBox}>
          <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '8px', textDecoration: 'underline' }}>
            TERMS AND CONDITIONS
          </div>
          
          {po.scopeOfWork && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Scope of Work:</strong> {po.scopeOfWork}
            </div>
          )}
          
          {po.measurementTerms && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Measurement:</strong> {po.measurementTerms}
            </div>
          )}
          
          {po.paymentTerms && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Payment Terms:</strong> {po.paymentTerms}
            </div>
          )}
          
          {po.qualityTerms && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Quality:</strong> {po.qualityTerms}
            </div>
          )}
          
          {po.deliverySchedule && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Delivery Schedule:</strong> {po.deliverySchedule}
            </div>
          )}
          
          {po.loadingCharges && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Loading / Unloading Charges:</strong> {po.loadingCharges}
            </div>
          )}
          
          {po.freightInsurance && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Freight, Insurance:</strong> {po.freightInsurance}
            </div>
          )}
          
          {po.liquidatedDamages && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Liquidated Damages:</strong> {po.liquidatedDamages}
            </div>
          )}
          
          {po.jurisdiction && (
            <div style={{ marginBottom: '6px' }}>
              <strong>Jurisdiction:</strong> {po.jurisdiction}
            </div>
          )}
          
          {po.otherTerms && (
            <div style={{ marginTop: '6px' }}>
              {po.otherTerms}
            </div>
          )}
        </div>

        {/* Signatures */}
        <div style={styles.signature}>
          <div>
            <div style={styles.signatureBox}>
              <div style={{ fontWeight: 'bold' }}>Prepared By</div>
              <div style={{ fontSize: '9pt', marginTop: '2px' }}>{po.preparedByName}</div>
            </div>
          </div>
          <div>
            <div style={styles.signatureBox}>
              <div style={{ fontWeight: 'bold' }}>Approved By</div>
              <div style={{ fontSize: '9pt', marginTop: '2px' }}>{po.approvedByName}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: '8pt', textAlign: 'right', marginTop: '20px', color: '#666' }}>
          {new Date(po.poDate).toLocaleDateString('en-GB')} | {po.poNumber} | Page 1 of 1
        </div>
      </div>
    </>
  );
}
