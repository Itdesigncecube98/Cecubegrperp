'use client';
import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ClipboardList, 
  FileText, 
  Calculator, 
  Briefcase, 
  CheckSquare, 
  Send, 
  Award,
  ArrowLeft
} from 'lucide-react';

export default function TenderDetailLayout({ children, params }) {
  const unwrappedParams = use(params);
  const tenderId = unwrappedParams.id;
  const pathname = usePathname();
  
  const [tender, setTender] = useState(null);

  useEffect(() => {
    async function loadTender() {
      try {
        const res = await fetch(`/api/tender/${tenderId}`);
        if (res.ok) setTender(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadTender();
  }, [tenderId]);

  const tabs = [
    { name: 'Evaluation', path: `/tender/${tenderId}/evaluation`, icon: ClipboardList },
    { name: 'Documents', path: `/tender/${tenderId}/documents`, icon: FileText },
    { name: 'BOQ & Costing', path: `/tender/${tenderId}/boq`, icon: Calculator },
    { name: 'Bid Prep', path: `/tender/${tenderId}/bid`, icon: Briefcase },
    { name: 'Approval', path: `/tender/${tenderId}/approval`, icon: CheckSquare },
    { name: 'Submission', path: `/tender/${tenderId}/submission`, icon: Send },
    { name: 'Result', path: `/tender/${tenderId}/result`, icon: Award },
  ];

  return (
    <div className="tnd-page-container">
      {/* Detail Header */}
      <div className="tnd-header" style={{ marginBottom: '0', paddingBottom: '16px', borderBottom: 'none' }}>
        <div>
          <div className="tnd-flex tnd-items-center" style={{ gap: '12px', marginBottom: '8px' }}>
            <Link href="/tender/register" className="tnd-btn tnd-btn-outline" style={{ padding: '4px 8px', border: 'none' }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 className="tnd-title" style={{ marginBottom: 0 }}>
              {tender?.title || 'Loading Tender...'}
            </h1>
            {tender && (
              <span className={`tnd-badge ${tender.status === 'Submitted' ? 'tnd-badge-blue' : 'tnd-badge-amber'}`}>
                {tender.status}
              </span>
            )}
          </div>
          <p className="tnd-subtitle" style={{ marginLeft: '44px' }}>
            {tender?.tenderNo} | {tender?.clientName} | {tender?.projectName}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tnd-tabs" style={{ marginLeft: '44px', marginBottom: '24px' }}>
        {tabs.map(tab => {
          const isActive = pathname === tab.path;
          return (
            <Link 
              key={tab.name} 
              href={tab.path}
              className={`tnd-tab ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ marginLeft: '44px' }}>
        {children}
      </div>
    </div>
  );
}
