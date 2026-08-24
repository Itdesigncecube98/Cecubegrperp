'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, BookOpen, Layers, Briefcase, FileText, Settings, 
  ChevronDown, ChevronRight, Calculator, Calendar, 
  Wrench, ThumbsUp, Database, FileBarChart, LogOut 
} from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

export default function EngineeringSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const [expanded, setExpanded] = useState({
    projects: true,
    engineering: true,
    planning: false,
    tools: false,
    library: false,
    qualityCheck: false,
    master: false,
    reports: false
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const confirmLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const navItems = [
    { name: 'Switch Module', path: '/portal', icon: Layers },
  ];

  const menuConfig = [
    {
      id: 'projects',
      label: 'Projects',
      icon: Briefcase,
      items: [
        { name: 'Project List', path: '/engineering/projects/project-list' },
        { name: 'Custom Report', path: '/engineering/projects/custom-report' },
        { name: 'WBS Budget', path: '/engineering/projects/wbs-budget' },
        { name: 'Budget Transaction Browse', path: '/engineering/projects/budget-transaction-browse' },
      ]
    },
    {
      id: 'engineering',
      label: 'Engineering',
      icon: Settings,
      items: [
        { name: 'Define WBS', path: '/engineering/engineering/define-wbs' },
        { name: 'Edit Estimates', path: '/engineering/engineering/edit-estimates' },
        { name: 'Manufacturing', path: '/engineering/engineering/manufacturing' },
        { name: 'Update Library Rates', path: '/engineering/engineering/update-library-rates' },
        { name: 'Re-Estimate', path: '/engineering/engineering/re-estimate' },
        { name: 'WBS Operations', path: '/engineering/engineering/wbs-operations' },
      ]
    },
    { id: 'planning', label: 'Planning', icon: Calendar, items: [] },
    { id: 'tools', label: 'Tools', icon: Wrench, items: [] },
    {
      id: 'library',
      label: 'Library',
      icon: BookOpen,
      items: [
        { name: 'Company', path: '/engineering/library/company' },
        { name: 'Material Library', path: '/engineering/library/material' },
        { name: 'Labour Library', path: '/engineering/library/labour' },
        { name: 'Equipment Library', path: '/engineering/library/equipment' },
        { name: 'Quality Check Library', path: '/engineering/library/quality-check' },
        { name: 'Task Library', path: '/engineering/library/task' },
        { name: 'Material Quality Check', path: '/engineering/library/material-quality-check' },
        { name: 'Project Category 1', path: '/engineering/library/project-category-1' },
        { name: 'Project Category 2', path: '/engineering/library/project-category-2' },
      ]
    },
    { id: 'qualityCheck', label: 'Quality Check', icon: ThumbsUp, items: [] },
    { 
      id: 'master', 
      label: 'Master', 
      icon: Database, 
      items: [
        { name: 'Library Manager', path: '/engineering/master/library-manager' },
        { name: 'Material Categories', path: '/engineering/master/material-categories' },
        { name: 'Unit Master', path: '/engineering/master/unit-master' },
        { name: 'Task Category', path: '/engineering/master/task-category' },
        { name: 'Material Brand', path: '/engineering/master/material-brand' },
      ] 
    },
    { id: 'reports', label: 'Reports', icon: FileBarChart, items: [] }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <img src="/logo.png" alt="Cecube Logo" style={{ maxWidth: '160px' }} />
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {menuConfig.map((section) => {
          const Icon = section.icon;
          const isExpanded = expanded[section.id];
          const hasItems = section.items.length > 0;
          
          const isActiveGroup = !hasItems && pathname.includes(section.id);
          
          return (
            <div key={section.id}>
              <div 
                className={`nav-item ${isActiveGroup ? 'active' : ''}`} 
                onClick={() => hasItems && toggleSection(section.id)}
                style={{ justifyContent: 'space-between', cursor: hasItems ? 'pointer' : 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Icon size={20} />
                  <span>{section.label}</span>
                </div>
                {hasItems && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </div>
              
              {isExpanded && hasItems && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '1rem', marginTop: '4px', marginBottom: '8px' }}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        <div style={{ 
                          width: '6px', height: '6px', borderRadius: '50%', 
                          background: isActive ? '#0284c7' : 'transparent',
                          border: isActive ? 'none' : '1px solid #94a3b8'
                        }}></div>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button 
          className="logout-btn" 
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      <Dialog
        isOpen={showLogoutDialog}
        type="confirm"
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </div>
  );
}
