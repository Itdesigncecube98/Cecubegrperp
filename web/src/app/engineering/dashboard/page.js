'use client';
import React, { useState, useEffect } from 'react';
import { 
  Building2, HardHat, TrendingDown, Receipt, 
  Clock, CheckCircle, AlertTriangle, Play
} from 'lucide-react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function EngineeringDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/engineering/dashboard');
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const projectProgressData = [
    { name: 'Executed', value: data?.executedValue || 0 },
    { name: 'Remaining', value: (data?.totalContractValue || 0) - (data?.executedValue || 0) },
  ];
  const COLORS = ['#7c3aed', '#e2e8f0'];

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Execution Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Project Management, Planning, Site, and Billing overview</p>
        </div>
        <Link href="/engineering/projects" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
          <Building2 size={16} /> All Projects
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* KPI 1 */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Building2 size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 4px 0' }}>Active Projects</p>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{data?.activeProjects} / {data?.totalProjects}</h3>
          </div>
        </div>
        
        {/* KPI 2 */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 4px 0' }}>Planning Variance</p>
            <h3 style={{ color: '#b91c1c', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{data?.planningVariance}%</h3>
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <HardHat size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 4px 0' }}>Today's Manpower</p>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{data?.manpowerToday} <span style={{fontSize: '0.875rem', fontWeight: 'normal', color: '#64748b'}}>across {data?.dprsToday} sites</span></h3>
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Receipt size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 4px 0' }}>Total RA Billed</p>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{formatCurrency(data?.billedValue)}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Project Pipeline Chart */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Project Execution vs Billing (In Cr)</h3>
          </div>
          <div style={{ height: '350px', padding: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Contract Value', value: 4.5 },
                { name: 'Executed (Site)', value: 1.25 },
                { name: 'Billed (RA)', value: 0.95 },
                { name: 'Certified', value: 0.80 },
              ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Milestones & Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: '0 0 16px 0' }}>Overall Project Progress</h3>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '120px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectProgressData} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="value">
                      {projectProgressData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginLeft: '16px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                  {Math.round(((data?.executedValue || 0) / (data?.totalContractValue || 1)) * 100)}%
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Financial Progress</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} /> {data?.delayedActivities} Critical Activities Delayed
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Upcoming Milestones</h3>
            </div>
            <div style={{ padding: '0' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data?.upcomingMilestones?.map(ms => (
                  <li key={ms.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px', color: ms.status === 'Delayed' ? '#ef4444' : '#10b981' }}>
                      {ms.status === 'Delayed' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>{ms.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Clock size={12} /> {new Date(ms.date).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
