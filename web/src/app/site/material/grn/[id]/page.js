'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Edit2, PackageCheck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const labelStyle = { color: '#64748b', fontSize: 12, fontWeight: 600 };
const valueStyle = { color: '#1e293b', fontSize: 14, fontWeight: 600 };
const cellStyle = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontSize: 13 };

const formatDate = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const formatDateTime = value => value ? new Date(value).toLocaleString('en-IN') : '-';

export default function GRNDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/engineering/site/grn?id=${encodeURIComponent(id)}`)
      .then(response => response.json().then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Failed to load GRN');
        setGrn(Array.isArray(data) ? data[0] : data);
      })
      .catch(loadError => setError(loadError.message));
  }, [id]);

  if (error) return <div style={{ padding: 24, color: '#991b1b' }}>{error}</div>;
  if (!grn) return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading GRN details...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 22 }}><PackageCheck size={22} color="#0284c7" /> {grn.grnNo || 'GRN Details'}</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Goods Receipt Note details and received material quantities</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => router.push(`/site/grn/new?id=${grn.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 0, borderRadius: 6, background: '#0284c7', color: '#fff', cursor: 'pointer', fontSize: 14 }}><Edit2 size={15} /> Edit GRN</button>
            <button type="button" onClick={() => router.push('/site/material/grn')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={15} /> Back to GRN List</button>
          </div>
        </div>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 20 }}>
            {[
              ['Project', grn.project?.name], ['Supplier', grn.supplierName], ['GRN Date', formatDate(grn.grnDate)],
              ['Status', grn.status], ['Receipt Type', grn.grnType === 'PO' ? 'With PO' : 'Without PO'], ['PO No', grn.poNo],
              ['Challan No', grn.challanNo], ['Challan Date', formatDate(grn.challanDate)], ['Vehicle No', grn.vehicleNo],
              ['Gate In', formatDateTime(grn.gateRegistrationIn)], ['Gate Out', formatDateTime(grn.gateRegistrationOut)],
              ['Gate Reference', grn.gateRegistrationRefNo], ['E-way Bill', grn.ewayBillNo], ['GTN', grn.gtn?.gtnNo]
            ].map(([label, value]) => <div key={label}><div style={labelStyle}>{label}</div><div style={{ ...valueStyle, marginTop: 4 }}>{value || '-'}</div></div>)}
          </div>
          {grn.remarks && <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}><div style={labelStyle}>Remarks</div><div style={{ marginTop: 4, color: '#334155', fontSize: 14 }}>{grn.remarks}</div></div>}
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
          <h2 style={{ margin: '0 0 18px', color: '#0f172a', fontSize: 17 }}>Received Materials</h2>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f1f5f9' }}>{['#', 'Material', 'Requisition', 'Challan Qty', 'Received Qty', 'Accepted Qty', 'Retained Qty', 'Rejected Qty', 'Unit', 'Store', 'Brand', 'Testing'].map(header => <th key={header} style={{ ...cellStyle, textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: 12 }}>{header}</th>)}</tr></thead><tbody>{(grn.items || []).map((item, index) => <tr key={item.id || index}><td style={cellStyle}>{index + 1}</td><td style={{ ...cellStyle, fontWeight: 600 }}>{item.materialName}</td><td style={cellStyle}>{item.requisition?.reqNo || '-'}</td><td style={cellStyle}>{item.challanQty || 0}</td><td style={cellStyle}>{item.quantity || 0}</td><td style={cellStyle}>{item.acceptedQty || 0}</td><td style={cellStyle}>{item.retainedQty || 0}</td><td style={cellStyle}>{item.rejectedQty || 0}</td><td style={cellStyle}>{item.unit || '-'}</td><td style={cellStyle}>{item.storeName || '-'}</td><td style={cellStyle}>{item.brand || '-'}</td><td style={cellStyle}>{item.testRequired ? 'Sent to GTN' : 'Not required'}</td></tr>)}</tbody></table></div>
          {!grn.items?.length && <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No material items recorded.</div>}
        </section>
      </div>
    </div>
  );
}
