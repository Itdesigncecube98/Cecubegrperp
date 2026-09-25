'use client';
import { useState } from 'react';

export default function TdsAdjustmentPage() {
  const [accountId, setAccountId] = useState('');
  const [bankId, setBankId] = useState('');
  const [debit, setDebit] = useState([]);
  const [credit, setCredit] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!accountId) {
      setMessage('Please enter an Account ID');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    setMessage('');
    try {
      const data = await fetch(`/api/tds-adjustments?accountId=${accountId}`).then(r => r.json());
      setDebit(data.data?.debitSide || []);
      setCredit(data.data?.creditSide || []);
      setAmounts({});
    } catch (error) {
      setMessage('Failed to load open items');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const setAmount = (item, value) => {
    setAmounts(current => ({ ...current, [`${item.refType}-${item.refId}`]: value }));
  };

  const total = side => side.reduce((sum, item) => 
    sum + (Number(amounts[`${item.refType}-${item.refId}`]) || 0), 0
  );

  const adjust = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const lines = [...debit, ...credit]
        .filter(item => Number(amounts[`${item.refType}-${item.refId}`]) > 0)
        .map(item => ({
          side: debit.includes(item) ? 'Debit' : 'Credit',
          refType: item.refType,
          refId: item.refId,
          amount: item.amount,
          pending: item.pending,
          adjAmount: Number(amounts[`${item.refType}-${item.refId}`])
        }));

      const response = await fetch('/api/tds-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, bankId: bankId || undefined, lines })
      });

      if (response.ok) {
        setMessage('✓ TDS adjustment saved successfully');
        setMessageType('success');
        setTimeout(() => setMessage(''), 5000);
        load();
      } else {
        setMessage('Adjustment failed');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Adjustment failed');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const renderSide = (title, side, bgColor) => (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 24,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ 
        margin: '0 0 20px 0', 
        fontSize: 18, 
        fontWeight: 600,
        color: '#0f172a',
        paddingBottom: 12,
        borderBottom: '2px solid #e2e8f0'
      }}>
        {title}
      </h2>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: bgColor, color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>REFERENCE</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AMOUNT</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PENDING</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', width: 140 }}>ADJUST</th>
            </tr>
          </thead>
          <tbody>
            {side.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  No open items
                </td>
              </tr>
            ) : (
              side.map((item, idx) => (
                <tr 
                  key={`${item.refType}-${item.refId}`}
                  style={{ 
                    borderBottom: idx < side.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '12px', color: '#334155', fontWeight: 500 }}>
                    {item.vDateVNo || item.bankParty || item.refType}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>
                    ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                    ₹{Number(item.pending).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={amounts[`${item.refType}-${item.refId}`] || ''}
                      onChange={e => setAmount(item, e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 14,
                        textAlign: 'right',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 16,
        padding: 12,
        background: '#f8fafc',
        borderRadius: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 500, color: '#475569', fontSize: 14 }}>Total:</span>
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
          ₹{total(side).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );

  const debitTotal = total(debit);
  const creditTotal = total(credit);
  const isBalanced = debitTotal > 0 && debitTotal === creditTotal;

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
          TDS / TCS Adjustment
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 15 
        }}>
          Match TDS payments with TDS payable accounts
        </p>
      </div>

      {/* Filter Card */}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
              Account ID *
            </label>
            <input
              type="text"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              placeholder="Enter TDS account ID"
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
              Bank ID
            </label>
            <input
              type="text"
              value={bankId}
              onChange={e => setBankId(e.target.value)}
              placeholder="Optional bank ID"
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
          {loading ? 'Loading...' : 'Load Open Items'}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div style={{ 
          padding: 14, 
          background: messageType === 'success' ? '#dcfce7' : '#fee2e2',
          color: messageType === 'success' ? '#166534' : '#991b1b',
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 14,
          fontWeight: 500,
          border: `1px solid ${messageType === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {message}
        </div>
      )}

      {/* Two-Column Layout */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: 24,
        marginBottom: 24
      }}>
        {renderSide('Debit Side (TDS Payment)', debit, 'linear-gradient(to right, #3b82f6, #2563eb)')}
        {renderSide('Credit Side (TDS Payable)', credit, 'linear-gradient(to right, #8b5cf6, #7c3aed)')}
      </div>

      {/* Balance Summary & Action */}
      {(debit.length > 0 || credit.length > 0) && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20
          }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Debit Total
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                  ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Credit Total
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>
                  ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Difference
                </div>
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 700, 
                  color: isBalanced ? '#10b981' : '#ef4444'
                }}>
                  ₹{Math.abs(debitTotal - creditTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <button
              onClick={adjust}
              disabled={saving || !isBalanced}
              style={{
                padding: '12px 32px',
                background: isBalanced ? '#10b981' : '#cbd5e1',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: (saving || !isBalanced) ? 'not-allowed' : 'pointer',
                opacity: (saving || !isBalanced) ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => isBalanced && !saving && (e.target.style.background = '#059669')}
              onMouseLeave={(e) => isBalanced && (e.target.style.background = '#10b981')}
            >
              {saving ? 'Adjusting...' : isBalanced ? '✓ Adjust & Save' : '⚠ Balance Required'}
            </button>
          </div>

          {!isBalanced && (debitTotal > 0 || creditTotal > 0) && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#fef3c7',
              borderRadius: 6,
              fontSize: 13,
              color: '#92400e',
              border: '1px solid #fde68a'
            }}>
              ⚠ Debit and Credit totals must match to save the adjustment
            </div>
          )}
        </div>
      )}
    </div>
  );
}
