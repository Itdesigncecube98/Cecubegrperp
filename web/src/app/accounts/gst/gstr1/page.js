"use client";

import { useState } from "react";

const COMPANY_ID = "demo-company-id";
const TABS = ["Browse", "B2B", "B2CL", "B2CS", "CDNR", "CDNUR", "EXP", "Adv Rece", "Adv Adjt", "Nil Exm Non", "HSN", "Docs"];

export default function Gstr1Page() {
  const [stateGstinId, setStateGstinId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState("Browse");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function loadData() {
    if (!stateGstinId) {
      setError("Please enter a State GSTIN");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({
        companyId: COMPANY_ID,
        stateGstinId,
        month: String(month),
        year: String(year),
      });
      const res = await fetch(`/api/gst/gstr1?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load GSTR1 data");
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function doAction(action) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/gst/gstr1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: COMPANY_ID, stateGstinId, month, year, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      setSuccess(`✓ ${action === 'SUBMIT' ? 'Submitted to GSP' : action === 'HOLD' ? 'Return held' : action === 'RELEASE' ? 'Return released' : 'Rolled back'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rows = result
    ? {
        Browse: result.data.browse,
        B2B: result.data.b2b,
        B2CL: result.data.b2cl,
        B2CS: result.data.b2cs,
        "Nil Exm Non": result.data.nilExempt,
        EXP: result.data.exp,
      }[tab] || []
    : [];

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
          GSTR1 - Outward Supplies
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          Monthly return of outward supplies filed by registered taxable persons
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 16
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 13, 
              fontWeight: 500, 
              color: '#475569',
              marginBottom: 6 
            }}>
              State GSTIN *
            </label>
            <input
              placeholder="Enter GSTIN (e.g., 29XXXXX1234X1Z5)"
              value={stateGstinId}
              onChange={(e) => setStateGstinId(e.target.value)}
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
              Tax Period (Month) *
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
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
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
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
              Year *
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
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

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={loadData}
              disabled={loading}
              style={{
                width: '100%',
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
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>
        </div>

        {result?.filing && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#f8fafc',
            borderRadius: 6,
            fontSize: 13,
            color: '#475569',
            display: 'flex',
            gap: 20
          }}>
            <span><strong>GSP Status:</strong> <span style={{ 
              padding: '2px 8px',
              borderRadius: 4,
              background: result.filing.gspStatus === 'SUBMITTED' ? '#dcfce7' : '#fef3c7',
              color: result.filing.gspStatus === 'SUBMITTED' ? '#166534' : '#92400e',
              fontWeight: 500
            }}>{result.filing.gspStatus}</span></span>
            {result.filing.isHeld && <span style={{ color: '#ef4444', fontWeight: 500 }}>⚠ Return is held</span>}
          </div>
        )}
      </div>

      {/* Messages */}
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
      {success && (
        <div style={{ 
          padding: 14, 
          background: '#dcfce7',
          color: '#166534',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid #bbf7d0'
        }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 4, 
        borderBottom: '2px solid #e2e8f0', 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
              background: tab === t ? '#eff6ff' : 'transparent',
              color: tab === t ? '#1e40af' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
              borderRadius: '4px 4px 0 0'
            }}
            onMouseEnter={(e) => tab !== t && (e.target.style.background = '#f8fafc')}
            onMouseLeave={(e) => tab !== t && (e.target.style.background = 'transparent')}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ 
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>V.DATE / V.NO</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BILL NO / DATE</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PARTY / GSTIN / STATE</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>INVOICE AMT</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ASSESSABLE</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGST</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SGST</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>IGST</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 16 }}>Loading...</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                    <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>No data available for {tab}</div>
                    <div style={{ fontSize: 14, color: '#94a3b8' }}>Select period and search to view transactions</div>
                  </td>
                </tr>
              ) : (
                rows.map((v, idx) => (
                  <tr 
                    key={v.id}
                    style={{ 
                      borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>
                        {new Date(v.vDate).toLocaleDateString('en-GB')}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                        {v.vNo}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#334155' }}>{v.billNo || '-'}</div>
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
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                      ₹{v.invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.assessableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                      ₹{v.sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                      ₹{v.igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      {result?.totals && rows.length > 0 && (
        <div style={{ 
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Summary Totals</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {[
              { label: 'Invoice Amount', value: result.totals.invoiceAmt },
              { label: 'Assessable Value', value: result.totals.assessableValue },
              { label: 'CGST', value: result.totals.cgstAmt },
              { label: 'SGST', value: result.totals.sgstAmt },
              { label: 'IGST', value: result.totals.igstAmt },
              { label: 'Total Tax', value: result.totals.totalTax },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {result && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 12,
          background: 'white',
          padding: 20,
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <button 
            onClick={() => doAction("HOLD")}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#f8fafc')}
            onMouseLeave={(e) => (e.target.style.background = 'white')}
          >
            Hold
          </button>
          <button 
            onClick={() => doAction("RELEASE")}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#f8fafc')}
            onMouseLeave={(e) => (e.target.style.background = 'white')}
          >
            Release
          </button>
          <button 
            onClick={() => doAction("ROLLBACK")}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#475569')}
            onMouseLeave={(e) => (e.target.style.background = '#64748b')}
          >
            Rollback To GSP
          </button>
          <button 
            onClick={() => doAction("SUBMIT")}
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#059669')}
            onMouseLeave={(e) => (e.target.style.background = '#10b981')}
          >
            Submit To GSP
          </button>
        </div>
      )}
    </div>
  );
}
