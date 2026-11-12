'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FilePlus2,
  FileText,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Users,
  UserRoundX,
} from 'lucide-react';
import './dashboard.css';

const today = new Date().toISOString().slice(0, 10);
const colors = ['#6366f1', '#10b981', '#38bdf8', '#f59e0b', '#a78bfa'];
const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });
const lakhs = value => `₹${(Number(value || 0) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;

export default function PurchaseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState('ALL');
  const [from, setFrom] = useState('2016-01-01');
  const [to, setTo] = useState(today);
  const [billingMode, setBillingMode] = useState('count');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ project, from, to });
      const response = await fetch(`/api/purchase/dashboard?${query}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Dashboard could not be loaded.');
      setData(result);
    } catch (err) {
      setError(err.message || 'Dashboard could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [project, from, to]);

  useEffect(() => { load(); }, [load]);

  const maxMonth = Math.max(1, ...(data?.monthlyPO || []).map(row => Number(row.value) || 0));
  const maxSupplier = Math.max(1, ...(data?.topSuppliers || []).map(row => Number(row.amount) || 0));
  const maxMaterial = Math.max(1, ...(data?.topMaterials || []).map(row => Number(row.amount) || 0));
  const billedValue = billingMode === 'count' ? data?.grnBilling?.billedCount : data?.grnBilling?.amountBilled;
  const unbilledValue = billingMode === 'count' ? data?.grnBilling?.unbilledCount : data?.grnBilling?.amountUnbilled;
  const billedPercent = Number(billedValue || 0) / Math.max(1, Number(billedValue || 0) + Number(unbilledValue || 0)) * 100;
  const totalPOValue = (data?.monthlyPO || []).reduce((sum, row) => sum + (Number(row.value) || 0), 0);

  return (
    <main className="purchase-dashboard">
      <header className="purchase-dashboard__header">
        <div className="purchase-dashboard__heading">
          <div className="purchase-dashboard__eyebrow"><span /> PROCUREMENT OVERVIEW</div>
          <h1>Purchase dashboard</h1>
          <p>Monitor suppliers, purchase orders and goods received across your projects.</p>
        </div>
        <div className="purchase-dashboard__actions">
          <Link className="purchase-dashboard__button purchase-dashboard__button--secondary" href="/purchase/pr/create">
            <FilePlus2 size={16} /> New requisition
          </Link>
          <Link className="purchase-dashboard__button purchase-dashboard__button--primary" href="/purchase/po/create">
            <ShoppingCart size={16} /> Create purchase order
          </Link>
        </div>
      </header>

      <form className="purchase-dashboard__filters" onSubmit={event => { event.preventDefault(); load(); }}>
        <label className="purchase-dashboard__project-filter">
          <span>Project</span>
          <select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}>
            <option value="ALL">All projects</option>
            {data?.projects?.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <div className="purchase-dashboard__date-filter">
          <CalendarDays size={16} aria-hidden="true" />
          <label><span>From</span><input aria-label="From date" type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
          <span className="purchase-dashboard__date-separator">to</span>
          <label><span>To</span><input aria-label="To date" type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
        </div>
        <button className="purchase-dashboard__button purchase-dashboard__button--filter" type="submit" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'purchase-dashboard__spin' : ''} />
          {loading ? 'Updating' : 'Refresh'}
        </button>
        <span className="purchase-dashboard__filter-note">Data updates when filters change</span>
      </form>

      {error && (
        <div className="purchase-dashboard__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load} disabled={loading}>Try again</button>
        </div>
      )}

      <section className="purchase-dashboard__summary" aria-label="Procurement summary">
        <SummaryCard
          label="Purchase order value"
          value={lakhs(totalPOValue)}
          note={`${number(data?.poStats?.[0]?.value)} orders in selected period`}
          icon={<CircleDollarSign size={19} />}
          tone="indigo"
          loading={loading && !data}
        />
        <SummaryCard
          label="Total suppliers"
          value={number(data?.suppliers?.total)}
          note={`${number(data?.suppliers?.active)} active suppliers`}
          icon={<Users size={19} />}
          tone="blue"
          loading={loading && !data}
        />
        <SummaryCard
          label="Open purchase orders"
          value={number(data?.poStats?.find(row => row.name === 'Open PO')?.value)}
          note={`${number(data?.poStats?.find(row => row.name === 'Completed PO')?.value)} completed`}
          icon={<ShoppingCart size={19} />}
          tone="amber"
          loading={loading && !data}
        />
        <SummaryCard
          label="Goods received"
          value={number(data?.grnBilling?.grnCount)}
          note={`${number(data?.grnBilling?.unbilledCount)} awaiting bills`}
          icon={<PackageCheck size={19} />}
          tone="green"
          loading={loading && !data}
        />
      </section>

      <section className="purchase-dashboard__analytics" aria-label="Purchase analytics">
        <article className="purchase-dashboard__panel purchase-dashboard__panel--orders">
          <PanelHeading title="Purchase orders" subtitle="Status breakdown for the selected period" />
          <div className="purchase-dashboard__status-list">
            {(data?.poStats || []).map((row, index) => {
              const total = Number(data?.poStats?.[0]?.value) || 0;
              const value = Number(row.value) || 0;
              return (
                <div className="purchase-dashboard__status-row" key={row.name}>
                  <div className="purchase-dashboard__status-label">
                    <span className="purchase-dashboard__status-dot" style={{ '--status-color': colors[index] }} />
                    <span>{row.name}</span>
                    <strong>{number(value)}</strong>
                  </div>
                  <div className="purchase-dashboard__progress">
                    <span style={{ width: `${total ? Math.min(100, value / total * 100) : 0}%`, '--status-color': colors[index] }} />
                  </div>
                </div>
              );
            })}
            {!data?.poStats?.length && <Empty />}
          </div>
          <div className="purchase-dashboard__panel-foot">
            <span>Purchase order value</span>
            <strong>{lakhs(totalPOValue)}</strong>
          </div>
        </article>

        <article className="purchase-dashboard__panel">
          <PanelHeading title="Top suppliers" subtitle="Ranked by purchase order value" />
          <div className="purchase-dashboard__rank-list">
            {(data?.topSuppliers || []).map((row, index) => (
              <RankRow key={row.name} index={index} name={row.name} amount={row.amount} max={maxSupplier} />
            ))}
            {!data?.topSuppliers?.length && <Empty />}
          </div>
        </article>

        <article className="purchase-dashboard__panel">
          <PanelHeading title="Top material categories" subtitle="Ranked by purchase order value" />
          <div className="purchase-dashboard__rank-list">
            {(data?.topMaterials || []).map((row, index) => (
              <RankRow key={row.name} index={index} name={row.name} amount={row.amount} max={maxMaterial} />
            ))}
            {!data?.topMaterials?.length && <Empty />}
          </div>
        </article>
      </section>

      <section className="purchase-dashboard__lower" aria-label="Purchase trends and billing">
        <article className="purchase-dashboard__panel purchase-dashboard__panel--monthly">
          <PanelHeading title="Monthly purchase order value" subtitle="Order value by month" aside="Values in lakhs" />
          <div className="purchase-dashboard__chart-scroll">
            <div className="purchase-dashboard__chart" role="img" aria-label="Monthly purchase order value bar chart">
              {(data?.monthlyPO || []).map(row => {
                const value = Number(row.value) || 0;
                const height = value ? Math.max(5, value / maxMonth * 100) : 0;
                return (
                  <div className="purchase-dashboard__bar-column" key={row.month} title={`${row.month}: ${lakhs(value)}`}>
                    <span className="purchase-dashboard__bar-value">{lakhs(value)}</span>
                    <div className="purchase-dashboard__bar-track"><span style={{ height: `${height}%` }} /></div>
                    <span className="purchase-dashboard__bar-label">
                      {new Date(`${row.month}-01T00:00:00Z`).toLocaleDateString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' })}
                    </span>
                  </div>
                );
              })}
              {!data?.monthlyPO?.length && <Empty />}
            </div>
          </div>
        </article>

        <article className="purchase-dashboard__panel purchase-dashboard__panel--billing">
          <PanelHeading title="GRN billing status" subtitle="Billed vs. unbilled goods receipts" />
          <div className="purchase-dashboard__segmented" role="group" aria-label="Billing display">
            <button type="button" className={billingMode === 'count' ? 'is-selected' : ''} onClick={() => setBillingMode('count')}>By count</button>
            <button type="button" className={billingMode === 'amount' ? 'is-selected' : ''} onClick={() => setBillingMode('amount')}>By amount</button>
          </div>
          <div className="purchase-dashboard__billing-visual">
            <div className="purchase-dashboard__donut" style={{ '--billed': `${billedPercent}%` }}>
              <div><strong>{number(data?.grnBilling?.grnCount)}</strong><span>Total GRNs</span></div>
            </div>
            <div className="purchase-dashboard__legend">
              <div><span className="purchase-dashboard__legend-dot purchase-dashboard__legend-dot--billed" /><span>Billed</span><strong>{billingMode === 'amount' ? lakhs(billedValue) : number(billedValue)}</strong></div>
              <div><span className="purchase-dashboard__legend-dot purchase-dashboard__legend-dot--unbilled" /><span>Unbilled</span><strong>{billingMode === 'amount' ? lakhs(unbilledValue) : number(unbilledValue)}</strong></div>
            </div>
          </div>
          <div className="purchase-dashboard__billing-foot">
            <span><FileText size={14} /> Average procurement cycle</span>
            <strong>{number(data?.avgCycleDays)} days</strong>
          </div>
        </article>
      </section>

      <section className="purchase-dashboard__supplier-strip" aria-label="Supplier status">
        <div><span className="purchase-dashboard__supplier-icon purchase-dashboard__supplier-icon--active"><CheckCircle2 size={17} /></span><span>Active suppliers</span><strong>{number(data?.suppliers?.active)}</strong></div>
        <div><span className="purchase-dashboard__supplier-icon purchase-dashboard__supplier-icon--inactive"><UserRoundX size={17} /></span><span>Inactive suppliers</span><strong>{number(data?.suppliers?.inactive)}</strong></div>
        <Link href="/purchase/bills">View purchase bills <ArrowUpRight size={15} /></Link>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, note, icon, tone, loading }) {
  return (
    <article className={`purchase-dashboard__summary-card purchase-dashboard__summary-card--${tone}`}>
      <span className="purchase-dashboard__summary-icon">{icon}</span>
      <div className="purchase-dashboard__summary-copy">
        <span>{label}</span>
        {loading ? <span className="purchase-dashboard__skeleton" aria-label="Loading" /> : <strong>{value ?? '—'}</strong>}
        <small>{note}</small>
      </div>
    </article>
  );
}

function PanelHeading({ title, subtitle, aside }) {
  return (
    <div className="purchase-dashboard__panel-heading">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {aside && <span className="purchase-dashboard__panel-aside">{aside}</span>}
    </div>
  );
}

function RankRow({ index, name, amount, max }) {
  const value = Number(amount) || 0;
  return (
    <div className="purchase-dashboard__rank-row">
      <span className="purchase-dashboard__rank-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="purchase-dashboard__rank-copy">
        <div><span title={name}>{name}</span><strong>{lakhs(value)}</strong></div>
        <div className="purchase-dashboard__rank-track"><span style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="purchase-dashboard__empty">No records for this period</div>;
}
