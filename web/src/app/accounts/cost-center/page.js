'use client';
import React, { useState } from 'react';
import { 
  Plus, Search, X, Save, FileText, Layers, Folder, FolderOpen, Printer, RefreshCw, MapPin, Trash2
} from 'lucide-react';
import Dialog from '../../../components/Dialog';
import '../company/company.css';

// Simple Tree Node Component (reusable from Chart of Accounts)
const TreeNode = ({ label, children, isRoot = false }) => {
  const [isOpen, setIsOpen] = useState(isRoot);
  
  return (
    <div style={{ marginLeft: isRoot ? '0' : '16px', marginTop: '4px' }}>
      <div 
        onClick={() => children && setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', 
          cursor: children ? 'pointer' : 'default',
          padding: '6px 8px', borderRadius: '4px',
          background: isOpen && !isRoot ? '#f1f5f9' : 'transparent',
          color: '#334155', fontSize: '0.875rem', fontWeight: isRoot ? 600 : 500
        }}
      >
        {children ? (isOpen ? <FolderOpen size={16} color="#0284c7" /> : <Folder size={16} color="#0284c7" />) : <FileText size={16} color="#64748b" />}
        <span>{label}</span>
      </div>
      {isOpen && children && (
        <div style={{ borderLeft: '1px solid #e2e8f0', marginLeft: '12px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default function CostCenterMaster() {
  const [activeTab, setActiveTab] = useState('cost-center'); // 'cost-center', 'group'
  const [showAssignState, setShowAssignState] = useState(false);
  const [filterType, setFilterType] = useState('group'); // 'group', 'center'
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, targetName: '' });

  const confirmDelete = () => {
    // Perform delete logic here
    setDeleteDialog({ isOpen: false, targetName: '' });
  };

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* Left Sidebar */}
      <div style={{ 
        width: '320px', background: 'white', borderRight: '1px solid #e2e8f0', 
        display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          
          {/* Stats Boxes */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1, background: '#ffedd5', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #fdba74' }}>
              <div style={{ color: '#ea580c', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Cost Center Group</div>
              <div style={{ color: '#ea580c', fontSize: '1.25rem', fontWeight: 700 }}>0</div>
            </div>
            <div style={{ flex: 1, background: '#e0e7ff', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #a5b4fc' }}>
              <div style={{ color: '#4f46e5', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Cost Center</div>
              <div style={{ color: '#4f46e5', fontSize: '1.25rem', fontWeight: 700 }}>0</div>
            </div>
          </div>

          {/* Radio Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#065f46', fontWeight: 500, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="filterType" 
                checked={filterType === 'group'} 
                onChange={() => setFilterType('group')} 
                style={{ accentColor: '#059669' }}
              /> 
              Cost Center Group
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#065f46', fontWeight: 500, cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="filterType" 
                checked={filterType === 'center'} 
                onChange={() => setFilterType('center')}
                style={{ accentColor: '#059669' }}
              /> 
              Cost Center
            </label>
          </div>

          {/* Dropdown & Search */}
          <select className="modern-input modern-select" style={{ marginBottom: '8px', fontSize: '0.8rem' }}>
            <option>Type 3</option>
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search Cost Centre" 
              className="modern-input"
              style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
            />
          </div>
        </div>
        
        {/* Tree View Placeholder */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <TreeNode label="Cost Centers" isRoot={true}>
            <TreeNode label="Direct Costs">
              <TreeNode label="Raw Materials" />
              <TreeNode label="Labor" />
            </TreeNode>
            <TreeNode label="Indirect Costs">
              <TreeNode label="Overhead" />
            </TreeNode>
          </TreeNode>
        </div>
      </div>

      {/* Right Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
        
        {/* Top Actions Bar */}
        <div style={{ 
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: 'white',
          display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end'
        }}>
          <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
          
          <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => alert('Rebuilding tree structure...')}>
            <RefreshCw size={14} /> Rebuild Tree
          </button>

          <button 
            className="btn-primary" 
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() => setShowAssignState(true)}
          >
            <MapPin size={14} /> Assign State
          </button>

          <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 8px' }}></div>

          <button 
            className="btn-outline"
            style={{ 
              background: activeTab === 'group' ? '#0284c7' : 'white',
              color: activeTab === 'group' ? 'white' : '#64748b',
              borderColor: activeTab === 'group' ? '#0284c7' : '#cbd5e1',
              fontSize: '0.8rem', padding: '6px 12px'
            }}
            onClick={() => setActiveTab('group')}
          >
            <Plus size={14} /> Add Group
          </button>
          
          <button 
            className="btn-outline"
            style={{ 
              background: activeTab === 'cost-center' ? '#0284c7' : 'white',
              color: activeTab === 'cost-center' ? 'white' : '#64748b',
              borderColor: activeTab === 'cost-center' ? '#0284c7' : '#cbd5e1',
              fontSize: '0.8rem', padding: '6px 12px'
            }}
            onClick={() => setActiveTab('cost-center')}
          >
            <Plus size={14} /> Add Cost Center
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {activeTab === 'group' && (
            <div className="modern-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.125rem', color: '#0284c7' }}>Add Group Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ maxWidth: '600px' }}>
                  <label className="modern-label">Group Name <span style={{color: 'red'}}>*</span></label>
                  <input className="modern-input" type="text" placeholder="Enter group name" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <button className="btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setDeleteDialog({ isOpen: true, targetName: 'this group' })}>
                    <Trash2 size={16} /> Delete
                  </button>
                  <button className="btn-primary" onClick={() => alert('Group saved successfully!')}>
                    <Save size={16} /> Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cost-center' && (
            <div className="modern-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.125rem', color: '#0284c7' }}>Add Cost Center</h3>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><label className="modern-label">Cost Center Name</label><input className="modern-input" type="text" /></div>
                <div><label className="modern-label">Percent Completion</label><select className="modern-input modern-select"><option>Select</option></select></div>
                
                <div><label className="modern-label">Status</label><select className="modern-input modern-select"><option>Select</option></select></div>
                <div><label className="modern-label">Control Account</label><select className="modern-input modern-select"><option>Search Account</option></select></div>
                
                <div><label className="modern-label">From Date</label><input className="modern-input" type="date" defaultValue="2026-08-24" /></div>
                <div><label className="modern-label">To Date</label><input className="modern-input" type="date" defaultValue="2026-08-24" /></div>
                
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#0284c7', width: '16px', height: '16px' }} /> Active Status
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
                <button className="btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setDeleteDialog({ isOpen: true, targetName: 'this cost center' })}>
                  <Trash2 size={16} /> Delete
                </button>
                <button className="btn-primary" onClick={() => alert('Cost Center saved successfully!')}>
                  <Save size={16} /> Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign State Modal */}
      {showAssignState && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ width: '90%', maxWidth: '900px', height: '80%' }}>
            <div className="modal-header" style={{ background: '#0284c7', color: 'white', borderBottom: 'none' }}>
              <h3 className="modal-title" style={{ color: 'white' }}>Assign State</h3>
              <button 
                className="action-btn" 
                style={{ background: 'transparent', border: 'none', color: 'white' }} 
                onClick={() => setShowAssignState(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', background: 'white' }}>
              
              {/* Filter Row */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label className="modern-label">Company</label>
                  <select className="modern-input modern-select"><option>CeCube Engineering India Private Limited</option></select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="modern-label">State</label>
                  <select className="modern-input modern-select"><option>Select</option></select>
                </div>
                <div>
                  <button className="btn-primary" style={{ background: '#0f766e' }}>✔ Apply All</button>
                </div>
              </div>

              {/* Table */}
              <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <table className="modern-table">
                  <thead style={{ background: '#0284c7' }}>
                    <tr>
                      <th style={{ color: 'white', background: '#0284c7' }}>Cost Center</th>
                      <th style={{ color: 'white', background: '#0284c7' }}>State</th>
                      <th style={{ color: 'white', background: '#0284c7' }}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <RefreshCw size={32} color="#0284c7" className="spin-animation" />
                          <span>Loading... Please wait</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Delete Dialog */}
      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${deleteDialog.targetName}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, targetName: '' })}
      />

      <style jsx>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
