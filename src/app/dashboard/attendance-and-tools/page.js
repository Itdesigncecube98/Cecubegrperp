'use client';

import Link from 'next/link';
import {
  BarChart2,
  Building,
  CheckCircle,
  Clock,
  File as FileIcon,
  FileText,
  Settings,
} from 'lucide-react';
import '../dashboard.css';

const sections = [
  {
    title: 'Punches',
    icon: Clock,
    gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
    color: '#0ea5e9',
    dot: '#c7d2fe',
    hover: '#f0f9ff',
    links: [
      ['Team Punches', '/dashboard/punches/team-punches'],
      ['Team Night Punches', '/dashboard/punches/team-night-punches'],
      ['Who Is In?', '/dashboard/punches/whos-in'],
    ],
  },
  {
    title: 'Attendance',
    icon: CheckCircle,
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
    color: '#16a34a',
    dot: '#bbf7d0',
    hover: '#f0fdf4',
    links: [
      ['Team Attendance Records', '/dashboard/attendance/team-records'],
      ['Team Regularization', '/dashboard/attendance/team-regularization'],
    ],
  },
  {
    title: 'Leave',
    icon: FileText,
    gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    color: '#d97706',
    dot: '#fde68a',
    hover: '#fffbeb',
    links: [
      ['Leave Requests (Approve)', '/dashboard/leaves/requests'],
      ['Apply Leave', '/dashboard/leaves/apply'],
      ['Team Applications', '/dashboard/leaves/team-applications'],
      ['Leave Balances', '/dashboard/leaves/balances'],
      ['Who is on Leave?', '/dashboard/leaves/whos-on-leave'],
    ],
  },
  {
    title: 'Organization',
    icon: Building,
    gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    color: '#1d4ed8',
    dot: '#bfdbfe',
    hover: '#eff6ff',
    links: [
      ['Holidays', '/dashboard/organization/holidays'],
      ['Directory', '/dashboard/organization/directory'],
      ['Announcements', '/dashboard/organization/announcements'],
    ],
  },
  {
    title: 'Documents',
    icon: FileIcon,
    gradient: 'linear-gradient(135deg,#64748b,#334155)',
    color: '#334155',
    dot: '#cbd5e1',
    hover: '#f1f5f9',
    links: [
      ['Personal Documents', '/dashboard/documents/personal'],
      ['Company Documents', '/dashboard/documents/company'],
      ['Dependent Documents', '/dashboard/documents/dependent'],
    ],
  },
  {
    title: 'Reports',
    icon: BarChart2,
    gradient: 'linear-gradient(135deg,#e2725b,#cc5a43)',
    color: '#cc5a43',
    dot: '#e2725b',
    hover: '#ffedea',
    links: [
      ['Punch Reports', '/dashboard/reports'],
      ['Attendance Reports', '/dashboard/reports'],
      ['Journey Reports', '/dashboard/reports'],
      ['Leave Reports', '/dashboard/reports'],
      ['Audit Reports', '/dashboard/reports'],
      ['Employee Reports', '/dashboard/reports'],
      ['COff Reports', '/dashboard/reports'],
      ['Custom Reports', '/dashboard/reports'],
    ],
  },
  {
    title: 'Synchronization 1',
    icon: Settings,
    gradient: 'linear-gradient(135deg,#c084fc,#9333ea)',
    color: '#7c3aed',
    dot: '#c4b5fd',
    hover: '#f5f3ff',
    links: [
      ['Admins', '/dashboard/synchronisation1/admins'],
      ['Departments', '/dashboard/synchronisation1/org-sync?tab=departments'],
      ['Branches', '/dashboard/synchronisation1/org-sync?tab=branches'],
      ['Site Offices', '/dashboard/synchronisation1/org-sync?tab=siteoffices'],
      ['Organizations', '/dashboard/synchronisation1/org-sync?tab=organizations'],
      ['Designations', '/dashboard/synchronisation1/org-sync?tab=designations'],
      ['Grades', '/dashboard/synchronisation1/org-sync?tab=grades'],
      ['Imprest Heads', '/dashboard/synchronisation1/org-sync?tab=imprestheads'],
      ['Imprest Types', '/dashboard/synchronisation1/org-sync?tab=impresttypes'],
      ['Imprest Workflow', '/dashboard/synchronisation1/org-sync?tab=imprestworkflow'],
      ['Bonus/Incentive Setup', '/dashboard/synchronisation1/bonus-incentive-setup'],
      ['Gratuity Setup', '/dashboard/synchronisation1/gratuity-setup'],
      ['Leaving Reasons', '/dashboard/synchronisation1/leaving-reasons'],
      ['Doc Workflow Config', '/dashboard/synchronisation1/doc-workflow'],
      ['HR Docs Placeholders', '/dashboard/synchronisation1/hrdocs-placeholders'],
    ],
  },
  {
    title: 'Synchronization 2',
    icon: Settings,
    gradient: 'linear-gradient(135deg,#ec4899,#db2777)',
    color: '#db2777',
    dot: '#fbcfe8',
    hover: '#fdf2f8',
    links: [
      ['Head Types', '/dashboard/synchronisation2/head-types'],
      ['Salary Heads', '/dashboard/synchronisation2/salary-heads'],
      ['Advance Application', '/dashboard/synchronisation2/advance-application'],
      ['Bank Names', '/dashboard/synchronisation2/bank-names'],
      ['Weekoff Types', '/dashboard/synchronisation2/weekoff-types'],
      ['Leave Type', '/dashboard/synchronisation2/leave-type'],
      ['Muster Status', '/dashboard/synchronisation2/muster-status'],
      ['Shift', '/dashboard/synchronisation2/shift'],
      ['Document Types', '/dashboard/synchronisation2/document-types'],
      ['LTA Setup', '/dashboard/synchronisation2/lta-setup'],
      ['TDS Category', '/dashboard/synchronisation2/tds-category'],
      ['PF/NSSF Setup', '/dashboard/synchronisation2/pf-nssf-setup'],
      ['Issuing Authority', '/dashboard/synchronisation2/issuing-authority'],
      ['Skills', '/dashboard/synchronisation2/skills'],
      ['Religion', '/dashboard/synchronisation2/religion'],
      ['Relationship', '/dashboard/synchronisation2/relationship'],
    ],
  },
];

export default function AttendanceAndToolsPage() {
  return (
    <div className="dashboardContainer">
      <header style={{ marginBottom: '1.75rem' }}>
        <h1 className="dashboardTitle">Attendance and Tools</h1>
        <p className="dashboardSubtitle">
          Attendance, leave, organization, documents, reports, and synchronization shortcuts.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="card"
              style={{ gap: 0 }}
              aria-labelledby={`attendance-tools-${section.title.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: section.title === 'Synchronization 1' ? '50%' : 10,
                  background: section.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} color="#fff" />
                </div>
                <h2
                  id={`attendance-tools-${section.title.replace(/\s+/g, '-').toLowerCase()}`}
                  style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: 0 }}
                >
                  {section.title}
                </h2>
              </div>

              <nav aria-label={`${section.title} links`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 8,
                      color: '#4b5563',
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = section.hover;
                      event.currentTarget.style.color = section.color;
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent';
                      event.currentTarget.style.color = '#4b5563';
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: section.dot, flexShrink: 0 }} />
                    {label}
                  </Link>
                ))}
              </nav>
            </section>
          );
        })}
      </div>
    </div>
  );
}
