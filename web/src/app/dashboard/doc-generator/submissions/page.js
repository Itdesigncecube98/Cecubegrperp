'use client';
import React, { useState, useEffect } from 'react';
import { Download, FileText, Check, X, FileIcon, User, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function DocSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedSub, setSelectedSub] = useState(null);
  
  // This would typically come from auth session, but for the sake of demo we assume the user is an admin
  const currentUser = { id: 'admin1', name: 'Admin', role: 'ADMIN' }; 

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = () => {
    const savedSubmissions = localStorage.getItem('docGenerator_submissions');
    if (savedSubmissions) {
      setSubmissions(JSON.parse(savedSubmissions).filter(s => s.status !== 'DRAFT'));
    }
  };

  const filteredSubs = submissions.filter(sub => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return sub.status.includes('PENDING');
    if (activeTab === 'APPROVED') return sub.status === 'APPROVED';
    if (activeTab === 'REJECTED') return sub.status === 'REJECTED';
    return true;
  });

  const handleAction = (id, action) => {
    if (!confirm(`Are you sure you want to ${action} this document?`)) return;

    const allSubs = JSON.parse(localStorage.getItem('docGenerator_submissions') || '[]');
    const subIndex = allSubs.findIndex(s => s.id === id);
    if (subIndex === -1) return;

    const sub = allSubs[subIndex];
    // Simple global approve/reject for demo (ignores specific workflow levels)
    if (action === 'APPROVE') {
      sub.status = 'APPROVED';
    } else {
      sub.status = 'REJECTED';
    }

    allSubs[subIndex] = sub;
    localStorage.setItem('docGenerator_submissions', JSON.stringify(allSubs));
    
    alert(`Document ${action}D successfully!`);
    loadSubmissions();
    if (selectedSub?.id === id) {
      setSelectedSub(sub);
    }
  };

  const exportPDF = async (sub) => {
    const origin = window.location.origin;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; color: black; background: white; width: 800px; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Header Section -->
        <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 20px; border-bottom: 2px dashed #94a3b8; padding-bottom: 20px;">
          <img src="${origin}/logo.png" style="height: 60px; object-fit: contain; margin-right: 20px;" crossorigin="anonymous" />
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h1 style="font-size: 22px; font-weight: bold; margin: 0; color: #1e3a8a;">CeCube Engineering India Pvt. Ltd.</h1>
            <h2 style="font-size: 18px; font-weight: bold; margin: 0; color: #1e3a8a;">CeCube Green Energy Pvt. Ltd.</h2>
          </div>
        </div>

        <!-- Form Title -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${sub.templateName}</h3>
        </div>
        
        <!-- Static Fields Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          ${Object.entries(sub.formData).filter(([k]) => k !== '_certified').map(([k, v]) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #000; font-weight: bold; width: 40%;">${k}</td>
              <td style="padding: 8px; border: 1px solid #000;">${v || '-'}</td>
            </tr>
          `).join('')}
        </table>
        
        <!-- Description -->
        ${sub.templateDescription ? `
          <div style="margin-bottom: 20px; font-size: 12px; line-height: 1.5; font-family: inherit;">
            ${sub.templateDescription}
          </div>
        ` : ''}
        
        <!-- Dynamic Table -->
        ${sub.tableData && sub.tableData.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <thead>
              <tr>
                ${Object.keys(sub.tableData[0]).filter(k => k !== 'id').map(k => `
                  <th style="padding: 8px; border: 1px solid #000; background: #e0f2fe; text-align: left;">${k}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${sub.tableData.map(row => `
                <tr>
                  ${Object.entries(row).filter(([k]) => k !== 'id').map(([_, v]) => `
                    <td style="padding: 8px; border: 1px solid #000;">${v || '-'}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        <!-- Employee Declaration -->
        <div style="margin-bottom: 30px; font-size: 13px; line-height: 1.5;">
          <strong>Employee Declaration</strong><br/>
          I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.
          <div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div>Employee Signature: ______________________</div>
            <div>Place: ______________________</div>
            <div>Date: ______________________</div>
          </div>
        </div>
        
        <!-- Approval Workflow -->
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Approval Workflow</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
          <thead>
            <tr>
              <th style="padding: 8px; border: 1px solid #000; text-align: left; width: 33%;">Reporting Manager</th>
              <th style="padding: 8px; border: 1px solid #000; text-align: left; width: 33%;">HR Verification</th>
              <th style="padding: 8px; border: 1px solid #000; text-align: left; width: 33%;">Accounts Processing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #000; vertical-align: top; height: 100px;">
                <div style="margin-bottom: 15px;">
                  <span style="margin-right: 15px;">&#9744; Approved</span>
                  <span>&#9744; Not Approved</span>
                </div>
                <div style="line-height: 1.8;">
                  Name:<br/>
                  Designation:<br/>
                  Signature:<br/>
                  Date:
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #000; vertical-align: top;">
                <div style="margin-bottom: 15px; line-height: 1.8;">
                  &#9744; Eligibility Verified<br/>
                  &#9744; Policy Compliance Checked
                </div>
                <div style="line-height: 1.8;">
                  Verified By:<br/>
                  Signature:<br/>
                  Date:
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #000; vertical-align: top;">
                <div style="margin-bottom: 15px;">
                  &#9744; Processed for the Month of ______
                </div>
                <div style="line-height: 1.8;">
                  Processed By:<br/>
                  Signature:<br/>
                  Date:
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Important Notes -->
        <div style="font-size: 12px; line-height: 1.5;">
          <strong>Important Notes</strong>
          <ol style="margin-top: 5px; padding-left: 15px; margin-bottom: 0;">
            <li>Claim must be submitted on monthly basis.</li>
            <li>Supporting bills / invoices must be attached to this form wherever applicable.</li>
            <li>Reimbursements shall be processed subject to approval from Reporting Manager / Project Head.</li>
            <li>Incomplete forms or unsupported claims may be kept on hold.</li>
            <li>Company reserves the right to verify deployment details before processing reimbursement.</li>
          </ol>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${sub.templateName.replace(/\s+/g, '_')}_${sub.employeeName}_Admin.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const renderStatusBadge = (status) => {
    let bg = '#f1f5f9', color = '#475569';
    if (status === 'APPROVED') { bg = '#dcfce7'; color = '#166534'; }
    else if (status === 'REJECTED') { bg = '#fee2e2'; color = '#991b1b'; }
    else if (status.includes('PENDING')) { bg = '#fef9c3'; color = '#854d0e'; }
    
    return (
      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: bg, color }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', display: 'flex', gap: '24px' }}>
      {/* Left List */}
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Document Approvals</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Review and approve employee documents.</p>
        </div>

        <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? '#0f172a' : '#64748b',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
          {filteredSubs.map(sub => (
            <div 
              key={sub.id} 
              onClick={() => setSelectedSub(sub)}
              style={{ 
                padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                background: selectedSub?.id === sub.id ? '#f0f9ff' : 'white',
                borderLeft: selectedSub?.id === sub.id ? '4px solid #0ea5e9' : '4px solid transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{sub.templateName}</div>
                {renderStatusBadge(sub.status)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                <User size={14} /> {sub.employeeName}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Submitted: {new Date(sub.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {filteredSubs.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No documents found.
            </div>
          )}
        </div>
      </div>

      {/* Right Detail View */}
      <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedSub ? (
          <>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{selectedSub.templateName}</h2>
                <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} /> {selectedSub.employeeName}
                  <span>•</span>
                  {renderStatusBadge(selectedSub.status)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => exportPDF(selectedSub)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                  <Download size={16} /> PDF
                </button>
                {selectedSub.status.includes('PENDING') && (
                  <>
                    <button onClick={() => handleAction(selectedSub.id, 'REJECT')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                      <X size={16} /> Reject
                    </button>
                    <button onClick={() => handleAction(selectedSub.id, 'APPROVE')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                      <Check size={16} /> Approve
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>General Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {Object.entries(selectedSub.formData).filter(([k]) => k !== '_certified').map(([key, value]) => (
                    <div key={key}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>{key}</div>
                      <div style={{ fontSize: '14px', color: '#0f172a' }}>{value || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSub.tableData && selectedSub.tableData.length > 0 && (
                <div style={{ marginTop: '24px', background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>Claim Details</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {Object.keys(selectedSub.tableData[0]).filter(k => k !== 'id').map(k => (
                          <th key={k} style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSub.tableData.map(row => (
                        <tr key={row.id}>
                          {Object.entries(row).filter(([k]) => k !== 'id').map(([k, v]) => (
                            <td key={k} style={{ padding: '8px', fontSize: '14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{v || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
            <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 500 }}>Select a document to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}
