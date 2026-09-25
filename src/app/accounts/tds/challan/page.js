'use client';
import { useEffect, useState } from 'react';

export default function TdsChallanPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ 
    financialYear: '2026-2027', 
    quarter: 'Q2', 
    dateFrom: '', 
    dateTo: '' 
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/tds-challans?${new URLSearchParams(filters)}`).then(r => r.json());
      setRows(data.data || []);
    } catch (error) {
      console.error('Failed to load challans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));

  return (
    <div style={{ 
      padding: 32, 
      background: '#f8fafc', 
      minHeight: '100vh' 
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 32,
        paddingBottom: 20,
        borderBottom: '2px solid #e2e8f0'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: 28, 
          fontWeight: 600, 
          color: '#0f172a',
          marginBottom: 8 
        }}>
          TDS Challan
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          Track TDS challan payments made to the government
        </p>
      </div>

      {/* Filters Card */}
      <div style={{ 
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16,
          marginBottom: 16
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Financial Year
            </label>
            <input
              type="text"
              value={filters.financialYear}
              onChange={e => setFilter('financialYear', e.target.value)}
              placeholder="2026-2027"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Quarter
            </label>
            <select
              value={filters.quarter}
              onChange={e => setFilter('quarter', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                background: 'white'
              }}
            >
              <option value="Q1">Q1 (Apr-Jun)</option>
              <option value="Q2">Q2 (Jul-Sep)</option>
              <option value="Q3">Q3 (Oct-Dec)</option>
              <option value="Q4">Q4 (Jan-Mar)</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilter('dateFrom', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilter('dateTo', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => !loading && (e.target.style.background = '#2563eb')}
          onMouseLeave={(e) => (e.target.style.background = '#3b82f6')}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Table Card */}
      <div style={{ 
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: 14
          }}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                color: 'white'
              }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VOUCHER NO</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TDS ACCOUNT</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SECTION</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BANK</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHEQUE DATE</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHEQUE NO</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>COST CENTRE</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 16 }}>Loading...</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
                    <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>No challans found</div>
                    <div style={{ fontSize: 14, color: '#94a3b8' }}>Adjust the filters and try searching again</div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr 
                    key={row.id}
                    style={{ 
                      borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: 'white',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500, fontFamily: 'monospace', fontSize: 13 }}>
                      {row.voucherNo}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500 }}>
                      {row.accountName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#3b82f6', fontWeight: 600 }}>
                      {row.section || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {row.bankName || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                      {row.chequeDate ? new Date(row.chequeDate).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>
                      {row.chequeNo || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {row.costCentre || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                      ₹{Number(row.challanAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
