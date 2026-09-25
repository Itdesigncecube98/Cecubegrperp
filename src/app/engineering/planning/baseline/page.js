'use client';
import React, { useState } from 'react';
import { Calendar, Plus, Save, Activity } from 'lucide-react';
import Link from 'next/link';

export default function BaselineSchedule() {
  const [activities, setActivities] = useState([
    { id: 1, wbs: 'Mobilization', name: 'Site Setup', qty: 1, unit: 'Lot', start: '2026-09-01', finish: '2026-09-07', weight: 5 },
    { id: 2, wbs: 'Civil Work', name: 'Excavation', qty: 5000, unit: 'Cum', start: '2026-09-08', finish: '2026-09-20', weight: 15 },
    { id: 3, wbs: 'Electrical', name: 'Cable Laying', qty: 15000, unit: 'Mtr', start: '2026-09-21', finish: '2026-10-15', weight: 30 }
  ]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Baseline Schedule</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Define WBS and planned activities</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
          <Save size={16} /> Save Baseline
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ fontWeight: '500', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#7c3aed" /> Project: PROJ-2026-001 (Solar Plant EPC)
          </div>
          <Link href="/engineering/planning/add-activity" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
              <Plus size={14} /> Add Activity
            </button>
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>WBS Group</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Activity Name</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Qty & Unit</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Planned Start</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Planned Finish</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Weightage (%)</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(act => (
                <tr key={act.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '500', color: '#475569' }}>{act.wbs}</td>
                  <td style={{ padding: '16px 20px', color: '#0f172a' }}>{act.name}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{act.qty} {act.unit}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="#64748b"/> {act.start}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="#64748b"/> {act.finish}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: '500', color: '#7c3aed' }}>{act.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
