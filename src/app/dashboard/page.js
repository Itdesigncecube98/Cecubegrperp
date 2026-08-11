'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, UserPlus, Mail, MapPin, PlusCircle, FileText, 
  RefreshCw, Clock, CheckCircle, File, Building, PenTool, 
  Map, BarChart2, Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, CartesianGrid, PieChart, Pie, Legend } from 'recharts';
import './dashboard.css';
import oldStyles from '../employee/dashboard/dashboard.module.css';
import { useAutoRefresh, formatRefreshTime } from '../../lib/useAutoRefresh';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateArrivals: 0,
    activeEmployees: 0,
    gpsLocations: 0
  });

  const [whoIsIn, setWhoIsIn] = useState([
    { name: 'IN', value: 0 },
    { name: 'OUT', value: 0 },
    { name: 'NO PUNCH', value: 0 },
    { name: 'ON LEAVE', value: 0 }
  ]);

  const [dailyTrend, setDailyTrend] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [topHours, setTopHours] = useState([]);
  const empCountRef = useRef(0);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [router]);

  // Fast path: one summary API → show dashboard immediately; top-hours loads after
  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/attendance/dashboard-summary?days=10');
      const summary = await res.json();
      if (summary.error) throw new Error(summary.error);

      setStats({
        totalEmployees: summary.totalEmployees || 0,
        presentToday: summary.presentToday || 0,
        lateArrivals: 0,
        activeEmployees: summary.totalEmployees || 0,
        gpsLocations: summary.gpsLocations || 0
      });
      empCountRef.current = summary.totalEmployees || 0;
      if (Array.isArray(summary.whoIsIn)) setWhoIsIn(summary.whoIsIn);
      if (Array.isArray(summary.statusDistribution)) setStatusDistribution(summary.statusDistribution);
      if (Array.isArray(summary.dailyTrend)) setDailyTrend(summary.dailyTrend);
    } catch (e) {
      console.error('Failed to load admin dashboard data', e);
      setStats(prev => ({ ...prev, totalEmployees: 0, presentToday: 0, activeEmployees: 0, gpsLocations: 0 }));
      setWhoIsIn([
        { name: 'IN', value: 0 },
        { name: 'OUT', value: 0 },
        { name: 'NO PUNCH', value: 0 },
        { name: 'ON LEAVE', value: 0 }
      ]);
      setStatusDistribution([]);
      setDailyTrend([]);
    } finally {
      setLoading(false);
    }

    // Non-blocking: top hours chart
    fetch('/api/attendance/top-hours?days=30')
      .then(r => r.json())
      .then(topData => setTopHours(Array.isArray(topData) ? topData : []))
      .catch(() => setTopHours([]));
  };

  // Silent auto-refresh also uses the fast summary endpoint
  const refreshToday = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/dashboard-summary?days=10');
      if (!res.ok) return;
      const summary = await res.json();
      if (summary.error) return;
      setStats(prev => ({
        ...prev,
        totalEmployees: summary.totalEmployees || 0,
        presentToday: summary.presentToday || 0,
        activeEmployees: summary.totalEmployees || 0,
        gpsLocations: summary.gpsLocations ?? prev.gpsLocations
      }));
      if (Array.isArray(summary.whoIsIn)) setWhoIsIn(summary.whoIsIn);
      if (Array.isArray(summary.statusDistribution)) setStatusDistribution(summary.statusDistribution);
      if (Array.isArray(summary.dailyTrend)) setDailyTrend(summary.dailyTrend);
    } catch {
      // Server restarting / offline — ignore
    }
  }, []);

  const { refresh, refreshing, lastRefreshed, autoRefresh, setAutoRefresh } = useAutoRefresh(refreshToday, {
    intervalMs: 15000,
    enabled: true
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="customTooltip">
          <div className="tooltipLabel">{payload[0].payload.fullDate || label}</div>
          {payload.map((entry, index) => (
            <div key={index} className="tooltipItem" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="dashboardContainer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
          <div style={{ width: 200, height: 28, borderRadius: 8, background: 'linear-gradient(90deg,#e8ecf4 25%,#f1f5f9 50%,#e8ecf4 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </div>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 16, background: 'linear-gradient(90deg,#e8ecf4 25%,#f1f5f9 50%,#e8ecf4 75%)', backgroundSize: '200% 100%', marginBottom: 16 }} />
        ))}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  return (
    <div className="dashboardContainer">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="dashboardTitle">Admin Dashboard</h1>
          <p className="dashboardSubtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 10, cursor: refreshing ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, color: '#0f766e', transition: 'all 0.2s' }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ width: 14, height: 14 }} />
            Auto
          </label>
          <span style={{ fontSize: 11, color: refreshing ? '#0f766e' : '#94a3b8' }}>
            {refreshing ? 'Live update…' : lastRefreshed ? formatRefreshTime(lastRefreshed) : ''}
          </span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
      {/* Row 1: Action Cards & Who Is In */}
      <div className="topRow">
        {/* Bring Employees */}
        <div className="card actionCard">
          <h2 className="cardTitle">Bring Employees in to your HRMS</h2>
          <div className="actionGrid">
            <div className="actionSquare" onClick={() => router.push('/dashboard/employees')}>
              <div className="actionValue">{stats.activeEmployees}</div>
              <div className="actionLabel">ACTIVE<br/>EMPLOYEES</div>
            </div>
            <div className="actionSquare" onClick={() => router.push('/dashboard/employees')}>
              <UserPlus size={28} className="actionIcon" />
              <div className="actionLabel">ADD<br/>EMPLOYEES</div>
            </div>
          </div>
        </div>

        {/* Setup GPS */}
        <div className="card actionCard">
          <h2 className="cardTitle">Setup Mobile GPS Checkin</h2>
          <div className="actionGrid">
            <div className="actionSquare" onClick={() => router.push('/dashboard/locations')}>
              <div className="actionValue">{stats.gpsLocations}</div>
              <div className="actionLabel">GPS<br/>LOCATIONS</div>
            </div>
            <div className="actionSquare" onClick={() => router.push('/dashboard/locations')}>
              <MapPin size={28} className="actionIcon" />
              <div className="actionLabel">ADD GPS<br/>LOCATION</div>
            </div>
          </div>
        </div>

        {/* Who is in? */}
        <div className="card chartCard">
          <div className="chartHeader">
            <div>
              <h2 className="chartTitle" style={{ color: '#6366f1' }}>Who is In? 🟢</h2>
              <p className="chartSubtitle" style={{ margin: 0 }}>Live today status</p>
            </div>
            <RefreshCw size={15} color="#c7d2fe" style={{cursor:'pointer'}} onClick={loadDashboardData} />
          </div>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[{label:'IN',val:whoIsIn[0].value,bg:'#dcfce7',c:'#15803d'},{label:'OUT',val:whoIsIn[1].value,bg:'#dbeafe',c:'#1d4ed8'},{label:'NO PUNCH',val:whoIsIn[2].value,bg:'#fee2e2',c:'#dc2626'},{label:'ON LEAVE',val:whoIsIn[3].value,bg:'#d1fae5',c:'#065f46'}].map(({label,val,bg,c})=>(
              <div key={label} style={{background:bg,borderRadius:10,padding:'6px 12px',display:'flex',flexDirection:'column',alignItems:'center',flex:1,minWidth:60}}>
                <span style={{fontSize:18,fontWeight:800,color:c}}>{val}</span>
                <span style={{fontSize:10,fontWeight:700,color:c,letterSpacing:0.5}}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'All', IN: whoIsIn[0].value, OUT: whoIsIn[1].value, 'NO PUNCH': whoIsIn[2].value, 'ON LEAVE': whoIsIn[3].value }]} margin={{ top: 0, right: 0, left: -20, bottom: 20 }} barSize={30}>
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickCount={5} domain={[0, 'dataMax + 1']} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="IN" stackId="a" fill="#22c55e" />
                <Bar dataKey="OUT" stackId="a" fill="#3b82f6" />
                <Bar dataKey="NO PUNCH" stackId="a" fill="#ef4444" />
                <Bar dataKey="ON LEAVE" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Stats */}
      <div className="statsRow">
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#ede9fe 0%,#f5f3ff 100%)', border: '1px solid #ddd6fe' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Users size={26} color="#6366f1" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#7c3aed' }}>Total Employees</span>
            <span className="statValue" style={{ color: '#4c1d95' }}>{stats.totalEmployees}</span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#dcfce7 0%,#f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(34,197,94,0.15)' }}>
            <CheckCircle size={26} color="#16a34a" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#15803d' }}>Present Today</span>
            <span className="statValue" style={{ color: '#14532d' }}>{stats.presentToday}</span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#fef9c3 0%,#fefce8 100%)', border: '1px solid #fde68a' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(234,179,8,0.15)' }}>
            <MapPin size={26} color="#ca8a04" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#a16207' }}>GPS Locations</span>
            <span className="statValue" style={{ color: '#713f12' }}>{stats.gpsLocations}</span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#fee2e2 0%,#fff1f2 100%)', border: '1px solid #fecaca' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <Users size={26} color="#dc2626" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#dc2626' }}>Absent Today</span>
            <span className="statValue" style={{ color: '#7f1d1d' }}>{Math.max(0, stats.totalEmployees - stats.presentToday)}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Daily Attendance Trend */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="cardTitle">Daily Attendance Trend</h2>
        <p className="cardSubtitle">Overview of presence across the last 10 working days</p>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrend} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Bar dataKey="Absent" fill="#fca5a5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Present" fill="#bbf7d0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Status Distribution & Top Hours */}
      <div className="chartsRow">
        <div className="card" style={{ flex: 1 }}>
          <h2 className="cardTitle">Attendance Status Distribution</h2>
          <p className="cardSubtitle">Past 30 days distribution</p>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusDistribution} 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={2} 
                  dataKey="value"
                  stroke="none"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h2 className="cardTitle">Average Hours Devoted (Top Employees)</h2>
          <p className="cardSubtitle">Average daily hours over the past 30 days</p>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHours} margin={{ top: 20, right: 30, left: 0, bottom: 40 }} barSize={28}>
                <defs>
                  <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                  dy={12}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickCount={6}
                  domain={[0, dataMax => Math.max(10, Math.ceil(dataMax * 1.2))]}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.08)', radius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          padding: '10px 16px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}>
                          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: 13 }}>
                            {payload[0].payload.name}
                          </div>
                          <div style={{ color: '#6366f1', fontSize: 14, fontWeight: 600 }}>
                            ⏱ {payload[0].value} hrs / day
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="hours" radius={[8, 8, 4, 4]} maxBarSize={40}>
                  {topHours.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="url(#hoursGradient)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="quickLinksSection">
        <h2 className="quickLinksTitle">Quick Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>

          {/* Punches */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Punches</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Team Punches','/dashboard/punches/team-punches'],['Who Is In?','/dashboard/punches/whos-in']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#f5f3ff';e.currentTarget.style.color='#6366f1'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c7d2fe', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Attendance */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Attendance</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Team Attendance Records','/dashboard/attendance/team-records'],['Team Regularization','/dashboard/attendance/team-regularization']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#f0fdf4';e.currentTarget.style.color='#16a34a'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#bbf7d0', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Leave */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Leave</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Leave Requests (Approve)','/dashboard/leaves/requests'],['Apply Leave','/dashboard/leaves/apply'],['Team Applications','/dashboard/leaves/team-applications'],['Leave Balances','/dashboard/leaves/balances'],["Who is on Leave?",'/dashboard/leaves/whos-on-leave']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#fffbeb';e.currentTarget.style.color='#d97706'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fde68a', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Organization */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Organization</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Holidays','/dashboard/organization/holidays'],['Directory','/dashboard/organization/directory'],['Announcements','/dashboard/organization/announcements']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#1d4ed8'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#bfdbfe', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Field Journey */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Map size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Field Journey</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Summary View','/dashboard/journey/summary'],['Map View','/dashboard/journey/map']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#ecfdf5';e.currentTarget.style.color='#059669'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a7f3d0', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#64748b,#334155)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <File size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Documents</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Personal Documents','/dashboard/documents/personal'],['Company Documents','/dashboard/documents/company'],['Dependent Documents','/dashboard/documents/dependent']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';e.currentTarget.style.color='#334155'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Reports */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#ec4899,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Reports</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Punch Reports','/dashboard/reports'],['Attendance Reports','/dashboard/reports'],['Journey Reports','/dashboard/reports'],['Leave Reports','/dashboard/reports'],['Geofence Reports','/dashboard/reports'],['Audit Reports','/dashboard/reports'],['Employee Reports','/dashboard/reports'],['Custom Reports','/dashboard/reports']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#fdf2f8';e.currentTarget.style.color='#be185d'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbcfe8', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
