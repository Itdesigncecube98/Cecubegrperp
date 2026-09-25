'use client';

import { useEffect, useState } from 'react';

export default function TDSMasterPage() {
  const [type, setType] = useState('TDS');
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

  const companyId = 'demo-company-id'; // Get from context/session

  useEffect(() => {
    fetchLedgers();
    fetchRows();
  }, [type]);

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
      setSuccess('✓ Deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
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
      
      setSuccess(editingRow ? '✓ Updated successfully' : '✓ Created successfully');
      setTimeout(() => setSuccess(null), 3000);
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
    <div style={{ padding: '24px', background: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '2px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#111827' }}>TDS Master</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Configure TDS/TCS sections and rates</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 8 }}>
            <button
              onClick={() => setType('TDS')}
              style={{
                padding: '8px 20px',
                background: type === 'TDS' ? '#3b82f6' : 'transparent',
                color: type === 'TDS' ? 'white' : '#374151',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
            >
              TDS
            </button>
            <button
              onClick={() => setType('TCS')}
              style={{
                padding: '8px 20px',
                background: type === 'TCS' ? '#3b82f6' : 'transparent',
                color: type === 'TCS' ? 'white' : '#374151',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
            >
              TCS
            </button>
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#2563eb'}
            onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
          >
            <span style={{ fontSize: 18 }}>+</span>
            New Section
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          padding: 12, 
          background: '#fee2e2', 
          color: '#991b1b', 
          borderRadius: 6, 
          marginBottom: 16,
          fontSize: 14
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ 
          padding: 12, 
          background: '#d1fae5', 
          color: '#065f46', 
          borderRadius: 6, 
          marginBottom: 16,
          fontSize: 14
        }}>
          {success}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
      ) : (
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: 8, 
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>TDS ACCOUNT</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>SECTION</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>LIMIT</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>PERCENT</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>SURCHARGE</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>CESS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>NET</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>No TDS accounts configured.</div>
                    <div style={{ fontSize: 14 }}>Click "New Section" to add one</div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr 
                    key={row.id} 
                    style={{ 
                      borderBottom: idx < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: 'white'
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
                      {row.tdsAccountName || row.tdsAccountId}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827', fontSize: 14 }}>
                      {row.section}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontSize: 14 }}>
                      ₹{Number(row.limit).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontSize: 14 }}>
                      {Number(row.percent).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontSize: 14 }}>
                      {Number(row.surcharge).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontSize: 14 }}>
                      {Number(row.cess).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#3b82f6', fontSize: 14 }}>
                      {net(row).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(row)}
                        style={{
                          padding: '6px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          marginRight: 8,
                          fontSize: 13,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 13
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
        </div>
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
            maxWidth: 540,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, fontSize: 20, fontWeight: 600 }}>
              {editingRow ? 'Edit' : 'Add'} TDS Section
            </h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                Section Code *
              </label>
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
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                TDS Account *
              </label>
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
                <option value="">-- Select Ledger --</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                Threshold Limit (₹)
              </label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
                  Percent %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.percent}
                  onChange={(e) => setFormData({ ...formData, percent: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
                  Surcharge %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.surcharge}
                  onChange={(e) => setFormData({ ...formData, surcharge: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
                  Cess %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cess}
                  onChange={(e) => setFormData({ ...formData, cess: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: 8,
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
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  fontSize: 14,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !saving && (e.target.style.background = '#2563eb')}
                onMouseLeave={(e) => (e.target.style.background = '#3b82f6')}
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
