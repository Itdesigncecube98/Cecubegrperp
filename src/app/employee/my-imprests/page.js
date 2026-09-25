'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, IndianRupee, Plus } from 'lucide-react';
import { getMyImprestRequests } from '../../../lib/data';
import ImprestModal from '../dashboard/ImprestModal';

export default function MyImprestsPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isImprestModalOpen, setIsImprestModalOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      loadRequests(parsed.id);
    } else {
      router.push('/login');
    }
  }, []);

  const loadRequests = async (id) => {
    setLoading(true);
    try {
      const res = await getMyImprestRequests(id);
      setRequests(Array.isArray(res) ? res : []);
      
      const balRes = await fetch(`/api/imprest/balance?employeeId=${id}`);
      if (balRes.ok) {
        const balData = await balRes.json();
        setBalance(balData.currentBalance || 0);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load your imprest data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImprestSubmit = async (formData) => {
    try {
      const res = await fetch('/api/imprest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          ...formData
        })
      });
      if (res.ok) {
        showToast('Imprest request submitted successfully!');
        setIsImprestModalOpen(false);
        loadRequests(employee.id);
      } else {
        showToast('Failed to submit Imprest request', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit Imprest request', 'error');
    }
  };

  if (loading || !employee) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your requests...</div>;
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
        <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '12px', color: '#4f46e5' }}>
          <IndianRupee size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>My Imprest Requests</h1>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0, fontWeight: 500 }}>Track the status of your imprest requests.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1rem' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Balance</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>
            ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <button 
          onClick={() => setIsImprestModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(14, 165, 233, 0.3)' }}
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          {requests.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem', fontWeight: 700 }}>Request Date</th>
                  <th style={{ padding: '1rem', fontWeight: 700 }}>Amount (₹)</th>
                  <th style={{ padding: '1rem', fontWeight: 700 }}>Purpose</th>
                  <th style={{ padding: '1rem', fontWeight: 700 }}>Project / Site</th>
                  <th style={{ padding: '1rem', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontSize: '14px', fontWeight: 500 }}>
                    <td style={{ padding: '1rem' }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', color: '#0ea5e9', fontWeight: 700 }}>₹{req.amountRequested}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{req.purpose}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{req.projectSite || 'Not Applicable'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 700, 
                        textTransform: 'uppercase',
                        backgroundColor: req.status === 'APPROVED_BY_ADMIN' || req.status === 'APPROVED' ? '#dcfce7' : 
                                         req.status === 'REJECTED' ? '#fee2e2' : 
                                         req.status === 'RETURNED' ? '#fefce8' : '#f0f9ff',
                        color: req.status === 'APPROVED_BY_ADMIN' || req.status === 'APPROVED' ? '#16a34a' : 
                               req.status === 'REJECTED' ? '#dc2626' : 
                               req.status === 'RETURNED' ? '#ca8a04' : '#0284c7',
                      }}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ background: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <IndianRupee size={32} color="#94a3b8" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>No Requests Found</h3>
              <p style={{ margin: 0 }}>You haven't made any imprest requests yet.</p>
            </div>
          )}
        </div>
      </div>

      <ImprestModal 
        isOpen={isImprestModalOpen} 
        onClose={() => setIsImprestModalOpen(false)} 
        employee={employee} 
        onSubmit={handleImprestSubmit} 
      />
    </div>
  );
}
