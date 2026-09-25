"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TDSMasterPage() {
  const { companyId } = useParams();
  const router = useRouter();

  const [type, setType] = useState("TDS");
  const [rows, setRows] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({
    section: '',
    tdsAccountId: '',
    limit: 0,
    percent: 0,
    surcharge: 0,
    cess: 0
  });

  useEffect(() => {
    if (companyId) {
      fetchLedgers();
      fetchRows();
    }
  }, [companyId, type]);

  const fetchLedgers = async () => {
    try {
      const res = await fetch(`/api/ledgers?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setLedgers(data.ledgers || []);
      }
    } catch (e) {
      console.error('Failed to load ledgers:', e);
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tds/master?companyId=${companyId}&type=${type}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRow(null);
    setFormData({
      section: '',
      tdsAccountId: '',
      limit: 0,
      percent: 0,
      surcharge: 0,
      cess: 0
    });
    setShowModal(true);
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setFormData({
      section: row.section,
      tdsAccountId: row.tdsAccountId,
      limit: row.limit,
      percent: row.percent,
      surcharge: row.surcharge,
      cess: row.cess
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this TDS section?')) return;
    
    try {
      const res = await fetch(`/api/tds/master/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSuccess('Deleted successfully');
      fetchRows();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    if (!formData.section || !formData.tdsAccountId) {
      setError('Section and TDS Account are required');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const url = editingRow 
        ? `/api/tds/master/${editingRow.id}`
        : '/api/tds/master';
      
      const res = await fetch(url, {
        method: editingRow ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyId, type })
      });

      if (!res.ok) throw new Error('Save failed');
      
      setSuccess(editingRow ? 'Updated successfully' : 'Created successfully');
      setShowModal(false);
      fetchRows();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const net = (row) => {
    return Number(row.percent || 0) + Number(row.surcharge || 0) + Number(row.cess || 0);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>TDS Master</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: 12, cursor: 'pointer' }}>
              <input type="radio" checked={type === "TDS"} onChange={() => setType("TDS")} /> TDS
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" checked={type === "TCS"} onChange={() => setType("TCS")} /> TCS
            </label>
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            + Add Section
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ padding: 12, background: '#d1fae5', color: '#065f46', borderRadius: 6, marginBottom: 16 }}>{success}</div>}

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: 8 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: 12, textAlign: 'left' }}>SECTION</th>
              <th style={{ padding: 12, textAlign: 'left' }}>TDS ACCOUNT</th>
              <th style={{ padding: 12, textAlign: 'right' }}>LIMIT</th>
              <th style={{ padding: 12, textAlign: 'right' }}>PERCENT</th>
              <th style={{ padding: 12, textAlign: 'right' }}>SURCHARGE</th>
              <th style={{ padding: 12, textAlign: 'right' }}>CESS</th>
              <th style={{ padding: 12, textAlign: 'right' }}>NET %</th>
              <th style={{ padding: 12, textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                  No {type} sections configured. Click "+ Add Section" to create one.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12, fontWeight: 500 }}>{row.section}</td>
                  <td style={{ padding: 12 }}>{row.tdsAccountName || row.tdsAccountId}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>₹{Number(row.limit).toLocaleString('en-IN')}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{Number(row.percent).toFixed(2)}%</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{Number(row.surcharge).toFixed(2)}%</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{Number(row.cess).toFixed(2)}%</td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>{net(row).toFixed(2)}%</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(row)}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        marginRight: 8
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 12,
            width: '100%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>{editingRow ? 'Edit' : 'Add'} TDS Section</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Section *</label>
              <input
                type="text"
                placeholder="e.g., 194C, 194J"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>TDS Account *</label>
              <select
                value={formData.tdsAccountId}
                onChange={(e) => setFormData({ ...formData, tdsAccountId: e.target.value })}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14
                }}
              >
                <option value="">Select Ledger</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Limit (₹)</label>
              <input
                type="number"
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Percent %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.percent}
                  onChange={(e) => setFormData({ ...formData, percent: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Surcharge %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.surcharge}
                  onChange={(e) => setFormData({ ...formData, surcharge: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Cess %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cess}
                  onChange={(e) => setFormData({ ...formData, cess: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
