'use client';
import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Key, Activity, UserCheck, ArrowRight, Zap,
} from 'lucide-react';
import Link from 'next/link';

function StatCard({ icon: Icon, label, value, color, bg, sub }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats]   = useState({ permissions: 0, auditToday: 0 });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/permissions').then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/admin/audit-log?limit=5').then(r => r.json()).catch(() => ({ data: [], total: 0 })),
    ]).then(([perms, audit]) => {
      if (cancelled) return;
      setStats({
        permissions: perms.total       || 0,
        auditToday:  audit.total       || 0,
      });
      setRecentLogs(audit.data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b', gap: 10 }}>
      <Activity size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading dashboard…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Admin Overview
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          Manage project and employee-wide permissions, and review system activity.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Key}         label="Permissions"   value={stats.permissions} color="#f59e0b" bg="#fffbeb" sub="Granular rights" />
        <StatCard icon={ClipboardList} label="Audit Events" value={stats.auditToday} color="#8b5cf6" bg="#f5f3ff" sub="All time" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Quick Actions */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#f59e0b" /> Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Employee Project Access', href: '/admin-dashboard/employee-tools', icon: UserCheck,     color: '#0891b2' },
              { label: 'Access Logs',             href: '/admin-dashboard/access-logs',    icon: ClipboardList, color: '#8b5cf6' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none', color: '#0f172a', fontSize: 13, fontWeight: 600, background: '#fafafa', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa'; }}>
                <a.icon size={15} color={a.color} />
                {a.label}
                <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Audit */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#6366f1" /> Recent Activity
            </h2>
            <Link href="/admin-dashboard/access-logs" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>View all logs →</Link>
          </div>
          {recentLogs.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No activity yet. System just initialized.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: log.status === 'SUCCESS' ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.action} — {log.module}{log.subModule ? ` › ${log.subModule}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {log.user?.displayName || 'System'} · {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
