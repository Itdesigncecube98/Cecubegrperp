import React, { useState, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
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

export default function ArrearsHistoryModal({ employee, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPrintData, setCurrentPrintData] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/payroll/arrears-calculation?employeeId=${employee.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [employee]);

  const handleToggleApprove = async (arrearId, newStatus) => {
    try {
      const res = await fetch(`/api/payroll/arrears-calculation/${arrearId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setHistory(history.map(r => r.id === arrearId ? { ...r, status: newStatus } : r));
      } else {
        alert('Failed to update status');
      }
    } catch (e) {
      alert('Error updating status');
    }
  };

  const handleDownloadPDF = async (row) => {
    let breakdown = null;
    try {
      if (row.message) breakdown = JSON.parse(row.message);
    } catch(e) {}

    // Prepare print data
    setCurrentPrintData({ row, breakdown });
    setDownloadingId(row.id);
  };

  useEffect(() => {
    // When print data is set and rendered, trigger html2canvas
    if (currentPrintData && downloadingId) {
      const generate = async () => {
        const element = document.getElementById('arrears-payslip-sheet-content');
        if (!element) {
          setDownloadingId(null);
          setCurrentPrintData(null);
          return;
        }

        try {
          const canvas = await html2canvas(element, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${employee.name.replace(/\s+/g, '_')}_Arrears_Payslip.pdf`);
        } catch (err) {
          console.error('Failed to generate Arrears PDF:', err);
        } finally {
          setDownloadingId(null);
          setCurrentPrintData(null);
        }
      };
      // small delay to ensure DOM is updated
      setTimeout(generate, 100);
    }
  }, [currentPrintData, downloadingId, employee.name]);

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem', overflowY: 'auto' }}>
      <style>{`
        .modal-container {
          animation: slipFadeIn 0.2s ease-out;
        }
        @keyframes slipFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .saas-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .saas-table td {
          padding: 14px 16px;
          font-size: 0.875rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }
        .saas-table tr:hover td {
          background-color: #f8fafc;
        }
      `}</style>
      <div className="modal-container" style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '1200px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Arrears History <span style={{ fontWeight: 400, color: '#64748b', fontSize: '1rem' }}>- {employee.name} ({employee.empId})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(`/api/payroll/arrears-calculation/generate?employeeId=${employee.id}`, { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    alert('Pending arrears generated successfully!');
                    // reload history
                    const hRes = await fetch(`/api/payroll/arrears-calculation?employeeId=${employee.id}`);
                    setHistory(await hRes.json());
                  } else {
                    alert(data.error || data.message || 'Failed to generate arrears');
                  }
                } catch(err) {
                  alert('Error generating arrears');
                }
              }}
              style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}
              onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}
            >
              <RefreshCw size={14} /> Calculate Pending Arrears
            </button>
            <button onClick={onClose} style={{ background: '#f1f5f9', color: '#475569', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        <div style={{ padding: '0', overflowY: 'auto', flexGrow: 1, background: '#ffffff' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={24} className="spin" style={{ color: '#0ea5e9' }} />
              <span>Loading arrears history...</span>
            </div>
          ) : (
            <table className="saas-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Arrears Month</th>
                  <th>Arrears Paid In</th>
                  <th>Arrears Type</th>
                  <th>Arrears Days</th>
                  <th style={{ textAlign: 'right' }}>Total Earning</th>
                  <th style={{ textAlign: 'right' }}>Total Deduction</th>
                  <th style={{ textAlign: 'right' }}>Net Salary</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#cbd5e1' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>No Arrears Found</span>
                        <span style={{ fontSize: '0.875rem' }}>This employee has no arrears history on record.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map(row => {
                    let breakdownObj = {};
                    try { if (row.message) breakdownObj = JSON.parse(row.message); } catch (e) {}
                    const isDayWise = !!breakdownObj.overlapDays;
                    const arrearsTypeDisplay = isDayWise ? 'Day-wise' : 'Month-wise';
                    const arrearsDaysDisplay = breakdownObj.overlapDays ? breakdownObj.overlapDays : row.workingDays;
                    
                    return (
                      <tr key={row.id}>
                        <td>{row.dept || '-'}</td>
                        <td style={{ fontWeight: 500 }}>{row.month}</td>
                        <td style={{ color: '#0ea5e9', fontWeight: 500 }}>{row.paidIn}</td>
                        <td>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '12px', background: isDayWise ? '#fef3c7' : '#e0e7ff', color: isDayWise ? '#b45309' : '#4338ca', fontSize: '0.75rem', fontWeight: 600 }}>
                            {arrearsTypeDisplay}
                          </span>
                        </td>
                        <td>{arrearsDaysDisplay}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a', textAlign: 'right' }}>₹{row.earning?.toFixed(2)}</td>
                        <td style={{ color: '#ef4444', textAlign: 'right' }}>₹{row.deduction?.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>₹{row.net?.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            {row.status === 'PENDING' ? (
                              <button 
                                onClick={() => handleToggleApprove(row.id, 'APPROVED')}
                                style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#d1fae5'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#ecfdf5'}
                              >
                                Approve
                              </button>
                            ) : row.status === 'APPROVED' ? (
                              <button 
                                onClick={() => handleToggleApprove(row.id, 'PENDING')}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                              >
                                Unapprove
                              </button>
                            ) : (
                              <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>Added to Salary</span>
                            )}
                            <button 
                              onClick={() => handleDownloadPDF(row)}
                              disabled={downloadingId === row.id}
                              style={{ background: downloadingId === row.id ? '#f8fafc' : '#ffffff', color: downloadingId === row.id ? '#94a3b8' : '#0ea5e9', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '6px', cursor: downloadingId === row.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                              onMouseOver={(e) => { if (downloadingId !== row.id) e.currentTarget.style.borderColor = '#bae6fd'; }}
                              onMouseOut={(e) => { if (downloadingId !== row.id) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                              title="Download PDF"
                            >
                              {downloadingId === row.id ? <RefreshCw size={16} className="spin" /> : <Download size={16} />} 
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* HIDDEN ARREARS PAYSLIP TEMPLATE */}
      {currentPrintData && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div id="arrears-payslip-sheet-content" style={{ width: '800px', background: 'white', color: 'black', padding: '30px', fontFamily: 'Arial, sans-serif' }}>
            
            {/* Header Box */}
            <div style={{ border: '2px solid black', textAlign: 'center', padding: '10px', marginBottom: '10px' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold', color: '#0369a1' }}>Arrears Payslip For Salary Revision</h3>
              <div style={{ fontSize: '14px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <span>From: {currentPrintData.breakdown?.fromDate ? new Date(currentPrintData.breakdown.fromDate).toLocaleDateString('en-GB') : '-'}</span>
                <span>To: {currentPrintData.breakdown?.toDate ? new Date(currentPrintData.breakdown.toDate).toLocaleDateString('en-GB') : '-'}</span>
                {currentPrintData.breakdown?.overlapDays && (
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Prorated For: {currentPrintData.breakdown.overlapDays} Days</span>
                )}
              </div>
            </div>

            {/* Company & Employee Details Box */}
            <div style={{ border: '2px solid black', display: 'grid', gridTemplateColumns: '65% 35%', marginBottom: '10px' }}>
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div><strong>Company :</strong> CeCube Engineering India Private Limited</div>
                <div><strong>Employee Name :</strong> {employee.name || '-'}</div>
                <div><strong>Employee Code :</strong> {employee.empId || '-'}</div>
              </div>
              <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid black' }}>
                <img src="/logo.png" alt="CeCube Logo" style={{ height: '60px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            </div>

            {/* Dummy Attendance / YTD rows (from screenshot) */}
            <div style={{ border: '2px solid black', padding: '10px', marginBottom: '10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <div>Working Days : {currentPrintData.row.workingDays}</div>
              <div>Present Days : 0.00</div>
              <div>Paid Leaves : 0.00</div>
              <div>Absent : 0.00</div>
              <div>Wage Days : {currentPrintData.row.workingDays}</div>
            </div>
            <div style={{ border: '2px solid black', padding: '10px', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}>
              Income Y.T.D : 0.00 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; I/Tax Y.T.D : 0.00
            </div>

            {/* Employee Extended Details */}
            <div style={{ border: '2px solid black', display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '12px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', borderRight: '1px solid black', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Location :</strong> <span>{employee.branch || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Department :</strong> <span>{employee.department || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Designation :</strong> <span>{employee.designation || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Grade :</strong> <span>{employee.grade || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Pan Card :</strong> <span>{employee.pan || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Joining Date :</strong> <span>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB') : '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><strong>Arrears Paid Date :</strong> <span>{currentPrintData.row.paidIn || '-'}</span></div>
              </div>
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>PF Memb Cont.(YTD) :</strong> <span>0.00</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>Payment Mode :</strong> <span>Money Transfer</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>P.F. A/c No. :</strong> <span>{employee.pfEmployee || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>E.S.I.C A/c No. :</strong> <span>{employee.esicNo || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>UAN :</strong> <span>{employee.uan || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>Bank Account No. :</strong> <span>{employee.bankAccountNo || '-'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}><strong>Bank Name :</strong> <span>{employee.bankName || '-'}</span></div>
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
                  {currentPrintData.breakdown && Object.entries(currentPrintData.breakdown).filter(([k]) => !['fromDate', 'toDate'].includes(k)).map(([k, v]) => (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold' }}>
                      <div>{k}</div>
                      <div style={{ textAlign: 'right' }}>{v.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold', padding: '6px 10px', borderTop: '1px solid black' }}>
                  <div>Total Earnings</div>
                  <div style={{ textAlign: 'right' }}>{currentPrintData.row.earning.toFixed(2)}</div>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', fontWeight: 'bold', padding: '6px 10px', borderBottom: '1px solid black' }}>
                  <div>DEDUCTIONS</div>
                  <div style={{ textAlign: 'right' }}>Amount (₹)</div>
                </div>
                <div style={{ padding: '10px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                <div style={{ textAlign: 'right' }}>{currentPrintData.row.earning.toFixed(2)}</div>
              </div>
            </div>

            {/* Words Row */}
            <div style={{ border: '2px solid black', borderTop: 'none', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
              Net Salary (In Words): {numberToWords(Math.round(currentPrintData.row.earning))}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '15px' }}>
              This is a system generated payslip and does not require signature.
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
