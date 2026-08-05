'use client';
import React, { useState, useEffect } from 'react';
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
import { getEmployees, getAttendance } from '../../lib/data';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateArrivals: 0,
    activeEmployees: 0,
    gpsLocations: 2
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

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const emps = await getEmployees();
      const att = await getAttendance();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysAtt = att.filter(a => a.date === todayStr);

      // Basic Stats
      const totalEmps = emps.length;
      const presentEmps = todaysAtt.length;
      const lateEmps = todaysAtt.filter(a => a.status === 'LATE').length;
      
      setStats({
        totalEmployees: totalEmps,
        presentToday: presentEmps,
        lateArrivals: lateEmps,
        activeEmployees: totalEmps,
        gpsLocations: 2
      });

      // Who Is In
      const inCount = todaysAtt.filter(a => !a.checkOut).length;
      const outCount = todaysAtt.filter(a => a.checkOut).length;
      const noPunchCount = totalEmps - (inCount + outCount);
      
      setWhoIsIn([
        { name: 'IN', value: inCount, color: '#22c55e' },
        { name: 'OUT', value: outCount, color: '#3b82f6' },
        { name: 'NO PUNCH', value: noPunchCount, color: '#ef4444' },
        { name: 'ON LEAVE', value: 0, color: '#10b981' }
      ]);

      // Daily Attendance Trend (Last 10 days mock/calc)
      const trend = [];
      const pastDays = 10;
      for (let i = pastDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dateLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
        
        const dayAtt = att.filter(a => a.date === dStr);
        trend.push({
          date: dateLabel,
          fullDate: dStr,
          Present: dayAtt.length,
          Absent: totalEmps - dayAtt.length,
          Late: dayAtt.filter(a => a.status === 'LATE').length
        });
      }
      setDailyTrend(trend);

      // Status Distribution (Pie Chart)
      setStatusDistribution([
        { name: 'Present', value: att.length, color: '#bbf7d0' },
        { name: 'Late', value: att.filter(a=>a.status === 'LATE').length, color: '#fcd34d' },
        { name: 'Absent', value: (totalEmps * 30) - att.length, color: '#fca5a5' }
      ]);

      // Top Employees hours
      if (emps.length > 0) {
        // Calculate basic hours from today's attendance if available, else 0
        const top = emps.map(emp => {
          const empAtt = todaysAtt.find(a => a.employeeId === emp.id);
          let hours = 0;
          if (empAtt && empAtt.timeSlots) {
            try {
              const slots = JSON.parse(empAtt.timeSlots);
              slots.forEach(slot => {
                if (slot.in && slot.out) {
                  const inT = new Date(`1970-01-01T${slot.in}:00`);
                  const outT = new Date(`1970-01-01T${slot.out}:00`);
                  hours += (outT - inT) / (1000 * 60 * 60);
                }
              });
            } catch(e){}
          }
          return { name: emp.name.toUpperCase(), hours: Number(hours.toFixed(1)) };
        }).sort((a, b) => b.hours - a.hours).slice(0, 5);
        
        setTopHours(top);
      } else {
        setTopHours([]);
      }

    } catch (e) {
      console.error('Failed to load admin dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading admin dashboard...</div>;
  }

  return (
    <div className="dashboardContainer">
      <h1 className="dashboardTitle">Admin Dashboard</h1>

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
            <div className="actionSquare">
              <Mail size={28} className="actionIcon" />
              <div className="actionLabel">INVITE<br/>EMPLOYEES</div>
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
            <div className="actionSquare">
              <Clock size={28} className="actionIcon" />
              <div className="actionLabel">MOBILE<br/>CHECKIN<br/>REPORT</div>
            </div>
          </div>
        </div>

        {/* Who is in? */}
        <div className="card chartCard">
          <div className="chartHeader">
            <h2 className="chartTitle" style={{ color: '#3b82f6', marginBottom: 0 }}>Who is in?</h2>
            <RefreshCw size={16} color="#9ca3af" style={{cursor: 'pointer'}} onClick={loadDashboardData} />
          </div>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'All', IN: whoIsIn[0].value, OUT: whoIsIn[1].value, 'NO PUNCH': whoIsIn[2].value, 'ON LEAVE': whoIsIn[3].value }]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={30}>
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickCount={5} domain={[0, 'dataMax + 1']} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
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
        <div className="card statCard">
          <div className="statIconWrapper" style={{ color: '#86efac' }}>
            <Users size={28} />
          </div>
          <div className="statInfo">
            <span className="statLabel">Total Employees</span>
            <span className="statValue">{stats.totalEmployees}</span>
          </div>
        </div>
        <div className="card statCard">
          <div className="statIconWrapper" style={{ color: '#fcd34d' }}>
            <CheckCircle size={28} />
          </div>
          <div className="statInfo">
            <span className="statLabel">Present Today</span>
            <span className="statValue">{stats.presentToday}</span>
          </div>
        </div>
        <div className="card statCard">
          <div className="statIconWrapper" style={{ color: '#fca5a5' }}>
            <Clock size={28} />
          </div>
          <div className="statInfo">
            <span className="statLabel">Late Arrivals</span>
            <span className="statValue">{stats.lateArrivals}</span>
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
              <Bar dataKey="Late" fill="#fcd34d" radius={[4, 4, 0, 0]} />
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
          <p className="cardSubtitle">Average daily hours over the past month</p>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHours} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickCount={5} domain={[0, 1.2]} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="hours" radius={[8, 8, 8, 8]}>
                  {
                    topHours.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                    ))
                  }
                </Bar>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bbf7d0" />
                    <stop offset="100%" stopColor="#fca5a5" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Links / Old Dashboard Grid */}
      <div className="quickLinksSection">
        <h2 className="quickLinksTitle">Quick Links</h2>
        <div className={oldStyles.grid}>
          {/* Web Checkin Card */}
          <div className={`${oldStyles.card} ${oldStyles.checkinCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Web Checkin</h2>
            </div>
            <div className={oldStyles.timeDisplay}>
              <div className={oldStyles.dateText}>
                <Calendar size={16} /> Wed 05 Aug 2026
              </div>
              <div className={oldStyles.timeText}>
                14:49:25
              </div>
            </div>
            <button className={oldStyles.checkinButton}>
              <Clock size={16} /> CHECK IN
            </button>
          </div>

          {/* Punches */}
          <div className={`${oldStyles.card} ${oldStyles.punchesCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Punches</h2>
              <Clock size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/punches/my-punches" className={oldStyles.linkItem}>My Punches</Link></li>
              <li><Link href="/dashboard/punches/team-punches" className={oldStyles.linkItem}>Team Punches</Link></li>
              <li><Link href="/dashboard/punches/mobile-checkin" className={oldStyles.linkItem}>Mobile Checkin Report</Link></li>
              <li><Link href="/dashboard/punches/whos-in" className={oldStyles.linkItem}>Who Is In?</Link></li>
              <li><Link href="/dashboard/punches/supervisor-entry" className={oldStyles.linkItem}>Supervisor Entry</Link></li>
            </ul>
          </div>

          {/* Attendance */}
          <div className={`${oldStyles.card} ${oldStyles.attendanceCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Attendance</h2>
              <CheckCircle size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/attendance/my-records" className={oldStyles.linkItem}>My Attendance Records</Link></li>
              <li><Link href="/dashboard/attendance/team-records" className={oldStyles.linkItem}>Team Attendance Records</Link></li>
              <li><Link href="/dashboard/attendance/my-regularization" className={oldStyles.linkItem}>My Regularization Requests</Link></li>
              <li><Link href="/dashboard/attendance/team-regularization" className={oldStyles.linkItem}>Team Regularization Requests</Link></li>
            </ul>
          </div>

          {/* Leave */}
          <div className={`${oldStyles.card} ${oldStyles.leaveCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Leave</h2>
              <FileText size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/leaves/apply" className={oldStyles.linkItem}>Apply Leave</Link></li>
              <li><Link href="/dashboard/leaves/my-applications" className={oldStyles.linkItem}>My Applications</Link></li>
              <li><Link href="/dashboard/leaves/team-applications" className={oldStyles.linkItem}>Team Applications</Link></li>
              <li><Link href="/dashboard/leaves/balances" className={oldStyles.linkItem}>Leave Balances</Link></li>
              <li><Link href="/dashboard/leaves/whos-on-leave" className={oldStyles.linkItem}>Who is on Leave?</Link></li>
            </ul>
          </div>

          {/* Organization */}
          <div className={`${oldStyles.card} ${oldStyles.orgCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Organization</h2>
              <Building size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/organization/holidays" className={oldStyles.linkItem}>Holidays</Link></li>
              <li><Link href="/dashboard/organization/directory" className={oldStyles.linkItem}>Directory</Link></li>
              <li><Link href="/dashboard/organization/announcements" className={oldStyles.linkItem}>Announcements</Link></li>
            </ul>
          </div>

          {/* Tools */}
          <div className={`${oldStyles.card} ${oldStyles.toolsCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Tools</h2>
              <PenTool size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="#" className={oldStyles.linkItem}>Approval Forward Settings</Link></li>
            </ul>
          </div>

          {/* Field Journey Tracker */}
          <div className={`${oldStyles.card} ${oldStyles.journeyCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Field Journey Tracker</h2>
              <Map size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/journey/summary" className={oldStyles.linkItem}>Summary View</Link></li>
              <li><Link href="/dashboard/journey/map" className={oldStyles.linkItem}>Map View</Link></li>
            </ul>
          </div>

          {/* Documents */}
          <div className={`${oldStyles.card} ${oldStyles.docsCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Documents</h2>
              <File size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/documents/personal" className={oldStyles.linkItem}>Personal Documents</Link></li>
              <li><Link href="/dashboard/documents/dependant" className={oldStyles.linkItem}>Dependant Documents</Link></li>
            </ul>
          </div>

          {/* Reports */}
          <div className={`${oldStyles.card} ${oldStyles.reportsCard}`}>
            <div className={oldStyles.cardHeader}>
              <h2 className={oldStyles.cardTitle}>Reports</h2>
              <BarChart2 size={18} className={oldStyles.cardIcon} />
            </div>
            <ul className={oldStyles.linkList}>
              <li><Link href="/dashboard/reports" className={oldStyles.linkItem}>All Reports</Link></li>
              <li><Link href="/dashboard/reports" className={oldStyles.linkItem}>Punch Reports</Link></li>
              <li><Link href="/dashboard/reports" className={oldStyles.linkItem}>Attendance Reports</Link></li>
              <li><Link href="/dashboard/reports" className={oldStyles.linkItem}>Journey Reports</Link></li>
              <li><Link href="/dashboard/reports" className={oldStyles.linkItem}>Custom Reports</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
