'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, ChevronDown, ChevronRight, FileText, 
  HelpCircle, Settings, FileSearch, PieChart, Wrench, Circle, Layers, LogOut
} from 'lucide-react';
import '../app/globals.css';

const ContractingSidebar = () => {
  const pathname = usePathname();
  // We want to auto-expand groups if they contain the active page
  const [expanded, setExpanded] = useState({
    contractors: pathname.includes('/contractors'),
    labour: pathname.includes('/labour'),
    workOrder: pathname.includes('/work-order'),
    raBills: pathname.includes('/ra-bills'),
  });

  const toggleExpand = (menu) => {
    setExpanded(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path) => pathname.includes(path);

  // New Light UI Colors
  const colors = {
    bg: '#ffffff',
    textMain: '#475569',
    textSub: '#64748b',
    activeBg: '#e0f2fe',
    activeText: '#0284c7',
    border: '#e2e8f0',
    subBg: '#f8fafc'
  };

  return (
    <div className="sidebar" style={{ backgroundColor: colors.bg, width: '250px', display: 'flex', flexDirection: 'column', height: '100vh', color: colors.textMain, borderRight: `1px solid ${colors.border}` }}>
      
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="CeCube Logo" style={{ height: '32px', objectFit: 'contain' }} />
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        
        {/* Switch Module */}
        <Link href="/portal" style={{ textDecoration: 'none' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
            borderRadius: '8px', cursor: 'pointer', color: colors.textMain,
            marginBottom: '16px', fontWeight: 500
          }}>
            <Layers size={18} />
            <span>Switch Module</span>
          </div>
        </Link>
        
        {/* Contractors Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('contractors')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.contractors ? colors.activeBg : 'transparent',
              color: expanded.contractors ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <Users size={18} />
              <span>Contractors</span>
            </div>
            {expanded.contractors ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.contractors && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Contractor', path: '/contractor-list' },
                { name: 'Contractor Insurance', path: '/insurance' },
                { name: 'Labour Master', path: '/labour-master' },
              ].map(sub => (
                <Link key={sub.name} href={`/contracting/contractors${sub.path}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '8px 16px 8px 32px', display: 'flex', alignItems: 'center', gap: '8px',
                    color: isActive(sub.path) ? colors.activeText : colors.textSub, fontSize: '0.85rem',
                    backgroundColor: isActive(sub.path) ? colors.activeBg : 'transparent',
                    borderTopRightRadius: '20px', borderBottomRightRadius: '20px',
                    marginRight: '8px'
                  }}>
                    <Circle size={8} fill={isActive(sub.path) ? colors.activeText : "transparent"} />
                    {sub.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Labour Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('labour')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.labour ? colors.activeBg : 'transparent',
              color: expanded.labour ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <Users size={18} />
              <span>Labour</span>
            </div>
            {expanded.labour ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.labour && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Labour Requisition', path: '/requisition', strict: true },
                { name: 'Labour Req. Browse', path: '/requisition-browse' },
                { name: 'Labour Rate Master', path: '/rate-master' },
              ].map(sub => {
                // strict check for /requisition vs /requisition-browse
                const isItemActive = sub.strict 
                  ? isActive(sub.path) && !isActive('browse')
                  : isActive(sub.path);
                  
                return (
                  <Link key={sub.name} href={`/contracting/labour${sub.path}`} style={{ textDecoration: 'none' }}>
                    <div style={{ 
                      padding: '8px 16px 8px 32px', display: 'flex', alignItems: 'center', gap: '8px',
                      color: isItemActive ? colors.activeText : colors.textSub, fontSize: '0.85rem',
                      backgroundColor: isItemActive ? colors.activeBg : 'transparent',
                      borderTopRightRadius: '20px', borderBottomRightRadius: '20px',
                      marginRight: '8px'
                    }}>
                      <Circle size={8} fill={isItemActive ? colors.activeText : "transparent"} />
                      {sub.name}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Work Order Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('workOrder')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.workOrder ? colors.activeBg : 'transparent',
              color: expanded.workOrder ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <Settings size={18} />
              <span>Work Order</span>
            </div>
            {expanded.workOrder ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.workOrder && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Raise Work Order', path: '/raise' },
                { name: 'WO Browse', path: '/browse' },
              ].map(sub => (
                <Link key={sub.name} href={`/contracting/work-order${sub.path}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '8px 16px 8px 32px', display: 'flex', alignItems: 'center', gap: '8px',
                    color: isActive(sub.path) ? colors.activeText : colors.textSub, fontSize: '0.85rem',
                    backgroundColor: isActive(sub.path) ? colors.activeBg : 'transparent',
                    borderTopRightRadius: '20px', borderBottomRightRadius: '20px',
                    marginRight: '8px'
                  }}>
                    <Circle size={8} fill={isActive(sub.path) ? colors.activeText : "transparent"} />
                    {sub.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RA Bills Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('raBills')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.raBills ? colors.activeBg : 'transparent',
              color: expanded.raBills ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <FileSearch size={18} />
              <span>RA Bills</span>
            </div>
            {expanded.raBills ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.raBills && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'RA Bill Generation', path: '/generation' },
                { name: 'RA Bill Browse', path: '/browse' },
                { name: 'RA Bill Approve', path: '/approve' },
              ].map(sub => (
                <Link key={sub.name} href={`/contracting/ra-bills${sub.path}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '8px 16px 8px 32px', display: 'flex', alignItems: 'center', gap: '8px',
                    color: isActive(sub.path) ? colors.activeText : colors.textSub, fontSize: '0.85rem',
                    backgroundColor: isActive(sub.path) ? colors.activeBg : 'transparent',
                    borderTopRightRadius: '20px', borderBottomRightRadius: '20px',
                    marginRight: '8px'
                  }}>
                    <Circle size={8} fill={isActive(sub.path) ? colors.activeText : "transparent"} />
                    {sub.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Other Items */}
        {[
          { name: 'Requisitions', icon: FileText, path: '/requisitions' },
          { name: 'Enquiry', icon: HelpCircle, path: '/enquiry' },
          { name: 'Reports', icon: PieChart, path: '/reports' },
          { name: 'Tools', icon: Wrench, path: '/tools' },
        ].map(item => (
          <Link key={item.name} href={`/contracting${item.path}`} style={{ textDecoration: 'none' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              color: colors.textMain, cursor: 'pointer', borderRadius: '8px', marginBottom: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', fontWeight: 500 }}>
                <item.icon size={18} />
                <span>{item.name}</span>
              </div>
            </div>
          </Link>
        ))}

      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: `1px solid ${colors.border}` }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
            borderRadius: '8px', cursor: 'pointer', color: '#ef4444',
            fontWeight: 500
          }}>
            <LogOut size={18} />
            <span>Logout</span>
          </div>
        </Link>
      </div>

    </div>
  );
};

export default ContractingSidebar;
