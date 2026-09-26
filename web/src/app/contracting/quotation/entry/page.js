'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Home, ChevronRight, FileText, Save, RefreshCw, AlertCircle, CheckCircle2, Upload, X, Paperclip } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import '../../contracting.css';

const Section = ({ title, color = '#1d4ed8', bg = '#eff6ff', border = '#dbeafe', children }) => (
  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
    <div style={{ background: bg, padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color, borderBottom: `1px solid ${border}` }}>▸ {title}</div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

const Field = ({ label, required, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}` }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' };
const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' };
const inp = { width: '100%', boxSizing: 'border-box' };
const ta = { width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' };

export default function QuotationEntry() {
  const searchParams = useSearchParams();
  const quotationId = searchParams.get('id') || '';
  const [enquiries, setEnquiries] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [selectedContractorId, setSelectedContractorId] = useState('');

  // Quotation Basic
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().slice(0, 10));
  const [validTill, setValidTill] = useState('');

  // Terms & Conditions
  const [terms, setTerms] = useState({
    deliveryTerms: '',
    paymentTerms: '',
    materialInspection: '',
    warranty: '',
    transactionMode: '',
    insurance: '',
    taxAndDuties: '',
    freightCharges: '',
    otherConditions: '',
  });

  // Rate Items
  const [items, setItems] = useState([]);

  // Documents
  const [docs, setDocs] = useState([]); // [{name, size, base64, type}]
  const fileRef = useRef();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/contracting/enquiry').then(r => r.json()),
      fetch('/api/contractors').then(r => r.json()),
      quotationId ? fetch(`/api/contracting/quotation?id=${quotationId}`).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]).then(([enq, cont, quotation]) => {
      setEnquiries(Array.isArray(enq) ? enq : []);
      setContractors(Array.isArray(cont) ? cont.filter(c => c.status !== 'Inactive') : []);
      if (quotation) {
        setSelectedEnquiryId(quotation.enquiryId || '');
        setSelectedContractorId(quotation.contractorId || '');
        setQuotationDate(quotation.quotationDate ? new Date(quotation.quotationDate).toISOString().slice(0, 10) : '');
        setValidTill(quotation.validTill ? new Date(quotation.validTill).toISOString().slice(0, 10) : '');
        setTerms({
          deliveryTerms: quotation.deliveryTerms || '', paymentTerms: quotation.paymentTerms || '',
          materialInspection: quotation.materialInspection || '', warranty: quotation.warranty || '',
          transactionMode: quotation.transactionMode || '', insurance: quotation.insurance || '',
          taxAndDuties: quotation.taxAndDuties || '', freightCharges: quotation.freightCharges || '',
          otherConditions: quotation.otherConditions || '',
        });
        setItems((quotation.items || []).map(item => ({
          taskName: item.taskName, unit: item.unit || '', qty: item.qty || 1,
          rate: item.rate || 0, gstPercent: item.gstPercent || 18,
        })));
        try { setDocs(quotation.documents ? JSON.parse(quotation.documents) : []); } catch { setDocs([]); }
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [quotationId]);

  const selectedEnquiry = enquiries.find(e => e.id === selectedEnquiryId) || null;
  const selectedContractor = contractors.find(c => c.id === selectedContractorId) || null;

  useEffect(() => {
    if (quotationId) return;
    const timer = setTimeout(() => {
      if (!selectedEnquiry) { setItems([]); return; }
      setItems((selectedEnquiry.tasks || []).map(t => ({
        taskName: t.taskName, unit: t.unit || '', qty: t.qty || 1, rate: 0, gstPercent: 18,
      })));
      if (selectedEnquiry.contractors?.length === 1) {
        const ec = selectedEnquiry.contractors[0];
        const match = contractors.find(c => c.id === ec.contractorId);
        if (match) setSelectedContractorId(match.id);
      }
      setTerms(t => ({
        ...t,
        paymentTerms: selectedEnquiry.paymentTerms || t.paymentTerms,
        deliveryTerms: selectedEnquiry.deliveryTerms || t.deliveryTerms,
        otherConditions: selectedEnquiry.specialCond || t.otherConditions,
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedEnquiryId, selectedEnquiry, contractors, quotationId]);

  const setTerm = (k, v) => setTerms(prev => ({ ...prev, [k]: v }));
  const updateItem = (idx, field, value) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const calcRow = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amount = qty * rate;
    const gst = amount * ((parseFloat(item.gstPercent) || 0) / 100);
    return { amount, gst, total: amount + gst };
  };

  const grandBasic = items.reduce((s, i) => s + calcRow(i).amount, 0);
  const grandGst = items.reduce((s, i) => s + calcRow(i).gst, 0);
  const grandTotal = grandBasic + grandGst;

  // File upload handler
  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocs(prev => [...prev, { name: file.name, size: file.size, type: file.type, base64: e.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDoc = (idx) => setDocs(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEnquiryId) { setSaveError('Select an enquiry.'); return; }
    if (!selectedContractorId) { setSaveError('Select a contractor.'); return; }

    setSaving(true); setSaveError(''); setSaved(null);
    try {
      const res = await fetch('/api/contracting/quotation', {
        method: quotationId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quotationId || undefined,
          enquiryId: selectedEnquiryId,
          contractorId: selectedContractorId,
          contractorName: selectedContractor?.companyName || '',
          quotationDate, validTill, items, terms, documents: docs,
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const data = await res.json();
      setSaved(data);
      if (!quotationId) {
        setSelectedEnquiryId(''); setSelectedContractorId(''); setItems([]); setDocs([]);
        setTerms({ deliveryTerms: '', paymentTerms: '', materialInspection: '', warranty: '', transactionMode: '', insurance: '', taxAndDuties: '', freightCharges: '', otherConditions: '' });
      }
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setSelectedEnquiryId(''); setSelectedContractorId(''); setItems([]); setDocs([]);
    setTerms({ deliveryTerms: '', paymentTerms: '', materialInspection: '', warranty: '', transactionMode: '', insurance: '', taxAndDuties: '', freightCharges: '', otherConditions: '' });
    setSaved(null); setSaveError('');
  };

  return (
    <div className="contracting-container">
      <div className="contracting-header">
        <div className="contracting-header-title"><FileText size={18} /> Quotation Entry</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation Entry
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {saved && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
            <CheckCircle2 size={16} /> Quotation <strong>{saved.quotationNo}</strong> saved successfully!
          </div>
        )}
        {saveError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b' }}>
            <AlertCircle size={16} /> {saveError}
          </div>
        )}

        <form onSubmit={handleSave}>

          {/* ── Section 1: Selection ── */}
          <Section title="Quotation Details" color="#334155" bg="#f1f5f9" border="#e2e8f0">
            <div style={{ ...grid4, marginBottom: '16px' }}>
              <Field label="Enquiry No." required span={2}>
                <select className="contracting-input" style={inp} value={selectedEnquiryId}
                  onChange={e => { setSelectedEnquiryId(e.target.value); setSelectedContractorId(''); }}>
                  <option value="">{loading ? 'Loading...' : '- Select Enquiry -'}</option>
                  {enquiries.map(e => <option key={e.id} value={e.id}>{e.enquiryNo} — {e.projectName}</option>)}
                </select>
              </Field>
              <Field label="Contractor" required span={2}>
                <select className="contracting-input" style={inp} value={selectedContractorId}
                  onChange={e => setSelectedContractorId(e.target.value)}>
                  <option value="">- Select Contractor -</option>
                  {(selectedEnquiry?.contractors || []).map(ec => {
                    const c = contractors.find(x => x.id === ec.contractorId);
                    return c ? <option key={c.id} value={c.id}>{c.companyName}</option> : null;
                  })}
                </select>
              </Field>
              <Field label="Quotation No.">
                <input className="contracting-input" style={inp} value="Auto Generated" readOnly disabled />
              </Field>
              <Field label="Quotation Date">
                <input type="date" className="contracting-input" style={inp} value={quotationDate}
                  onChange={e => setQuotationDate(e.target.value)} />
              </Field>
              <Field label="Valid Till">
                <input type="date" className="contracting-input" style={inp} value={validTill}
                  onChange={e => setValidTill(e.target.value)} />
              </Field>
              <Field label="Project">
                <input className="contracting-input" style={inp} value={selectedEnquiry?.projectName || ''} readOnly disabled />
              </Field>
            </div>
          </Section>

          {/* ── Section 2: Rate Entry Table ── */}
          {items.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ background: '#eff6ff', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#1d4ed8', borderBottom: '1px solid #dbeafe' }}>
                ▸ Rate Entry — {selectedEnquiry?.projectName}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      {['#', 'Task / Work Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)', 'GST%', 'Total (₹)'].map((h, i) => (
                        <th key={i} style={{ padding: '10px', textAlign: i === 0 ? 'center' : i >= 4 ? 'right' : i === 2 || i === 3 ? 'center' : 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, width: [40, 'auto', 80, 80, 110, 110, 70, 120][i] }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const { amount, gst, total } = calcRow(item);
                      return (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: 500, color: '#334155' }}>{item.taskName}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{item.unit || '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{item.qty}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>
                            <input type="number" className="contracting-input" style={{ width: '100%', textAlign: 'right' }} value={item.rate} min="0" onChange={e => updateItem(idx, 'rate', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>
                            <input type="number" className="contracting-input" style={{ width: '100%', textAlign: 'center' }} value={item.gstPercent} onChange={e => updateItem(idx, 'gstPercent', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#17a2b8' }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ background: '#f8fafc', fontWeight: 600 }}>
                    <tr>
                      <td colSpan={5} style={{ padding: '10px', textAlign: 'right', borderTop: '2px solid #e2e8f0' }}>Sub Total (Basic)</td>
                      <td style={{ padding: '10px', textAlign: 'right', borderTop: '2px solid #e2e8f0' }}>₹{grandBasic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px', textAlign: 'right', borderTop: '2px solid #e2e8f0' }}>GST</td>
                      <td style={{ padding: '10px', textAlign: 'right', borderTop: '2px solid #e2e8f0' }}>₹{grandGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td colSpan={6} style={{ padding: '10px', textAlign: 'right', color: '#17a2b8', fontSize: '1rem' }}>Grand Total</td>
                      <td colSpan={2} style={{ padding: '10px', textAlign: 'right', color: '#17a2b8', fontSize: '1.1rem' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {items.length === 0 && selectedEnquiryId && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              No tasks in this enquiry.
            </div>
          )}

          {/* ── Section 3: Terms & Conditions ── */}
          <Section title="Terms & Conditions">
            <div style={{ ...grid4, marginBottom: '16px' }}>
              <Field label="Delivery Terms" span={2}>
                <textarea className="contracting-input" style={ta} value={terms.deliveryTerms}
                  onChange={e => setTerm('deliveryTerms', e.target.value)}
                  placeholder="e.g. Ex-Works / At Site / As per scope" />
              </Field>
              <Field label="Payment Terms" span={2}>
                <textarea className="contracting-input" style={ta} value={terms.paymentTerms}
                  onChange={e => setTerm('paymentTerms', e.target.value)}
                  placeholder="e.g. 30 days from invoice date" />
              </Field>
            </div>
            <div style={{ ...grid4, marginBottom: '16px' }}>
              <Field label="Material Inspection" span={2}>
                <textarea className="contracting-input" style={ta} value={terms.materialInspection}
                  onChange={e => setTerm('materialInspection', e.target.value)}
                  placeholder="e.g. Third party / Client inspection required" />
              </Field>
              <Field label="Warranty">
                <textarea className="contracting-input" style={ta} value={terms.warranty}
                  onChange={e => setTerm('warranty', e.target.value)}
                  placeholder="e.g. 12 months from date of completion" />
              </Field>
              <Field label="Transaction Mode">
                <select className="contracting-input" style={inp} value={terms.transactionMode}
                  onChange={e => setTerm('transactionMode', e.target.value)}>
                  <option value="">- Select -</option>
                  <option>NEFT / RTGS</option>
                  <option>Cheque</option>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>DD</option>
                </select>
              </Field>
            </div>
            <div style={{ ...grid3 }}>
              <Field label="Insurance">
                <textarea className="contracting-input" style={ta} value={terms.insurance}
                  onChange={e => setTerm('insurance', e.target.value)}
                  placeholder="e.g. Contractor to arrange WC policy" />
              </Field>
              <Field label="Tax & Duties">
                <textarea className="contracting-input" style={ta} value={terms.taxAndDuties}
                  onChange={e => setTerm('taxAndDuties', e.target.value)}
                  placeholder="e.g. GST extra at actuals / Inclusive" />
              </Field>
              <Field label="Freight Charges">
                <textarea className="contracting-input" style={ta} value={terms.freightCharges}
                  onChange={e => setTerm('freightCharges', e.target.value)}
                  placeholder="e.g. Included / Extra at actuals" />
              </Field>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Field label="Other Conditions / Remarks">
                <textarea className="contracting-input" style={{ ...ta, minHeight: '80px' }} value={terms.otherConditions}
                  onChange={e => setTerm('otherConditions', e.target.value)}
                  placeholder="Any additional terms or special conditions..." />
              </Field>
            </div>
          </Section>

          {/* ── Section 4: Document Upload ── */}
          <Section title="Document Attachments" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
            {/* Drop Zone */}
            <div
              style={{ border: '2px dashed #c4b5fd', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: '#faf5ff', marginBottom: '16px', transition: 'border-color 0.2s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <Upload size={28} style={{ color: '#7c3aed', marginBottom: '8px' }} />
              <div style={{ fontWeight: 600, color: '#5b21b6', fontSize: '0.9rem' }}>Click to upload or drag &amp; drop</div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '4px' }}>PDF, Images, Excel, Word — up to 10MB each</div>
              <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)} />
            </div>

            {/* Uploaded docs list */}
            {docs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docs.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px' }}>
                    <Paperclip size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{(doc.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button type="button" onClick={() => removeDoc(idx)}
                      style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {docs.length === 0 && (
              <div style={{ textAlign: 'center', color: '#d8b4fe', fontSize: '0.82rem' }}>No documents attached yet.</div>
            )}
          </Section>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn-cyan" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleReset}>
              <RefreshCw size={14} /> Reset
            </button>
            <button type="submit" className="btn-cyan" disabled={saving || items.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px' }}>
              <Save size={16} /> {saving ? 'Saving...' : quotationId ? 'Update Quotation' : 'Save Quotation'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
