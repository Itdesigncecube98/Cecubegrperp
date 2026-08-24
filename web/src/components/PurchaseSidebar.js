'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, ChevronDown, ChevronRight, 
  Layers, LogOut, Circle, Tag, ClipboardList, MessageSquare, FileText, Database
} from 'lucide-react';
import '../app/globals.css';

const PurchaseSidebar = () => {
  const pathname = usePathname();
  // Auto-expand based on active route
  const [expanded, setExpanded] = useState({
    suppliers: pathname.includes('/suppliers'),
    brands: pathname.includes('/brands'),
    requisition: pathname.includes('/requisition'),
    enquiry: pathname.includes('/enquiry'),
    quotation: pathname.includes('/quotation'),
    rateMaster: pathname.includes('/rate-master'),
  });

  const toggleExpand = (menu) => {
    setExpanded(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path) => pathname.includes(path);

  // Light UI Colors matching the other modules
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
        
        {/* Suppliers Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('suppliers')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.suppliers ? colors.activeBg : 'transparent',
              color: expanded.suppliers ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <Users size={18} />
              <span>Suppliers</span>
            </div>
            {expanded.suppliers ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.suppliers && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Supplier Master', path: '/add-supplier' },
                { name: 'Supplier List', path: '/supplier-list' },
              ].map(sub => (
                <Link key={sub.name} href={`/purchase/suppliers${sub.path}`} style={{ textDecoration: 'none' }}>
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

        {/* Brands Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('brands')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.brands ? colors.activeBg : 'transparent',
              color: expanded.brands ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <Tag size={18} />
              <span>Brands</span>
            </div>
            {expanded.brands ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.brands && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Brand Master', path: '/brand-master' },
              ].map(sub => (
                <Link key={sub.name} href={`/purchase/brands${sub.path}`} style={{ textDecoration: 'none' }}>
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

        {/* Requisition Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('requisition')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.requisition ? colors.activeBg : 'transparent',
              color: expanded.requisition ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <ClipboardList size={18} />
              <span>Requisition</span>
            </div>
            {expanded.requisition ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.requisition && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Requisition Browse', path: '/browse' },
              ].map(sub => (
                <Link key={sub.name} href={`/purchase/requisition${sub.path}`} style={{ textDecoration: 'none' }}>
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

        {/* Enquiry Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('enquiry')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.enquiry ? colors.activeBg : 'transparent',
              color: expanded.enquiry ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <MessageSquare size={18} />
              <span>Enquiry</span>
            </div>
            {expanded.enquiry ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.enquiry && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Enquiry Generation', path: '/generation' },
                { name: 'Enquiry Browse', path: '/browse' },
              ].map(sub => (
                <Link key={sub.name} href={`/purchase/enquiry${sub.path}`} style={{ textDecoration: 'none' }}>
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

        {/* Quotation Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('quotation')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.quotation ? colors.activeBg : 'transparent',
              color: expanded.quotation ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <FileText size={18} />
              <span>Quotation</span>
            </div>
            {expanded.quotation ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.quotation && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Quotation', path: '' },
              ].map(sub => (
                <Link key={sub.name} href={`/purchase/quotation${sub.path}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '8px 16px 8px 32px', display: 'flex', alignItems: 'center', gap: '8px',
                    color: isActive(`/purchase/quotation`) ? colors.activeText : colors.textSub, fontSize: '0.85rem',
                    backgroundColor: isActive(`/purchase/quotation`) ? colors.activeBg : 'transparent',
                    borderTopRightRadius: '20px', borderBottomRightRadius: '20px',
                    marginRight: '8px'
                  }}>
                    <Circle size={8} fill={isActive(`/purchase/quotation`) ? colors.activeText : "transparent"} />
                    {sub.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Rate Master Group */}
        <div style={{ marginBottom: '4px' }}>
          <div 
            onClick={() => toggleExpand('rateMaster')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', 
              cursor: 'pointer', backgroundColor: expanded.rateMaster ? colors.activeBg : 'transparent',
              color: expanded.rateMaster ? colors.activeText : colors.textMain,
              borderRadius: '8px', fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
              <Database size={18} />
              <span>Rate Master</span>
            </div>
            {expanded.rateMaster ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {expanded.rateMaster && (
            <div style={{ backgroundColor: colors.subBg, margin: '4px 0 8px 12px', borderRadius: '8px', padding: '8px 0', borderLeft: `2px solid ${colors.border}` }}>
              {[
                { name: 'Rate Master', path: '' },
              ].map(sub => (
                <Link key={sub.name} href={`/purchase/rate-master${sub.path}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '8px 16px 8px 32px', display: 'flex', alignItems: 'center', gap: '8px',
                    color: isActive(`/purchase/rate-master`) ? colors.activeText : colors.textSub, fontSize: '0.85rem',
                    backgroundColor: isActive(`/purchase/rate-master`) ? colors.activeBg : 'transparent',
                    borderTopRightRadius: '20px', borderBottomRightRadius: '20px',
                    marginRight: '8px'
                  }}>
                    <Circle size={8} fill={isActive(`/purchase/rate-master`) ? colors.activeText : "transparent"} />
                    {sub.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

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

export default PurchaseSidebar;
