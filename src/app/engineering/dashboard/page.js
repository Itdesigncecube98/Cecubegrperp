'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BarChart3, Building2, IndianRupee, Layers3, PackageCheck, RefreshCw, Search } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const EMPTY = {
  projects: [], totals: {}, budgetByHead: [], monthlyMovement: [], estimateVersions: [],
  consumptionHistory: [], wbsGroups: [], materialPerArea: [], materialRequisitions: [], projectSummary: [],
};

const COLORS = ['#369bb2', '#7776e8', '#df567f', '#38a3f1', '#e9aa3b', '#15a579', '#9b66cf'];
const amount = value => Number(value || 0);
const lakhs = value => Number((amount(value) / 100000).toFixed(2));
const money = value => `₹${amount(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const lakhsLabel = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
const monthLabel = value => value ? new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="eng-dash-panel">
      <header className="eng-dash-panel-head">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ children = 'No records found for this selection.' }) {
  return <div className="eng-dash-empty">{children}</div>;
}

function DataTable({ columns, rows, emptyText }) {
  if (!rows?.length) return <Empty>{emptyText}</Empty>;
  return (
    <div className="eng-dash-table-wrap">
      <table className="eng-dash-table">
        <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={row.id || `${row.name || row.month || row.version || 'row'}-${index}`}>
            {columns.map(column => <td key={column.key}>{column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—')}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ChartFrame({ data, children, emptyText }) {
  if (!data?.length) return <Empty>{emptyText}</Empty>;
  return <div className="eng-dash-chart"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

export default function EngineeringDashboard() {
  const [data, setData] = useState(EMPTY);
  const [projectId, setProjectId] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ projectId: 'ALL', fromDate: '', toDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams(applied);
    setLoading(true);
    fetch(`/api/engineering/dashboard?${params.toString()}`, { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load engineering dashboard.');
        return result;
      })
      .then(result => { if (live) { setData(result); setError(''); } })
      .catch(loadError => { if (live) setError(loadError.message || 'Could not load engineering dashboard.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [applied]);

  const budgetChart = useMemo(() => (data.budgetByHead || []).slice(0, 12).map(item => ({
    ...item, approvedL: lakhs(item.approved), estimatedL: lakhs(item.estimated), actualL: lakhs(item.actual),
  })), [data.budgetByHead]);
  const monthlyChart = useMemo(() => (data.monthlyMovement || []).map(item => ({
    ...item, monthName: monthLabel(item.month), allocatedL: lakhs(item.allocated), estimateL: lakhs(item.estimated), expendedL: lakhs(item.expended),
  })), [data.monthlyMovement]);
  const estimateChart = useMemo(() => (data.estimateVersions || []).map(item => ({
    ...item, estimatedL: lakhs(item.estimatedCost), label: item.version,
  })), [data.estimateVersions]);
  const consumptionChart = useMemo(() => (data.consumptionHistory || []).map(item => ({
    ...item, monthName: monthLabel(item.month), allocatedL: lakhs(item.allocated), releasedL: lakhs(item.released), consumedL: lakhs(item.consumed),
  })), [data.consumptionHistory]);
  const wbsChart = useMemo(() => (data.wbsGroups || []).slice(0, 15).map(item => ({ ...item, estimateL: lakhs(item.estimatedCost) })), [data.wbsGroups]);
  const totalBudget = amount(data.totals?.approved);

  const search = event => {
    event.preventDefault();
    setApplied({ projectId, fromDate, toDate });
  };

  return (
    <main className="engineering-analytics-dashboard">
      <style>{`
        .engineering-analytics-dashboard { --eng-blue:#228fa7; --eng-blue-dark:#315b9a; --eng-ink:#263548; --eng-muted:#748196; --eng-border:#dfe5eb; color:var(--eng-ink); max-width:1700px; margin:0 auto; padding:22px 24px 36px; }
        .eng-dash-titlebar { display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap; margin-bottom:18px; }
        .eng-dash-title { display:flex; align-items:center; gap:10px; }
        .eng-dash-title h1 { margin:0; font-size:25px; letter-spacing:-.35px; }
        .eng-dash-title p { margin:5px 0 0; color:var(--eng-muted); font-size:13px; }
        .eng-dash-filters { display:flex; align-items:end; flex-wrap:wrap; gap:9px; }
        .eng-dash-field { display:grid; gap:4px; font-size:11px; font-weight:700; color:#64748b; }
        .eng-dash-field select,.eng-dash-field input { height:39px; border:1px solid #cbd5df; border-radius:7px; padding:0 10px; color:#334155; background:#fff; min-width:145px; }
        .eng-dash-field select { min-width:230px; }
        .eng-dash-search { height:39px; display:inline-flex; align-items:center; gap:7px; border:0; border-radius:7px; background:#168eae; color:#fff; font-weight:700; padding:0 15px; cursor:pointer; }
        .eng-dash-search:hover { background:#0f7896; }
        .eng-dash-kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
        .eng-dash-kpi { display:flex; gap:12px; align-items:center; min-width:0; background:#fff; border:1px solid var(--eng-border); border-radius:9px; padding:15px; box-shadow:0 1px 3px #12263a0b; }
        .eng-dash-kpi-icon { width:39px; height:39px; border-radius:9px; display:grid; place-items:center; flex:none; background:#e8f6fa; color:#168eae; }
        .eng-dash-kpi-label { color:#66778c; font-size:11px; font-weight:750; text-transform:uppercase; letter-spacing:.4px; }
        .eng-dash-kpi-value { margin-top:4px; font-size:20px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .eng-dash-panel { background:#fff; border:1px solid var(--eng-border); border-radius:9px; overflow:hidden; min-width:0; box-shadow:0 1px 3px #12263a0b; }
        .eng-dash-panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 15px; background:#eaf7fb; border-bottom:1px solid #c9e0e9; min-height:51px; }
        .eng-dash-panel-head h2 { margin:0; color:#315b9a; font-size:15px; font-weight:750; }
        .eng-dash-panel-head p { margin:4px 0 0; color:#728198; font-size:11px; }
        .eng-dash-panel-body { padding:12px 14px; }
        .eng-dash-row { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(340px,1fr); gap:15px; margin-bottom:15px; }
        .eng-dash-dual { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; margin-bottom:15px; }
        .eng-dash-chart { height:300px; padding:10px 8px 0; }
        .eng-dash-chart.tall { height:350px; }
        .eng-dash-empty { min-height:100px; display:grid; place-items:center; text-align:center; padding:18px; color:#8793a3; font-size:13px; }
        .eng-dash-table-wrap { overflow:auto; max-height:420px; }
        .eng-dash-table { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
        .eng-dash-table th { position:sticky; top:0; z-index:1; background:#f2f4f6; color:#687588; font-size:10px; text-align:left; letter-spacing:.35px; text-transform:uppercase; }
        .eng-dash-table th,.eng-dash-table td { padding:10px 11px; border-bottom:1px solid #e9edf1; }
        .eng-dash-table tbody tr:hover { background:#f7fbfc; }
        .eng-dash-num { text-align:right; font-variant-numeric:tabular-nums; }
        .eng-dash-progress { min-width:100px; }
        .eng-dash-progress-track { height:6px; background:#e7edf1; border-radius:99px; overflow:hidden; margin-top:5px; }
        .eng-dash-progress-track span { display:block; height:100%; background:#24b98a; border-radius:99px; }
        .eng-dash-alert { display:flex; gap:9px; align-items:center; padding:12px 14px; margin-bottom:14px; border:1px solid #fecaca; border-radius:8px; color:#991b1b; background:#fff5f5; font-size:13px; }
        .eng-dash-loading { padding:28px; text-align:center; color:#708095; }
        .eng-dash-footer { display:flex; justify-content:flex-end; padding-top:12px; }
        .eng-dash-footer a { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:7px; color:#246b9d; background:#eef6fb; text-decoration:none; font-weight:650; font-size:12px; }
        @media(max-width:1050px) { .eng-dash-row { grid-template-columns:1fr; } }
        @media(max-width:760px) { .engineering-analytics-dashboard { padding:16px 12px 28px; } .eng-dash-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } .eng-dash-dual { grid-template-columns:1fr; } .eng-dash-title h1 { font-size:21px; } }
        @media(max-width:460px) { .eng-dash-kpis { grid-template-columns:1fr; } .eng-dash-field select,.eng-dash-field input { min-width:120px; } }
      `}</style>

      <div className="eng-dash-titlebar">
        <div className="eng-dash-title">
          <BarChart3 size={24} color="#315b9a" />
          <div><h1>Project Management Dashboard</h1><p>Project budgets, estimates, WBS costs, and material requirements</p></div>
        </div>
        <form className="eng-dash-filters" onSubmit={search}>
          <label className="eng-dash-field">PROJECT
            <select value={projectId} onChange={event => setProjectId(event.target.value)}>
              <option value="ALL">All accessible projects</option>
              {data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="eng-dash-field">FROM<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label>
          <label className="eng-dash-field">TO<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label>
          <button className="eng-dash-search" type="submit"><Search size={16} /> Search</button>
        </form>
      </div>

      {error && <div className="eng-dash-alert" role="alert"><AlertCircle size={17} />{error}</div>}
      {loading && <div className="eng-dash-loading"><RefreshCw size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />Loading project data…</div>}

      {!loading && !error && <>
        <div className="eng-dash-kpis">
          <Kpi icon={<IndianRupee size={20} />} label="Approved budget" value={money(data.totals?.approved)} />
          <Kpi icon={<BarChart3 size={20} />} label="Estimated cost" value={money(data.totals?.estimated)} />
          <Kpi icon={<Layers3 size={20} />} label="Allocated / expended" value={`${money(data.totals?.allocated)} / ${money(data.totals?.expended)}`} />
          <Kpi icon={<PackageCheck size={20} />} label="Material requested / approved" value={`${amount(data.totals?.materialRequired).toLocaleString('en-IN')} / ${amount(data.totals?.materialApproved).toLocaleString('en-IN')}`} />
        </div>

        {data.projects.length === 0 ? <Panel title="Engineering projects"><Empty>No projects are available for your account.</Empty></Panel> : <>
          <div className="eng-dash-row">
            <Panel title="Budget vs Estimate vs Actual" subtitle="WBS budget totals grouped by budget head (₹ lakh)">
              <ChartFrame data={budgetChart} emptyText="No WBS budget heads have been entered for this project.">
                <BarChart data={budgetChart} margin={{ top: 12, right: 15, left: 5, bottom: 45 }}>
                  <CartesianGrid stroke="#e4eaf0" vertical={false} />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={62} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={value => [lakhsLabel(value), '']} />
                  <Legend />
                  <Bar dataKey="approvedL" name="Budget" fill="#7776e8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="estimatedL" name="Estimated" fill="#9b9bec" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actualL" name="Actual" fill="#cc3c62" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartFrame>
            </Panel>
            <Panel title="Budget Head wise" subtitle="Approved, estimated, and expended totals">
              <DataTable rows={data.budgetByHead} emptyText="No WBS budget entries found." columns={[
                { key: 'name', label: 'Head name' },
                { key: 'approved', label: 'Budgeted cost', render: value => <span className="eng-dash-num">{money(value)}</span> },
                { key: 'estimated', label: 'Estimated cost', render: value => money(value) },
                { key: 'actual', label: 'Actual cost', render: value => money(value) },
              ]} />
              <div className="eng-dash-panel-body" style={{ borderTop: '1px solid #e9edf1', color: '#6c7b8e', fontSize: 11 }}>
                Budget utilization: <b style={{ color: '#334155' }}>{totalBudget > 0 ? `${Math.min(100, amount(data.totals?.expended) / totalBudget * 100).toFixed(1)}%` : '—'}</b>
              </div>
            </Panel>
          </div>

          <div className="eng-dash-dual">
            <Panel title="Monthly Budget Movement" subtitle="Changes recorded in WBS budget history during the selected date range">
              <ChartFrame data={monthlyChart} emptyText="No budget change history was recorded in this date range.">
                <ComposedChart data={monthlyChart} margin={{ top: 12, right: 12, left: 2, bottom: 4 }}>
                  <CartesianGrid stroke="#e4eaf0" vertical={false} /><XAxis dataKey="monthName" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={value => [lakhsLabel(value), '']} /><Legend />
                  <Bar dataKey="allocatedL" name="Allocated change" fill="#4e83d5" />
                  <Bar dataKey="estimateL" name="Estimate change" fill="#a49be8" />
                  <Line dataKey="expendedL" name="Expended change" stroke="#d94f76" strokeWidth={2} />
                </ComposedChart>
              </ChartFrame>
            </Panel>
            <Panel title="Version wise Estimated Cost" subtitle="Estimate revisions reconstructed from saved WBS history">
              <ChartFrame data={estimateChart} emptyText="No estimate revision history is available yet.">
                <LineChart data={estimateChart} margin={{ top: 14, right: 18, left: 5, bottom: 12 }}>
                  <CartesianGrid stroke="#e4eaf0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={value => [lakhsLabel(value), 'Estimated cost']} labelFormatter={(label, rows) => rows?.[0]?.payload?.date ? `${label} · ${dateLabel(rows[0].payload.date)}` : label} />
                  <Line dataKey="estimatedL" name="Estimated cost" stroke="#2fa6bb" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ChartFrame>
              <DataTable rows={data.estimateVersions} emptyText="No revisions found." columns={[
                { key: 'version', label: 'Version' }, { key: 'date', label: 'Date', render: value => dateLabel(value) },
                { key: 'estimatedCost', label: 'Estimated cost', render: value => money(value) },
              ]} />
            </Panel>
          </div>

          <div className="eng-dash-dual">
            <Panel title="Budget vs Consumption" subtitle="Recorded allocation and expenditure changes by month">
              <ChartFrame data={consumptionChart} emptyText="No monthly allocation or expenditure revisions are available.">
                <ComposedChart data={consumptionChart} margin={{ top: 12, right: 12, left: 2, bottom: 4 }}>
                  <CartesianGrid stroke="#e4eaf0" vertical={false} /><XAxis dataKey="monthName" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={value => [lakhsLabel(value), '']} /><Legend />
                  <Bar dataKey="allocatedL" name="Allocated" fill="#8274d9" />
                  <Bar dataKey="releasedL" name="Released" fill="#5bb7c7" />
                  <Line dataKey="consumedL" name="Expended" stroke="#dc5a83" strokeWidth={3} />
                </ComposedChart>
              </ChartFrame>
              <DataTable rows={consumptionChart} emptyText="No consumption history found." columns={[
                { key: 'monthName', label: 'Month' }, { key: 'allocated', label: 'Allocated', render: value => money(value) },
                { key: 'released', label: 'Released', render: value => money(value) }, { key: 'consumed', label: 'Expended', render: value => money(value) },
              ]} />
            </Panel>
            <Panel title="WBS Group wise Estimated Cost" subtitle="Material and labour estimates from project WBS quantities">
              <ChartFrame data={wbsChart} emptyText="No WBS groups or cost estimates found.">
                <BarChart data={wbsChart} layout="vertical" margin={{ top: 8, right: 18, left: 15, bottom: 2 }}>
                  <CartesianGrid stroke="#e4eaf0" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={value => [lakhsLabel(value), 'Estimated cost']} /><Bar dataKey="estimateL" name="Estimated cost" fill="#6e79d7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartFrame>
              <DataTable rows={data.wbsGroups} emptyText="No WBS group records." columns={[
                { key: 'name', label: 'WBS group' }, { key: 'taskCount', label: 'Tasks' },
                { key: 'material', label: 'Material estimate', render: value => money(value) },
                { key: 'labour', label: 'Labour estimate', render: value => money(value) },
                { key: 'estimatedCost', label: 'Total estimate', render: value => money(value) },
              ]} />
            </Panel>
          </div>

          <div className="eng-dash-dual">
            <Panel title="Material Estimated Quantity per Sq. Ft." subtitle="WBS material volume divided by the project built-up area">
              <DataTable rows={data.materialPerArea} emptyText="Material volume or built-up area is not entered for this project." columns={[
                { key: 'name', label: 'Material category / WBS group' },
                { key: 'quantity', label: 'Material volume', render: value => amount(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
                { key: 'area', label: 'Built-up area (sq. ft.)', render: value => amount(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
                { key: 'quantityPerSqFt', label: 'Qty / sq. ft.', render: value => value == null ? 'Area missing' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 4 }) },
              ]} />
            </Panel>
            <Panel title="Top Material Requisitions" subtitle="Requested quantity compared with approved quantity (top 20 materials)">
              <DataTable rows={data.materialRequisitions} emptyText="No material requisitions were found in the selected date range." columns={[
                { key: 'name', label: 'Material' }, { key: 'unit', label: 'Unit' },
                { key: 'requested', label: 'Requested', render: value => amount(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
                { key: 'approved', label: 'Approved', render: value => amount(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
                { key: 'requests', label: 'Requests' },
              ]} />
            </Panel>
          </div>

          <Panel title="Project Portfolio" subtitle="Approved WBS budget, current estimate, expenditure, and available task count">
            <DataTable rows={data.projectSummary} emptyText="No accessible project records found." columns={[
              { key: 'name', label: 'Project', render: (value, row) => <><b>{value}</b><div style={{ color: '#7b8797', fontSize: 10 }}>{[row.company, row.location].filter(Boolean).join(' · ')}</div></> },
              { key: 'status', label: 'Status' }, { key: 'approved', label: 'Approved budget', render: value => money(value) },
              { key: 'estimated', label: 'Estimate', render: value => money(value) }, { key: 'expended', label: 'Expended', render: value => money(value) },
              { key: 'progressPct', label: 'Budget consumed', render: value => value == null ? '—' : <div className="eng-dash-progress">{value}%<div className="eng-dash-progress-track"><span style={{ width: `${value}%` }} /></div></div> },
              { key: 'taskCount', label: 'WBS tasks' },
            ]} />
            <div className="eng-dash-footer"><Link href="/engineering/projects/wbs-budget"><Layers3 size={14} /> Open WBS Budget</Link></div>
          </Panel>
        </>}
      </>}
    </main>
  );
}

function Kpi({ icon, label, value }) {
  return <div className="eng-dash-kpi"><div className="eng-dash-kpi-icon">{icon}</div><div style={{ minWidth: 0 }}><div className="eng-dash-kpi-label">{label}</div><div className="eng-dash-kpi-value">{value}</div></div></div>;
}
