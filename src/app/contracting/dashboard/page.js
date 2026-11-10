'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Building2, CalendarDays, FileText, RefreshCw, Search, Users } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const EMPTY = {
  projects: [], contractors: { total: 0, active: 0, inactive: 0, onTrial: 0 },
  statisticCounts: [], workOrderStats: { total: 0, open: 0, cancelled: 0, foreclosed: 0, completed: 0 },
  topContractors: [], labourCategories: [], contractorSummary: [], performance: [], totals: {},
};
const COLORS = ['#7c8790', '#26afbd', '#36b99f', '#ed6849', '#f4b33f'];
const number = value => Number(value || 0);
const inLacs = value => Number((number(value) / 100000).toFixed(2));
const lacsText = value => `₹${number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
const money = value => `₹${number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const monthText = month => month ? new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function Card({ title, subtitle, children, className = '' }) {
  return <section className={`contract-dash-card ${className}`}>
    <header className="contract-dash-card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></header>
    {children}
  </section>;
}

function Empty({ children = 'No records found for this project and date range.' }) {
  return <div className="contract-dash-empty">{children}</div>;
}

function Table({ columns, rows }) {
  if (!rows?.length) return <Empty />;
  return <div className="contract-dash-table-scroll"><table className="contract-dash-table">
    <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id || `${row.name || row.month}-${index}`}>
      {columns.map(column => <td key={column.key}>{column.render ? column.render(row[column.key], row) : row[column.key] ?? '—'}</td>)}
    </tr>)}</tbody>
  </table></div>;
}

function Metric({ title, value, icon, tone, details }) {
  return <div className="contract-dash-metric">
    <div><div className="contract-dash-metric-title">{title}</div><strong>{value}</strong>{details && <div className="contract-dash-metric-detail">{details}</div>}</div>
    <div className="contract-dash-metric-icon" style={{ background: tone }}>{icon}</div>
  </div>;
}

export default function ContractorDashboard() {
  const [data, setData] = useState(EMPTY);
  const [projectId, setProjectId] = useState('ALL');
  const [fromDate, setFromDate] = useState('1900-01-01');
  const [toDate, setToDate] = useState(today);
  const [applied, setApplied] = useState({ projectId: 'ALL', fromDate: '1900-01-01', toDate: today });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryMode, setSummaryMode] = useState('chart');
  const [performanceMode, setPerformanceMode] = useState('chart');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(applied);
    setLoading(true);
    fetch(`/api/contracting/dashboard?${params.toString()}`, { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load contractor dashboard.');
        return result;
      })
      .then(result => { if (active) { setData(result); setError(''); } })
      .catch(loadError => { if (active) setError(loadError.message || 'Unable to load contractor dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied]);

  const summaryData = useMemo(() => data.contractorSummary.map(item => ({ ...item, monthName: monthText(item.month), woL: inLacs(item.workOrderValue), raL: inLacs(item.raBill), retentionL: inLacs(item.retention), outstandingL: inLacs(item.outstanding) })), [data.contractorSummary]);
  const statusData = useMemo(() => [
    { name: 'Open WO', value: number(data.workOrderStats?.open) },
    { name: 'Cancelled WO', value: number(data.workOrderStats?.cancelled) },
    { name: 'Foreclosed WO', value: number(data.workOrderStats?.foreclosed) },
    { name: 'Completed WO', value: number(data.workOrderStats?.completed) },
  ], [data.workOrderStats]);
  const contractorBars = useMemo(() => data.topContractors.map(item => ({ ...item, valueL: inLacs(item.workOrderValue) })), [data.topContractors]);
  const labourBars = useMemo(() => data.labourCategories.map(item => ({ ...item, amountL: inLacs(item.amount) })), [data.labourCategories]);
  const performanceBars = useMemo(() => data.performance.map(item => ({ ...item, delayed: number(item.delayedOrders), foreclosed: number(item.foreclosedOrders), rejected: number(item.rejectedBills) })), [data.performance]);

  const applyFilters = event => {
    event.preventDefault();
    setApplied({ projectId, fromDate, toDate });
  };

  return <main className="contractor-dashboard">
    <style>{`
      .contractor-dashboard { --cd-blue:#2671bd; --cd-cyan:#d8f2fb; --cd-ink:#28384a; --cd-muted:#708096; color:var(--cd-ink); max-width:1750px; margin:0 auto; padding:18px 18px 35px; }
      .contract-dash-titlebar { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:12px; }
      .contract-dash-title { display:flex; align-items:center; gap:9px; } .contract-dash-title h1 { margin:0; font-size:23px; } .contract-dash-title p { margin:4px 0 0; font-size:12px; color:var(--cd-muted); }
      .contract-dash-filters { display:flex; gap:7px; align-items:end; flex-wrap:wrap; }
      .contract-dash-field { display:grid; gap:3px; color:#65758a; font-size:10px; font-weight:750; }
      .contract-dash-field select,.contract-dash-field input { height:35px; min-width:138px; border:1px solid #cfd8e1; border-radius:6px; padding:0 8px; color:#344256; background:#fff; }
      .contract-dash-field select { min-width:225px; max-width:275px; }
      .contract-dash-search { height:35px; border:0; border-radius:6px; display:flex; align-items:center; gap:5px; padding:0 12px; background:#3970d1; color:#fff; font-weight:700; cursor:pointer; }
      .contract-dash-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:14px; }
      .contract-dash-metric { min-height:78px; padding:13px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid #e2e6ea; border-radius:7px; background:#fff; box-shadow:0 2px 6px #14283b0c; }
      .contract-dash-metric-title { color:#4284c2; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.45px; }
      .contract-dash-metric strong { display:block; margin-top:4px; font-size:21px; color:#273648; }
      .contract-dash-metric-detail { color:#68788d; font-size:11px; margin-top:2px; }
      .contract-dash-metric-icon { color:white; width:42px; height:42px; display:grid; place-items:center; border-radius:6px; flex:none; }
      .contract-dash-grid { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(250px,.6fr) minmax(250px,.6fr); gap:13px; margin-bottom:14px; }
      .contract-dash-two { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; margin-bottom:14px; }
      .contract-dash-card { min-width:0; border:1px solid #e0e5ea; border-radius:7px; overflow:hidden; background:white; box-shadow:0 2px 6px #14283b0c; }
      .contract-dash-card-head { min-height:52px; display:flex; align-items:center; padding:11px 14px; background:#d9f1fa; border-bottom:1px solid #b8dce8; }
      .contract-dash-card-head h2 { margin:0; font-size:14px; color:#385fa0; font-weight:750; }
      .contract-dash-card-head p { margin:4px 0 0; color:#708096; font-size:11px; }
      .contract-dash-card-body { padding:10px 12px; }
      .contract-dash-table-scroll { max-width:100%; max-height:410px; overflow:auto; }
      .contract-dash-table { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
      .contract-dash-table th { position:sticky; top:0; background:#f3f5f7; z-index:1; color:#69778a; text-align:left; font-size:10px; letter-spacing:.35px; text-transform:uppercase; }
      .contract-dash-table td,.contract-dash-table th { padding:9px 10px; border-bottom:1px solid #e8ecef; }
      .contract-dash-table tbody tr:hover { background:#f7fbfc; }
      .contract-dash-chart { height:285px; padding:8px 8px 3px; }
      .contract-dash-chart.short { height:230px; }
      .contract-dash-empty { min-height:120px; display:grid; place-items:center; padding:20px; color:#8794a3; text-align:center; font-size:12px; }
      .contract-dash-toolbar { margin-left:auto; display:flex; gap:6px; }
      .contract-dash-toolbar button { border:1px solid #d6e0e8; background:#fff; color:#56718d; border-radius:5px; padding:5px 7px; cursor:pointer; }
      .contract-dash-toolbar button.active { color:#fff; background:#3970d1; border-color:#3970d1; }
      .contract-dash-stats { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:9px 12px 12px; }
      .contract-dash-stats h3 { margin:0; padding:9px 8px; color:#68788c; background:#f4f5f6; font-size:10px; text-transform:uppercase; }
      .contract-dash-stats table { width:100%; border-collapse:collapse; font-size:12px; }
      .contract-dash-stats td { padding:8px; border-bottom:1px solid #e7ebee; }
      .contract-dash-stats td:last-child { text-align:right; font-weight:700; }
      .contract-dash-wo-counts { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
      .contract-dash-wo-counts div { padding:9px 10px; display:flex; justify-content:space-between; gap:10px; border:1px solid #e8edf1; border-radius:6px; background:#fbfcfd; font-size:11px; }
      .contract-dash-wo-counts span { color:#68788d; }
      .contract-dash-wo-counts b { color:#334155; font-size:13px; }
      .contract-dash-alert { padding:11px 13px; display:flex; gap:8px; align-items:center; border:1px solid #fecaca; border-radius:7px; margin-bottom:12px; color:#991b1b; background:#fff5f5; font-size:12px; }
      .contract-dash-loading { padding:25px; text-align:center; color:#708096; }
      @media(max-width:1100px) { .contract-dash-grid { grid-template-columns:1fr 1fr; } .contract-dash-grid .contract-dash-card:first-child { grid-column:1/-1; } }
      @media(max-width:780px) { .contractor-dashboard { padding:14px 10px 28px; } .contract-dash-metrics { grid-template-columns:1fr; } .contract-dash-grid,.contract-dash-two { grid-template-columns:1fr; } .contract-dash-grid .contract-dash-card:first-child { grid-column:auto; } .contract-dash-stats { grid-template-columns:1fr; } .contract-dash-wo-counts { grid-template-columns:1fr; } }
    `}</style>

    <div className="contract-dash-titlebar">
      <div className="contract-dash-title"><Building2 size={22} color="#4d5e70" /><div><h1>Contract Dashboard</h1><p>Contractor status, work orders, RA billing, advances, and labour trends</p></div></div>
      <form className="contract-dash-filters" onSubmit={applyFilters}>
        <label className="contract-dash-field">PROJECT
          <select value={projectId} onChange={event => setProjectId(event.target.value)}>
            <option value="ALL">All accessible projects</option>
            {data.projects.map(project => <option key={project.id} value={project.id}>{project.name} {project.projectId ? `(${project.projectId})` : ''}</option>)}
          </select>
        </label>
        <label className="contract-dash-field">FROM<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label>
        <label className="contract-dash-field">TO<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label>
        <button className="contract-dash-search" type="submit"><Search size={14} /> Search</button>
      </form>
    </div>

    {error && <div className="contract-dash-alert" role="alert"><AlertCircle size={16} />{error}</div>}
    {loading && <div className="contract-dash-loading"><RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Loading contractor data…</div>}

    {!loading && !error && <>
      <div className="contract-dash-metrics">
        <Metric title="Total Contractor" value={number(data.contractors?.total).toLocaleString('en-IN')} tone="#2e75bc" icon={<Users size={22} />} />
        <Metric title="Active Contractor" value={number(data.contractors?.active).toLocaleString('en-IN')} tone="#32ad53" icon={<Users size={22} />} details={`Regular: ${number(data.contractors?.active)}  ·  On Trial: ${number(data.contractors?.onTrial)}`} />
        <Metric title="Inactive Contractor" value={number(data.contractors?.inactive).toLocaleString('en-IN')} tone="#d54141" icon={<Users size={22} />} />
      </div>

      <div className="contract-dash-grid">
        <Card title="Statistics Count">
          <div className="contract-dash-stats">
            <div><h3>Description <span style={{ float: 'right' }}>Count</span></h3><table><tbody>{data.statisticCounts.map(item => <tr key={item.name}><td>{item.name}</td><td>{number(item.count).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div>
            <div><h3>Description <span style={{ float: 'right' }}>Percentage (%)</span></h3><table><tbody>{data.statisticCounts.map(item => <tr key={item.name}><td>{item.name}</td><td>{number(item.percentage).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div>
          </div>
        </Card>
        <Card title="Top 10 Contractor">
          <Table rows={contractorBars} columns={[
            { key: 'name', label: 'Contractor name' }, { key: 'valueL', label: 'WO value (₹ L)', render: value => lacsText(value) },
          ]} />
        </Card>
        <Card title="Top 10 Labour Category">
          <Table rows={labourBars} columns={[
            { key: 'name', label: 'Category name' }, { key: 'amountL', label: 'Amount (₹ L)', render: value => lacsText(value) },
          ]} />
        </Card>
      </div>

      <div className="contract-dash-two">
        <Card title="Work Order Statistics">
          <div className="contract-dash-card-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,.8fr) minmax(250px,1fr)', alignItems: 'center', gap: 10 }}>
            <div className="contract-dash-chart short"><ResponsiveContainer width="100%" height="100%"><PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={53} outerRadius={88} paddingAngle={2}>
                {statusData.map((item, index) => <Cell key={item.name} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip /><Legend verticalAlign="bottom" height={35} />
            </PieChart></ResponsiveContainer></div>
            <div className="contract-dash-wo-counts">
              <div><span>Total WO</span><b>{number(data.workOrderStats?.total)}</b></div>
              <div><span>Open WO</span><b>{number(data.workOrderStats?.open)}</b></div>
              <div><span>Cancelled WO</span><b>{number(data.workOrderStats?.cancelled)}</b></div>
              <div><span>Foreclosed WO</span><b>{number(data.workOrderStats?.foreclosed)}</b></div>
              <div><span>Completed WO</span><b>{number(data.workOrderStats?.completed)}</b></div>
            </div>
          </div>
        </Card>
        <Card title="Contractor Summary" subtitle="Work order value, RA bills, retention, and unpaid net payable by month">
          <div className="contract-dash-toolbar" style={{ justifyContent: 'flex-end', padding: '8px 10px 0' }}>
            <button type="button" className={summaryMode === 'chart' ? 'active' : ''} onClick={() => setSummaryMode('chart')} title="Chart"><BarChart3 size={16} /></button>
            <button type="button" className={summaryMode === 'table' ? 'active' : ''} onClick={() => setSummaryMode('table')} title="Table"><CalendarDays size={16} /></button>
          </div>
          {summaryMode === 'chart' ? <div className="contract-dash-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={summaryData} margin={{ top: 10, right: 14, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="#e6ebef" vertical={false} /><XAxis dataKey="monthName" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={value => [lacsText(value), '']} /><Legend />
            <Bar dataKey="woL" name="WO Value" fill="#596fbe" /><Bar dataKey="raL" name="RA Bill" fill="#e45e6a" />
            <Bar dataKey="retentionL" name="Retention" fill="#69b6d2" /><Bar dataKey="outstandingL" name="O/S Payment" fill="#38a47b" />
          </ComposedChart></ResponsiveContainer></div> : <Table rows={summaryData} columns={[
            { key: 'monthName', label: 'Month' }, { key: 'workOrderValue', label: 'WO value', render: value => money(value) },
            { key: 'raBill', label: 'RA bill', render: value => money(value) }, { key: 'retention', label: 'Retention', render: value => money(value) },
            { key: 'outstanding', label: 'O/S payment', render: value => money(value) },
          ]} />}
        </Card>
      </div>

      <div className="contract-dash-two">
        <Card title="Contractor Wise Performance" subtitle="Delayed and foreclosed work orders, plus rejected RA bills">
          <div className="contract-dash-toolbar" style={{ justifyContent: 'flex-end', padding: '8px 10px 0' }}>
            <button type="button" className={performanceMode === 'chart' ? 'active' : ''} onClick={() => setPerformanceMode('chart')} title="Chart"><BarChart3 size={16} /></button>
            <button type="button" className={performanceMode === 'table' ? 'active' : ''} onClick={() => setPerformanceMode('table')} title="Table"><FileText size={16} /></button>
          </div>
          {performanceMode === 'chart' ? <div className="contract-dash-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={performanceBars} margin={{ top: 10, right: 12, left: 4, bottom: 40 }}>
            <CartesianGrid stroke="#e6ebef" vertical={false} /><XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={55} tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} />
            <Tooltip /><Legend /><Bar dataKey="delayed" name="Delayed WO" fill="#607ac5" /><Bar dataKey="foreclosed" name="Foreclosed WO" fill="#f0b63e" /><Bar dataKey="rejected" name="Rejected RA Bills" fill="#e66767" />
          </BarChart></ResponsiveContainer></div> : <Table rows={performanceBars} columns={[
            { key: 'name', label: 'Contractor' }, { key: 'workOrders', label: 'WOs' }, { key: 'delayedOrders', label: 'Delayed' },
            { key: 'foreclosedOrders', label: 'Foreclosed' }, { key: 'rejectedBills', label: 'Rejected RA' },
          ]} />}
        </Card>
        <Card title="Labour Category Wise" subtitle="Labour requisition amount = rate × quantity × duration">
          <div className="contract-dash-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={labourBars} margin={{ top: 10, right: 12, left: 4, bottom: 35 }}>
            <CartesianGrid stroke="#e6ebef" vertical={false} /><XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={54} tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={value => [lacsText(value), 'Amount']} /><Bar dataKey="amountL" name="Estimate (₹ L)" fill="#5f78c6" radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
          <Table rows={labourBars} columns={[
            { key: 'name', label: 'Labour category' }, { key: 'quantity', label: 'Quantity', render: value => number(value).toLocaleString('en-IN') },
            { key: 'requisitions', label: 'Requisitions' }, { key: 'amount', label: 'Amount', render: value => money(value) },
          ]} />
        </Card>
      </div>
    </>}
  </main>;
}
