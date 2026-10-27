'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Building2, Clock, HardHat, Receipt } from 'lucide-react';
import Link from 'next/link';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';

const EMPTY_DASHBOARD = {
  projects: [],
  projectSummary: [],
  upcomingMilestones: [],
  financials: { contractValue: 0, certifiedValue: 0, billedValue: 0, netPayable: 0 }
};

const money = value => {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const crore = value => Number((Number(value || 0) / 10000000).toFixed(2));
const shortDate = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const formatNumber = value => Number(value || 0).toLocaleString('en-IN');

export default function EngineeringDashboard() {
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/engineering/dashboard?projectId=${encodeURIComponent(selectedProjectId)}`, { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load project dashboard.');
        return result;
      })
      .then(result => {
        if (active) {
          setData(result);
          setError('');
        }
      })
      .catch(loadError => {
        if (active) setError(loadError.message || 'Unable to load project dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedProjectId]);

  const chartData = useMemo(() => [
    { name: 'Contract', value: crore(data.financials?.contractValue) },
    { name: 'Certified MB', value: crore(data.financials?.certifiedValue) },
    { name: 'RA Billed', value: crore(data.financials?.billedValue) },
    { name: 'Net Payable', value: crore(data.financials?.netPayable) }
  ], [data]);

  const progressData = useMemo(() => [
    { name: 'Completed work', value: Number(data.overallProgressPct || 0) },
    { name: 'Remaining work', value: Math.max(0, 100 - Number(data.overallProgressPct || 0)) }
  ], [data.overallProgressPct]);

  const hasFinancialData = chartData.some(item => item.value > 0);
  const hasProjects = data.projectSummary.length > 0;

  return (
    <div style={{ padding: 24, maxWidth: 1500, margin: '0 auto', color: '#1e293b' }}>
      <style>{`
        .engineering-dashboard-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
        .engineering-dashboard-content { display:grid; grid-template-columns:minmax(0,2fr) minmax(300px,1fr); gap:20px; margin-top:20px; }
        .engineering-dashboard-project-table { width:100%; border-collapse:collapse; min-width:850px; }
        @media (max-width: 900px) {
          .engineering-dashboard-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .engineering-dashboard-content { grid-template-columns:1fr; }
        }
        @media (max-width: 560px) {
          .engineering-dashboard-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 750, margin: 0 }}>Project Execution Dashboard</h1>
          <p style={{ color: '#64748b', margin: '6px 0 0' }}>Live project, site progress, measurement book, and RA billing summary.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="engineering-dashboard-project" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Project</label>
          <select
            id="engineering-dashboard-project"
            value={selectedProjectId}
            onChange={event => {
              setLoading(true);
              setError('');
              setSelectedProjectId(event.target.value);
            }}
            style={{ minWidth: 260, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}
          >
            <option value="ALL">All Projects</option>
            {data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <Link href="/engineering/projects" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: '#fff', padding: '9px 14px', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            <Building2 size={16} /> Project Master
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 14, marginBottom: 18, border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', background: '#fef2f2' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="engineering-dashboard-grid">
        <KpiCard icon={<Building2 size={22} />} tone="#7c3aed" label="Active Projects" value={`${formatNumber(data.activeProjects)} / ${formatNumber(data.totalProjects)}`} />
        <KpiCard icon={<AlertTriangle size={22} />} tone="#b91c1c" label="Activities Past Planned Finish" value={formatNumber(data.delayedActivities)} detail="Past plan date and below planned quantity" />
        <KpiCard icon={<HardHat size={22} />} tone="#0369a1" label="Today's Manpower" value={formatNumber(data.manpowerToday)} detail={`Across ${formatNumber(data.dprsToday)} site reports`} />
        <KpiCard icon={<Receipt size={22} />} tone="#15803d" label="RA Billed" value={money(data.financials?.billedValue)} detail="Current bill totals, excluding drafts" />
      </div>

      {loading && <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading project data...</div>}

      {!loading && !error && !hasProjects && (
        <div style={{ marginTop: 20, padding: 28, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 10, background: '#fff', color: '#64748b' }}>
          No Engineering projects found. Add a project in Project Master to see execution data here.
        </div>
      )}

      {!loading && !error && hasProjects && (
        <>
          <div className="engineering-dashboard-content">
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, minWidth: 0 }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: 16 }}>Contract, Certification & Billing (₹ crore)</h2>
                <p style={{ color: '#64748b', fontSize: 13, margin: '5px 0 0' }}>Amounts are summed from project contracts, certified MBs, and submitted RA bills.</p>
              </div>
              <div style={{ height: 320, padding: 16 }}>
                {hasFinancialData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 16, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={value => [`₹${Number(value).toLocaleString('en-IN')} Cr`, 'Amount']} />
                      <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartMessage>No contract, certified MB, or RA billing amounts have been recorded for this selection.</EmptyChartMessage>
                )}
              </div>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
                <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Physical Progress</h2>
                {data.overallProgressPct === null ? (
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Progress is unavailable until activities have planned quantities and site DPR quantities.</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={progressData} cx="50%" cy="50%" innerRadius={38} outerRadius={54} dataKey="value" startAngle={90} endAngle={-270}>
                            <Cell fill="#7c3aed" />
                            <Cell fill="#e2e8f0" />
                          </Pie>
                          <Tooltip formatter={value => [`${value}%`, 'Weighted progress']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 28, color: '#7c3aed' }}>{data.overallProgressPct}%</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>Activity progress weighted by planned importance</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9', color: data.delayedActivities ? '#b91c1c' : '#475569', fontSize: 13 }}>
                  <AlertTriangle size={15} /> {formatNumber(data.delayedActivities)} activities past planned finish
                </div>
              </section>

              <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0' }}>
                  <h2 style={{ margin: 0, fontSize: 16 }}>Upcoming Planned Activities</h2>
                </div>
                {data.upcomingMilestones.length ? data.upcomingMilestones.map(activity => (
                  <div key={activity.id} style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{activity.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5, color: '#64748b', fontSize: 12 }}>
                      <span>{activity.projectName}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><Clock size={12} />{shortDate(activity.date)}</span>
                    </div>
                  </div>
                )) : (
                  <p style={{ padding: '16px 18px', margin: 0, color: '#64748b', fontSize: 13 }}>No upcoming planned activities found.</p>
                )}
              </section>
            </div>
          </div>

          <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Project Portfolio</h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: '5px 0 0' }}>Progress and financial values use recorded project activity, MB, and RA data.</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="engineering-dashboard-project-table">
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc', color: '#475569', fontSize: 12 }}>
                    {['Project', 'Status', 'Contract Value', 'Certified MB', 'RA Billed', 'Physical Progress', 'Activities', 'Past Plan'].map(label => (
                      <th key={label} style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.projectSummary.map(project => (
                    <tr key={project.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ fontWeight: 650 }}>{project.name}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{[project.projectId, project.location].filter(Boolean).join(' · ') || '—'}</div>
                      </td>
                      <td style={{ padding: '13px 14px' }}>{project.status || '—'}</td>
                      <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>{money(project.contractValue)}</td>
                      <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>{money(project.certifiedValue)}</td>
                      <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>{money(project.billedValue)}</td>
                      <td style={{ padding: '13px 14px' }}>{project.physicalProgressPct === null ? 'No quantity data' : `${project.physicalProgressPct}%`}</td>
                      <td style={{ padding: '13px 14px' }}>{formatNumber(project.activityCount)}</td>
                      <td style={{ padding: '13px 14px', color: project.delayedActivities ? '#b91c1c' : '#475569' }}>{formatNumber(project.delayedActivities)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, tone, label, value, detail }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14, minHeight: 88 }}>
      <div style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 9, background: `${tone}16`, color: tone, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
        <div style={{ color: '#0f172a', fontSize: 21, fontWeight: 750, marginTop: 3 }}>{value}</div>
        {detail && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 3 }}>{detail}</div>}
      </div>
    </div>
  );
}

function EmptyChartMessage({ children }) {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>{children}</div>;
}
