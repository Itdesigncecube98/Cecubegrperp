"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function Schedule3Page() {
  const { companyId } = useParams();

  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/schedule3?companyId=${companyId}&fromDate=${fromDate}&toDate=${toDate}`
      );
      if (!res.ok) throw new Error("Failed to load Schedule III");
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const fmt = (n) =>
    typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#1e293b' }}>Schedule III (Companies Act 2013)</h1>

      <div style={{ display: "flex", gap: '16px', alignItems: "flex-end", marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13px' }} />
        </div>
        <button onClick={fetchData} disabled={loading} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px', background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div style={{ marginBottom: '12px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>{error}</div>}

      {data && (
        <div style={{ display: "flex", gap: '32px', flexWrap: "wrap" }}>
          {data.sections.map((section) => (
            <div key={section.section} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflowX: 'auto', flex: '1 1 400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: "#0ea5e9", color: "#fff" }}>
                    <th style={{ textAlign: "left", padding: "12px 16px" }}>{section.section}</th>
                    <th style={{ textAlign: "right", padding: "12px 16px" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {section.groups.map((group) => (
                    <>
                      <tr key={group.heading}>
                        <td colSpan={2} style={{ fontWeight: 600, padding: "12px 16px", background: "#f8fafc" }}>
                          {group.heading}
                        </td>
                      </tr>
                      {group.lines.map((line) => (
                        <tr key={line.label} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: "8px 16px 8px 32px" }}>{line.label}</td>
                          <td style={{ padding: "8px 16px", textAlign: "right" }}>{fmt(line.amount)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '1px solid #cbd5e1' }}>
                        <td style={{ padding: "8px 16px", fontStyle: "italic", color: '#64748b' }}>Sub-total</td>
                        <td style={{ padding: "8px 16px", textAlign: "right", fontStyle: "italic", color: '#64748b' }}>
                          {fmt(group.subtotal)}
                        </td>
                      </tr>
                    </>
                  ))}
                  <tr style={{ fontWeight: 700, borderTop: "2px solid #1e293b", background: '#f8fafc' }}>
                    <td style={{ padding: "12px 16px" }}>Total</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>{fmt(section.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div style={{ marginTop: '24px', padding: '12px 16px', background: data.totals.difference === 0 ? '#ecfdf5' : '#fef2f2', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
          Difference (should be 0): <strong>{fmt(data.totals.difference)}</strong>
        </div>
      )}
    </div>
  );
}
