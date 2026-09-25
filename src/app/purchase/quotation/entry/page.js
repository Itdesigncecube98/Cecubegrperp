'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Home, ChevronRight, FileText, Save, Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle2, Upload, Paperclip, X } from 'lucide-react';
import '../../purchase.css';
import { computeLineTotal, getComparison, saveQuotation } from '../quotationApi';

const today = () => new Date().toISOString().slice(0, 10);
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Section = ({ title, color = '#1d4ed8', bg = '#eff6ff', border = '#dbeafe', children }) => (
  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
    <div style={{ background: bg, padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color, borderBottom: `1px solid ${border}` }}>▸ {title}</div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

const Field = ({ label, required, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}` }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0284c7', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' };
const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' };
const inp = { width: '100%', boxSizing: 'border-box' };
const ta = { width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' };

function QuotationEntryInner() {
  const searchParams = useSearchParams();
  const rfqId = searchParams.get('rfqId') || '';
  const vendorId = searchParams.get('vendorId') || '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rfq, setRfq] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [lines, setLines] = useState([]);
  const [quoteDate, setQuoteDate] = useState(today());
  
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

  // Documents
  const [docs, setDocs] = useState([]);
  const fileRef = useRef();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const load = useCallback(async () => {
    if (!rfqId || !vendorId) {
      setLoadError('An enquiry and a vendor must be selected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const data = await getComparison(rfqId);
      const vendor = data.vendors.find((entry) => entry.vendorId === vendorId);

      setRfq(data.rfq);
      setVendorName(vendor?.vendorName || 'Vendor');

      // Check if quotation already exists to pre-fill terms
      let prefilledTerms = {};
      let prefilledDocs = [];
      try {
        const checkRes = await fetch(`/api/purchase/quotation?rfqId=${rfqId}`);
        if (checkRes.ok) {
          const quotes = await checkRes.json();
          const existQ = quotes.find(q => q.vendorId === vendorId);
          if (existQ) {
            prefilledTerms = {
              deliveryTerms: existQ.deliveryTerms || '',
              paymentTerms: existQ.paymentTerms || '',
              materialInspection: existQ.materialInspection || '',
              warranty: existQ.warranty || '',
              transactionMode: existQ.transactionMode || '',
              insurance: existQ.insurance || '',
              taxAndDuties: existQ.taxAndDuties || '',
              freightCharges: existQ.freightCharges || '',
              otherConditions: existQ.otherConditions || '',
            };
            if (existQ.documents) {
              try {
                prefilledDocs = JSON.parse(existQ.documents);
              } catch (e) {}
            }
          }
        }
      } catch (err) {}

      setTerms(prev => ({ ...prev, ...prefilledTerms }));
      if (prefilledDocs.length > 0) setDocs(prefilledDocs);

      setLines(
        data.materials.map((material) => {
          const existing = material.offers.find((offer) => offer.vendorId === vendorId);
          return {
            key: material.indentItemId,
            indentItemId: material.indentItemId,
            item: material.item,
            unit: material.unit,
            quantity: material.quantity,
            specification: material.specification,
            libraryRate: material.libraryRate || 0,
            brand: existing?.brand || '',
            rate: existing ? String(existing.rate) : '',
            discount: existing ? String(existing.discount) : '',
            gst: existing ? String(existing.gst) : '',
            custom: false
          };
        })
      );
    } catch (error) {
      setLoadError(error.message || 'Failed to load the enquiry.');
    } finally {
      setLoading(false);
    }
  }, [rfqId, vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLine = (key, field, value) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  };
  const setTerm = (k, v) => setTerms(prev => ({ ...prev, [k]: v }));

  const addCustomLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        indentItemId: null,
        item: '', unit: 'Nos', quantity: '', specification: '', brand: '', rate: '', discount: '', gst: '', custom: true
      }
    ]);
  };

  const removeCustomLine = (key) => setLines((prev) => prev.filter((line) => line.key !== key));

  const totals = useMemo(() => {
    let gross = 0; let discount = 0; let gst = 0;
    lines.forEach((line) => {
      const lineGross = (parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0);
      const lineDiscount = (lineGross * (parseFloat(line.discount) || 0)) / 100;
      const taxable = lineGross - lineDiscount;
      gross += lineGross;
      discount += lineDiscount;
      gst += (taxable * (parseFloat(line.gst) || 0)) / 100;
    });
    return { gross, discount, gst, final: gross - discount + gst };
  }, [lines]);

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

  const handleSave = async () => {
    const items = lines
      .filter((line) => line.item.trim() && parseFloat(line.rate) > 0)
      .map((line) => ({
        indentItemId: line.indentItemId,
        item: line.item,
        brand: line.brand,
        quantity: line.quantity,
        rate: line.rate,
        discount: line.discount,
        gst: line.gst
      }));

    if (items.length === 0) {
      setSaveError('Enter a rate for at least one material before saving.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSavedMessage('');

    try {
      await saveQuotation({ rfqId, vendorId, date: quoteDate, items, terms, documents: docs });
      setSavedMessage(`Quotation saved for ${vendorName}.`);
      await load();
    } catch (error) {
      setSaveError(error.message || 'Failed to save the quotation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="purchase-container">
      <div className="purchase-header">
        <div className="purchase-header-title">
          <FileText size={18} /> Quotation Entry {rfq ? `— ${rfq.rfqNo}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation <ChevronRight size={14} /> Entry
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/purchase/quotation" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to quotations
        </Link>
        {rfq && (
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            PR {rfq.indentNo || '-'} • Due {rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString('en-IN') : '-'}
          </span>
        )}
      </div>

      <div style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
        {loadError && (
          <div className="purchase-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
              <AlertCircle size={16} /> {loadError}
            </div>
          </div>
        )}

        {savedMessage && (
          <div className="purchase-card" style={{ borderLeft: '3px solid #10b981' }}>
            <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857' }}>
              <CheckCircle2 size={16} /> {savedMessage}
            </div>
          </div>
        )}

        {/* ── Section 1: Selection ── */}
        <Section title="Quotation Details" color="#334155" bg="#f1f5f9" border="#e2e8f0">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a', fontWeight: 600 }}>
            <span>Vendor: {vendorName}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', fontSize: '0.85rem', color: '#475569' }}>
              Quotation Date
              <input type="date" className="purchase-input" style={{ padding: '4px 8px' }} value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
            </span>
          </div>
        </Section>

        {/* ── Section 2: Rate Entry Table ── */}
        <Section title="Rate Entry" color="#0284c7" bg="#f0f9ff" border="#bae6fd">
          {loading ? (
            <div style={{ padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>Loading materials...</div>
          ) : (
            <div className="purchase-table-wrapper" style={{ marginTop: 0, margin: '-20px' }}>
              <table className="purchase-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Sr.</th>
                    <th>Material</th>
                    <th style={{ width: '70px' }}>Unit</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Qty</th>
                    <th style={{ width: '140px' }}>Brand Offered</th>
                    <th style={{ width: '110px' }}>Rate</th>
                    <th style={{ width: '120px' }}>Library Rate</th>
                    <th style={{ width: '90px' }}>Disc %</th>
                    <th style={{ width: '90px' }}>GST %</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.key}>
                      <td>{index + 1}</td>
                      <td>
                        {line.custom ? (
                          <input type="text" className="purchase-input" style={{ width: '100%', padding: '4px 8px' }} placeholder="Material name" value={line.item} onChange={(e) => updateLine(line.key, 'item', e.target.value)} />
                        ) : (
                          <span style={{ color: '#0284c7', fontWeight: 500 }}>{line.item}</span>
                        )}
                      </td>
                      <td>
                        {line.custom ? (
                          <input type="text" className="purchase-input" style={{ width: '100%', padding: '4px 8px' }} value={line.unit} onChange={(e) => updateLine(line.key, 'unit', e.target.value)} />
                        ) : (
                          line.unit
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {line.custom ? (
                          <input type="number" className="purchase-input" style={{ width: '100%', padding: '4px 8px', textAlign: 'right' }} value={line.quantity} onChange={(e) => updateLine(line.key, 'quantity', e.target.value)} />
                        ) : (
                          line.quantity
                        )}
                      </td>
                      <td>
                        <input type="text" className="purchase-input" style={{ width: '100%', padding: '4px 8px' }} placeholder="e.g. Havells" value={line.brand} onChange={(e) => updateLine(line.key, 'brand', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="0.01" className="purchase-input" style={{ width: '100%', padding: '4px 8px' }} value={line.rate} onChange={(e) => updateLine(line.key, 'rate', e.target.value)} />
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{money(line.libraryRate)}</td>
                      <td>
                        <input type="number" step="0.01" className="purchase-input" style={{ width: '100%', padding: '4px 8px' }} value={line.discount} onChange={(e) => updateLine(line.key, 'discount', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="0.01" className="purchase-input" style={{ width: '100%', padding: '4px 8px' }} value={line.gst} onChange={(e) => updateLine(line.key, 'gst', e.target.value)} />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(computeLineTotal(line.quantity, line.rate, line.discount, line.gst))}</td>
                      <td style={{ textAlign: 'center' }}>
                        {line.custom && (
                          <button type="button" onClick={() => removeCustomLine(line.key)} title="Remove line" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex' }}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                    <td colSpan={8} style={{ textAlign: 'right' }}>Basic {money(totals.gross)} − Discount {money(totals.discount)} + GST {money(totals.gst)}</td>
                    <td style={{ textAlign: 'right', color: '#0284c7' }}>{money(round2(totals.final))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn-cyan" onClick={addCustomLine} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Add Extra Material
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Section 3: Terms & Conditions ── */}
        <Section title="Terms & Conditions" color="#047857" bg="#d1fae5" border="#a7f3d0">
          <div style={{ ...grid4, marginBottom: '16px' }}>
            <Field label="Delivery Terms" span={2}>
              <textarea className="purchase-input" style={ta} value={terms.deliveryTerms} onChange={e => setTerm('deliveryTerms', e.target.value)} placeholder="e.g. Ex-Works / At Site" />
            </Field>
            <Field label="Payment Terms" span={2}>
              <textarea className="purchase-input" style={ta} value={terms.paymentTerms} onChange={e => setTerm('paymentTerms', e.target.value)} placeholder="e.g. 30 days from invoice date" />
            </Field>
          </div>
          <div style={{ ...grid4, marginBottom: '16px' }}>
            <Field label="Material Inspection" span={2}>
              <textarea className="purchase-input" style={ta} value={terms.materialInspection} onChange={e => setTerm('materialInspection', e.target.value)} placeholder="e.g. Client inspection required" />
            </Field>
            <Field label="Warranty">
              <textarea className="purchase-input" style={ta} value={terms.warranty} onChange={e => setTerm('warranty', e.target.value)} placeholder="e.g. 12 months" />
            </Field>
            <Field label="Transaction Mode">
              <select className="purchase-input" style={inp} value={terms.transactionMode} onChange={e => setTerm('transactionMode', e.target.value)}>
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
              <textarea className="purchase-input" style={ta} value={terms.insurance} onChange={e => setTerm('insurance', e.target.value)} placeholder="e.g. Contractor to arrange" />
            </Field>
            <Field label="Tax & Duties">
              <textarea className="purchase-input" style={ta} value={terms.taxAndDuties} onChange={e => setTerm('taxAndDuties', e.target.value)} placeholder="e.g. GST extra" />
            </Field>
            <Field label="Freight Charges">
              <textarea className="purchase-input" style={ta} value={terms.freightCharges} onChange={e => setTerm('freightCharges', e.target.value)} placeholder="e.g. Included" />
            </Field>
          </div>
          <div style={{ marginTop: '16px' }}>
            <Field label="Other Conditions / Remarks">
              <textarea className="purchase-input" style={{ ...ta, minHeight: '80px' }} value={terms.otherConditions} onChange={e => setTerm('otherConditions', e.target.value)} placeholder="Any additional terms or special conditions..." />
            </Field>
          </div>
        </Section>

        {/* ── Section 4: Document Upload ── */}
        <Section title="Document Attachments" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">
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
              style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          </div>

          {docs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map((doc, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px' }}>
                  <Paperclip size={16} style={{ color: '#7c3aed', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{(doc.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button type="button" onClick={() => removeDoc(idx)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', gap: '12px' }}>
          {saveError && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
              <AlertCircle size={15} /> {saveError}
            </span>
          )}
          <button type="button" className="btn-cyan" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuotationEntryPage() {
  return (
    <Suspense fallback={<div className="purchase-container">Loading quotation entry...</div>}>
      <QuotationEntryInner />
    </Suspense>
  );
}
