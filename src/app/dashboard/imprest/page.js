'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Banknote, 
  Receipt, 
  Calculator,
  BarChart2,
  Wallet
} from 'lucide-react';
import './imprest.css';

import ImprestDashboard from './components/ImprestDashboard';
import ImprestRequest from './components/ImprestRequest';
import ImprestApproval from './components/ImprestApproval';
import ImprestIssue from './components/ImprestIssue';
import ImprestSettlement from './components/ImprestSettlement';
import ImprestReports from './reports/page';
import OpeningBalance from './opening-balance/page';

export default function ImprestManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'opening-balance', name: 'Opening Balance', icon: Wallet },
    { id: 'request', name: 'Request Creation', icon: FileText },
    { id: 'approval', name: 'Approval Workflow', icon: CheckSquare },
    { id: 'issue', name: 'Issue Details', icon: Banknote },
    { id: 'settlement', name: 'Settlement', icon: Calculator },
    { id: 'reports', name: 'Reports', icon: BarChart2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ImprestDashboard />;
      case 'opening-balance':
        return <OpeningBalance />;
      case 'request':
        return <ImprestRequest />;
      case 'approval':
        return <ImprestApproval />;
      case 'issue':
        return <ImprestIssue />;
      case 'settlement':
        return <ImprestSettlement />;
      case 'reports':
        return <ImprestReports />;
      default:
        return <ImprestDashboard />;
    }
  };

  return (
    <div className="imprest-container">
      <div className="imprest-header">
        <h1>Imprest Management</h1>
        <p className="subtitle">Manage petty cash, employee expenses, and settlements efficiently.</p>
      </div>

      <div className="imprest-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      <div className="imprest-content">
        {renderContent()}
      </div>
    </div>
  );
}
