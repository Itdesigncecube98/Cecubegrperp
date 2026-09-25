'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileBarChart, Home, ChevronRight, Layers, Building2, Search, 
  RefreshCw, Download, Printer, Filter, Calendar, CheckCircle2, 
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function CustomReportPage() {
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [reportType, setReportType] = useState('BUDGET_VS_ACTUAL');
  
  const [reportRows, setReportRows] = useState([]);
  const [summary, setSummary] = useState({ totalApproved: 0, totalAllocated: 0, totalEstimate: 0, totalExpended: 0, totalVariance: 0, rowCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = `/api/engineering/projects/custom-report?projectId=${selectedProjectId}&company=${selectedCompany}&reportType=${reportType}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setReportRows(data.reportRows || []);
        setSummary(data.summary || {});
      } else {
        showToast('Failed to generate report', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating custom report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedProjectId, selectedCompany, reportType]);

  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') return projects;
    return projects.filter(p => p.company?.toLowerCase() === selectedCompany.toLowerCase());
  }, [projects, selectedCompany]);

  const filteredRows = useMemo(() => {
    return reportRows.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m1 = r.taskName?.toLowerCase().includes(q);
        const m2 = r.project?.toLowerCase().includes(q);
        const m3 = r.category?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [reportRows, searchQuery]);

  const handleExportCSV = () => {
    if (reportRows.length === 0) {
      showToast('No report data to export', 'error');
      return;
    }

    const headers = Object.keys(reportRows[0]).filter(k => k !== 'id');
    const rows = reportRows.map(row => headers.map(h => `"${row[h] !== undefined ? row[h] : ''}"`));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Custom_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported report to CSV!');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatRate = (val) => {
    return Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? '#ef4444' : '#4f46e5',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Projects <ChevronRight size={14} /> <span style={{ color: '#4f46e5', fontWeight: 600 }}>Custom Report</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ede9fe', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileBarChart size={24} color="#4f46e5" />
            </div>
            Custom Project Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Generate financial cost variance, procurement schedules, and project budget analytics across companies and sites.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none' }}
            >
              <option value="ALL">All Companies</option>
              {companies.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={16} color="#4f46e5" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none' }}
            >
              <option value="ALL">All Projects</option>
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchReport}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#4f46e5" />
            <span>Generate</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'BUDGET_VS_ACTUAL', label: 'Budget vs Actual Expenditure' },
          { id: 'MATERIAL_SCHEDULE', label: 'Material Procurement Schedule' },
          { id: 'TASK_VARIANCE', label: 'Task Rate Variance Analysis' }
        ].map(rt => (
          <button
            key={rt.id}
            onClick={() => setReportType(rt.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: reportType === rt.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
              background: reportType === rt.id ? '#ede9fe' : '#ffffff',
              color: reportType === rt.id ? '#4f46e5' : '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: reportType === rt.id ? '0 2px 4px rgba(79, 70, 229, 0.15)' : 'none'
            }}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Approved Ceiling</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>₹ {formatRate(summary.totalApproved)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Expended</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>₹ {formatRate(summary.totalExpended)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Variance Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>₹ {formatRate(summary.totalVariance)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Items Reported</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>{summary.rowCount || reportRows.length}</div>
          </div>
        </div>
      </div>

      {/* Report Table Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Search items or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            <button
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#4f46e5', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)' }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Project / Company</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>Approved (₹)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>Expended (₹)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed', textAlign: 'right' }}>Variance (₹)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Burn Rate</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={22} className="animate-spin" color="#4f46e5" style={{ margin: '0 auto 8px auto' }} />
                    <div>Generating Custom Report...</div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No rows found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.project}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{r.company}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                      {r.taskName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {r.category}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      ₹ {formatRate(r.approvedAmount || r.benchmarkRate)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      ₹ {formatRate(r.expendedAmount || r.projectRate)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>
                      ₹ {formatRate(r.varianceAmount || r.procurementVariance)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {r.burnRate || r.variancePct || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: r.status === 'Over Budget' ? '#fee2e2' : r.status === 'In Progress' ? '#fef3c7' : '#ecfdf5',
                        color: r.status === 'Over Budget' ? '#dc2626' : r.status === 'In Progress' ? '#b45309' : '#047857'
                      }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
