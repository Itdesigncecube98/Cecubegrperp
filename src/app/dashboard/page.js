'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, UserPlus, Mail, MapPin, PlusCircle, FileText, 
  RefreshCw, Clock, CheckCircle, File, Building, PenTool, 
  Map, BarChart2, Calendar, Settings, DollarSign, Activity, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, CartesianGrid, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
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
  const [topPresentDays, setTopPresentDays] = useState([]);
  const [workforceKpis, setWorkforceKpis] = useState({
    totalEmployees: 0,
    genderSplit: { male: 0, female: 0 },
    avgAge: 0,
    avgTenureYears: 0,
    avgSalary: 0,
    avgOvertime: 0,
    charts: {
      empTypeData: [],
      deptCountData: [],
      deptSalaryData: [],
      tenureData: []
    }
  });
  const empCountRef = useRef(0);

  const [chartModes, setChartModes] = useState({
    empType: 'pie',
    empTenure: 'pie',
    dailyTrend: 'bar',
    topHours: 'bar',
    topPresent: 'bar',
    deptHeadcount: 'bar',
    deptSalary: 'bar'
  });
  
  const [chartLoading, setChartLoading] = useState({
    dailyTrend: false,
    topHours: false,
    topPresent: false,
    workforceKpis: false
  });

  const [trendStartDate, setTrendStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 9);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  const [trendEndDate, setTrendEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [statusStartDate, setStatusStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 9);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  const [statusEndDate, setStatusEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const fetchDailyTrend = async () => {
    setChartLoading(prev => ({ ...prev, dailyTrend: true }));
    try {
      const res = await fetch(`/api/attendance/daily-trend?startDate=${trendStartDate}&endDate=${trendEndDate}`);
      const trendData = await res.json();
      if (!trendData.error && Array.isArray(trendData)) {
        setDailyTrend(trendData);
      }
    } catch (e) {}
    setChartLoading(prev => ({ ...prev, dailyTrend: false }));
  };

  const fetchStatusDist = async () => {
    setChartLoading(prev => ({ ...prev, statusDist: true }));
    try {
      const res = await fetch(`/api/attendance/daily-trend?startDate=${statusStartDate}&endDate=${statusEndDate}`);
      const trendData = await res.json();
      if (!trendData.error && Array.isArray(trendData)) {
        const distPresent = trendData.reduce((sum, day) => sum + day.Present, 0);
        const distCOff = trendData.reduce((sum, day) => sum + day.COff, 0);
        const distAbsent = trendData.reduce((sum, day) => sum + day.Absent, 0);
        const distHoliday = trendData.reduce((sum, day) => sum + day.Holiday, 0);
        const distOff = trendData.reduce((sum, day) => sum + day.Off, 0);
        const distLeave = trendData.reduce((sum, day) => sum + day.Leave, 0);
        
        setStatusDistribution([
          { name: 'Present', value: distPresent, color: '#bbf7d0' },
          { name: 'COff', value: distCOff, color: '#166534' },
          { name: 'Absent', value: distAbsent, color: '#fca5a5' },
          { name: 'Holiday', value: distHoliday, color: '#fcd34d' },
          { name: 'Off', value: distOff, color: '#93c5fd' },
          { name: 'Leave', value: distLeave, color: '#10b981' }
        ]);
      }
    } catch (e) {}
    setChartLoading(prev => ({ ...prev, statusDist: false }));
  };

  const fetchTopHours = async () => {
    setChartLoading(prev => ({ ...prev, topHours: true }));
    try {
      const res = await fetch('/api/attendance/top-hours?days=30');
      const data = await res.json();
      setTopHours(Array.isArray(data) ? data : []);
    } catch { setTopHours([]); }
    setChartLoading(prev => ({ ...prev, topHours: false }));
  };

  const fetchTopPresentDays = async () => {
    setChartLoading(prev => ({ ...prev, topPresent: true }));
    try {
      const res = await fetch('/api/attendance/top-present-days?days=30');
      const data = await res.json();
      setTopPresentDays(Array.isArray(data) ? data : []);
    } catch { setTopPresentDays([]); }
    setChartLoading(prev => ({ ...prev, topPresent: false }));
  };

  const fetchWorkforceKpis = async () => {
    setChartLoading(prev => ({ ...prev, workforceKpis: true }));
    try {
      const res = await fetch('/api/analytics/workforce-kpis');
      const data = await res.json();
      if (!data.error) setWorkforceKpis(data);
    } catch {}
    setChartLoading(prev => ({ ...prev, workforceKpis: false }));
  };

  const toggleChartMode = (chartKey) => {
    setChartModes(prev => ({
      ...prev,
      [chartKey]: prev[chartKey] === 'bar' ? 'line' : 'bar'
    }));
  };

  const ChartToolbar = ({ chartKey, onRefresh, loading, hideToggle, supportPie }) => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {!hideToggle && (
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
          {supportPie && (
            <button 
              onClick={() => setChartModes(prev => ({...prev, [chartKey]: 'pie'}))}
              style={{ all: 'unset', cursor: 'pointer', padding: '4px', borderRadius: '4px', background: chartModes[chartKey] === 'pie' ? '#fff' : 'transparent', boxShadow: chartModes[chartKey] === 'pie' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: chartModes[chartKey] === 'pie' ? '#0ea5e9' : '#64748b' }}
              title="Pie Chart"
            >
              <PieChartIcon size={16} />
            </button>
          )}
          <button 
            onClick={() => setChartModes(prev => ({...prev, [chartKey]: 'bar'}))}
            style={{ all: 'unset', cursor: 'pointer', padding: '4px', borderRadius: '4px', background: chartModes[chartKey] === 'bar' || (!chartModes[chartKey] && !supportPie) ? '#fff' : 'transparent', boxShadow: chartModes[chartKey] === 'bar' || (!chartModes[chartKey] && !supportPie) ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: chartModes[chartKey] === 'bar' || (!chartModes[chartKey] && !supportPie) ? '#0ea5e9' : '#64748b' }}
            title="Bar Chart"
          >
            <BarChart3 size={16} />
          </button>
          <button 
            onClick={() => setChartModes(prev => ({...prev, [chartKey]: 'line'}))}
            style={{ all: 'unset', cursor: 'pointer', padding: '4px', borderRadius: '4px', background: chartModes[chartKey] === 'line' ? '#fff' : 'transparent', boxShadow: chartModes[chartKey] === 'line' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: chartModes[chartKey] === 'line' ? '#0ea5e9' : '#64748b' }}
            title="Line Chart"
          >
            <LineChartIcon size={16} />
          </button>
        </div>
      )}
      <button 
        onClick={onRefresh}
        disabled={loading}
        style={{ all: 'unset', cursor: loading ? 'default' : 'pointer', padding: '6px', borderRadius: '6px', background: '#eff6ff', color: '#3b82f6', opacity: loading ? 0.5 : 1 }}
        title="Refresh"
      >
        <RefreshCw size={16} className={loading ? 'spin' : ''} />
      </button>
    </div>
  );

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
        gpsLocations: summary.gpsLocations || 0,
        todayStatus: summary.todayStatus || 'Working',
        absentToday: summary.absentToday || 0,
        leavesToday: summary.leavesToday || 0
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

    // Non-blocking fetching
    fetchTopHours();
    fetchTopPresentDays();
    fetchWorkforceKpis();
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
        gpsLocations: summary.gpsLocations ?? prev.gpsLocations,
        todayStatus: summary.todayStatus || 'Working',
        absentToday: summary.absentToday || 0,
        leavesToday: summary.leavesToday || 0
      }));
      if (Array.isArray(summary.whoIsIn)) setWhoIsIn(summary.whoIsIn);
      if (Array.isArray(summary.statusDistribution)) setStatusDistribution(summary.statusDistribution);
      // Only update the trend chart if user hasn't changed the date range
      // (i.e., trendEndDate still matches today)
      const todayStr = new Date().toISOString().split('T')[0];
      if (trendEndDate === todayStr && Array.isArray(summary.dailyTrend)) {
        setDailyTrend(summary.dailyTrend);
      }
    } catch {
      // Server restarting / offline — ignore
    }
  }, [trendEndDate]);

  const { refresh, refreshing, lastRefreshed, autoRefresh, setAutoRefresh } = useAutoRefresh(refreshToday, {
    intervalMs: 15000,
    enabled: true
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const displayLabel = (payload[0].payload.fullDate || label || '').split('||')[0];
      return (
        <div className="customTooltip">
          <div className="tooltipLabel">{displayLabel}</div>
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

  const CustomTick = ({ x, y, payload }) => {
    const parts = (payload.value || '').split('||');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize={12}>
          <tspan x="0" dy="0">{parts[0]}</tspan>
          {parts[1] && <tspan x="0" dy="14" fill={parts[1] === 'Off' ? '#3b82f6' : '#f59e0b'} fontWeight="600" fontSize={11}>{parts[1]}</tspan>}
        </text>
      </g>
    );
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
              <h2 className="chartTitle" style={{ color: 'var(--accent-color)' }}>Who is In? 🟢</h2>
              <p className="chartSubtitle" style={{ margin: 0 }}>Live today status</p>
            </div>
            <RefreshCw size={15} color="#c7d2fe" style={{cursor:'pointer'}} onClick={loadDashboardData} />
          </div>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {whoIsIn.map(({name, value, bg, c}) => (
              <div key={name} style={{background:bg,borderRadius:10,padding:'6px 12px',display:'flex',flexDirection:'column',alignItems:'center',flex:1,minWidth:60}}>
                <span style={{fontSize:18,fontWeight:800,color:c}}>{value}</span>
                <span style={{fontSize:10,fontWeight:700,color:c,letterSpacing:0.5}}>{name}</span>
              </div>
            ))}
          </div>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[ whoIsIn.reduce((acc, curr) => ({...acc, [curr.name]: curr.value}), {name: 'All'}) ]} margin={{ top: 0, right: 0, left: -20, bottom: 20 }} barSize={30}>
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickCount={5} domain={[0, 'dataMax + 1']} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                {whoIsIn.map((item) => (
                  <Bar key={item.name} dataKey={item.name} stackId="a" fill={item.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Stats */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#334155', marginBottom: '1rem', marginTop: '1.5rem', letterSpacing: '-0.01em' }}>Today Attendance</h2>
      <div className="statsRow">
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#e0f2fe 0%,#f0f9ff 100%)', border: '1px solid #bae6fd' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(14,165,233,0.15)' }}>
            <Users size={26} color="var(--accent-color)" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#0284c7' }}>Total Employees</span>
            <span className="statValue" style={{ color: '#075985' }}>{stats.totalEmployees}</span>
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
            <span className="statValue" style={{ color: '#7f1d1d' }}>
              {stats.absentToday}
            </span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%)', border: '1px solid #a7f3d0' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Users size={26} color="#10b981" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#047857' }}>Leave Today</span>
            <span className="statValue" style={{ color: '#064e3b' }}>
              {stats.leavesToday}
            </span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#fef9c3 0%,#fefce8 100%)', border: '1px solid #fde68a' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(234,179,8,0.15)' }}>
            <Calendar size={26} color="#ca8a04" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#a16207' }}>Holiday Today</span>
            <span className="statValue" style={{ color: '#713f12' }}>
              {stats.todayStatus === 'Holiday' ? Math.max(0, stats.totalEmployees - stats.presentToday) : 0}
            </span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)', border: '1px solid #bfdbfe' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Calendar size={26} color="#3b82f6" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#2563eb' }}>Off Today</span>
            <span className="statValue" style={{ color: '#1e3a8a' }}>
              {stats.todayStatus === 'Off' ? Math.max(0, stats.totalEmployees - stats.presentToday) : 0}
            </span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#dcfce7 0%,#f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(22,163,74,0.15)' }}>
            <CheckCircle size={26} color="#15803d" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#166534' }}>COff Today</span>
            <span className="statValue" style={{ color: '#14532d' }}>
              {stats.todayStatus !== 'Working' ? stats.presentToday : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Workforce Analytics */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#334155', marginBottom: '1rem', marginTop: '1.5rem', letterSpacing: '-0.01em' }}>Workforce Analytics</h2>
      <div className="statsRow">
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)', border: '1px solid #e2e8f0' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(15,23,42,0.1)' }}>
            <Users size={26} color="#0f172a" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#475569' }}>Total Employees</span>
            <span className="statValue" style={{ color: '#0f172a' }}>{workforceKpis.totalEmployees}</span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#fdf4ff 0%,#fce7f3 100%)', border: '1px solid #fbcfe8' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(219,39,119,0.15)' }}>
            <Activity size={26} color="#db2777" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#be185d' }}>Gender Split (M/F)</span>
            <span className="statValue" style={{ color: '#9d174d', fontSize: '1.5rem' }}>{workforceKpis.genderSplit.male} / {workforceKpis.genderSplit.female}</span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)', border: '1px solid #fde68a' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(217,119,6,0.15)' }}>
            <Calendar size={26} color="#d97706" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#b45309' }}>Average Age</span>
            <span className="statValue" style={{ color: '#92400e' }}>{workforceKpis.avgAge} <span style={{fontSize: '1rem'}}>yrs</span></span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#ecfeff 0%,#cffafe 100%)', border: '1px solid #a5f3fc' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(8,145,178,0.15)' }}>
            <Clock size={26} color="#0891b2" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#0e7490' }}>Average Tenure</span>
            <span className="statValue" style={{ color: '#164e63' }}>{workforceKpis.avgTenureYears} <span style={{fontSize: '1rem'}}>yrs</span></span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)', border: '1px solid #bbf7d0' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(22,163,74,0.15)' }}>
            <DollarSign size={26} color="#16a34a" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#15803d' }}>Average Salary</span>
            <span className="statValue" style={{ color: '#14532d' }}>₹{workforceKpis.avgSalary.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="card statCard" style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)', border: '1px solid #bfdbfe' }}>
          <div className="statIconWrapper" style={{ background: 'rgba(37,99,235,0.15)' }}>
            <Clock size={26} color="#2563eb" />
          </div>
          <div className="statInfo">
            <span className="statLabel" style={{ color: '#1d4ed8' }}>Avg Overtime/Wk</span>
            <span className="statValue" style={{ color: '#1e3a8a' }}>{workforceKpis.avgOvertime} <span style={{fontSize: '1rem'}}>hrs</span></span>
          </div>
        </div>
      </div>

      {/* Workforce Charts */}
      <div className="chartsRow" style={{ marginTop: '1.5rem' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Employment Type</h2>
              <p className="cardSubtitle">Distribution by employment status</p>
            </div>
            <ChartToolbar chartKey="empType" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} supportPie={true} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.empType === 'line' ? (
                <LineChart data={workforceKpis.charts?.empTypeData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" name="Employees" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : chartModes.empType === 'bar' ? (
                <BarChart data={workforceKpis.charts?.empTypeData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.08)', radius: 8 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Employees" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie 
                    data={workforceKpis.charts?.empTypeData || []} 
                    innerRadius={80} 
                    outerRadius={110} 
                    paddingAngle={2} 
                    dataKey="value"
                    stroke="none"
                  >
                    {(workforceKpis.charts?.empTypeData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0ea5e9', '#f59e0b', '#10b981', '#6366f1'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Employee Tenure</h2>
              <p className="cardSubtitle">Distribution of years of service</p>
            </div>
            <ChartToolbar chartKey="empTenure" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} supportPie={true} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.empTenure === 'line' ? (
                <LineChart data={workforceKpis.charts?.tenureData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" name="Employees" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : chartModes.empTenure === 'bar' ? (
                <BarChart data={workforceKpis.charts?.tenureData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.08)', radius: 8 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Employees" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie 
                    data={workforceKpis.charts?.tenureData || []} 
                    innerRadius={0} 
                    outerRadius={110} 
                    paddingAngle={1} 
                    dataKey="value"
                    stroke="#fff"
                  >
                    {(workforceKpis.charts?.tenureData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chartsRow" style={{ marginTop: '1.5rem' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Qualification Count</h2>
              <p className="cardSubtitle">Number of employees holding each qualification</p>
            </div>
            <ChartToolbar chartKey="eduCount" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} hideToggle={true} />
          </div>
          <div style={{ marginTop: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {(!workforceKpis.charts?.eduCountData || workforceKpis.charts.eduCountData.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No education data available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {workforceKpis.charts.eduCountData.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '12px 16px', 
                    borderBottom: idx < workforceKpis.charts.eduCountData.length - 1 ? '1px solid #e2e8f0' : 'none',
                    background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#0ea5e9', fontWeight: 500 }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Attrition Tenure</h2>
              <p className="cardSubtitle">Time spent by employees before quitting</p>
            </div>
            <ChartToolbar chartKey="attrition" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.attrition === 'line' ? (
                <LineChart data={workforceKpis.charts?.attritionData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" name="Employees" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={workforceKpis.charts?.attritionData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(239, 68, 68, 0.08)', radius: 8 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Employees" radius={[6, 6, 0, 0]} fill="#ef4444" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chartsRow" style={{ marginTop: '1.5rem' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Resignations (Last 12 Months)</h2>
              <p className="cardSubtitle">Trend of employees leaving the organisation</p>
            </div>
            <ChartToolbar chartKey="resignationTrend" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.resignationTrend === 'line' ? (
                <LineChart data={workforceKpis.charts?.resignationTrendData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" name="Resignations" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={workforceKpis.charts?.resignationTrendData || []} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(239, 68, 68, 0.08)', radius: 8 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Resignations" radius={[6, 6, 0, 0]} fill="#ef4444" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chartsRow">
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Headcount by Department</h2>
              <p className="cardSubtitle">Top departments by number of employees</p>
            </div>
            <ChartToolbar chartKey="deptHeadcount" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} />
          </div>
          <div style={{ height: '360px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.deptHeadcount === 'line' ? (
                <LineChart data={workforceKpis.charts?.deptCountData || []} margin={{ top: 20, right: 30, left: 0, bottom: 140 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={12} interval={0} angle={-40} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickCount={6} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" name="Employees" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={workforceKpis.charts?.deptCountData || []} margin={{ top: 20, right: 30, left: 0, bottom: 140 }} barSize={28}>
                  <defs>
                    <linearGradient id="deptCountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#6ee7b7" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={12} interval={0} angle={-40} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickCount={6} />
                  <Tooltip cursor={{ fill: 'rgba(16, 185, 129, 0.08)', radius: 8 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Employees" radius={[8, 8, 4, 4]}>
                    {(workforceKpis.charts?.deptCountData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#deptCountGrad)" />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Avg Salary by Department</h2>
              <p className="cardSubtitle">Average basic salary across departments</p>
            </div>
            <ChartToolbar chartKey="deptSalary" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} />
          </div>
          <div style={{ height: '360px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.deptSalary === 'line' ? (
                <LineChart data={workforceKpis.charts?.deptSalaryData || []} margin={{ top: 20, right: 30, left: 0, bottom: 140 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={12} interval={0} angle={-40} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickCount={6} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Avg Salary']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="avgSalary" name="Avg Salary" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={workforceKpis.charts?.deptSalaryData || []} margin={{ top: 20, right: 30, left: 0, bottom: 140 }} barSize={28}>
                  <defs>
                    <linearGradient id="deptSalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fcd34d" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={12} interval={0} angle={-40} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickCount={6} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip cursor={{ fill: 'rgba(245, 158, 11, 0.08)', radius: 8 }} formatter={(value) => [`₹${value.toLocaleString()}`, 'Avg Salary']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="avgSalary" name="Salary" radius={[8, 8, 4, 4]}>
                    {(workforceKpis.charts?.deptSalaryData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#deptSalGrad)" />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Salary Tables */}
      <div className="chartsRow" style={{ marginTop: '1.5rem' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Salary by Designation</h2>
              <p className="cardSubtitle">Total vs Avg Salary & Employee Count per Designation</p>
            </div>
            <ChartToolbar chartKey="designationSalary" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} hideToggle={true} />
          </div>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Designation</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Total Salary</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Avg Salary</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Employees</th>
                </tr>
              </thead>
              <tbody>
                {(workforceKpis.charts?.designationSalaryData || []).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : 'white' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>{row.designation}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>₹{row.totalSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>₹{row.avgSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>{row.empCount}</span>
                    </td>
                  </tr>
                ))}
                {(!workforceKpis.charts?.designationSalaryData || workforceKpis.charts.designationSalaryData.length === 0) && (
                  <tr>
                    <td colSpan="4" style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No salary data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="chartsRow" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Salary by Organisation</h2>
              <p className="cardSubtitle">Total vs Avg Salary & Employee Count per Organisation</p>
            </div>
            <ChartToolbar chartKey="orgSalary" onRefresh={fetchWorkforceKpis} loading={chartLoading.workforceKpis} hideToggle={true} />
          </div>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Organisation</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Total Salary</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Avg Salary</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Employees</th>
                </tr>
              </thead>
              <tbody>
                {(workforceKpis.charts?.orgSalaryData || []).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : 'white' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>{row.organisation}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>₹{row.totalSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>₹{row.avgSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>{row.empCount}</span>
                    </td>
                  </tr>
                ))}
                {(!workforceKpis.charts?.orgSalaryData || workforceKpis.charts.orgSalaryData.length === 0) && (
                  <tr>
                    <td colSpan="4" style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No organisation salary data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Organization Structure Shortcut */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)' }}>
            <Users size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: 700 }}>Organization Structure</h2>
            <p style={{ margin: '4px 0 0 0', color: '#3b82f6', fontSize: '14px', fontWeight: 500 }}>Corporate Hierarchy & Functional Reporting</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/dashboard/organization/structure')}
          style={{ background: 'white', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
        >
          View Structure
        </button>
      </div>

      {/* Row 3: Daily Attendance Trend */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="cardTitle">Daily Attendance Trend</h2>
            <p className="cardSubtitle">Overview of presence across selected dates</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                value={trendStartDate} 
                onChange={e => setTrendStartDate(e.target.value)} 
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>to</span>
              <input 
                type="date" 
                value={trendEndDate} 
                onChange={e => setTrendEndDate(e.target.value)} 
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <ChartToolbar chartKey="dailyTrend" onRefresh={fetchDailyTrend} loading={chartLoading.dailyTrend} />
          </div>
        </div>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', marginTop: '16px' }}>
          <div style={{ height: '300px', minWidth: `${Math.max(100, dailyTrend.length * 40)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartModes.dailyTrend === 'line' ? (
              <LineChart data={dailyTrend} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={<CustomTick />} dy={10} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="Leave" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Absent" stroke="#fca5a5" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Present" stroke="#bbf7d0" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="COff" stroke="#166534" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Holiday" stroke="#fcd34d" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Off" stroke="#93c5fd" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            ) : (
              <BarChart data={dailyTrend} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={<CustomTick />} dy={10} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Leave" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Present" fill="#bbf7d0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="COff" fill="#166534" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Holiday" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Off" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Status Distribution & Top Hours */}
      <div className="chartsRow">
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Attendance Status Distribution</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="date" 
                  value={statusStartDate} 
                  onChange={e => setStatusStartDate(e.target.value)} 
                  className="date-input"
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <span style={{ fontSize: '13px', color: '#64748b' }}>to</span>
                <input 
                  type="date" 
                  value={statusEndDate} 
                  onChange={e => setStatusEndDate(e.target.value)} 
                  className="date-input"
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>
            <ChartToolbar chartKey="statusDist" onRefresh={fetchStatusDist} hideToggle={false} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.statusDist === 'line' ? (
                <LineChart data={statusDistribution} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" name="Occurrences" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={statusDistribution} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.08)', radius: 8 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Occurrences" radius={[6, 6, 0, 0]}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Average Hours Devoted (Top Employees)</h2>
              <p className="cardSubtitle">Average daily hours over the past 30 days</p>
            </div>
            <ChartToolbar chartKey="topHours" onRefresh={fetchTopHours} loading={chartLoading.topHours} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.topHours === 'line' ? (
                <LineChart data={topHours} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={12} interval={0} angle={-20} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickCount={6} domain={[0, dataMax => Math.max(10, Math.ceil(dataMax * 1.2))]} unit="h" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: 13 }}>{payload[0].payload.name}</div>
                            <div style={{ color: '#6366f1', fontSize: 14, fontWeight: 600 }}>⏱ {payload[0].value} hrs / day</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="hours" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={topHours} margin={{ top: 20, right: 30, left: 0, bottom: 40 }} barSize={28}>
                  <defs>
                    <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#7dd3fc" />
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
                    cursor={{ fill: 'rgba(14, 165, 233, 0.08)', radius: 8 }}
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
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 5: Top Present Days */}
      <div className="chartsRow">
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="cardTitle">Top Employees (Days Present)</h2>
              <p className="cardSubtitle">Number of days present in the past 30 days</p>
            </div>
            <ChartToolbar chartKey="topPresent" onRefresh={fetchTopPresentDays} loading={chartLoading.topPresent} />
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartModes.topPresent === 'line' ? (
                <LineChart data={topPresentDays} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={12} interval={0} angle={-20} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickCount={6} domain={[0, 'dataMax']} unit=" days" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: 13 }}>{payload[0].payload.name}</div>
                            <div style={{ color: '#0284c7', fontSize: 14, fontWeight: 600 }}>📅 {payload[0].value} days present</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="presentDays" stroke="#0284c7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={topPresentDays} margin={{ top: 20, right: 30, left: 0, bottom: 40 }} barSize={28}>
                  <defs>
                    <linearGradient id="daysGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#38bdf8" />
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
                    domain={[0, 'dataMax']}
                    unit=" days"
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(2, 132, 199, 0.08)', radius: 8 }}
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
                            <div style={{ color: '#0284c7', fontSize: 14, fontWeight: 600 }}>
                              📅 {payload[0].value} days present
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="presentDays" radius={[8, 8, 4, 4]} maxBarSize={40}>
                    {topPresentDays.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#daysGradient)" />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="quickLinksSection">
        <h2 className="quickLinksTitle">Employee Musters</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>

          {/* Punches */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Punches</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Team Punches','/dashboard/punches/team-punches'],['Team Night Punches','/dashboard/punches/team-night-punches'],['Who Is In?','/dashboard/punches/whos-in']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='var(--accent-faint)';e.currentTarget.style.color='var(--accent-color)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
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
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#e2725b,#cc5a43)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Reports</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Punch Reports','/dashboard/reports'],['Attendance Reports','/dashboard/reports'],['Journey Reports','/dashboard/reports'],['Leave Reports','/dashboard/reports'],['Audit Reports','/dashboard/reports'],['Employee Reports','/dashboard/reports'],['COff Reports','/dashboard/reports'],['Custom Reports','/dashboard/reports']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#ffedea';e.currentTarget.style.color='#cc5a43'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e2725b', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Synchronization 1 */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                <Settings size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Synchronization 1</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Admins','/dashboard/synchronisation1/admins'],['Departments','/dashboard/synchronisation1/org-sync?tab=departments'],['Branches','/dashboard/synchronisation1/org-sync?tab=branches'],['Site Offices','/dashboard/synchronisation1/org-sync?tab=siteoffices'],['Organizations','/dashboard/synchronisation1/org-sync?tab=organizations'],['Designations','/dashboard/synchronisation1/org-sync?tab=designations'],['Grades','/dashboard/synchronisation1/org-sync?tab=grades'],['Imprest Heads','/dashboard/synchronisation1/org-sync?tab=imprestheads'],['Imprest Types','/dashboard/synchronisation1/org-sync?tab=impresttypes'],['Imprest Workflow','/dashboard/synchronisation1/org-sync?tab=imprestworkflow'],['Bonus/Incentive Setup','/dashboard/synchronisation1/bonus-incentive-setup'],['Gratuity Setup','/dashboard/synchronisation1/gratuity-setup'],['Leaving Reasons','/dashboard/synchronisation1/leaving-reasons'],['Doc Workflow Config','/dashboard/synchronisation1/doc-workflow'],['HR Docs Placeholders','/dashboard/synchronisation1/hrdocs-placeholders']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#f5f3ff';e.currentTarget.style.color='#7c3aed'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4b5fd', flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Synchronization 2 */}
          <div className="card" style={{ gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#ec4899,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Synchronization 2</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Head Types','/dashboard/synchronisation2/head-types'],['Salary Heads','/dashboard/synchronisation2/salary-heads'],['Advance Application','/dashboard/synchronisation2/advance-application'],['Bank Names','/dashboard/synchronisation2/bank-names'],['Weekoff Types','/dashboard/synchronisation2/weekoff-types'],['Leave Type','/dashboard/synchronisation2/leave-type'],['Muster Status','/dashboard/synchronisation2/muster-status'],['Shift','/dashboard/synchronisation2/shift'],['Document Types','/dashboard/synchronisation2/document-types'],['LTA Setup','/dashboard/synchronisation2/lta-setup'],['TDS Category','/dashboard/synchronisation2/tds-category'],['PF/NSSF Setup','/dashboard/synchronisation2/pf-nssf-setup'],['Issuing Authority','/dashboard/synchronisation2/issuing-authority'],['Skills','/dashboard/synchronisation2/skills'],['Religion','/dashboard/synchronisation2/religion'],['Relationship','/dashboard/synchronisation2/relationship']].map(([label,href])=>(
                <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: '#4b5563', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='#fdf2f8';e.currentTarget.style.color='#db2777'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4b5563'}}>
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
