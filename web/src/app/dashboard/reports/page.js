'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Grid, Clock, CheckCircle2, MapPin, Menu, FileText } from 'lucide-react';
import '../attendance/attendance.css';
import './reports.css';

const reportsData = [
  {
    id: 1,
    title: 'Attendance Day Wise Summary Report',
    desc: 'Detailed summary of attendance for each day within the selected date range.',
    tags: ['attendance'],
    category: 'attendance',
    link: '/dashboard/reports/attendance-day-wise'
  },
  {
    id: 2,
    title: 'Attendance Muster Report',
    desc: 'Snapshot view of attendance status for each date in the selected range, color-coded, providing detailed check-in and check-out times for each employee.',
    tags: ['attendance', 'leave'],
    category: 'attendance',
    link: '/dashboard/reports/attendance-muster'
  },
  {
    id: 3,
    title: 'Grouped Summary Report',
    desc: 'Summary for the selected date range with the ability to group data by branch, department, or designation. Provides details for each attendance status, including total worked hours and overtime hours.',
    tags: ['attendance', 'leave'],
    category: 'attendance',
    link: '/dashboard/reports/grouped-summary'
  },

  {
    id: 5,
    title: 'Team Punches Report',
    desc: 'Punches Report shows the list of punches across all sources, with filters for date range, punch mode, punch type, and more.',
    tags: ['punch'],
    category: 'punch',
    link: '/dashboard/reports/team-punches'
  },
  {
    id: 6,
    title: 'Live Tracking Day Wise Summary Report',
    desc: 'Day wise summary of the journey status for the selected date range, providing insights like distance traveled, duration on the road, and more.',
    tags: ['journey'],
    category: 'journey',
    link: '/dashboard/reports/live-tracking-day-wise'
  },
  {
    id: 7,
    title: 'Live Tracking Summary Report',
    desc: 'Summary report with total distance traveled, total duration on the road, and session for the selected date range.',
    tags: ['journey'],
    category: 'journey',
    link: '/dashboard/reports/live-tracking-summary'
  },
  {
    id: 8,
    title: 'Live Tracking Day Wise Muster Report',
    desc: 'Snapshot report of the journey status for each date, providing insights like distance traveled, duration on the road, and more.',
    tags: ['journey'],
    category: 'journey',
    link: '/dashboard/reports/live-tracking-muster'
  },
  {
    id: 9,
    title: 'First and Last Punch Muster Report',
    desc: 'First and Last Punch Muster Report',
    tags: ['custom'],
    category: 'custom',
    link: '/dashboard/reports/first-last-punch'
  }
];

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredReports = activeCategory === 'all' 
    ? reportsData 
    : reportsData.filter(r => r.category === activeCategory);

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Reports</div>
      </div>

      <div className="reportsContainer">
        {/* Sidebar */}
        <div className="reportsSidebar">
          <button 
            className={`reportsSidebarItem ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <div className="sidebarIconText">
              <Grid size={16} /> All Reports
            </div>
            <ChevronRight size={16} color="#9ca3af" />
          </button>
          
          <button 
            className={`reportsSidebarItem ${activeCategory === 'punch' ? 'active' : ''}`}
            onClick={() => setActiveCategory('punch')}
          >
            <div className="sidebarIconText">
              <Clock size={16} /> Punch Reports
            </div>
            <ChevronRight size={16} color="#9ca3af" />
          </button>
          
          <button 
            className={`reportsSidebarItem ${activeCategory === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveCategory('attendance')}
          >
            <div className="sidebarIconText">
              <CheckCircle2 size={16} /> Attendance Reports
            </div>
            <ChevronRight size={16} color="#9ca3af" />
          </button>

          <button 
            className={`reportsSidebarItem ${activeCategory === 'journey' ? 'active' : ''}`}
            onClick={() => setActiveCategory('journey')}
          >
            <div className="sidebarIconText">
              <MapPin size={16} /> Journey Reports
            </div>
            <ChevronRight size={16} color="#9ca3af" />
          </button>

          <button 
            className={`reportsSidebarItem ${activeCategory === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveCategory('custom')}
          >
            <div className="sidebarIconText">
              <Menu size={16} /> Custom Reports
            </div>
            <ChevronRight size={16} color="#9ca3af" />
          </button>
        </div>

        {/* Content */}
        <div className="reportsContent">
          {filteredReports.map(report => (
            <div key={report.id} className="reportCard">
              <div className="reportInfo">
                <FileText size={18} className="reportIcon" />
                <div>
                  <h3 className="reportTitle">{report.title}</h3>
                  <p className="reportDescription">{report.desc}</p>
                  <div className="reportTags">
                    {report.tags.map(tag => (
                      <span key={tag} className="reportTag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <Link href={report.link || '#'} className="reportAction">View</Link>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No reports found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
