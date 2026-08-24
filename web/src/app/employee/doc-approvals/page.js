'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, ClipboardList, Eye } from 'lucide-react';
import GlobalAlert from '@/components/GlobalAlert';

export default function DocApprovalsDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [docConfig, setDocConfig] = useState({});
  const [docRequests, setDocRequests] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
    } else {
      const emp = JSON.parse(empData);
      setEmployee(emp);
      const config = JSON.parse(localStorage.getItem('docGenerator_workflowConfig') || '{}');
      setDocConfig(config);
      
      const roleStr = (emp.role || '').toUpperCase();
      const deptStr = (emp.department || '').toUpperCase();
      const desigStr = (emp.designation || '').toUpperCase();

      const isHrMatch = (s) => s.includes('HR') || s.includes('HUMAN RESOURCE');
      const isAccountsMatch = (s) => s.includes('ACCOUNT') || s.includes('FINANCE');
      const isAdminMatch = (s) => s.includes('ADMIN');

      const isDocApprover = (roleType) => Object.values(config).some(c => c[roleType] === emp.id);

      const isHr = isHrMatch(roleStr) || isHrMatch(deptStr) || isHrMatch(desigStr) || isDocApprover('hrId');
      const isAccounts = isAccountsMatch(roleStr) || isAccountsMatch(deptStr) || isAccountsMatch(desigStr) || isDocApprover('accountsId');
      const isAdmin = isAdminMatch(roleStr) || isAdminMatch(deptStr) || isAdminMatch(desigStr);
      const isHod = isDocApprover('hodId');

      if (!isHr && !isAccounts && !isAdmin && !isHod) {
        router.replace('/employee/dashboard');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!employee) return;
    loadRequests();
  }, [employee]);

  const loadRequests = () => {
    try {
      const savedSubs = JSON.parse(localStorage.getItem('docGenerator_submissions') || '[]');
      setDocRequests(savedSubs);
    } catch (err) {
      console.error('Failed to load doc requests', err);
    }
  };

  const handleDocAction = (id, action) => {
    try {
      const roleStr = (employee.role || '').toUpperCase();
      const deptStr = (employee.department || '').toUpperCase();
      const desigStr = (employee.designation || '').toUpperCase();

      const isHrMatch = (s) => s.includes('HR') || s.includes('HUMAN RESOURCE');
      const isAccountsMatch = (s) => s.includes('ACCOUNT') || s.includes('FINANCE');
      const isAdminMatch = (s) => s.includes('ADMIN');

      const isDocApprover = (roleType) => Object.values(docConfig).some(c => c[roleType] === employee.id);

      const isHr = isHrMatch(roleStr) || isHrMatch(deptStr) || isHrMatch(desigStr) || isDocApprover('hrId');
      const isAccounts = isAccountsMatch(roleStr) || isAccountsMatch(deptStr) || isAccountsMatch(desigStr) || isDocApprover('accountsId');
      const isAdmin = isAdminMatch(roleStr) || isAdminMatch(deptStr) || isAdminMatch(desigStr);
      const isHod = isDocApprover('hodId');

      const allSubs = JSON.parse(localStorage.getItem('docGenerator_submissions') || '[]');
      const updated = allSubs.map(s => {
        if (s.id === id) {
          if (action === 'REJECTED') {
            return { ...s, status: 'REJECTED' };
          }
          if (isHr || (isAdmin && s.status === 'PENDING_HR')) {
            return { ...s, status: 'PENDING_ACCOUNTS' };
          }
          if (isAccounts || (isAdmin && s.status === 'PENDING_ACCOUNTS')) {
            return { ...s, status: 'APPROVED' };
          }
        }
        return s;
      });
      localStorage.setItem('docGenerator_submissions', JSON.stringify(updated));
      showToast(`Document ${action === 'APPROVE' ? 'approved successfully!' : 'rejected.'}`);
      loadRequests();
    } catch (e) {
      console.error('Failed to update document', e);
      showToast('Failed to update document request', 'error');
    }
  };

  if (!employee) return null;

  const roleStr = (employee.role || '').toUpperCase();
  const deptStr = (employee.department || '').toUpperCase();
  const desigStr = (employee.designation || '').toUpperCase();

  const isHrMatch = (s) => s.includes('HR') || s.includes('HUMAN RESOURCE');
  const isAccountsMatch = (s) => s.includes('ACCOUNT') || s.includes('FINANCE');
  const isAdminMatch = (s) => s.includes('ADMIN');

  const isDocApprover = (roleType) => Object.values(docConfig).some(c => c[roleType] === employee.id);

  const isHr = isHrMatch(roleStr) || isHrMatch(deptStr) || isHrMatch(desigStr) || isDocApprover('hrId');
  const isAccounts = isAccountsMatch(roleStr) || isAccountsMatch(deptStr) || isAccountsMatch(desigStr) || isDocApprover('accountsId');
  const isAdmin = isAdminMatch(roleStr) || isAdminMatch(deptStr) || isAdminMatch(desigStr);
  const isHod = isDocApprover('hodId');

  // Filter logic based on role config
  const relevantDocs = docRequests.filter(r => {
    if (isAdmin) return true;
    if (isHod && docConfig[r.employeeId]?.hodId === employee.id) return true;
    if (isHr && ['PENDING_HR', 'PENDING_ACCOUNTS', 'APPROVED', 'REJECTED'].includes(r.status)) return true;
    if (isAccounts && ['PENDING_ACCOUNTS', 'APPROVED', 'REJECTED'].includes(r.status)) return true;
    return false;
  });

  const displayDocs = relevantDocs.filter(r => {
    const isPendingForMe = () => {
      if (isAdmin && (r.status === 'PENDING_HR' || r.status === 'PENDING_ACCOUNTS' || r.status === 'PENDING_HOD')) return true;
      if (isHod && r.status === 'PENDING_HOD') return true;
      if (isHr && r.status === 'PENDING_HR') return true;
      if (isAccounts && r.status === 'PENDING_ACCOUNTS') return true;
      return false;
    };

    if (activeTab === 'PENDING') {
      return isPendingForMe();
    } else {
      return !isPendingForMe();
    }
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: toast.type === 'error' ? '#991b1b' : '#065f46',
          padding: '0.75rem 1.25rem', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => router.push('/employee/dashboard')}
          style={{ background: 'white', border: '1px solid #e5e7eb', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#111827' }}>Doc Approvals Dashboard</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Manage document requests pending your approval</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('PENDING')}
          style={{
            padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'PENDING' ? 700 : 500,
            color: activeTab === 'PENDING' ? '#0ea5e9' : '#6b7280',
            borderBottom: activeTab === 'PENDING' ? '2px solid #0ea5e9' : '2px solid transparent'
          }}
        >
          Pending Approvals
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          style={{
            padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'HISTORY' ? 700 : 500,
            color: activeTab === 'HISTORY' ? '#0ea5e9' : '#6b7280',
            borderBottom: activeTab === 'HISTORY' ? '2px solid #0ea5e9' : '2px solid transparent'
          }}
        >
          History / Approved
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Date</th>
              <th style={{ padding: '1rem' }}>Employee</th>
              <th style={{ padding: '1rem' }}>Template Name</th>
              <th style={{ padding: '1rem' }}>Current Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayDocs.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No document requests found in this tab.</td></tr>
            ) : (
              displayDocs.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem' }}>
                    {new Date(req.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{req.employeeName || 'Unknown'}</div>
                  </td>
                  <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem' }}>
                    {req.templateName}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSelectedDoc(req)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                      >
                        <Eye size={14} /> View
                      </button>
                      {activeTab === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleDocAction(req.id, 'APPROVE')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleDocAction(req.id, 'REJECTED')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedDoc && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          
          {/* Controls / Close Button */}
          <button 
            onClick={() => setSelectedDoc(null)} 
            style={{ position: 'absolute', top: '1.5rem', right: '2rem', background: 'white', border: 'none', cursor: 'pointer', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 1010 }}
          >
            <X size={24} />
          </button>

          {/* The Paper Sheet */}
          <div style={{ 
            background: 'white', 
            width: '800px', 
            maxWidth: '100%', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: 'black', boxSizing: 'border-box' }}>
              
              {/* Header Section */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #1e3a8a', paddingBottom: '20px' }}>
                <img src="/logo.png" style={{ height: '60px', objectFit: 'contain', marginRight: '20px' }} alt="Logo" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#1e3a8a' }}>CeCube Engineering India Pvt. Ltd.</h1>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1e3a8a' }}>CeCube Green Energy Pvt. Ltd.</h2>
                </div>
              </div>

              {/* Form Title */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', textDecoration: 'underline' }}>
                  {selectedDoc.templateName}
                </h3>
              </div>
              
              {/* Static Fields Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                <tbody>
                  {Object.entries(selectedDoc.formData || {}).filter(([k]) => k !== '_certified').map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold', width: '40%', background: '#f8fafc' }}>{k}</td>
                      <td style={{ padding: '8px', border: '1px solid #000' }}>{v || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Description */}
              {selectedDoc.templateDescription && (
                <div style={{ marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
                  <pre style={{ fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedDoc.templateDescription}</pre>
                </div>
              )}
              
              {/* Dynamic Table */}
              {selectedDoc.tableData && selectedDoc.tableData.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {Object.keys(selectedDoc.tableData[0]).filter(k => k !== 'id').map(k => (
                        <th key={k} style={{ padding: '8px', border: '1px solid #000', background: '#e0f2fe', textAlign: 'left', fontWeight: 'bold' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDoc.tableData.map(row => (
                      <tr key={row.id}>
                        {Object.entries(row).filter(([k]) => k !== 'id').map(([k, v]) => (
                          <td key={k} style={{ padding: '8px', border: '1px solid #000' }}>{v || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {/* Employee Declaration */}
              <div style={{ marginBottom: '30px', fontSize: '13px', lineHeight: '1.5' }}>
                <strong>Employee Declaration</strong><br/>
                I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.
                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>Employee Signature: ______________________</div>
                  <div>Place: ______________________</div>
                  <div>Date: ______________________</div>
                </div>
              </div>
              
              {/* Approval Workflow */}
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Approval Workflow</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left', width: '33%', background: '#e0f2fe', textTransform: 'uppercase' }}>Reporting Manager</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left', width: '33%', background: '#e0f2fe', textTransform: 'uppercase' }}>HR Verification</th>
                    <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left', width: '33%', background: '#e0f2fe', textTransform: 'uppercase' }}>Accounts Processing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #000', verticalAlign: 'top', height: '100px', background: '#e0f2fe' }}>
                      <div style={{ marginBottom: '15px' }}>
                        <span style={{ marginRight: '15px' }}>{['PENDING_HR', 'PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? '☑' : '☐'} Approved</span>
                        <span>{selectedDoc.status === 'REJECTED' ? '☑' : '☐'} Not Approved</span>
                      </div>
                      <div style={{ lineHeight: '1.8' }}>
                        Name: {['PENDING_HR', 'PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? 'Reporting Manager' : ''}<br/>
                        Designation: {['PENDING_HR', 'PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? 'HOD' : ''}<br/>
                        Signature:<br/>
                        Date: {['PENDING_HR', 'PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? new Date(selectedDoc.createdAt).toLocaleDateString('en-GB') : ''}
                      </div>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #000', verticalAlign: 'top', background: '#e0f2fe' }}>
                      <div style={{ marginBottom: '15px', lineHeight: '1.8' }}>
                        {['PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? '☑' : '☐'} Eligibility Verified<br/>
                        {['PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? '☑' : '☐'} Policy Compliance Checked
                      </div>
                      <div style={{ lineHeight: '1.8' }}>
                        Verified By: {['PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? 'HR Administrator' : ''}<br/>
                        Signature:<br/>
                        Date: {['PENDING_ACCOUNTS', 'APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? new Date(selectedDoc.createdAt).toLocaleDateString('en-GB') : ''}
                      </div>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #000', verticalAlign: 'top', background: '#e0f2fe' }}>
                      <div style={{ marginBottom: '15px' }}>
                        {['APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? '☑' : '☐'} Processed for the Month of <u>{['APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? new Date(selectedDoc.createdAt).toLocaleString('default', { month: 'long' }) : '______'}</u>
                      </div>
                      <div style={{ lineHeight: '1.8' }}>
                        Processed By: {['APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? 'Accounts Administrator' : ''}<br/>
                        Signature:<br/>
                        Date: {['APPROVED', 'APPROVED_ACCOUNTS'].includes(selectedDoc.status) ? new Date(selectedDoc.createdAt).toLocaleDateString('en-GB') : ''}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {/* Important Notes */}
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <strong>Important Notes</strong>
                <ol style={{ marginTop: '5px', paddingLeft: '15px', marginBottom: '0' }}>
                  <li>Claim must be submitted on monthly basis.</li>
                  <li>Supporting bills / invoices must be attached to this form wherever applicable.</li>
                  <li>Reimbursements shall be processed subject to approval from Reporting Manager / Project Head.</li>
                  <li>Incomplete forms or unsupported claims may be kept on hold.</li>
                  <li>Company reserves the right to verify deployment details before processing reimbursement.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
