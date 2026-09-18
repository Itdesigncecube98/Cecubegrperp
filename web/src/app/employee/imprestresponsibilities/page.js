'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, RefreshCw, ClipboardList, ArrowLeft } from 'lucide-react';
import { getImprestApprovals, updateImprestRequest } from '../../../lib/data';

export default function ImprestResponsibilitiesPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      loadApprovals(parsed.id);
    } else {
      router.push('/login');
    }
  }, []);

  const loadApprovals = async (id) => {
    setLoading(true);
    try {
      const res = await getImprestApprovals(id);
      setRequests(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load imprest approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkChange = (id, value) => {
    setRemarks({ ...remarks, [id]: value });
  };

  const handleAction = async (id, currentStatus, action) => {
    try {
      const result = await updateImprestRequest(id, action, {
        remarks: remarks[id] || '',
        approverId: employee.id,
        currentStatus
      });
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      showToast(`Imprest request ${action.toLowerCase()} successfully!`);
      loadApprovals(employee.id); // Reload
    } catch (err) {
      console.error(err);
      showToast(`Failed to ${action.toLowerCase()} request`, 'error');
    }
  };

  if (loading || !employee) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your responsibilities...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {toast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px', backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {toast.message}
        </div>
      )}

      <button onClick={() => router.push('/employee/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', color: '#d97706' }}>
          <ClipboardList size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Imprest Responsibilities</h1>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0, fontWeight: 500 }}>Review and manage imprest requests pending your approval.</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem', opacity: 0.5 }} />
            <h3>You're all caught up!</h3>
            <p>No pending imprest requests await your approval.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {requests.map(req => (
              <div key={req.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', backgroundColor: '#f8fafc', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                      {req.employee?.name} <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>({req.employee?.empId})</span>
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#475569', fontWeight: 500 }}>
                      {req.employee?.department} | {req.projectSite || 'No Project/Site'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: '#0ea5e9' }}>
                      ₹{req.amountRequested?.toLocaleString('en-IN')}
                    </p>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Required Date</div>
                    <div style={{ color: '#1e293b', fontWeight: 500 }}>{new Date(req.requiredDate).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Purpose</div>
                    <div style={{ color: '#1e293b', fontWeight: 500 }}>{req.purpose}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Approver Remarks (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Add your remarks or comments here..."
                    value={remarks[req.id] || ''}
                    onChange={(e) => handleRemarkChange(req.id, e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleAction(req.id, req.status, 'REJECT')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                  >
                    <XCircle size={18} /> Reject
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, req.status, 'RETURN')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: '1px solid #eab308', backgroundColor: '#fefce8', color: '#ca8a04', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                  >
                    <RefreshCw size={18} /> Return
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, req.status, 'APPROVE')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
