'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ClipboardCheck, FileCheck2, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

const COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const CHART_COLORS = { Completed: '#10b981', 'In Progress': '#0ea5e9', 'On Hold': '#f59e0b', Pending: '#94a3b8' };
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, minWidth: 0, boxShadow: '0 2px 8px rgba(15,23,42,.04)' };

function ChartCard({ title, children, empty }) {
  return <section style={cardStyle}>
    <h2 style={{ fontSize: 16, margin: '0 0 14px', color: '#0f172a' }}>{title}</h2>
    {empty ? <div style={{ height: 250, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 14 }}>No records for this selection.</div> : children}
  </section>;
}

function StatusPie({ data }) {
  return <ResponsiveContainer width="100%" height={250}>
    <PieChart>
      <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="46%" outerRadius={82} label={({ status, count }) => `${status}: ${count}`}>
        {data.map((entry, index) => <Cell key={`${entry.status}-${index}`} fill={COLORS[index % COLORS.length]} />)}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>;
}

function StatusBars({ data }) {
  return <ResponsiveContainer width="100%" height={250}>
    <BarChart data={data} margin={{ top: 8, right: 12, bottom: 6, left: -16 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} />
      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
      <Tooltip />
      <Bar dataKey="count" name="Records" radius={[5, 5, 0, 0]}>
        {data.map((entry, index) => <Cell key={`${entry.status}-${index}`} fill={CHART_COLORS[entry.status] || COLORS[index % COLORS.length]} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>;
}

export default function SiteDashboard() {
  const [data, setData] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async projectId => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/site/dashboard?projectId=${encodeURIComponent(projectId || 'ALL')}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load dashboard.');
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not load dashboard.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(selectedProjectId); }, [fetchDashboard, selectedProjectId]);

  const workCompletionData = useMemo(() => (data?.workCompletion || []).map(project => ({
    name: project.projectName,
    total: project.total,
    'Completed tasks': project.completed,
    'In progress': project.inProgress,
    'On hold': project.onHold,
    Pending: project.pending,
    completionPercent: project.completionPercent,
  })), [data]);

  const stats = [
    { label: 'Projects', value: data?.totals?.projects || 0, icon: Activity, color: '#2563eb', tint: '#eff6ff' },
    { label: 'DPRs', value: data?.totals?.dprs || 0, icon: FileCheck2, color: '#059669', tint: '#ecfdf5' },
    { label: 'Material requisitions', value: data?.totals?.requisitions || 0, icon: ClipboardCheck, color: '#d97706', tint: '#fffbeb' },
    { label: 'Incomplete GRN / GTN materials', value: (data?.totals?.incompleteGrnMaterials || 0) + (data?.totals?.incompleteGtnMaterials || 0), icon: Truck, color: '#dc2626', tint: '#fef2f2' },
  ];

  return <main style={{ padding: 24, maxWidth: 1500, margin: '0 auto', color: '#0f172a' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 750, margin: 0 }}>Site Dashboard</h1>
        <p style={{ color: '#64748b', margin: '5px 0 0' }}>Project status, DPR, work completion, requisitions and pending material checks</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'end', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 650 }}>
          PROJECT
          <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} style={{ minWidth: 260, padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: 14 }}>
            <option value="ALL">All Projects</option>
            {(data?.projects || []).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => fetchDashboard(selectedProjectId)} disabled={loading} style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 13px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', cursor: loading ? 'wait' : 'pointer' }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
    </div>

    {error && <div role="alert" style={{ padding: 14, marginBottom: 16, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>{error}</div>}
    {loading && !data ? <div style={{ ...cardStyle, color: '#64748b' }}>Loading site dashboard…</div> : data && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 18 }}>
        {stats.map(stat => {
          const Icon = stat.icon;
          return <div key={stat.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 12, background: stat.tint, color: stat.color }}><Icon size={23} /></div>
            <div><div style={{ color: '#64748b', fontSize: 12 }}>{stat.label}</div><div style={{ fontSize: 24, fontWeight: 750, marginTop: 2 }}>{stat.value}</div></div>
          </div>;
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,430px),1fr))', gap: 16 }}>
        <ChartCard title="Project Status" empty={!data.projectStatuses?.length}><StatusPie data={data.projectStatuses || []} /></ChartCard>
        <ChartCard title="DPR Status" empty={!data.dprStatuses?.length}><StatusBars data={data.dprStatuses || []} /></ChartCard>
        <ChartCard title="Work Completion by Project" empty={!workCompletionData.some(project => project.total > 0)}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#64748b', fontSize: 12, marginBottom: 2 }}>Average task completion by project</div>
          <ResponsiveContainer width="100%" height={Math.max(250, workCompletionData.length * 32)}>
            <BarChart data={workCompletionData} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10 }} />
              <Tooltip formatter={value => [`${value}%`, 'Completion']} />
              <Bar dataKey="completionPercent" name="Completion" fill="#10b981" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: '#64748b' }}>Task counts: completed, in progress, on hold, and pending.</div>
        </ChartCard>
        <ChartCard title="Material Requisition Status" empty={!data.requisitionStatuses?.length}><StatusPie data={data.requisitionStatuses || []} /></ChartCard>
        <ChartCard title="Task Status" empty={!data.taskStatuses?.some(row => row.count > 0)}><StatusBars data={data.taskStatuses || []} /></ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,500px),1fr))', gap: 16, marginTop: 16 }}>
        <MaterialTable title="GRN — Materials Not Fully Received" rows={data.grnPending || []} kind="grn" />
        <MaterialTable title="GTN — Materials Not Fully Passed" rows={data.gtnPending || []} kind="gtn" />
      </div>
      {loading && <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Updating dashboard…</div>}
    </>}
  </main>;
}

function MaterialTable({ title, rows, kind }) {
  return <section style={{ ...cardStyle, overflow: 'hidden' }}>
    <h2 style={{ fontSize: 16, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <PackageCheck size={18} color={kind === 'grn' ? '#d97706' : '#7c3aed'} />{title}
    </h2>
    <div style={{ overflowX: 'auto', maxHeight: 390 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 480 }}>
        <thead><tr style={{ position: 'sticky', top: 0, background: '#f1f5f9', textAlign: 'left', color: '#475569' }}>
          {(kind === 'grn' ? ['Project', 'Material', 'Required', 'Accepted', 'Pending'] : ['Project', 'GTN No.', 'Material', 'Quantity', 'Status']).map(label => <th key={label} style={{ padding: 9 }}>{label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.key} style={{ borderTop: '1px solid #e2e8f0' }}>
            <td style={{ padding: 9 }}>{row.projectName}</td>
            {kind === 'grn' ? <>
              <td style={{ padding: 9 }}>{row.material}</td><td style={{ padding: 9 }}>{row.required} {row.unit}</td><td style={{ padding: 9 }}>{row.accepted} {row.unit}</td><td style={{ padding: 9, fontWeight: 700, color: '#b45309' }}>{row.pending} {row.unit}</td>
            </> : <>
              <td style={{ padding: 9 }}>{row.gtnNo}</td><td style={{ padding: 9 }}>{row.material}</td><td style={{ padding: 9 }}>{row.quantity}</td><td style={{ padding: 9, fontWeight: 650, color: String(row.status).toLowerCase().includes('fail') || String(row.status).toLowerCase().includes('reject') ? '#b91c1c' : '#b45309' }}>{row.status}</td>
            </>}
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>All recorded materials are fully received / passed.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
