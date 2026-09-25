"use client";

import { useEffect, useState, useCallback } from "react";

const COMPANY_ID = "demo-company-id";

export default function GstVoucherBrowsePage() {
  const [stateGstins, setStateGstins] = useState([]);
  const [filters, setFilters] = useState({
    stateGstinId: "",
    fromDate: "",
    toDate: "",
    direction: "ALL",
    search: "",
  });
  const [vouchers, setVouchers] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ companyId: COMPANY_ID });
      if (filters.stateGstinId) params.set("stateGstinId", filters.stateGstinId);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);
      if (filters.direction) params.set("direction", filters.direction);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/gst/vouchers?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setVouchers(json.data);
      setTotals(json.totals);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    search();
  }, [search]);

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === vouchers.length ? new Set() : new Set(vouchers.map((v) => v.id))
    );
  }

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
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
          GST Voucher Browse
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          Search and manage GST vouchers across all transactions
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
              State GSTIN
            </label>
            <select
              value={filters.stateGstinId}
              onChange={(e) => setFilters({ ...filters, stateGstinId: e.target.value })}
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
              <option value="">All GSTINs</option>
              {stateGstins.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.state} - {g.gstin}
                </option>
              ))}
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
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
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
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
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
              Transaction Type
            </label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
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
              <option value="ALL">All</option>
              <option value="INWARD">Inward (Purchase)</option>
              <option value="OUTWARD">Outward (Sales)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              Search
            </label>
            <input
              placeholder="Search by Party Name, Voucher No, Bill No, GSTIN..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
          <button
            onClick={search}
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
          <button
            onClick={() => setFilters({ stateGstinId: "", fromDate: "", toDate: "", direction: "ALL", search: "" })}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.target.style.background = 'white'}
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: 14, 
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}

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
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={vouchers.length > 0 && selected.size === vouchers.length}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>V.DATE / V.NO / STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BILL NO / DATE</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PARTY / GSTIN / STATE</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TYPE</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ASSESSABLE</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGST</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SGST</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>IGST</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CESS</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL TAX</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 16 }}>Loading...</div>
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>No vouchers found</div>
                    <div style={{ fontSize: 14, color: '#94a3b8' }}>Adjust filters and try again</div>
                  </td>
                </tr>
              ) : (
                vouchers.map((v, idx) => (
                  <tr 
                    key={v.id}
                    style={{ 
                      borderBottom: idx < vouchers.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: selected.has(v.id) ? '#eff6ff' : 'white',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => !selected.has(v.id) && (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => !selected.has(v.id) && (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <input 
                        type="checkbox" 
                        checked={selected.has(v.id)}
                        onChange={() => toggleRow(v.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 500, marginBottom: 2 }}>
                        {new Date(v.vDate).toLocaleDateString('en-GB')}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace', marginBottom: 2 }}>
                        {v.vNo}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        background: v.vStatus === 'RELEASED' ? '#dcfce7' : '#fef3c7',
                        color: v.vStatus === 'RELEASED' ? '#166534' : '#92400e'
                      }}>
                        {v.vStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#334155', fontWeight: 500 }}>{v.billNo || '-'}</div>
                      {v.billDate && (
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                          {new Date(v.billDate).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 500, marginBottom: 2 }}>{v.partyName}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {v.partyGstin || 'No GSTIN'} {v.partyState && `• ${v.partyState}`}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background: v.direction === 'OUTWARD' ? '#dbeafe' : '#fce7f3',
                        color: v.direction === 'OUTWARD' ? '#1e40af' : '#9f1239'
                      }}>
                        {v.direction}
                      </span>
                      {v.itemType && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{v.itemType}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontWeight: 500 }}>
                      ₹{v.assessableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.cessAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                      ₹{v.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {totals && vouchers.length > 0 && (
              <tfoot style={{ background: '#f8fafc', fontWeight: 600 }}>
                <tr>
                  <td style={{ padding: '12px 16px' }} colSpan={5}>Total ({vouchers.length} vouchers)</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a' }}>
                    ₹{totals.assessableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    ₹{totals.cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    ₹{totals.sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    ₹{totals.igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    ₹{totals.cessAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6' }}>
                    ₹{totals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Selection Info */}
      {selected.size > 0 && (
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
            {selected.size} voucher{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
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
