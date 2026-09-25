'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, Trophy, Target, 
  TrendingUp, PieChart
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';

export default function MarketingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/marketing/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="mkt-page-container">
        <div className="mkt-loading">
          <div className="mkt-spinner"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="mkt-page-container mkt-text-danger">Failed to load dashboard data</div>;
  }

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

  const sourceData = data.leadsBySource.map((s) => ({
    name: s.leadSource || 'Unknown',
    value: s._count.leadSource
  }));

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <h1 className="mkt-title">Marketing Overview</h1>
        <div className="mkt-badge mkt-badge-slate">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      <div className="mkt-grid-4">
        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Users size={24} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Total Leads</p>
            <h3 className="mkt-kpi-value">{data.totalLeads}</h3>
          </div>
        </div>

        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <Briefcase size={24} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Opportunities</p>
            <h3 className="mkt-kpi-value">{data.totalOpportunities}</h3>
          </div>
        </div>

        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}>
            <Target size={24} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Pipeline Value</p>
            <h3 className="mkt-kpi-value">{formatCurrency(data.pipelineValue)}</h3>
          </div>
        </div>

        <div className="mkt-card mkt-kpi-card">
          <div className="mkt-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Trophy size={24} />
          </div>
          <div className="mkt-kpi-info">
            <p className="mkt-kpi-label">Won Value</p>
            <h3 className="mkt-kpi-value">{formatCurrency(data.wonValue)}</h3>
          </div>
        </div>
      </div>

      <div className="mkt-grid-2">
        <div className="mkt-card">
          <div className="mkt-card-body">
            <h3 className="mkt-section-title"><TrendingUp size={18} color="#4f46e5" /> Sales Funnel</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.funnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={100} tick={{fill: '#64748b'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {data.funnel.map((entry, index) => (
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
            <h3 className="mkt-section-title"><PieChart size={18} color="#ec4899" /> Leads by Source</h3>
            <div style={{ height: '300px' }}>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  No source data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
