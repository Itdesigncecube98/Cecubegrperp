'use client';
import React, { useState, useEffect } from 'react';
import { Download, Printer, Filter, Calendar, Loader2 } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';

export default function TrialBalance() {
  const [tbData, setTbData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/accounts/trial-balance?fromDate=2026-04-01&toDate=2026-09-30');
        const json = await res.json();
        if (json.data) setTbData(json.data);
      } catch (err) {
        console.error("Error fetching trial balance:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totals = tbData.reduce((acc, row) => ({
    openDr: acc.openDr + row.openDr,
    openCr: acc.openCr + row.openCr,
    periodDr: acc.periodDr + row.periodDr,
    periodCr: acc.periodCr + row.periodCr,
    closeDr: acc.closeDr + row.closeDr,
    closeCr: acc.closeCr + row.closeCr,
  }), { openDr: 0, openCr: 0, periodDr: 0, periodCr: 0, closeDr: 0, closeCr: 0 });

  const handlePrint = () => window.print();
  const handleExport = () => exportToExcel(tbData, 'Trial_Balance');

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Trial Balance</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Verify arithmetical accuracy of ledgers</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155' }}>
            <Calendar size={16} color="#64748b" />
            <span>01-Apr-2026 to 30-Sep-2026</span>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            <Filter size={16} /> Filters
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}>
            <Printer size={16} /> Print
          </button>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} className="acc-table-wrapper">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th rowSpan={2} style={{ padding: '12px 20px', fontWeight: '600', color: '#475569', fontSize: '0.875rem', borderRight: '1px solid #e2e8f0', width: '25%' }}>Account Name</th>
                <th colSpan={2} style={{ padding: '8px 20px', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>Opening Balance</th>
                <th colSpan={2} style={{ padding: '8px 20px', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>Period Transactions</th>
                <th colSpan={2} style={{ padding: '8px 20px', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center' }}>Closing Balance</th>
              </tr>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 16px', fontWeight: '600', color: '#475569', fontSize: '0.75rem', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>Debit (₹)</th>
                <th style={{ padding: '8px 16px', fontWeight: '600', color: '#475569', fontSize: '0.75rem', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>Credit (₹)</th>
                <th style={{ padding: '8px 16px', fontWeight: '600', color: '#475569', fontSize: '0.75rem', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>Debit (₹)</th>
                <th style={{ padding: '8px 16px', fontWeight: '600', color: '#475569', fontSize: '0.75rem', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>Credit (₹)</th>
                <th style={{ padding: '8px 16px', fontWeight: '600', color: '#475569', fontSize: '0.75rem', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>Debit (₹)</th>
                <th style={{ padding: '8px 16px', fontWeight: '600', color: '#475569', fontSize: '0.75rem', textAlign: 'right' }}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {tbData.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', '&:hover': { background: '#f8fafc' } }}>
                  <td style={{ padding: '12px 20px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#1e293b', fontWeight: '500' }}>{row.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.code}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155', borderRight: '1px solid #e2e8f0' }}>{row.openDr > 0 ? row.openDr.toLocaleString('en-IN') : '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155', borderRight: '1px solid #e2e8f0' }}>{row.openCr > 0 ? row.openCr.toLocaleString('en-IN') : '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', borderRight: '1px solid #e2e8f0' }}>{row.periodDr > 0 ? row.periodDr.toLocaleString('en-IN') : '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', borderRight: '1px solid #e2e8f0' }}>{row.periodCr > 0 ? row.periodCr.toLocaleString('en-IN') : '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#1e293b', fontWeight: '500', borderRight: '1px solid #e2e8f0' }}>{row.closeDr > 0 ? row.closeDr.toLocaleString('en-IN') : '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#1e293b', fontWeight: '500' }}>{row.closeCr > 0 ? row.closeCr.toLocaleString('en-IN') : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>Grand Total</td>
                <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>{totals.openDr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>{totals.openCr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6', borderRight: '1px solid #e2e8f0' }}>{totals.periodDr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6', borderRight: '1px solid #e2e8f0' }}>{totals.periodCr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 'bold', color: '#059669', borderRight: '1px solid #e2e8f0' }}>{totals.closeDr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{totals.closeCr.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}
