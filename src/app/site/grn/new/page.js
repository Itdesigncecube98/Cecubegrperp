'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, PackageCheck, Plus, Save, Trash2 } from 'lucide-react';

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontSize: 14
};
const labelStyle = { display: 'block', marginBottom: 6, color: '#334155', fontSize: 13, fontWeight: 700 };
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];
const emptyItem = () => ({
  requisitionId: '', materialName: '', quantity: '', unit: '', acceptedQty: '', retainedQty: '', rejectedQty: '',
  challanQty: '', storeName: '', brand: '', testRequired: false, remarks: ''
});

function CreateGRNForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const requisitionId = searchParams.get('requisitionId');
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [poLoading, setPoLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    projectId: '', supplierId: '', supplierName: '', grnDate: new Date().toISOString().slice(0, 10),
    grnType: 'WITHOUT_PO', poNo: '', vehicleNo: '', challanNo: '', challanDate: '',
    gateRegistrationDate: '', gateRegistrationIn: '', gateRegistrationOut: '', gateRegistrationRefNo: '',
    state: '', ewayBillNo: '', ewayBillDate: '', status: 'Draft', remarks: ''
  });
  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    fetch('/api/engineering/projects').then(response => response.json()).then(data => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
    fetch('/api/purchase/vendors?_t=' + Date.now(), { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error('Failed to load suppliers');
      return response.json();
    }).then(data => setSuppliers(Array.isArray(data) ? data : [])).catch(error => {
      console.error('Failed to load suppliers:', error);
      setSuppliers([]);
    });
    fetch('/api/engineering/requisitions').then(response => response.json()).then(data => {
      const available = Array.isArray(data) ? data.filter(item => item.status !== 'Issued') : [];
      setRequisitions(previous => {
        const merged = new Map(previous.map(item => [String(item.id), item]));
        available.forEach(item => merged.set(String(item.id), item));
        return Array.from(merged.values());
      });
      const requisition = available.find(item => item.id === requisitionId);
      if (requisition) {
        setForm(previous => ({ ...previous, projectId: requisition.projectId || previous.projectId }));
        setItems([{ ...emptyItem(), requisitionId: requisition.id, materialName: requisition.materialName || requisition.itemDescription || '', quantity: requisition.quantityReq || '', acceptedQty: requisition.quantityReq || '', unit: requisition.unit || '' }]);
      }
    }).catch(() => {});
    if (!editId) return;
    fetch(`/api/engineering/site/grn?id=${encodeURIComponent(editId)}`)
      .then(response => response.json())
      .then(data => {
        const grn = Array.isArray(data) ? data[0] : data;
        if (!grn?.id) return;
        const linkedRequisitions = (grn.items || []).map(item => item.requisition).filter(Boolean);
        if (linkedRequisitions.length) {
          setRequisitions(previous => {
            const merged = new Map(previous.map(item => [String(item.id), item]));
            linkedRequisitions.forEach(item => merged.set(String(item.id), item));
            return Array.from(merged.values());
          });
        }
        setForm({
          projectId: grn.projectId || '', supplierId: grn.supplierId || '', supplierName: grn.supplierName || '',
          grnDate: grn.grnDate?.slice(0, 10) || '', grnType: grn.grnType || 'WITHOUT_PO', poNo: grn.poNo || '',
          vehicleNo: grn.vehicleNo || '', challanNo: grn.challanNo || '', challanDate: grn.challanDate?.slice(0, 10) || '',
          gateRegistrationDate: grn.gateRegistrationDate?.slice(0, 10) || '', gateRegistrationIn: grn.gateRegistrationIn?.slice(0, 16) || '',
          gateRegistrationOut: grn.gateRegistrationOut?.slice(0, 16) || '', gateRegistrationRefNo: grn.gateRegistrationRefNo || '',
          state: grn.state || '', ewayBillNo: grn.ewayBillNo || '', ewayBillDate: grn.ewayBillDate?.slice(0, 10) || '',
          status: grn.status || 'Draft', remarks: grn.remarks || ''
        });
        setItems(grn.items?.length ? grn.items.map(item => ({ ...emptyItem(), ...item, requisitionId: item.requisitionId ? String(item.requisitionId) : '' })) : [emptyItem()]);
      }).catch(() => {});
  }, [editId, requisitionId]);

  const setField = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const normalizeMaterial = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const loadPurchaseOrder = async poNumber => {
    const number = String(poNumber || '').trim();
    if (!number) return;
    setPoLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/purchase/po?_t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to fetch purchase orders');
      const purchaseOrders = await response.json();
      const purchaseOrder = (Array.isArray(purchaseOrders) ? purchaseOrders : []).find(po =>
        String(po.poNumber || '').trim().toLowerCase() === number.toLowerCase()
      );
      if (!purchaseOrder) throw new Error(`PO ${number} was not found.`);

      const project = projects.find(item =>
        item.id === purchaseOrder.projectId || item.name?.toLowerCase() === purchaseOrder.projectName?.toLowerCase()
      );
      const supplier = suppliers.find(item => item.id === purchaseOrder.supplierId);
      const matchedItems = (purchaseOrder.items || []).map(poItem => {
        const key = normalizeMaterial(poItem.description);
        const requisition = requisitions.find(item => normalizeMaterial(item.materialName || item.itemDescription) === key && (!project || item.projectId === project.id));
        const quantity = Number(poItem.quantity) || 0;
        return {
          ...emptyItem(),
          requisitionId: requisition?.id || '',
          materialName: poItem.description || '',
          quantity,
          acceptedQty: quantity,
          unit: poItem.unit || '',
          brand: poItem.specifications || '',
          poItemId: poItem.id
        };
      });
      setForm(previous => ({
        ...previous,
        projectId: project?.id || purchaseOrder.projectId || previous.projectId,
        supplierId: supplier?.id || purchaseOrder.supplierId || previous.supplierId,
        supplierName: supplier?.name || purchaseOrder.supplierName || '',
        grnType: 'PO',
        poNo: purchaseOrder.poNumber
      }));
      setItems(matchedItems.length ? matchedItems : [emptyItem()]);
    } catch (error) {
      setMessage(error.message || 'Failed to fetch PO details');
      setItems([emptyItem()]);
    } finally {
      setPoLoading(false);
    }
  };
  const updateItem = (index, key, value) => setItems(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/engineering/site-material/grn', {
        method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editId, items: items.map(item => ({ ...item, goodQty: item.acceptedQty, sendToGtn: item.testRequired === true })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save GRN');
      setMessage(`GRN ${editId ? 'updated' : 'created'} successfully: ${data.grn?.grnNo || data.grnNo || ''}`);
      setTimeout(() => router.push('/site/material/grn'), 1200);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}><PackageCheck size={22} style={{ color: '#0284c7' }} />Create GRN</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Goods Receipt Note - Record material received at site</p>
          </div>
          <button type="button" onClick={() => router.push('/site/material/grn')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={15} /> Back to GRN List</button>
        </div>
        {message && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 14, background: message.includes('successfully') ? '#dcfce7' : '#fee2e2', color: message.includes('successfully') ? '#166534' : '#991b1b' }}>{message}</div>}
        <form onSubmit={submit}>
          <section style={{ background: '#fff', padding: 24, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: 17, color: '#0f172a', marginBottom: 20 }}>GRN Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div><label style={labelStyle}>Engineering Project *</label><select value={form.projectId} onChange={event => setField('projectId', event.target.value)} style={inputStyle} required><option value="">Select Project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
              <div><label style={labelStyle}>Supplier</label><select value={form.supplierId} onChange={event => { const supplier = suppliers.find(item => String(item.id) === event.target.value); setForm(previous => ({ ...previous, supplierId: event.target.value, supplierName: supplier?.name || '' })); }} style={inputStyle}><option value="">Select Supplier</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
              <div><label style={labelStyle}>GRN Date *</label><input type="date" value={form.grnDate} onChange={event => setField('grnDate', event.target.value)} style={inputStyle} required /></div>
              <div><label style={labelStyle}>Receipt Type</label><select value={form.grnType} onChange={event => setField('grnType', event.target.value)} style={inputStyle}><option value="WITHOUT_PO">Without PO</option><option value="PO">With PO</option></select></div>
              <div><label style={labelStyle}>Status</label><select value={form.status} onChange={event => setField('status', event.target.value)} style={inputStyle}>{['Draft', 'Received', 'Accepted', 'Rejected'].map(status => <option key={status} value={status}>{status}</option>)}</select></div>
              <div><label style={labelStyle}>PO No</label><input value={form.poNo} onChange={event => setField('poNo', event.target.value)} onBlur={event => loadPurchaseOrder(event.target.value)} placeholder={poLoading ? 'Fetching PO...' : 'Enter PO number'} style={inputStyle} /></div>
              <div><label style={labelStyle}>Vehicle No</label><input value={form.vehicleNo} onChange={event => setField('vehicleNo', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Challan No</label><input value={form.challanNo} onChange={event => setField('challanNo', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Challan Date</label><input type="date" value={form.challanDate} onChange={event => setField('challanDate', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Gate Registration Date</label><input type="date" value={form.gateRegistrationDate} onChange={event => setField('gateRegistrationDate', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Gate In</label><input type="datetime-local" value={form.gateRegistrationIn} onChange={event => setField('gateRegistrationIn', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Gate Out</label><input type="datetime-local" value={form.gateRegistrationOut} onChange={event => setField('gateRegistrationOut', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Gate Reference No</label><input value={form.gateRegistrationRefNo} onChange={event => setField('gateRegistrationRefNo', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>State</label><select value={form.state} onChange={event => setField('state', event.target.value)} style={inputStyle}><option value="">Select State</option>{STATES.map(state => <option key={state} value={state}>{state}</option>)}</select></div>
              <div><label style={labelStyle}>E-way Bill No</label><input value={form.ewayBillNo} onChange={event => setField('ewayBillNo', event.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>E-way Bill Date</label><input type="date" value={form.ewayBillDate} onChange={event => setField('ewayBillDate', event.target.value)} style={inputStyle} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Remarks</label><textarea value={form.remarks} onChange={event => setField('remarks', event.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            </div>
          </section>
          <section style={{ background: '#fff', padding: 24, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h2 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>Received Materials</h2><button type="button" onClick={() => setItems(previous => [...previous, emptyItem()])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}><Plus size={14} /> Add Item</button></div>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1450, borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f1f5f9' }}>{['#', 'Requisition *', 'Material *', 'Challan Qty', 'Received Qty', 'Accepted Qty', 'Retained Qty', 'Rejected Qty', 'Unit', 'Store', 'Brand', 'Send to GTN', 'Remarks', ''].map(header => <th key={header} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{header}</th>)}</tr></thead><tbody>{items.map((item, index) => <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px', color: '#64748b', fontSize: 13 }}>{index + 1}</td><td style={{ padding: '6px 4px' }}><select required value={item.requisitionId} onChange={event => { const requisition = requisitions.find(entry => entry.id === event.target.value); updateItem(index, 'requisitionId', event.target.value); if (requisition) setItems(previous => previous.map((entry, itemIndex) => itemIndex === index ? { ...entry, requisitionId: requisition.id, materialName: requisition.materialName || requisition.itemDescription || '', quantity: requisition.quantityReq || '', acceptedQty: requisition.quantityReq || '', unit: requisition.unit || '' } : entry)); }} style={{ ...inputStyle, padding: '8px 7px', minWidth: 220 }}><option value="">Select requisition</option>{requisitions.map(requisition => <option key={requisition.id} value={requisition.id}>{requisition.reqNo} - {requisition.materialName || requisition.itemDescription}</option>)}</select></td>{[['materialName', 'Material name', 'text'], ['challanQty', 'Qty', 'number'], ['quantity', 'Qty', 'number'], ['acceptedQty', 'Qty', 'number'], ['retainedQty', 'Qty', 'number'], ['rejectedQty', 'Qty', 'number'], ['unit', 'Unit', 'text'], ['storeName', 'Store', 'text'], ['brand', 'Brand', 'text']].map(([key, placeholder, type]) => <td key={key} style={{ padding: '6px 4px' }}><input required={key === 'materialName'} type={type} value={item[key] || ''} onChange={event => updateItem(index, key, event.target.value)} placeholder={placeholder} style={{ ...inputStyle, padding: '8px 7px', minWidth: key === 'materialName' ? 150 : 80 }} /></td>)}<td style={{ padding: '6px 4px', textAlign: 'center' }}><input type="checkbox" checked={Boolean(item.testRequired)} onChange={event => updateItem(index, 'testRequired', event.target.checked)} /></td><td style={{ padding: '6px 4px' }}><input value={item.remarks || ''} onChange={event => updateItem(index, 'remarks', event.target.value)} placeholder="Remarks" style={{ ...inputStyle, padding: '8px 7px', minWidth: 120 }} /></td><td style={{ padding: '6px 4px' }}>{items.length > 1 && <button type="button" onClick={() => setItems(previous => previous.filter((_, itemIndex) => itemIndex !== index))} style={{ padding: 7, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', borderRadius: 5, cursor: 'pointer' }}><Trash2 size={14} /></button>}</td></tr>)}</tbody></table></div>
          </section>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => router.push('/site/material/grn')} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button><button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', border: 0, background: saving ? '#94a3b8' : '#0284c7', color: '#fff', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}><Save size={15} />{saving ? 'Saving...' : 'Create GRN'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function CreateGRNPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc' }} />}>
      <CreateGRNForm />
    </Suspense>
  );
}
