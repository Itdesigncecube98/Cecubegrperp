'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Edit2, PackageCheck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const labelStyle = { color: '#64748b', fontSize: 12, fontWeight: 600 };
const valueStyle = { color: '#1e293b', fontSize: 14, fontWeight: 600 };
const cellStyle = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#334155', fontSize: 13 };
const formatDate = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';

export default function GTNDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [gtn, setGtn] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/engineering/site/gtn/${encodeURIComponent(id)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load GTN');
        return data;
      })
      .then(setGtn)
      .catch(loadError => setError(loadError.message || 'Failed to load GTN'));
  }, [id]);

  if (error) return <div style={{ padding: 24, color: '#991b1b' }}>{error}</div>;
  if (!gtn) return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading GTN details...</div>;

  const details = [
    ['Project', gtn.project?.name], ['GTN No', gtn.gtnSrNo || gtn.gtnNo], ['PO No', gtn.purchaseOrderNo], ['Supplier', gtn.supplierName],
    ['GTN Date', formatDate(gtn.gtnDate)], ['Status', gtn.status], ['Vehicle No', gtn.vehicleNo],
    ['Challan No', gtn.challanNo], ['Challan Date', formatDate(gtn.challanDate)],
    ['E-way Bill No', gtn.ewayBillNo], ['From Location', gtn.fromLocation], ['To Location', gtn.toLocation],
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 22 }}><PackageCheck size={22} color="#0284c7" /> GTN Details</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{gtn.gtnSrNo || gtn.gtnNo}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => router.push(`/site/gtn/new?id=${encodeURIComponent(gtn.id)}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 0, borderRadius: 6, background: '#0284c7', color: '#fff', cursor: 'pointer' }}><Edit2 size={15} /> Edit GTN</button>
            <button type="button" onClick={() => router.push('/site/material/gtn')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}><ArrowLeft size={15} /> Back to GTN List</button>
          </div>
        </div>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {details.map(([label, value]) => <div key={label}><div style={labelStyle}>{label}</div><div style={{ ...valueStyle, marginTop: 4 }}>{value || '-'}</div></div>)}
          </div>
          {gtn.remarks && <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}><div style={labelStyle}>Remarks</div><div style={{ marginTop: 4, color: '#334155', fontSize: 14, whiteSpace: 'pre-wrap' }}>{gtn.remarks}</div></div>}
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
          <h2 style={{ margin: '0 0 18px', color: '#0f172a', fontSize: 17 }}>Test Items</h2>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f1f5f9' }}>{['#', 'Material', 'Quantity', 'Unit', 'Test', 'Result', 'Status', 'Remarks'].map(label => <th key={label} style={{ ...cellStyle, color: '#475569', fontWeight: 700 }}>{label}</th>)}</tr></thead><tbody>{(gtn.items || []).map((item, index) => <tr key={item.id}><td style={cellStyle}>{index + 1}</td><td style={cellStyle}>{item.materialName}</td><td style={cellStyle}>{item.quantity ?? '-'}</td><td style={cellStyle}>{item.unit || '-'}</td><td style={cellStyle}>{item.testName || item.testDescription || '-'}</td><td style={cellStyle}>{item.testResult || '-'}</td><td style={cellStyle}>{item.testStatus || 'Pending'}</td><td style={cellStyle}>{item.testRemark || '-'}</td></tr>)}</tbody></table></div>
          {!gtn.items?.length && <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No test items recorded.</div>}
        </section>
      </div>
    </div>
  );
}