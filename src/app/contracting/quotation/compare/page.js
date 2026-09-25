'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, BarChart2, CheckCircle2, AlertCircle, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../contracting.css';

export default function QuotationCompare() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [quotations, setQuotations] = useState([]);
  const [fetchingQ, setFetchingQ] = useState(false);
  const [selectingId, setSelectingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/contracting/enquiry').then(r => r.json())
      .then(data => setEnquiries(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadQuotations = async (enquiryId) => {
    if (!enquiryId) { setQuotations([]); return; }
    setFetchingQ(true);
    try {
      const res = await fetch(`/api/contracting/quotation?enquiryId=${enquiryId}`);
      const data = await res.json();
      setQuotations(Array.isArray(data) ? data : []);
    } catch { setQuotations([]); }
    finally { setFetchingQ(false); }
  };

  const handleEnquiryChange = (id) => {
    setSelectedEnquiryId(id);
    setQuotations([]);
    loadQuotations(id);
  };

  const selectedEnquiry = enquiries.find(e => e.id === selectedEnquiryId);
  const allTasks = selectedEnquiry?.tasks || [];

  // Get lowest rate for each task across quotations
  const lowestRates = {};
  allTasks.forEach(task => {
    const rates = quotations.map(q => {
      const item = q.items?.find(i => i.taskName === task.taskName);
      return item ? parseFloat(item.rate) : Infinity;
    }).filter(r => r !== Infinity);
    lowestRates[task.taskName] = rates.length > 0 ? Math.min(...rates) : null;
  });

  const handleSelectWinner = async (quotation) => {
    setSelectingId(quotation.id);
    try {
      await fetch('/api/contracting/quotation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quotation.id, status: 'Selected' })
      });
      setToast({ msg: `${quotation.contractorName} selected as winner!`, type: 'success' });
      setTimeout(() => setToast(null), 4000);
      loadQuotations(selectedEnquiryId);
    } catch {
      setToast({ msg: 'Failed to select winner.', type: 'error' });
    } finally {
      setSelectingId(null);
    }
  };

  const getTotal = (q) => q.items?.reduce((s, i) => s + (i.totalAmount || 0), 0) || 0;

  return (
    <div className="contracting-container">
      <div className="contracting-header">
        <div className="contracting-header-title"><BarChart2 size={18} /> Quotation Compare</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation Compare
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {toast && (
          <div style={{ background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: toast.type === 'success' ? '#166534' : '#991b1b' }}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.msg}
          </div>
        )}

        {/* Enquiry Selection */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>▸ Select Enquiry</div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Enquiry No.</label>
                <select className="contracting-input" style={{ width: '100%' }} value={selectedEnquiryId} onChange={e => handleEnquiryChange(e.target.value)}>
                  <option value="">{loading ? 'Loading...' : '- Select Enquiry -'}</option>
                  {enquiries.map(e => <option key={e.id} value={e.id}>{e.enquiryNo} — {e.projectName}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 16px', fontSize: '0.85rem', color: '#0369a1', width: '100%' }}>
                  <strong>{quotations.length}</strong> Quotation(s) received &nbsp;|&nbsp; <strong>{allTasks.length}</strong> Task(s)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {selectedEnquiryId && !fetchingQ && (
          quotations.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              No quotations received for this enquiry yet.
            </div>
          ) : (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#eff6ff', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#1d4ed8', borderBottom: '1px solid #dbeafe' }}>
                ▸ Rate Comparison — {selectedEnquiry?.projectName}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#334155', minWidth: '200px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>Task / Work Description</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#334155', width: '60px' }}>Unit</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: '#334155', width: '60px' }}>Qty</th>
                      {quotations.map(q => (
                        <th key={q.id} style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', color: q.status === 'Selected' ? '#166534' : '#334155', minWidth: '140px', background: q.status === 'Selected' ? '#f0fdf4' : '#f8fafc' }}>
                          {q.status === 'Selected' && <Trophy size={13} style={{ marginRight: '4px', color: '#16a34a' }} />}
                          {q.contractorName}
                          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>{q.quotationNo}</span>
                          {q.status === 'Selected' && <span style={{ display: 'block', fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>✓ SELECTED</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTasks.map((task, tidx) => (
                      <tr key={task.id} style={{ background: tidx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 500, color: '#334155', position: 'sticky', left: 0, background: tidx % 2 === 0 ? '#fff' : '#fafafa', zIndex: 1 }}>{task.taskName}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#64748b' }}>{task.unit || '—'}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#64748b' }}>{task.qty}</td>
                        {quotations.map(q => {
                          const item = q.items?.find(i => i.taskName === task.taskName);
                          const rate = item ? parseFloat(item.rate) : null;
                          const isLowest = rate !== null && lowestRates[task.taskName] === rate;
                          return (
                            <td key={q.id} style={{
                              padding: '10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right',
                              background: isLowest ? '#f0fdf4' : q.status === 'Selected' ? '#fafffe' : 'inherit',
                              color: isLowest ? '#16a34a' : '#334155', fontWeight: isLowest ? 700 : 400
                            }}>
                              {rate !== null ? <>₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {isLowest && <span title="Lowest">🏆</span>}</> : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Grand Total Row */}
                    <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                      <td colSpan={3} style={{ padding: '12px', borderTop: '2px solid #e2e8f0', textAlign: 'right', color: '#334155' }}>Grand Total (incl. GST)</td>
                      {quotations.map(q => {
                        const total = getTotal(q);
                        const lowestTotal = Math.min(...quotations.map(x => getTotal(x)));
                        const isLowest = total === lowestTotal;
                        return (
                          <td key={q.id} style={{ padding: '12px', borderTop: '2px solid #e2e8f0', textAlign: 'right', color: isLowest ? '#16a34a' : '#334155', background: isLowest ? '#dcfce7' : '#f1f5f9' }}>
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Select Winner Buttons */}
              <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Select Winner:</span>
                {quotations.map(q => (
                  <button
                    key={q.id}
                    onClick={() => handleSelectWinner(q)}
                    disabled={selectingId === q.id || q.status === 'Selected'}
                    style={{
                      padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem', cursor: q.status === 'Selected' ? 'default' : 'pointer',
                      border: '1.5px solid', fontWeight: 600, transition: 'all 0.15s',
                      background: q.status === 'Selected' ? '#dcfce7' : '#fff',
                      borderColor: q.status === 'Selected' ? '#16a34a' : '#17a2b8',
                      color: q.status === 'Selected' ? '#16a34a' : '#17a2b8',
                    }}
                  >
                    {q.status === 'Selected' ? <><Trophy size={13} /> {q.contractorName} ✓</> : <>{selectingId === q.id ? 'Selecting...' : q.contractorName}</>}
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {fetchingQ && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading quotations...</div>
        )}
      </div>
    </div>
  );
}
