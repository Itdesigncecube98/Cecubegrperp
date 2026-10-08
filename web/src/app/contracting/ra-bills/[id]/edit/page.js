'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const num = v => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
const inr = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const box = { border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px 8px', width: '100%', boxSizing: 'border-box' };
const label = { display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 };

export default function EditRABillPage() {
    const { id } = useParams();
    const router = useRouter();
    const [bill, setBill] = useState(null);
    const [form, setForm] = useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/contracting/ra-bills?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load bill');
                const b = Array.isArray(data) ? data[0] : data;
                if (!b) throw new Error('RA bill not found');

                let parsedLines = [];
                let remarks = b.remarks || '';
                if (remarks.startsWith('__TASK_LINES__:')) {
                    const nl = remarks.indexOf('\n');
                    if (nl !== -1) {
                        try { parsedLines = JSON.parse(remarks.substring('__TASK_LINES__:'.length, nl)); } catch { /* ignore */ }
                        remarks = remarks.substring(nl + 1).trim();
                    }
                }
                if (cancelled) return;
                setBill(b);
                setLines(parsedLines.map(l => ({ description: l.description || '', qty: l.qty ?? 0, rate: l.rate ?? 0 })));
                setForm({
                    date: b.date ? new Date(b.date).toISOString().slice(0, 10) : '',
                    measuredValue: b.measuredValue ?? 0,
                    retentionPercent: b.retentionPercent ?? 0,
                    advanceRecovery: b.advanceRecovery ?? 0,
                    otherDeductions: b.otherDeductions ?? 0,
                    tdsPercent: b.tdsPercent ?? 0,
                    remarks,
                });
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
    if (error && !form) return <div style={{ padding: 40, color: '#b91c1c' }}>{error}</div>;

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

    const lineTotal = lines.reduce((s, l) => s + num(l.qty) * num(l.rate), 0);
    const measured = lines.length ? lineTotal : num(form.measuredValue);
    const retAmt = (measured * num(form.retentionPercent)) / 100;
    const beforeTds = measured - retAmt - num(form.advanceRecovery) - num(form.otherDeductions);
    const tdsAmt = (beforeTds * num(form.tdsPercent)) / 100;
    const net = beforeTds - tdsAmt;
    const locked = bill.status === 'Paid';

    const save = async () => {
        try {
            setSaving(true);
            setError('');
            const taskLines = lines.map(l => ({
                description: l.description,
                qty: num(l.qty),
                rate: num(l.rate),
                amount: num(l.qty) * num(l.rate),
            }));
            const res = await fetch('/api/contracting/ra-bills', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    date: form.date,
                    measuredValue: measured,
                    retentionPercent: num(form.retentionPercent),
                    advanceRecovery: num(form.advanceRecovery),
                    otherDeductions: num(form.otherDeductions),
                    tdsPercent: num(form.tdsPercent),
                    remarks: form.remarks,
                    taskLines,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            router.push(`/contracting/ra-bills/${id}/print`);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'Arial, sans-serif', fontSize: 14 }}>
            <h2 style={{ margin: '0 0 4px' }}>Edit RA Bill {bill.billNo}</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b' }}>Status: {bill.status}</p>

            {locked && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: 10, borderRadius: 6, marginBottom: 16 }}>
                    This bill is marked Paid, so editing is disabled.
                </div>
            )}
            {!locked && bill.status === 'Approved' && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: 10, borderRadius: 6, marginBottom: 16 }}>
                    This bill is already Approved. Saving will change its certified amounts.
                </div>
            )}

            <fieldset disabled={locked} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div><span style={label}>RA Bill Date</span><input type="date" style={box} value={form.date} onChange={e => setField('date', e.target.value)} /></div>
                    <div><span style={label}>Retention %</span><input type="number" style={box} value={form.retentionPercent} onChange={e => setField('retentionPercent', e.target.value)} /></div>
                    <div><span style={label}>TDS %</span><input type="number" style={box} value={form.tdsPercent} onChange={e => setField('tdsPercent', e.target.value)} /></div>
                    <div><span style={label}>Advance Recovery</span><input type="number" style={box} value={form.advanceRecovery} onChange={e => setField('advanceRecovery', e.target.value)} /></div>
                    <div><span style={label}>Other Deductions</span><input type="number" style={box} value={form.otherDeductions} onChange={e => setField('otherDeductions', e.target.value)} /></div>
                    {lines.length === 0 && (
                        <div><span style={label}>Measured Value</span><input type="number" style={box} value={form.measuredValue} onChange={e => setField('measuredValue', e.target.value)} /></div>
                    )}
                </div>

                {lines.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ textAlign: 'left', padding: 6, border: '1px solid #cbd5e1' }}>Description</th>
                                <th style={{ padding: 6, border: '1px solid #cbd5e1', width: 110 }}>Qty</th>
                                <th style={{ padding: 6, border: '1px solid #cbd5e1', width: 110 }}>Rate</th>
                                <th style={{ padding: 6, border: '1px solid #cbd5e1', width: 130 }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((l, i) => (
                                <tr key={i}>
                                    <td style={{ border: '1px solid #cbd5e1', padding: 4 }}><input style={box} value={l.description} onChange={e => setLine(i, 'description', e.target.value)} /></td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: 4 }}><input type="number" style={box} value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)} /></td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: 4 }}><input type="number" style={box} value={l.rate} onChange={e => setLine(i, 'rate', e.target.value)} /></td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: 6, textAlign: 'right' }}>{inr(num(l.qty) * num(l.rate))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div style={{ marginBottom: 16 }}>
                    <span style={label}>Remarks</span>
                    <textarea rows={3} style={box} value={form.remarks} onChange={e => setField('remarks', e.target.value)} />
                </div>
            </fieldset>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <div>Measured value: <strong>{inr(measured)}</strong></div>
                <div>Retention: {inr(retAmt)} | TDS: {inr(tdsAmt)}</div>
                <div>Net payable: <strong>{inr(net)}</strong></div>
            </div>

            {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} disabled={saving || locked} style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => router.push(`/contracting/ra-bills/${id}/print`)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 18px', borderRadius: 4, cursor: 'pointer' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}