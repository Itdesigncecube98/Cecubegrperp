"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function TDSMasterPage() {
  const { companyId } = useParams();

  const [type, setType] = useState("TDS");
  const [newSection, setNewSection] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tds-master?companyId=${companyId}&type=${type}`);
      if (!res.ok) throw new Error("Failed to load TDS accounts");
      const data = await res.json();
      setRows(data.rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, type]);

  // "+ New Section" button
  const handleAddSection = () => {
    const sectionCode = newSection.trim();
    if (!sectionCode) {
      setError("Enter a section code first, e.g. 194C");
      return;
    }
    if (rows.some((r) => r.section === sectionCode)) {
      setError(`Section ${sectionCode} already exists`);
      return;
    }

    setRows((prev) => [
      ...prev,
      {
        id: null, // null id = not yet saved to DB
        tdsAccountId: "",
        tdsAccountName: "",
        section: sectionCode,
        limit: 0,
        percent: 0,
        surcharge: 0,
        cess: 0,
        net: 0,
      },
    ]);
    setNewSection("");
    setError(null);
  };

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, [field]: value };
        if (["percent", "surcharge", "cess"].includes(field)) {
          updated.net =
            Number(updated.percent || 0) +
            Number(updated.surcharge || 0) +
            Number(updated.cess || 0);
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    const invalid = rows.find((r) => !r.tdsAccountId || !r.section);
    if (invalid) {
      setError("Every row needs a TDS Account and a Section before saving");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tds-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, type, rows }),
      });
      if (!res.ok) throw new Error("Save failed");
      await fetchRows();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>TDS Master</h1>
        <div>
          <label style={{ marginRight: 12 }}>
            <input
              type="radio"
              checked={type === "TDS"}
              onChange={() => setType("TDS")}
            />{" "}
            TDS
          </label>
          <label>
            <input
              type="radio"
              checked={type === "TCS"}
              onChange={() => setType("TCS")}
            />{" "}
            TCS
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="New section e.g. 194C"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
        />
        <button onClick={handleAddSection} style={{ padding: "8px 16px", cursor: "pointer" }}>
          + New Section
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving || rows.length === 0}
          style={{ padding: "8px 16px", cursor: saving || rows.length === 0 ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}
      {loading && <p>Loading...</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
        <thead>
          <tr style={{ background: "#e8f1fb", textAlign: "left" }}>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>TDS ACCOUNT</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>SECTION</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>LIMIT</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>PERCENT</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>SURCHARGE</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>CESS</th>
            <th style={{ padding: 8, border: "1px solid #ddd" }}>NET</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: 16, border: "1px solid #ddd" }}>
                No TDS accounts configured.
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.id ?? `new-${i}`}>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                <input
                  type="text"
                  placeholder="Ledger ID"
                  value={row.tdsAccountId}
                  onChange={(e) => updateRow(i, "tdsAccountId", e.target.value)}
                  style={{ width: "100%", padding: 4, border: "1px solid #ccc" }}
                />
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>{row.section}</td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                <input
                  type="number"
                  value={row.limit}
                  onChange={(e) => updateRow(i, "limit", Number(e.target.value))}
                  style={{ width: 90, padding: 4, border: "1px solid #ccc" }}
                />
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                <input
                  type="number"
                  step="0.01"
                  value={row.percent}
                  onChange={(e) => updateRow(i, "percent", Number(e.target.value))}
                  style={{ width: 70, padding: 4, border: "1px solid #ccc" }}
                />
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                <input
                  type="number"
                  step="0.01"
                  value={row.surcharge}
                  onChange={(e) => updateRow(i, "surcharge", Number(e.target.value))}
                  style={{ width: 70, padding: 4, border: "1px solid #ccc" }}
                />
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>
                <input
                  type="number"
                  step="0.01"
                  value={row.cess}
                  onChange={(e) => updateRow(i, "cess", Number(e.target.value))}
                  style={{ width: 70, padding: 4, border: "1px solid #ccc" }}
                />
              </td>
              <td style={{ padding: 8, border: "1px solid #ddd" }}>{row.net.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
