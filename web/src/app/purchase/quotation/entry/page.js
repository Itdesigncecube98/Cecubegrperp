'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Home, ChevronRight, FileText, Save, Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import '../../purchase.css';
import { computeLineTotal, getComparison, saveQuotation } from '../quotationApi';

const today = () => new Date().toISOString().slice(0, 10);
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const addCustomLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        indentItemId: null,
        item: '',
        unit: 'Nos',
        quantity: '',
        specification: '',
        brand: '',
        rate: '',
        discount: '',
        gst: '',
        custom: true
      }
    ]);
  };

  const removeCustomLine = (key) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const totals = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let gst = 0;

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
      await saveQuotation({ rfqId, vendorId, date: quoteDate, items });
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
          <FileText size={18} />
          Quotation Entry {rfq ? `— ${rfq.rfqNo}` : ''}
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

      <div className="purchase-card">
        <div className="purchase-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
          <span>Vendor: {vendorName}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', fontSize: '0.85rem', color: '#475569' }}>
            Quotation Date
            <input type="date" className="purchase-input" style={{ padding: '4px 8px' }} value={quoteDate} onChange={(event) => setQuoteDate(event.target.value)} />
          </span>
        </div>

        <div className="purchase-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>Loading materials...</div>
          ) : (
            <div className="purchase-table-wrapper" style={{ marginTop: 0 }}>
              <table className="purchase-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Sr.</th>
                    <th>Material</th>
                    <th style={{ width: '70px' }}>Unit</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Qty</th>
                    <th style={{ width: '140px' }}>Brand Offered</th>
                    <th style={{ width: '110px' }}>Rate</th>
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
                          <input
                            type="text"
                            className="purchase-input"
                            style={{ width: '100%', padding: '4px 8px' }}
                            placeholder="Material name"
                            value={line.item}
                            onChange={(event) => updateLine(line.key, 'item', event.target.value)}
                          />
                        ) : (
                          <span style={{ color: '#0284c7', fontWeight: 500 }}>{line.item}</span>
                        )}
                      </td>
                      <td>
                        {line.custom ? (
                          <input
                            type="text"
                            className="purchase-input"
                            style={{ width: '100%', padding: '4px 8px' }}
                            value={line.unit}
                            onChange={(event) => updateLine(line.key, 'unit', event.target.value)}
                          />
                        ) : (
                          line.unit
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {line.custom ? (
                          <input
                            type="number"
                            className="purchase-input"
                            style={{ width: '100%', padding: '4px 8px', textAlign: 'right' }}
                            value={line.quantity}
                            onChange={(event) => updateLine(line.key, 'quantity', event.target.value)}
                          />
                        ) : (
                          line.quantity
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="purchase-input"
                          style={{ width: '100%', padding: '4px 8px' }}
                          placeholder="e.g. Havells"
                          value={line.brand}
                          onChange={(event) => updateLine(line.key, 'brand', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="purchase-input"
                          style={{ width: '100%', padding: '4px 8px' }}
                          value={line.rate}
                          onChange={(event) => updateLine(line.key, 'rate', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="purchase-input"
                          style={{ width: '100%', padding: '4px 8px' }}
                          value={line.discount}
                          onChange={(event) => updateLine(line.key, 'discount', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="purchase-input"
                          style={{ width: '100%', padding: '4px 8px' }}
                          value={line.gst}
                          onChange={(event) => updateLine(line.key, 'gst', event.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {money(computeLineTotal(line.quantity, line.rate, line.discount, line.gst))}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {line.custom && (
                          <button
                            type="button"
                            onClick={() => removeCustomLine(line.key)}
                            title="Remove line"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex' }}
                          >
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
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" className="btn-cyan" onClick={addCustomLine} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Extra Material
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
