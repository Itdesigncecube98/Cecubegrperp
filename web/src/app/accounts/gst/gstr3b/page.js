"use client";

import { useState } from "react";

const COMPANY_ID = "demo-company-id";
const TABS = ["(3)", "(4)", "(5)", "(6)", "verification", "Excluded Vouchers"];

function Row({ label, row }) {
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '12px 16px', color: '#334155', fontSize: 13 }}>{label}</td>
      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontWeight: 500 }}>
        ₹{row.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
        ₹{row.centralTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
        ₹{row.stateTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
        ₹{row.integratedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
        ₹{row.cess.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>
  );
}

export default function Gst3BPage() {
  const [stateGstinId, setStateGstinId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tab, setTab] = useState("(3)");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function loadData() {
    if (!stateGstinId || !fromDate || !toDate) {
      setError("State GSTIN, From Date and To Date are required");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({ companyId: COMPANY_ID, stateGstinId, fromDate, toDate });
      const res = await fetch(`/api/gst/gstr3b?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load GST3B data");
      setResult(json.data);
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
      const res = await fetch("/api/gst/gstr3b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: COMPANY_ID, stateGstinId, fromDate, toDate, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      setSuccess(`✓ ${action === 'SUBMIT' ? 'Submitted successfully' : 'Rolled back successfully'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const s = result?.section3_1;
  const s2 = result?.section3_2;

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
          GSTR3B - Monthly Return
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 15 }}>
          Summary return showing tax liability and ITC claimed for the month
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>State GSTIN *</label>
            <input placeholder="Enter GSTIN" value={stateGstinId} onChange={(e) => setStateGstinId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>From Date *</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>To Date *</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={loadData} disabled={loading}
            style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#2563eb')} onMouseLeave={(e) => (e.target.style.background = '#3b82f6')}>
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: 14, background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 500, border: '1px solid #fecaca' }}>{error}</div>}
      {success && <div style={{ padding: 14, background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 500, border: '1px solid #bbf7d0' }}>{success}</div>}

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent', background: tab === t ? '#eff6ff' : 'transparent', color: tab === t ? '#1e40af' : '#64748b', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '4px 4px 0 0' }}
            onMouseEnter={(e) => tab !== t && (e.target.style.background = '#f8fafc')} onMouseLeave={(e) => tab !== t && (e.target.style.background = 'transparent')}>
            {t}
          </button>
        ))}
      </div>

      {tab === "(3)" && s && (
        <>
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                (3.1) Details of outward supplies and inward supplies liable to reverse charge
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NATURE OF SUPPLIES</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL TAXABLE VALUE</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CENTRAL TAX</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATE/UT TAX</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>INTEGRATED TAX</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CESS</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="(a) Outward taxable supplies (other than zero rated, nil rated and exempted)" row={s.outwardTaxable} />
                  <Row label="(b) Outward taxable supplies (zero rated)" row={s.outwardZeroRated} />
                  <Row label="(c) Other outward supplies (Nil rated, exempted)" row={s.outwardNilExempt} />
                  <Row label="(d) Inward supplies (liable to reverse charge)" row={s.inwardReverseCharge} />
                  <Row label="(e) Non-GST outward supplies" row={s.nonGstOutward} />
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                (3.2) Inter-state supplies to unregistered persons, composition taxable persons and UIN holders
              </h2>
            </div>
            {[
              ["Supplies made to Composition Taxable Persons", s2.compositionTaxablePersons],
              ["Supplies made to UIN holders", s2.uinHolders],
              ["Supplies made to Unregistered Persons", s2.unregisteredPersons],
            ].map(([label, list]) => (
              <div key={label} style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#334155' }}>{label}</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>PLACE OF SUPPLY (STATE/UT)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>TOTAL TAXABLE VALUE</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>INTEGRATED TAX</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 ? (
                        <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No data - ₹0.00</td></tr>
                      ) : (
                        list.map((r) => (
                          <tr key={r.placeOfSupply} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', color: '#334155' }}>{r.placeOfSupply}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: 500 }}>
                              ₹{r.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                              ₹{r.integratedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <button onClick={() => doAction("ROLLBACK")} disabled={loading}
              style={{ padding: '10px 20px', background: '#64748b', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
              onMouseEnter={(e) => !loading && (e.target.style.background = '#475569')} onMouseLeave={(e) => (e.target.style.background = '#64748b')}>
              Rollback
            </button>
            <button onClick={() => doAction("SUBMIT")} disabled={loading}
              style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
              onMouseEnter={(e) => !loading && (e.target.style.background = '#059669')} onMouseLeave={(e) => (e.target.style.background = '#10b981')}>
              Submit
            </button>
          </div>
        </>
      )}

      {tab !== "(3)" && (
        <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>Section {tab}</div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            Wire up the equivalent aggregation query the same way section (3) does above
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Loading...</div>}
    </div>
  );
}
