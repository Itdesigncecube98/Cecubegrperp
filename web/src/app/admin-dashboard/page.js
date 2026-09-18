'use client';
import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Building2, ClipboardList, Key, AlertTriangle,
  TrendingUp, Activity, CheckCircle, Lock, UserCheck, FileText,
  ArrowRight, Zap,
} from 'lucide-react';
import Link from 'next/link';

const MODULES = [
  { label: 'HR',              color: '#6366f1', bg: '#eef2ff', key: 'HR' },
  { label: 'Engineering',     color: '#0ea5e9', bg: '#e0f2fe', key: 'Engineering' },
  { label: 'Purchase',        color: '#f59e0b', bg: '#fffbeb', key: 'Purchase' },
  { label: 'Store',           color: '#10b981', bg: '#ecfdf5', key: 'Store' },
  { label: 'Planning',        color: '#8b5cf6', bg: '#f5f3ff', key: 'Planning' },
  { label: 'Site',            color: '#ef4444', bg: '#fef2f2', key: 'Site' },
  { label: 'Accounts',        color: '#14b8a6', bg: '#f0fdfa', key: 'Accounts' },
  { label: 'Marketing',       color: '#f97316', bg: '#fff7ed', key: 'Marketing' },
  { label: 'Tender',          color: '#06b6d4', bg: '#ecfeff', key: 'Tender' },
  { label: 'Quality',         color: '#22c55e', bg: '#f0fdf4', key: 'Quality' },
  { label: 'Safety',          color: '#dc2626', bg: '#fef2f2', key: 'Safety' },
  { label: 'Project Billing', color: '#7c3aed', bg: '#faf5ff', key: 'Project Billing' },
  { label: 'Subcontractor',   color: '#0891b2', bg: '#ecfeff', key: 'Subcontractor' },
];

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
  const [stats, setStats]   = useState({ users: 0, roles: 0, companies: 0, permissions: 0, auditToday: 0 });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/admin/roles').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/admin/company-setup').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/admin/permissions').then(r => r.json()).catch(() => ({ total: 0 })),
      fetch('/api/admin/audit-log?limit=5').then(r => r.json()).catch(() => ({ data: [], total: 0 })),
    ]).then(([users, roles, companies, perms, audit]) => {
      setStats({
        users:       users.total       || 0,
        roles:       (roles.data       || []).length,
        companies:   (companies.data   || []).length,
        permissions: perms.total       || 0,
        auditToday:  audit.total       || 0,
      });
      setRecentLogs(audit.data || []);
      setLoading(false);
    });
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
          Manage users, roles, permissions, and system configuration across all modules.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Users}       label="System Users"  value={stats.users}       color="#6366f1" bg="#eef2ff" sub="Active accounts" />
        <StatCard icon={Shield}      label="Roles"         value={stats.roles}       color="#0ea5e9" bg="#e0f2fe" sub="Permission groups" />
        <StatCard icon={Building2}   label="Companies"     value={stats.companies}   color="#10b981" bg="#ecfdf5" sub="Registered" />
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
              { label: 'Add New User',      href: '/admin-dashboard/users',    icon: Users,         color: '#6366f1' },
              { label: 'Create Role',       href: '/admin-dashboard/roles',    icon: Shield,        color: '#0ea5e9' },
              { label: 'Add Company',       href: '/admin-dashboard/company',  icon: Building2,     color: '#10b981' },
              { label: 'View Audit Log',    href: '/admin-dashboard/audit',    icon: ClipboardList, color: '#8b5cf6' },
              { label: 'Security Settings', href: '/admin-dashboard/security', icon: Lock,          color: '#ef4444' },
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
            <Link href="/admin-dashboard/audit" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
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

      {/* Module Grid */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color="#10b981" /> ERP Modules
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {MODULES.map(mod => (
            <Link key={mod.key} href={`/admin-dashboard/module/${mod.key.toLowerCase().replace(/\s+/g, '-')}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px', borderRadius: 12, border: `1px solid ${mod.bg === '#fff' ? '#e2e8f0' : mod.color + '30'}`, background: mod.bg, textDecoration: 'none', gap: 8, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${mod.color}20`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: mod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${mod.color}40` }}>
                <UserCheck size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: mod.color, textAlign: 'center', lineHeight: 1.3 }}>{mod.label}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Manage Access</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
