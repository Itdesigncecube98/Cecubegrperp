'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CalendarDays, PackageCheck, Search, Users } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);
const money = value => `₹${(Number(value || 0) / 100000).toFixed(2)}`;
const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });
const colors = ['#62b4d2', '#9d60d6', '#5f8edc', '#626bd5', '#8063d6'];

export default function PurchaseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState('ALL');
  const [from, setFrom] = useState('2016-01-01');
  const [to, setTo] = useState(today);
  const [billingMode, setBillingMode] = useState('count');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ project, from, to });
      const response = await fetch(`/api/purchase/dashboard?${query}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Dashboard could not be loaded');
      setData(result);
    } catch (err) { setError(err.message || 'Dashboard could not be loaded'); }
    finally { setLoading(false); }
  }, [project, from, to]);

  useEffect(() => { load(); }, [load]);

  const maxMonth = Math.max(1, ...(data?.monthlyPO || []).map(row => row.value));
  const maxSupplier = Math.max(1, ...(data?.topSuppliers || []).map(row => row.amount));
  const funnelMax = Math.max(1, data?.poStats?.[0]?.value || 0);
  const billedValue = billingMode === 'count' ? data?.grnBilling?.billedCount : data?.grnBilling?.amountBilled;
  const unbilledValue = billingMode === 'count' ? data?.grnBilling?.unbilledCount : data?.grnBilling?.amountUnbilled;

  return <main className="pdb-page">
    <header className="pdb-heading"><h1><BarChart3 size={22}/> Purchase Dashboard</h1><div className="pdb-filters">
      <select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}><option value="ALL">All projects</option>{data?.projects?.map(name => <option key={name} value={name}>{name}</option>)}</select>
      <label><CalendarDays size={15}/><input aria-label="From date" type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><span>–</span>
      <label><CalendarDays size={15}/><input aria-label="To date" type="date" value={to} onChange={event => setTo(event.target.value)}/></label>
      <button onClick={load} disabled={loading}><Search size={15}/>{loading ? 'Loading' : 'Search'}</button>
    </div></header>
    {error && <div className="pdb-error">{error}</div>}
    <section className="pdb-kpis">
      <Kpi title="TOTAL SUPPLIER" value={data?.suppliers?.total} icon={<Users/>} tone="blue"/>
      <Kpi title="ACTIVE SUPPLIER" value={data?.suppliers?.active} icon={<PackageCheck/>} tone="green"/>
      <Kpi title="INACTIVE SUPPLIER" value={data?.suppliers?.inactive} icon={<Users/>} tone="red"/>
    </section>
    <section className="pdb-overview">
      <article className="pdb-panel pdb-funnel-panel"><PanelTitle>Purchase Order Statistics</PanelTitle><div className="pdb-funnel">
        <div className="pdb-funnel-shapes">{(data?.poStats || []).map((row, index) => <div key={row.name} className="pdb-funnel-row" style={{ width: `${Math.max(28, ((row.value || 0) / funnelMax) * 100)}%`, background: colors[index] }}>{row.name} <b>{number(row.value)}</b></div>)}</div>
      </div></article>
      <article className="pdb-panel pdb-colored pdb-amber"><PanelTitle>Top 10 Supplier</PanelTitle><div className="pdb-table-head"><span>SUPPLIERS</span><span>AMOUNT IN LACS</span></div>{(data?.topSuppliers || []).map(row => <div className="pdb-rank" key={row.name}><span>{row.name}</span><b>{money(row.amount)}</b></div>)}{!data?.topSuppliers?.length && <Empty/>}</article>
      <article className="pdb-panel pdb-colored pdb-indigo"><PanelTitle>Top 10 Material Category</PanelTitle><div className="pdb-table-head"><span>CATEGORY NAME</span><span>AMOUNT IN LACS</span></div>{(data?.topMaterials || []).map(row => <div className="pdb-rank" key={row.name}><span>{row.name}</span><b>{money(row.amount)}</b></div>)}{!data?.topMaterials?.length && <Empty/>}</article>
    </section>
    <section className="pdb-panel pdb-monthly"><PanelTitle>Monthly PO Cost <small>Amount in lacs</small></PanelTitle><div className="pdb-chart" aria-label="Monthly PO cost chart">{(data?.monthlyPO || []).map(row => <div className="pdb-bar-column" key={row.month}><b>{money(row.value)}</b><div className="pdb-bar" style={{ height: `${Math.max(2, row.value / maxMonth * 80)}%` }}/><span>{new Date(`${row.month}-01T00:00:00`).toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span></div>)}{!data?.monthlyPO?.length && <Empty/>}</div></section>
    <section className="pdb-bottom">
      <article className="pdb-panel"><PanelTitle>Average Procurement Cycle</PanelTitle><div className="pdb-cycle">{['Requisition', 'PO Confirmation', 'GRN', 'Bill', 'Payment'].map((name, index) => <div key={name} className="pdb-cycle-step"><div className="pdb-cycle-peak" style={{ background: colors[index] }}/><span>{name}</span></div>)}</div><div className="pdb-cycle-caption"><strong>{number(data?.avgCycleDays)} days</strong><span>Average PO approval cycle (created to approved)</span></div></article>
      <article className="pdb-panel"><PanelTitle>GRN Billing Status</PanelTitle><div className="pdb-toggle"><button className={billingMode === 'count' ? 'selected' : ''} onClick={() => setBillingMode('count')}>Count Wise</button><button className={billingMode === 'amount' ? 'selected' : ''} onClick={() => setBillingMode('amount')}>Amount Wise</button></div><div className="pdb-billing"><div className="pdb-donut" style={{ '--billed': `${(Number(billedValue || 0) / Math.max(1, Number(billedValue || 0) + Number(unbilledValue || 0))) * 100}%` }}><div><b>{number(data?.grnBilling?.grnCount)}</b><small>Total GRN</small></div></div><div className="pdb-legend"><span><i/>Billed <b>{billingMode === 'amount' ? money(billedValue) : number(billedValue)}</b></span><span><i/>Unbilled <b>{billingMode === 'amount' ? money(unbilledValue) : number(unbilledValue)}</b></span></div></div><div className="pdb-billing-foot"><span>Total GRN <b>{number(data?.grnBilling?.grnCount)}</b></span><span>Billed <b>{billingMode === 'amount' ? money(billedValue) : number(billedValue)}</b></span><span>Unbilled <b>{billingMode === 'amount' ? money(unbilledValue) : number(unbilledValue)}</b></span></div></article>
    </section>
    <style jsx>{`
      .pdb-page{padding:24px;background:#f1f1f1;min-height:100vh;color:#26364a}.pdb-heading{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:18px}.pdb-heading h1{display:flex;align-items:center;gap:8px;font-size:24px;margin:0;color:#3c4652}.pdb-filters{display:flex;align-items:center;gap:7px}.pdb-filters select,.pdb-filters label{height:36px;border:1px solid #cbd5e1;border-radius:7px;background:white;padding:0 9px;display:flex;align-items:center;gap:6px;color:#64748b}.pdb-filters input{width:145px;border:0;outline:0;color:#354256;background:transparent}.pdb-filters select{min-width:180px}.pdb-filters button{height:36px;border:0;border-radius:7px;background:#3555c8;color:white;padding:0 13px;display:flex;align-items:center;gap:6px;cursor:pointer}.pdb-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-bottom:18px}.pdb-kpi,.pdb-panel{background:white;border:1px solid #e1e5eb;border-radius:7px;box-shadow:0 2px 5px #0f172a0b}.pdb-kpi{height:92px;padding:16px;display:flex;align-items:center;justify-content:space-between}.pdb-kpi h3{margin:0 0 8px;color:#5599d1;font-size:14px;letter-spacing:.04em}.pdb-kpi strong{font-size:23px;color:#263442}.pdb-kpi-icon{height:48px;width:48px;display:grid;place-items:center;color:white;border-radius:5px}.blue .pdb-kpi-icon{background:#2875bd}.green .pdb-kpi-icon{background:#28af4a}.red .pdb-kpi-icon{background:#d83d41}.pdb-overview{display:grid;grid-template-columns:1.38fr .94fr .94fr;gap:22px;align-items:stretch}.pdb-panel{padding:12px;min-width:0}.pdb-panel-title{padding:14px 10px;background:#d8f0fa;color:#4265a5;font-size:15px;font-weight:700;border-radius:4px;margin-bottom:12px}.pdb-panel-title small{display:block;font-size:12px;font-weight:400;color:#718096;margin-top:3px}.pdb-funnel{height:405px;display:flex;align-items:center;justify-content:center}.pdb-funnel-shapes{width:82%;display:flex;align-items:center;flex-direction:column;gap:0}.pdb-funnel-row{height:54px;display:flex;justify-content:center;align-items:center;gap:10px;color:white;clip-path:polygon(0 0,100% 0,82% 100%,18% 100%);font-size:13px;min-width:30%;transition:width .2s}.pdb-colored{padding:12px;background:var(--tone);color:white}.pdb-amber{--tone:#ffb900}.pdb-indigo{--tone:#6379cc}.pdb-colored .pdb-panel-title{background:transparent;color:white;padding:14px 8px 20px;border-bottom:1px solid #ffffff55}.pdb-table-head,.pdb-rank{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 8px}.pdb-table-head{background:#fff;color:#687180;font-size:12px;font-weight:700}.pdb-rank{border-bottom:1px solid #ffffff66;font-size:14px;min-height:36px}.pdb-rank span{overflow:hidden;text-overflow:ellipsis}.pdb-rank b{white-space:nowrap}.pdb-monthly{margin-top:20px}.pdb-chart{height:305px;display:flex;align-items:flex-end;gap:14px;padding:25px 12px 4px;border-bottom:1px solid #b9c0c9;overflow-x:auto}.pdb-bar-column{flex:1;min-width:54px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px;color:#697586;font-size:12px}.pdb-bar-column b{font-size:12px;font-weight:500}.pdb-bar{background:#6481d5;border-radius:5px 5px 0 0;width:min(60%,42px)}.pdb-bottom{display:grid;grid-template-columns:1.9fr 1fr;gap:22px;margin-top:20px}.pdb-cycle{height:255px;display:flex;align-items:flex-end;justify-content:space-around;padding:0 12px 16px;border-bottom:1px solid #d2d7df}.pdb-cycle-step{height:100%;display:flex;flex:1;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px;color:#6c7c92;font-size:12px}.pdb-cycle-peak{width:70%;height:72%;clip-path:polygon(0 100%,50% 0,100% 100%);opacity:.8}.pdb-cycle-step:nth-child(2) .pdb-cycle-peak{height:56%}.pdb-cycle-step:nth-child(4) .pdb-cycle-peak{height:50%}.pdb-cycle-step:nth-child(5) .pdb-cycle-peak{height:44%}.pdb-cycle-caption{padding:12px 5px;display:flex;justify-content:space-between;color:#6b7280;font-size:13px}.pdb-cycle-caption strong{color:#3c526e}.pdb-toggle{display:flex;border-bottom:1px solid #e2e8f0}.pdb-toggle button{border:0;background:white;padding:11px 15px;color:#64748b;cursor:pointer}.pdb-toggle button.selected{border:1px solid #e2e8f0;border-bottom:0;border-radius:5px 5px 0 0;color:#27364b;font-weight:700}.pdb-billing{height:245px;display:flex;align-items:center;justify-content:center;gap:30px}.pdb-donut{height:168px;width:168px;border-radius:50%;background:conic-gradient(#15c6ca 0 var(--billed),#2680c9 var(--billed) 100%);display:grid;place-items:center}.pdb-donut>div{height:104px;width:104px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;flex-direction:column}.pdb-donut b{font-size:22px}.pdb-donut small{font-size:11px;color:#697586}.pdb-legend{display:grid;gap:12px;font-size:12px;color:#64748b}.pdb-legend span{display:grid;grid-template-columns:10px auto;align-items:center;gap:6px}.pdb-legend b{grid-column:2;color:#29384b}.pdb-legend i{height:10px;width:10px;background:#15c6ca;border-radius:2px}.pdb-legend span+span i{background:#2680c9}.pdb-billing-foot{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #e2e2e2;text-align:center}.pdb-billing-foot span{padding:10px 4px;font-size:11px;border-right:1px solid #ddd}.pdb-billing-foot span:last-child{border:0}.pdb-billing-foot b{display:block;margin-top:5px;font-size:15px}.pdb-error{background:#fff1f2;color:#b42318;padding:12px;border-radius:6px;margin-bottom:15px}.pdb-empty{padding:16px 8px;text-align:center;color:#fff9;font-size:13px}
      @media(max-width:1050px){.pdb-overview{grid-template-columns:1fr 1fr}.pdb-funnel-panel{grid-column:1/-1}.pdb-bottom{grid-template-columns:1fr}}@media(max-width:700px){.pdb-page{padding:14px}.pdb-heading{align-items:flex-start;flex-direction:column}.pdb-filters{flex-wrap:wrap}.pdb-filters select{width:100%}.pdb-kpis{grid-template-columns:1fr;gap:10px}.pdb-overview{grid-template-columns:1fr}.pdb-funnel-panel{grid-column:auto}.pdb-funnel{height:280px}.pdb-cycle-caption{gap:8px;flex-direction:column}.pdb-billing{gap:16px}.pdb-donut{width:138px;height:138px}.pdb-donut>div{width:86px;height:86px}}
    `}</style>
  </main>;
}

function PanelTitle({ children }) { return <div className="pdb-panel-title">{children}</div>; }
function Empty() { return <div className="pdb-empty">No records in this period</div>; }
function Kpi({ title, value, icon, tone }) { return <article className={`pdb-kpi ${tone}`}><div><h3>{title}</h3><strong>{value ?? '—'}</strong></div><span className="pdb-kpi-icon">{icon}</span></article>; }
