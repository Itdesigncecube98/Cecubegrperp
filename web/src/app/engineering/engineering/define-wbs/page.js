'use client';
import React, { useState } from 'react';
import { 
  Search, Plus, ChevronRight, ChevronDown as ExpandIcon, ChevronRight as CollapseIcon, Home, Layers
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

// Simple Tree Node Component
const TreeNode = ({ label, children, defaultExpanded = false, isTask = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div style={{ marginLeft: '20px', marginTop: '8px' }}>
      <div 
        style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          cursor: hasChildren ? 'pointer' : 'default',
          color: '#334155', fontSize: '0.875rem'
        }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? <ExpandIcon size={14} /> : <CollapseIcon size={14} />
        ) : (
          <span style={{ width: 14, display: 'inline-block' }}></span>
        )}
        <input type="checkbox" defaultChecked={true} onClick={e => e.stopPropagation()} />
        <span style={{ fontWeight: hasChildren && !isTask ? 500 : 400, color: hasChildren && !isTask ? '#0ea5e9' : '#334155' }}>
          {label}
        </span>
      </div>
      {isExpanded && hasChildren && (
        <div style={{ borderLeft: '1px dashed #cbd5e1', marginLeft: '6px', paddingLeft: '8px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default function DefineWBS() {
  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* Left Pane - Tree View */}
      <div style={{ width: '380px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#334155' }}></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>Define WBS</h2>
          </div>
          
          <select className="modern-input modern-select" style={{ marginBottom: '12px' }}>
            <option>Birla Estate, Rerouting of 66KV Electrical Service</option>
          </select>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 12px', fontSize: '0.875rem' }}>
              <Plus size={14} /> Add Group
            </button>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 12px', fontSize: '0.875rem' }}>
              <Layers size={14} /> Add Task
            </button>
          </div>
          
          <div className="search-wrapper" style={{ position: 'relative' }}>
            <input type="text" className="modern-input" placeholder="Search" style={{ paddingRight: '32px' }} />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', minHeight: '300px' }}>
            <TreeNode label="All" defaultExpanded={true}>
              <TreeNode label="Birla Estate, Rerouting of 66KV Electrical Service" defaultExpanded={true}>
                <TreeNode label="Civil Work" defaultExpanded={true} isTask={true}></TreeNode>
                <TreeNode label="Electrical Work" defaultExpanded={true} isTask={true}></TreeNode>
                <TreeNode label="Soil Testing" defaultExpanded={true} isTask={true}></TreeNode>
                <TreeNode label="Rental Charge" defaultExpanded={true} isTask={true}></TreeNode>
                <TreeNode label="Tools" defaultExpanded={true} isTask={true}></TreeNode>
                <TreeNode label="Labour charges" defaultExpanded={true} isTask={true}></TreeNode>
                <TreeNode label="Hi-Pot Testing" defaultExpanded={true} isTask={true}></TreeNode>
              </TreeNode>
            </TreeNode>
          </div>
        </div>
      </div>

      {/* Right Pane - Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        {/* Top Breadcrumb Bar */}
        <div style={{ 
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: 'white',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <div className="breadcrumb" style={{ margin: 0 }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Engineering <ChevronRight size={14} /> Define WBS
          </div>
        </div>
        
        {/* Main Content Area - Empty state to match screenshot */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Layers size={48} opacity={0.5} />
            Select a task or group to view details
          </div>
        </div>
      </div>
    </div>
  );
}
