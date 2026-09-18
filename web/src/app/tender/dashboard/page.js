'use client';
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  BarChart3,
  Search
} from 'lucide-react';
import Link from 'next/link';

export default function TenderDashboard() {
  const [stats, setStats] = useState({
    totalTenders: 0,
    openTenders: 0,
    submitted: 0,
    awarded: 0,
    lost: 0
  });

  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/tender');
        if (res.ok) {
          const data = await res.json();
          setTenders(data);
          
          // Calculate Stats
          const total = data.length;
          const open = data.filter(t => t.status === 'Evaluation' || t.status === 'Bid Preparation').length;
          const submitted = data.filter(t => t.status === 'Submitted' || t.status === 'Opening').length;
          const awarded = data.filter(t => t.result?.finalStatus === 'Awarded').length;
          const lost = data.filter(t => t.result?.finalStatus === 'Lost' || t.status === 'Cancelled').length;

          setStats({ totalTenders: total, openTenders: open, submitted, awarded, lost });
        }
      } catch (error) {
        console.error('Failed to load tender data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="tnd-page-container">
      <div className="tnd-header">
        <div>
          <h1 className="tnd-title">Tender Dashboard</h1>
          <p className="tnd-subtitle">Overview of bidding and estimation activities</p>
        </div>
        <Link href="/tender/create" className="tnd-btn tnd-btn-primary">
          + New Tender
        </Link>
      </div>

      <div className="tnd-grid-4">
        <div className="tnd-card tnd-kpi-card">
          <div className="tnd-kpi-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <FileText size={24} />
          </div>
          <div className="tnd-kpi-info">
            <p className="tnd-kpi-label">Total Tenders</p>
            <h3 className="tnd-kpi-value">{stats.totalTenders}</h3>
          </div>
        </div>
        
        <div className="tnd-card tnd-kpi-card">
          <div className="tnd-kpi-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div className="tnd-kpi-info">
            <p className="tnd-kpi-label">Under Preparation</p>
            <h3 className="tnd-kpi-value">{stats.openTenders}</h3>
          </div>
        </div>
        
        <div className="tnd-card tnd-kpi-card">
          <div className="tnd-kpi-icon" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
            <CheckCircle size={24} />
          </div>
          <div className="tnd-kpi-info">
            <p className="tnd-kpi-label">Awarded</p>
            <h3 className="tnd-kpi-value">{stats.awarded}</h3>
          </div>
        </div>

        <div className="tnd-card tnd-kpi-card">
          <div className="tnd-kpi-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle size={24} />
          </div>
          <div className="tnd-kpi-info">
            <p className="tnd-kpi-label">Lost / Cancelled</p>
            <h3 className="tnd-kpi-value">{stats.lost}</h3>
          </div>
        </div>
      </div>

      <div className="tnd-card tnd-mt-6">
        <div className="tnd-card-header" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="tnd-card-title tnd-flex tnd-items-center tnd-gap-2"><BarChart3 size={20} className="tnd-text-indigo-600" /> Recent Tenders</h2>
          <Link href="/tender/register" className="tnd-btn tnd-btn-outline">View All</Link>
        </div>
        
        <div className="tnd-table-wrapper">
          {loading ? (
            <div className="tnd-loading"><div className="tnd-spinner"></div></div>
          ) : (
            <table className="tnd-table">
              <thead>
                <tr>
                  <th>Tender Ref</th>
                  <th>Client & Project</th>
                  <th>Value</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenders.slice(0, 5).map(t => (
                  <tr key={t.id}>
                    <td className="tnd-font-semibold">{t.tenderNo}</td>
                    <td>
                      <div className="tnd-font-medium">{t.projectName}</div>
                      <div className="tnd-text-xs tnd-text-muted">{t.clientName}</div>
                    </td>
                    <td className="tnd-font-medium">{formatCurrency(t.tenderValue)}</td>
                    <td>{t.bidSubLastDate ? new Date(t.bidSubLastDate).toLocaleDateString() : '-'}</td>
                    <td><span className="tnd-badge tnd-badge-blue">{t.status}</span></td>
                  </tr>
                ))}
                {tenders.length === 0 && (
                  <tr>
                    <td colSpan="5" className="tnd-text-center tnd-text-muted tnd-py-8">No tenders found. Create one to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
