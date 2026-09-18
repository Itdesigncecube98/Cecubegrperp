'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Clock, AlertTriangle, Search, Filter } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function PlanningDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/engineering/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        } else {
          console.error('Failed to fetch projects:', res.status);
        }
      } catch (err) {
        console.error('Error loading projects:', err);
        // Continue with empty projects array
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const dummyVarianceData = [
    { name: 'Site Prep', planned: 100, actual: 100 },
    { name: 'Foundation', planned: 80, actual: 60 },
    { name: 'Structure', planned: 40, actual: 10 },
    { name: 'Cabling', planned: 0, actual: 0 }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Planning Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Monitor project schedules, variance, and delayed activities</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Average Planned %</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>65%</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Average Actual %</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>58%</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Overall Variance</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444' }}>-7%</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Delayed Activities</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b' }}>12</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Planned vs Actual Progress</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dummyVarianceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="planned" fill="#e2e8f0" name="Planned %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#7c3aed" name="Actual %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Critical Delay Alerts</h3>
          </div>
          <div style={{ padding: '0' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>Transformer Foundation</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Variance: -15% | Delay: 8 Days</div>
                </div>
              </li>
              <li style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>Control Room Slab</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Variance: -10% | Delay: 4 Days</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
