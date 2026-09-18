'use client';
import { useEffect, useState } from 'react';

export default function TdsPaymentPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ 
    deductionType: '26Q', 
    quarter: 'Q2', 
    financialYear: '2026-2027', 
    dateFrom: '', 
    dateTo: '' 
  });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const data = await fetch(`/api/tds-deductions?${params}`).then(r => r.json());
      setRows(data.data || []);
      setSelected([]);
    } catch (error) {
      console.error('Failed to load TDS payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));

  const toggleSelect = (id) => {
    setSelected(current => 
      current.includes(id) ? current.filter(rowId => rowId !== id) : [...current, id]
    );
  };

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
          TDS Payment
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          View and manage TDS deductions from vendor payments
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
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
              Deduction Type
            </label>
            <input
              type="text"
              value={filters.deductionType}
              onChange={e => setFilter('deductionType', e.target.value)}
              placeholder="26Q"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
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
                <th style={{ 
                  padding: '14px 16px', 
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: 40
                }}>
                  <input 
                    type="checkbox"
                    checked={selected.length === rows.length && rows.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? rows.map(r => r.id) : [])}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAN</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACCOUNT</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VOUCHER</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATE</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BILL AMOUNT</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TDS AMOUNT</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>INTEREST</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>REMARK</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 16 }}>Loading...</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                    <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>No deductions found</div>
                    <div style={{ fontSize: 14, color: '#94a3b8' }}>Adjust the filters and try searching again</div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr 
                    key={row.id}
                    style={{ 
                      borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: selected.includes(row.id) ? '#eff6ff' : 'white',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => !selected.includes(row.id) && (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => !selected.includes(row.id) && (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <input 
                        type="checkbox" 
                        checked={selected.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0f172a', fontFamily: 'monospace', fontSize: 13 }}>
                      {row.pan || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                      {row.accountName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>
                      {row.voucherNo}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                      {new Date(row.voucherDate).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontWeight: 500 }}>
                      ₹{Number(row.billAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                      ₹{Number(row.tdsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{Number(row.interest).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                      {row.deductionRemark || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background: row.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: row.status === 'Paid' ? '#166534' : '#92400e'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection Info */}
      {selected.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: '#eff6ff',
          borderRadius: 8,
          border: '1px solid #bfdbfe',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#1e40af', fontWeight: 500, fontSize: 14 }}>
            {selected.length} item{selected.length > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelected([])}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              color: '#1e40af',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}
