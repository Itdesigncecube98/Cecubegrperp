'use client';
import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, Search, X, ChevronRight, ChevronDown, Save, FileText, Layers, Folder, FolderOpen, User
} from 'lucide-react';
import '../company/company.css';

// Simple Tree Node Component
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

export default function ChartOfAccountsMaster() {
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'group', 'global'
  const [showInterestConfig, setShowInterestConfig] = useState(false);

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* Left Sidebar - Tree View */}
      <div style={{ 
        width: '300px', background: 'white', borderRight: '1px solid #e2e8f0', 
        display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#0284c7" /> Chart of Accounts
          </h2>
          <div style={{ marginTop: '16px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search Account" 
              className="modern-input"
              style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
            />
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <TreeNode label="Capital Accounts" isRoot={true}>
            <TreeNode label="Current Assets">
              <TreeNode label="Cash in Hand" />
              <TreeNode label="Bank Accounts" />
            </TreeNode>
            <TreeNode label="Current Liabilities">
              <TreeNode label="Sundry Creditors" />
              <TreeNode label="Duties & Taxes" />
            </TreeNode>
            <TreeNode label="Investments" />
            <TreeNode label="Loans (Liability)" />
            <TreeNode label="Revenue Accounts">
              <TreeNode label="Sales Accounts" />
              <TreeNode label="Purchase Accounts" />
            </TreeNode>
            <TreeNode label="Suspense Accounts" />
          </TreeNode>
        </div>
      </div>

      {/* Right Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
        
        {/* Top Actions Bar */}
        <div style={{ 
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: 'white',
          display: 'flex', gap: '12px', alignItems: 'center'
        }}>
          <button 
            className="btn-outline"
            style={{ 
              background: activeTab === 'group' ? '#0284c7' : 'white',
              color: activeTab === 'group' ? 'white' : '#64748b',
              borderColor: activeTab === 'group' ? '#0284c7' : '#cbd5e1'
            }}
            onClick={() => setActiveTab('group')}
          >
            <Plus size={16} /> Add Group
          </button>
          
          <button 
            className="btn-outline"
            style={{ 
              background: activeTab === 'account' ? '#0284c7' : 'white',
              color: activeTab === 'account' ? 'white' : '#64748b',
              borderColor: activeTab === 'account' ? '#0284c7' : '#cbd5e1'
            }}
            onClick={() => setActiveTab('account')}
          >
            <Plus size={16} /> Add Account
          </button>

          <button 
            className="btn-outline"
            style={{ 
              background: activeTab === 'global' ? '#0284c7' : 'white',
              color: activeTab === 'global' ? 'white' : '#64748b',
              borderColor: activeTab === 'global' ? '#0284c7' : '#cbd5e1'
            }}
            onClick={() => setActiveTab('global')}
          >
            <Plus size={16} /> Add Global Account
          </button>

          <button 
            className="btn-outline"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowInterestConfig(true)}
          >
            Interest Configuration
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {activeTab === 'group' && (
            <div className="modern-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.125rem', color: '#0f172a' }}>Add Group Details</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                <div style={{ flex: 1, maxWidth: '400px' }}>
                  <label className="modern-label">Group Name <span style={{color: 'red'}}>*</span></label>
                  <input className="modern-input" type="text" placeholder="Enter group name" />
                </div>
                <button className="btn-primary" onClick={() => alert('Saved successfully!')}><Save size={16} /> Save Group</button>
              </div>
            </div>
          )}

          {activeTab === 'global' && (
            <div className="modern-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.125rem', color: '#0f172a' }}>Add Global Account</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                <div style={{ flex: 1, maxWidth: '400px' }}>
                  <label className="modern-label">Global Account Name <span style={{color: 'red'}}>*</span></label>
                  <input className="modern-input" type="text" placeholder="Enter global account name" />
                </div>
                <button className="btn-primary" onClick={() => alert('Saved successfully!')}><Save size={16} /> Save</button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
              
              {/* Basic Information */}
              <div className="modern-card" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} /> Basic Information
                </h4>
                <div className="form-grid">
                  <div><label className="modern-label">Account Name</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Ledger Balance Name</label><input className="modern-input" type="text" /></div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="modern-card" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} /> Contact Details
                </h4>
                <div className="form-grid">
                  <div><label className="modern-label">Contact Person</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Address</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Building No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Street</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">City</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">District</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">State</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">Country</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">Pin Code</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Mobile No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Phone No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Email</label><input className="modern-input" type="email" /></div>
                </div>
              </div>

              {/* Legal Details */}
              <div className="modern-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} /> Legal Details
                  </h4>
                  <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 16px' }}>GST Registration</button>
                </div>
                <div className="form-grid">
                  <div><label className="modern-label">PAN No</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">VAT No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Corporate Id No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">STC No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">PAN Status</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">LBT/VAT No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Excise Commissionerate Status</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">Tax/Master Status</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">MSME Category</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">MSME Registration No</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">MSME Type</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">MSME/UAN No</label><select className="modern-input modern-select"><option>Select</option></select></div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="modern-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} /> Bank Details
                  </h4>
                  <button className="btn-primary" onClick={() => alert('Saved successfully!')} style={{ fontSize: '0.8rem', padding: '6px 16px' }}><Plus size={14} /> Add Bank</button>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Bank Name</th>
                        <th>A/c Holder Name</th>
                        <th>Bank A/c No.</th>
                        <th>IFSC Code</th>
                        <th>State</th>
                        <th>Is Verified</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No bank details added</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categories */}
              <div className="modern-card" style={{ padding: '24px' }}>
                 <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} /> Categories
                </h4>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div><label className="modern-label">A/c Category 1</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">A/c Category 2</label><select className="modern-input modern-select"><option>Select</option></select></div>
                  <div><label className="modern-label">A/c Category 3</label><select className="modern-input modern-select"><option>Select</option></select></div>
                </div>
              </div>

              {/* Filters & Address Information */}
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="modern-card" style={{ padding: '24px' }}>
                   <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} /> Filters
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div><label className="modern-label">Branch / Division</label><select className="modern-input modern-select"><option>Select</option></select></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div><label className="modern-label">Interest Rate</label><input className="modern-input" type="text" defaultValue="0" /></div>
                      <div><label className="modern-label">Job / Subcost</label><input className="modern-input" type="text" defaultValue="0" /></div>
                    </div>
                    <div><label className="modern-label">Status</label><select className="modern-input modern-select"><option>Active</option></select></div>
                    <div><label className="modern-label">Remark</label><input className="modern-input" type="text" /></div>
                  </div>
                </div>

                <div className="modern-card" style={{ padding: '24px' }}>
                   <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} /> Address Information
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div><label className="modern-label">Service Tax No</label><input className="modern-input" type="text" /></div>
                    <div><label className="modern-label">TIN No</label><input className="modern-input" type="text" /></div>
                    <div><label className="modern-label">CST No</label><input className="modern-input" type="text" /></div>
                    <div><label className="modern-label">Local Body Tax No</label><input className="modern-input" type="text" /></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interest Configuration Modal */}
      {showInterestConfig && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ width: '90%', maxWidth: '1000px', height: '80%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Interest Configuration</h3>
              <button className="action-btn" onClick={() => setShowInterestConfig(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Filter Row */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label className="modern-label">Fixed Group</label>
                  <select className="modern-input modern-select"><option>All selected</option></select>
                </div>
                <div style={{ flex: 2 }}>
                  <label className="modern-label">Party Account</label>
                  <select className="modern-input modern-select"><option>Search Account</option></select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-outline">Reset</button>
                  <button className="btn-primary"><Search size={16} /> Search</button>
                </div>
              </div>

              {/* Table */}
              <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0284c7', background: '#e0f2fe', padding: '4px 12px', borderRadius: '4px' }}>Total Records: 0</span>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Show Rows: <select className="modern-input" style={{ width: '60px', padding: '4px' }}><option>40</option></select>
                    Page: 1 of 0 
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}><input type="checkbox" /></th>
                        <th>Party Account</th>
                        <th>Fixed Group</th>
                        <th>Parent Group</th>
                        <th>Effective Date</th>
                        <th>Current Interest Rate (in %)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No Records Found !!</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Add Area */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ flex: 1 }}>
                  <label className="modern-label">Interest rate (in %)</label>
                  <input className="modern-input" type="text" placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="modern-label">Effective date</label>
                  <input className="modern-input" type="date" defaultValue="2026-08-24" />
                </div>
                <button className="btn-primary" style={{ padding: '0.625rem 2rem' }}><Save size={16} /> Save</button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
