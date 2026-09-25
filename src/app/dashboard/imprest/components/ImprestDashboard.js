'use client';

import React, { useState, useEffect } from 'react';
import { IndianRupee, FileText, CheckCircle, Clock, AlertTriangle, Users, Briefcase, Banknote } from 'lucide-react';

export default function ImprestDashboard() {
  const [data, setData] = useState({
    totalIssued: 0,
    pendingApprovalCount: 0,
    projectWise: [],
    employeeWise: [],
    recentIssues: []
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/imprest/dashboard?t=' + Date.now());
      const resData = await res.json();
      setData({
        totalIssued: resData.totalIssued || 0,
        pendingApprovalCount: resData.pendingApprovalCount || 0,
        projectWise: resData.projectWise || [],
        employeeWise: resData.employeeWise || [],
        recentIssues: resData.recentIssues || []
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summaryCards = [
    { title: 'Total Imprest Issued', amount: `₹ ${data.totalIssued}`, icon: IndianRupee, color: '#0ea5e9', bg: '#e0f2fe' },
    { title: 'Total Expense Submitted', amount: '₹ 0', icon: FileText, color: '#f59e0b', bg: '#fef3c7' },
    { title: 'Pending Expense Approval', amount: '₹ 0', icon: Clock, color: '#6366f1', bg: '#e0e7ff' },
    { title: 'Pending Settlement', amount: '₹ 0', icon: CheckCircle, color: '#10b981', bg: '#d1fae5' },
    { title: 'Available Imprest Balance', amount: '₹ 0', icon: IndianRupee, color: '#14b8a6', bg: '#ccfbf1' },
    { title: 'Pending Imprest Approvals', amount: data.pendingApprovalCount.toString(), icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
  ];

  const projectWise = data.projectWise;
  const employeeWise = data.employeeWise;
  const recentIssues = data.recentIssues;

  return (
    <div>
      <h2 className="section-title">Imprest Management Dashboard </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: card.bg, color: card.color, padding: '12px', borderRadius: '12px' }}>
                <Icon size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{card.title}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{card.amount}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="#64748b" /> Project-wise Imprest
          </h3>
          <table className="imprest-table">
            <thead>
              <tr>
                <th>Project / Site</th>
                <th>Amount Issued</th>
              </tr>
            </thead>
            <tbody>
              {projectWise.length > 0 ? projectWise.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.project}</td>
                  <td style={{ fontWeight: 500 }}>{item.amount}</td>
                </tr>
              )) : (
                <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#64748b" /> Employee-wise Imprest
          </h3>
          <table className="imprest-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Amount Issued</th>
              </tr>
            </thead>
            <tbody>
              {employeeWise.length > 0 ? employeeWise.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td style={{ fontWeight: 500 }}>{item.amount}</td>
                </tr>
              )) : (
                <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '32px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Banknote size={18} color="#64748b" /> Recent Issue Details
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="imprest-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Employee Name</th>
                <th>Issued Amount</th>
                <th>Payment Mode</th>
                <th>Transaction Ref</th>
                <th>Issue Date</th>
              </tr>
            </thead>
            <tbody>
              {recentIssues.length > 0 ? recentIssues.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 500, color: '#0ea5e9' }}>{item.requestId}</td>
                  <td>{item.empName}</td>
                  <td style={{ fontWeight: 600 }}>₹ {item.issuedAmount}</td>
                  <td>{item.paymentMode || '-'}</td>
                  <td>{item.transactionRef || '-'}</td>
                  <td>{item.issueDate}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>No recent issues found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
