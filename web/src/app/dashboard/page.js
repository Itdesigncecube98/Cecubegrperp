'use client';
import React, { useEffect, useState } from 'react';
import { getEmployees, getAttendance, getAnalytics } from '../../lib/data';
import './dashboard.css';
import { Users, UserCheck, Clock, Activity, User, Plane, FileText, MapPin, Wrench, Map, Settings, CalendarCheck, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Custom Tooltip for Top Chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="item">
            <span style={{ color: entry.color, fontWeight: 'bold' }}>{entry.name}:</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Legend
const CustomLegend = (props) => {
  const { payload } = props;
  if (!payload) return null;
  return (
    <div className="custom-legend">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="custom-legend-item">
          <div className="legend-dot" style={{ backgroundColor: entry.color }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [gpsCount, setGpsCount] = useState(0);

  useEffect(() => {
    const data = sessionStorage.getItem('adminData');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.name) setAdminName(parsed.name);
    }

      const fetchData = async () => {
      try {
        const employees = await getEmployees();
        const attendance = await getAttendance();
        const analyticsData = await getAnalytics();
        
        const present = attendance.filter(a => a.status === 'Present').length;
        const late = attendance.filter(a => a.status === 'Late').length;

        setStats({
          total: employees.filter(e => e.role !== 'SUPERVISOR').length,
          present,
          late
        });
        setTodayAttendance(attendance);
        setAnalytics(analyticsData);
        
        // Fetch GPS count
        try {
          const locRes = await fetch('/api/locations');
          const locs = await locRes.json();
          setGpsCount(Array.isArray(locs) ? locs.length : 0);
        } catch {}
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="page-subtitle" style={{ padding: '2rem' }}>Loading dashboard data...</div>;
  }

  // Colors based on the reference image
  const COLORS = {
    Present: '#B9FBC0', // Light green
    Absent: '#FF6B6B',  // Red
    Late: '#FFD166',    // Yellow
  };

  return (
    <div className="dashboard-wrapper">
      <h1 className="page-title">Admin Dashboard</h1>
      
      {/* Top Widget Row - Bring Employees */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* Bring Employees to HRMS */}
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>Bring Employees in to your HRMS</h3>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/dashboard/employees" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '16px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: '#fafafa', transition: '0.2s' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>{stats.total}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Employees</div>
            </a>
            <a href="/dashboard/employees" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '16px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <UserCheck size={28} color="#374151" />
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add Employees</div>
            </a>
            <a href="/dashboard/employees" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '16px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Users size={28} color="#374151" />
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invite Employees</div>
            </a>
          </div>
        </div>

        {/* GPS Checkin Setup */}
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>Setup Mobile GPS Checkin</h3>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/dashboard/locations" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '16px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: '#fafafa' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>{gpsCount}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>GPS Locations</div>
            </a>
            <a href="/dashboard/locations" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '16px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <MapPin size={28} color="#374151" />
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add GPS Location</div>
            </a>
            <a href="/dashboard/whoisin" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '16px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Clock size={28} color="#374151" />
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mobile Checkin Report</div>
            </a>
          </div>
        </div>

        {/* Who is in? Widget */}
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#007bff' }}>Who is in?</h3>
            <a href="/dashboard/whoisin" style={{ color: '#9ca3af', cursor: 'pointer' }}><RefreshCw size={14} /></a>
          </div>
          <div style={{ height: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  name: 'All',
                  IN: todayAttendance.filter(r => r.status === 'Present').length,
                  OUT: todayAttendance.filter(r => r.status === 'Absent').length,
                  NoPunch: todayAttendance.filter(r => r.status === 'Not Marked').length,
                  OnLeave: todayAttendance.filter(r => r.status === 'On Leave').length,
                }
              ]} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="IN" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={30} />
                <Bar dataKey="OUT" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={30} />
                <Bar dataKey="NoPunch" fill="#f87171" radius={[3,3,0,0]} maxBarSize={30} />
                <Bar dataKey="OnLeave" fill="#34d399" radius={[3,3,0,0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            {[['IN','#22c55e'],['OUT','#3b82f6'],['NO PUNCH','#f87171'],['ON LEAVE','#34d399']].map(([l,c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: '#374151' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ color: '#B9FBC0' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Employees</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ color: '#FFD166' }}>
            <UserCheck size={24} />
          </div>
          <div className="stat-info">
            <h3>Present Today</h3>
            <p className="stat-value">{stats.present}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ color: '#FF6B6B' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>Late Arrivals</h3>
            <p className="stat-value">{stats.late}</p>
          </div>
        </div>
      </div>

      {analytics && (
        <div className="analytics-section">
          
          {/* Top Chart mimicking the Grouped Bar Chart from image */}
          <div className="chart-card glass-panel" style={{ marginBottom: '1rem' }}>
            <h3>Daily Attendance Trend</h3>
            <p className="chart-desc">Overview of presence across the last 10 working days</p>
            <div className="chart-container" style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                  <XAxis dataKey="date" tickFormatter={(val) => (typeof val === 'string' && val.length >= 10) ? val.substring(8, 10) + '/' + val.substring(5,7) : val} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#666666', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666666', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="Present" fill={COLORS.Present} radius={[4, 4, 0, 0]} maxBarSize={10} />
                  <Bar dataKey="Absent" fill={COLORS.Absent} radius={[4, 4, 0, 0]} maxBarSize={10} />
                  <Bar dataKey="Late" fill={COLORS.Late} radius={[4, 4, 0, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-grid">
            
            {/* Bottom Left Chart: Donut Chart */}
            <div className="chart-card glass-panel">
              <h3>Attendance Status Distribution</h3>
              <p className="chart-desc">Past 30 days distribution</p>
              <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Donut Legend underneath */}
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                  {analytics.statusDistribution.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666666', fontSize: '0.85rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[entry.name] }}></div>
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Right Chart: Segmented Bar/Gradient look */}
            <div className="chart-card glass-panel">
              <h3>Average Hours Devoted (Top Employees)</h3>
              <p className="chart-desc">Average daily hours over the past month</p>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.timeDevoted.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="#FFD166" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#B9FBC0" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{ fill: '#666666', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666666', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="hours" fill="url(#colorHours)" radius={[10, 10, 10, 10]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
          
        </div>
      )}

      {/* Administration & Reports Section */}
      <div className="admin-reports-section">
        <h2 className="admin-reports-header">Administration & Reports</h2>
        <div className="admin-reports-grid">
          
          {/* Employee Management */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Employee Management</h3>
              <User className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="/dashboard/employees" className="report-card-link">View All Employees</a></li>
                <li><a href="/dashboard/employees" className="report-card-link">Add New Employee</a></li>
                <li><a href="/dashboard/employees" className="report-card-link">Invite Employees</a></li>
                <li><a href="/dashboard/employees" className="report-card-link">Employee Registration Requests</a></li>
              </ul>
            </div>
          </div>

          {/* Employee Punches */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Employee Punches</h3>
              <UserCheck className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="/dashboard/attendance" className="report-card-link">View All Punches</a></li>
                <li><a href="/dashboard/whoisin" className="report-card-link">Who is in?</a></li>
                <li><a href="/dashboard/whoisin" className="report-card-link">Mobile Checkin Report</a></li>
              </ul>
            </div>
            <div className="report-card-footer" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/dashboard/setup'}>
              <Settings size={14} /> Punch Settings
            </div>
          </div>

          {/* Attendance & Shift Management */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Attendance & Shift Management</h3>
              <CalendarCheck className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="/dashboard/attendance" className="report-card-link">View Attendance Records</a></li>
                <li><a href="/dashboard/regularization" className="report-card-link">View Regularization Requests</a></li>
                <li><a href="/dashboard/attendance/summary" className="report-card-link">Attendance Summary Report</a></li>
                <li><a href="/dashboard/attendance/grid" className="report-card-link">Advanced Attendance Grid (OT/HOT/LC/EG)</a></li>
                <li><a href="/dashboard/attendance/summary" className="report-card-link">Manual OT/HOT</a></li>
              </ul>
            </div>
            <div className="report-card-footer" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/dashboard/setup'}>
              <Settings size={14} /> Attendance & Shift Settings
            </div>
          </div>

          {/* Leave Management */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Leave Management</h3>
              <Plane className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="/dashboard/leaves/requests" className="report-card-link">View Leave Requests</a></li>
                <li><a href="/dashboard/leaves/assign" className="report-card-link">Assign Leave</a></li>
                <li><a href="/dashboard/leaves/holidays" className="report-card-link">Manage Holidays</a></li>
                <li><a href="/dashboard/leaves/entitlements" className="report-card-link">Entitlements</a></li>
                <li><a href="/dashboard/leaves/report" className="report-card-link">Leave Entitlements and Usage Report</a></li>
              </ul>
            </div>
            <div className="report-card-footer" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/dashboard/setup'}>
              <Settings size={14} /> Leave Settings
            </div>
          </div>

          {/* Employee Documents */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Employee Documents</h3>
              <FileText className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="#" className="report-card-link">Manage Personal Documents</a></li>
                <li><a href="#" className="report-card-link">Manage Dependants Documents</a></li>
              </ul>
            </div>
          </div>

          {/* Location Management */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Location Management</h3>
              <MapPin className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="/dashboard/locations" className="report-card-link">Add New Location</a></li>
                <li><a href="/dashboard/locations" className="report-card-link">View All Locations</a></li>
                <li><a href="/dashboard/locations" className="report-card-link">Manage Location Categories</a></li>
              </ul>
            </div>
          </div>

          {/* Tools */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Tools</h3>
              <Wrench className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="#" className="report-card-link">Announcements</a></li>
                <li><a href="#" className="report-card-link">Approval Forward Settings</a></li>
              </ul>
            </div>
          </div>

          {/* Field Journey Tracker */}
          <div className="report-card">
            <div className="report-card-header">
              <h3 className="report-card-title">Field Journey Tracker</h3>
              <Map className="report-card-icon" size={20} />
            </div>
            <div className="report-card-body">
              <ul className="report-card-links">
                <li><a href="#" className="report-card-link">Summary View</a></li>
                <li><a href="#" className="report-card-link">Map View</a></li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
