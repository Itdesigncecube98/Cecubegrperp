'use client';
import React, { useState } from 'react';
import { 
  Search, Plus, ChevronRight, ChevronDown as ExpandIcon, ChevronRight as CollapseIcon, Home, Folder, Copy, Scissors, ChevronDown
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

// Simple Tree Node Component
const TreeNode = ({ label, children, defaultExpanded = false, isItem = false }) => {
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
        <Folder size={14} color="#f59e0b" fill="#f59e0b" />
        <span style={{ fontWeight: hasChildren && !isItem ? 500 : 400, color: '#334155' }}>
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

export default function TaskLibrary() {
  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* Left Pane - Tree View */}
      <div style={{ width: '380px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#334155' }}></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>Task Library</h2>
          </div>
          
          <select className="modern-input modern-select" style={{ marginBottom: '12px' }}>
            <option>Electrical Work Library</option>
          </select>
          
          <div className="search-wrapper" style={{ position: 'relative', marginBottom: '12px' }}>
            <input type="text" className="modern-input" placeholder="Search Task" style={{ paddingRight: '32px' }} />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 10px', fontSize: '0.8rem' }}>
               Add Group
            </button>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 10px', fontSize: '0.8rem' }}>
               Add Task
            </button>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 10px', fontSize: '0.8rem' }}>
               Reports <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', minHeight: '300px' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#84cc16', marginBottom: '8px' }}>
               <Folder size={14} color="#84cc16" /> Electrical Work Library
            </div>
            <TreeNode label="DG Repair Work" isItem={true}></TreeNode>
            <TreeNode label="External Electrification work" isItem={true}></TreeNode>
            <TreeNode label="Account work" isItem={true}></TreeNode>
            <TreeNode label="1. CeCube Task Library" isItem={true}></TreeNode>
            <TreeNode label="2. Merging" isItem={true}></TreeNode>
            <TreeNode label="Duplicate Task" isItem={true}></TreeNode>
            <TreeNode label="Data for Delete" isItem={true}></TreeNode>
            <TreeNode label="Test" isItem={true}></TreeNode>
            <TreeNode label="Test-1" isItem={true}></TreeNode>
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
            <Home size={14} /> Home <ChevronRight size={14} /> Library <ChevronRight size={14} /> Task Library
          </div>
        </div>
        
        {/* Main Content Area - Empty state to match screenshot */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Folder size={48} opacity={0.5} />
            Select a task or group to view details
          </div>
        </div>
      </div>
    </div>
  );
}
