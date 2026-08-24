'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function EmployeeCardPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then(res => res.json())
      .then(data => {
        setEmployee(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching employee:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Employee Card...</div>;
  if (!employee) return <div style={{ padding: '20px', textAlign: 'center' }}>Employee not found.</div>;

  const e = employee;

  // Derive transfer details
  const transferDetails = (e.jobHistories && e.jobHistories.length > 0) 
    ? e.jobHistories.map(h => ({
        position: h.designation || e.designation || '-',
        branch: h.siteOffice || h.branch || e.branch || '-',
        department: h.department || e.department || '-',
        chargeType: h.chargeType || e.chargeType || 'Primary Charge',
        fromDate: h.fromDate,
        toDate: h.toDate || 'Till Date'
      }))
    : [{
        position: e.designation || '-',
        branch: e.siteOffice || e.branch || '-',
        department: e.department || '-',
        chargeType: e.chargeType || 'Primary Charge',
        fromDate: e.joinedDate || e.createdAt?.substring(0, 10) || '-',
        toDate: 'Till Date'
      }];

  const orgs = (e.organisation || 'Cecube Engineering India Private Limited').split(',').map(o => o.trim()).filter(Boolean);
  if (orgs.length === 0) {
    orgs.push('Cecube Engineering India Private Limited');
  }

  return (
    <>
      {orgs.map((orgName, idx) => (
      <div key={idx} className="card-container" style={{ marginBottom: idx < orgs.length - 1 ? '40px' : '0' }}>
        {/* Header Region */}
        <div className="header-row">
          <div className="logo-box">
            <img src="/logo.png" alt="CeCube Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
          </div>
          <div className="title-box">
            <div className="company-name">{orgName.toUpperCase()}</div>
            <div className="document-title">Employee Card</div>
          </div>
        </div>

        {/* Main Details Area */}
        <div className="main-grid">
          
          {/* Top Section with Photo */}
          <div className="top-section">
            <div className="details-col">
              <Row label="Emp. Code" value={e.empId} label2="Date of Joining" value2={e.joinedDate} />
              <Row label="Name" value={e.name} label2="Father Name" value2={e.fatherName} />
              <Row label="Sex" value={e.gender} label2="Status" value2={e.employmentStatus || 'Working'} />
              <Row label="Department" value={e.department} label2="Branch" value2={e.branch} />
              <Row label="Designation" value={e.designation} fullWidth />
            </div>
            <div className="photo-col">
              {e.photoUrl ? (
                <img src={e.photoUrl} alt="Employee Photo" />
              ) : (
                <div className="photo-placeholder">Photo</div>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Middle Section */}
          <Row label="Employee Type" value={e.employeeType || 'Permanent'} label2="Grade" value2={e.grade} />
          <Row label="Birth Date" value={e.dateOfBirth} label2="NDA (Non Disclosure Agreement) No." value2="-" />
          
          <div className="grid-row four-col">
            <div className="cell-label">Permanent Address</div>
            <div className="cell-value address-cell">
              {e.address || ''}
            </div>
            <div className="cell-label">Temporary Address</div>
            <div className="cell-value address-cell">
              {e.addressStreet1 || e.address || ''}
            </div>
          </div>

          <Row label="Tel. No" value={e.emergencyPhone} label2="Office No" value2={e.extension || e.workTelephone} />
          <Row label="Official No." value={e.workTelephone} label2="Personal No." value2={e.phone} />
          <Row label="Official Email" value={e.email} label2="Personal Email" value2={e.otherEmail} />
          
          <Row label="Languages Read" value={e.langRead} label2="Languages Speak" value2={e.langSpeak} />
          <Row label="Languages Write" value={e.langWrite} label2="Blood Group" value2={e.bloodGroup} />
          
          <Row label="Passport No." value={e.passportNo} label2="Marital Status" value2={e.maritalStatus} />
          <Row label="Identification Mark" value={e.identificationMark} fullWidth />

          <div className="divider" />

          {/* Bottom Section */}
          <Row label="UAN No." value={e.uan} label2="PAN No." value2={e.pan} />
          <Row label="ESI No." value={e.esicNo} label2="Annual CTC." value2={e.annualCtc} />
          <Row label="Bank Name" value={e.bankName} label2="Bank A/C No." value2={e.bankAccountNo} />

          <div className="divider" />

          {/* Transfer Details */}
          <div className="transfer-header">Transfer Details</div>
          <div className="transfer-table">
            <div className="th">Position</div>
            <div className="th">Branch</div>
            <div className="th">Department</div>
            <div className="th">Charge Type</div>
            <div className="th">From Date</div>
            <div className="th">To Date</div>
            
            {transferDetails.map((t, idx) => (
              <React.Fragment key={idx}>
                <div className="td">{t.position}</div>
                <div className="td">{t.branch}</div>
                <div className="td">{t.department}</div>
                <div className="td">{t.chargeType}</div>
                <div className="td">{t.fromDate}</div>
                <div className="td">{t.toDate}</div>
              </React.Fragment>
            ))}
          </div>

        </div>
      </div>
      ))}

      <style jsx global>{`
        body {
          background: #e5e7eb;
          margin: 0;
          padding: 20px;
          font-family: 'Times New Roman', serif;
        }

        .card-container {
          background: white;
          width: 750px;
          margin: 0 auto;
          border: 2.5px solid #000;
          padding: 2px;
          box-sizing: border-box;
        }

        /* Header */
        .header-row {
          display: flex;
          align-items: center;
          margin-bottom: 2px;
        }
        .logo-box {
          width: 100px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #000;
          margin-right: 2px;
        }
        .title-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .company-name, .document-title {
          background: white;
          border: 1.5px solid #000;
          text-align: center;
          font-weight: bold;
          padding: 8px;
          font-size: 18px;
        }

        /* Grid System */
        .main-grid {
          border: 1.5px solid #000;
          display: flex;
          flex-direction: column;
        }

        .divider {
          height: 2px;
          background: #000;
          width: 100%;
        }

        .top-section {
          display: flex;
        }
        .details-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-right: 1.5px solid #000;
        }
        .photo-col {
          width: 120px;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .photo-col img {
          width: 100px;
          height: 120px;
          object-fit: cover;
          border: 1.5px solid #999;
        }
        .photo-placeholder {
          width: 100px;
          height: 120px;
          border: 1.5px dashed #999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 12px;
        }

        .grid-row {
          display: grid;
          border-bottom: 1.5px solid #000;
        }
        .grid-row.four-col {
          grid-template-columns: 160px 1fr 160px 1fr;
        }
        .grid-row.full-width {
          grid-template-columns: 160px 1fr;
        }
        .grid-row:last-child {
          border-bottom: none;
        }

        .cell-label {
          background: white;
          padding: 6px 8px;
          font-weight: bold;
          font-size: 13px;
          border-right: 1.5px solid #000;
          display: flex;
          align-items: center;
        }
        .cell-value {
          padding: 6px 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          word-break: break-word;
          white-space: pre-wrap;
          line-height: 1.4;
        }
        .cell-value:not(:last-child) {
          border-right: 1.5px solid #000;
        }

        .address-cell {
          min-height: 40px;
          align-items: flex-start;
        }

        /* Transfer Table */
        .transfer-header {
          background: white;
          padding: 6px 8px;
          font-weight: bold;
          font-size: 13px;
          border-bottom: 1.5px solid #000;
          display: inline-block;
          margin: 4px;
        }
        .transfer-table {
          display: grid;
          grid-template-columns: 2fr 2fr 2fr 1.5fr 1fr 1fr;
          border-top: 1.5px solid #000;
        }
        .th {
          background: white;
          font-weight: bold;
          font-size: 12px;
          padding: 6px;
          border-right: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
        }
        .td {
          font-size: 12px;
          padding: 6px;
          border-right: 1.5px solid #000;
          min-height: 24px;
        }
        .th:last-child, .td:nth-child(6n) {
          border-right: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          nextjs-portal, #nextjs-portal {
            display: none !important;
          }
          .card-container, .card-container * {
            visibility: visible;
          }
          .card-container {
            position: relative;
            left: 50%;
            transform: translateX(-50%);
            width: 750px;
            border: 3px solid #000 !important;
            margin: 0 0 20mm 0 !important;
            page-break-inside: avoid;
          }
          /* Print backgrounds */
          .company-name, .document-title, .cell-label, .transfer-header, .th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          /* Explicit border declarations for print reliability */
          .logo-box {
            border: 2px solid #000 !important;
          }
          .company-name, .document-title {
            border: 2px solid #000 !important;
          }
          .main-grid {
            border: 2px solid #000 !important;
          }
          .details-col {
            border-right: 2px solid #000 !important;
          }
          .cell-label {
            border-right: 2px solid #000 !important;
          }
          .cell-value:not(:last-child) {
            border-right: 2px solid #000 !important;
          }
          .grid-row {
            border-bottom: 2px solid #000 !important;
          }
          .photo-col img {
            border: 2px solid #999 !important;
          }
          .photo-placeholder {
            border: 2px solid #999 !important;
          }
          .divider {
            border-top: 3px solid #000 !important;
            height: 0 !important;
            background: none !important;
          }
          .transfer-header {
            border-bottom: 2px solid #000 !important;
          }
          .transfer-table {
            border-top: 2px solid #000 !important;
            border-collapse: collapse !important;
          }
          .th {
            border-right: 2px solid #000 !important;
            border-bottom: 2px solid #000 !important;
          }
          .td {
            border-right: 2px solid #000 !important;
          }
        }
      `}</style>
    </>
  );
}

// Helper component for rows
const Row = ({ label, value, label2, value2, fullWidth }) => {
  if (fullWidth || !label2) {
    return (
      <div className="grid-row full-width">
        <div className="cell-label">{label}</div>
        <div className="cell-value">{value || ''}</div>
      </div>
    );
  }
  return (
    <div className="grid-row four-col">
      <div className="cell-label">{label}</div>
      <div className="cell-value">{value || ''}</div>
      <div className="cell-label">{label2}</div>
      <div className="cell-value">{value2 || ''}</div>
    </div>
  );
};
