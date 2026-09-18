'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock3, Users, Target, Trophy, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#10b981'];

export default function MarketingAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/marketing/analytics');
        if (!res.ok) throw new Error('Failed to load analytics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="mkt-page-container">
        <div className="mkt-card">
          <div className="mkt-loading" style={{ minHeight: '200px' }}>
            <div className="mkt-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mkt-page-container">
        <div className="mkt-card mkt-card-body">
          No analytics data available.
        </div>
      </div>
    );
  }

  const inquiryData = (data.inquiryBreakdown || []).map(item => ({
    name: item.name,
    value: item.value,
  }));

  const performerData = (data.bestPerformers || []).map(item => ({
    name: item.name,
    value: item.count,
  }));

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">Marketing Analytics</h1>
          <div className="mkt-subtitle">Info wise inquiries, follow-up efficiency, and conversion timings</div>
        </div>
      </div>

      <div className="mkt-grid-4">
        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Users size={22} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Total Inquiries</p>
            <h3 className="mkt-kpi-value">{data.totals?.leads ?? 0}</h3>
          </div>
        </div>

        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <TrendingUp size={22} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Opportunities</p>
            <h3 className="mkt-kpi-value">{data.totals?.opportunities ?? 0}</h3>
          </div>
        </div>

        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}>
            <Activity size={22} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Avg Lead Duration</p>
            <h3 className="mkt-kpi-value">{data.metrics?.avgLeadDuration ?? '0d 0h'}</h3>
          </div>
        </div>

        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock3 size={22} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Avg Close Time</p>
            <h3 className="mkt-kpi-value">{data.metrics?.avgCloseTime ?? '0d 0h'}</h3>
          </div>
        </div>
      </div>

      <div className="mkt-grid-2">
        <div className="mkt-card">
          <div className="mkt-card-body">
            <h3 className="mkt-section-title"><BarChart3 size={18} color="#4f46e5" /> Inquiry-wise breakdown</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inquiryData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {inquiryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mkt-card">
          <div className="mkt-card-body">
            <h3 className="mkt-section-title"><Target size={18} color="#ec4899" /> Inquiry source share</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inquiryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={4}>
                    {inquiryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="mkt-grid-2">
        <div className="mkt-card">
          <div className="mkt-card-body">
            <h3 className="mkt-section-title"><Trophy size={18} color="#059669" /> Best performers</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {performerData.length ? (
                performerData.map((person, index) => (
                  <div key={person.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: COLORS[index % COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                        {person.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{person.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Follow-ups logged</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{person.value}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b' }}>No follow-up data available yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mkt-card">
          <div className="mkt-card-body">
            <h3 className="mkt-section-title"><Clock3 size={18} color="#f59e0b" /> Timing metrics</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                <span>Avg lead duration</span>
                <strong>{data.metrics?.avgLeadDuration ?? '0d 0h'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                <span>Avg opportunity duration</span>
                <strong>{data.metrics?.avgOpportunityDuration ?? '0d 0h'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                <span>Avg close time</span>
                <strong>{data.metrics?.avgCloseTime ?? '0d 0h'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
