'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageCheck, ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontSize: '14px'
};
const labelStyle = { display: 'block', marginBottom: 6, color: '#334155', fontSize: 13, fontWeight: 700 };

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

function CreateGTNContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    projectId: '',
    supplierId: '',
    supplierName: '',
    gtnDate: new Date().toISOString().slice(0, 10),
    state: '',
    vehicleNo: '',
    challanNo: '',
    challanDate: '',
    ewayBillNo: '',
    ewayBillDate: new Date().toISOString().slice(0, 10),
    fromLocation: '',
    toLocation: '',
    remarks: '',
    status: 'Draft',
  });

  const [items, setItems] = useState([
    { materialName: '', quantity: '', unit: '', testParameters: '', testStatus: '', remarks: '' }
  ]);

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/vendors').then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {});
    if (editId) {
      fetch(`/api/engineering/site/gtn?id=${editId}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.id) {
            setForm({
              projectId: d.projectId || '',
              supplierId: d.supplierId || '',
              supplierName: d.supplierName || '',
              gtnDate: d.gtnDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              state: d.state || '',
              vehicleNo: d.vehicleNo || '',
              challanNo: d.challanNo || '',
              challanDate: d.challanDate?.slice(0, 10) || '',
              ewayBillNo: d.ewayBillNo || '',
              ewayBillDate: d.ewayBillDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              fromLocation: d.fromLocation || '',
              toLocation: d.toLocation || '',
              remarks: d.remarks || '',
              status: d.status || 'Draft',
            });
            setItems(d.items?.length ? d.items.map(i => ({
              materialName: i.materialName || '',
              quantity: i.quantity || '',
              unit: i.unit || '',
              testParameters: i.testParameters || '',
              testStatus: i.testStatus || '',
              remarks: i.remarks || '',
            })) : [{ materialName: '', quantity: '', unit: '', testParameters: '', testStatus: '', remarks: '' }]);
          }
        }).catch(() => {});
    }
  }, [editId]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateItem = (idx, key, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  const addItem = () => setItems(prev => [...prev, { materialName: '', quantity: '', unit: '', testParameters: '', testStatus: '', remarks: '' }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/engineering/site/gtn', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editId, items })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save GTN');
      setMessage(`GTN ${editId ? 'updated' : 'created'} successfully: ${data.gtnNo || data.gtnSrNo || ''}`);
      setTimeout(() => router.push('/site/material/gtn'), 1500);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PackageCheck size={22} style={{ color: '#0284c7' }} />
              {editId ? 'Edit GTN' : 'Create GTN'}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Goods Testing Note — Material quality testing</p>
          </div>
          <button onClick={() => router.push('/site/material/gtn')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={15} /> Back to GTN List
          </button>
        </div>

        {message && (
          <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 14,
            background: message.includes('success') ? '#dcfce7' : '#fee2e2',
            color: message.includes('success') ? '#166534' : '#991b1b' }}>
            {message}
          </div>
        )}

        <form onSubmit={submit}>
          {/* GTN Details */}
          <section style={{ background: '#fff', padding: 24, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 17, color: '#0f172a', marginBottom: 20 }}>GTN Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <label style={labelStyle}>Project *</label>
                <select value={form.projectId} onChange={e => setField('projectId', e.target.value)} style={inputStyle} required>
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Supplier</label>
                <select value={form.supplierId} onChange={e => {
                  const s = suppliers.find(v => String(v.id) === e.target.value);
                  setForm(f => ({ ...f, supplierId: e.target.value, supplierName: s?.name || '' }));
                }} style={inputStyle}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>GTN Date *</label>
                <input type="date" value={form.gtnDate} onChange={e => setField('gtnDate', e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)} style={inputStyle}>
                  {['Draft','Dispatched','Submitted','Testing','Completed','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Vehicle No</label>
                <input type="text" value={form.vehicleNo} onChange={e => setField('vehicleNo', e.target.value)} style={inputStyle} placeholder="e.g. DL01AB1234" />
              </div>
              <div>
                <label style={labelStyle}>Challan No</label>
                <input type="text" value={form.challanNo} onChange={e => setField('challanNo', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Challan Date</label>
                <input type="date" value={form.challanDate} onChange={e => setField('challanDate', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>E-way Bill No</label>
                <input type="text" value={form.ewayBillNo} onChange={e => setField('ewayBillNo', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>E-way Bill Date</label>
                <input type="date" value={form.ewayBillDate} onChange={e => setField('ewayBillDate', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <select value={form.state} onChange={e => setField('state', e.target.value)} style={inputStyle}>
                  <option value="">Select State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>From Location</label>
                <input type="text" value={form.fromLocation} onChange={e => setField('fromLocation', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>To Location</label>
                <input type="text" value={form.toLocation} onChange={e => setField('toLocation', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Remarks</label>
                <textarea value={form.remarks} onChange={e => setField('remarks', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          </section>

          {/* Test Items */}
          <section style={{ background: '#fff', padding: 24, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>Test Items</h2>
              <button type="button" onClick={addItem}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['#', 'Material Name *', 'Quantity', 'Unit', 'Test Parameters', 'Test Status', 'Remarks', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 13 }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input required value={item.materialName} onChange={e => updateItem(idx, 'materialName', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} placeholder="Material name" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} style={{ ...inputStyle, padding: '8px 10px', width: 90 }} placeholder="Qty" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} style={{ ...inputStyle, padding: '8px 10px', width: 80 }} placeholder="Nos/Kg" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input value={item.testParameters} onChange={e => updateItem(idx, 'testParameters', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} placeholder="e.g. Tensile, Hardness" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <select value={item.testStatus} onChange={e => updateItem(idx, 'testStatus', e.target.value)} style={{ ...inputStyle, padding: '8px 10px', width: 110 }}>
                          <option value="">Pending</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input value={item.remarks} onChange={e => updateItem(idx, 'remarks', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} placeholder="Remarks" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            style={{ padding: '7px', border: '1px solid #fecaca', background: '#fff', color: '#ef4444', borderRadius: 5, cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => router.push('/site/material/gtn')}
              style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', border: 0, background: saving ? '#94a3b8' : '#0284c7', color: '#fff', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
              <Save size={15} /> {saving ? 'Saving...' : editId ? 'Update GTN' : 'Create GTN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateGTNPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <CreateGTNContent />
    </Suspense>
  );
}
