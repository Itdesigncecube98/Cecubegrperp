'use client';
import React, { useState } from 'react';
import { 
  Search, FileText, Home, ChevronRight, ChevronDown, 
  ChevronUp, Lock, Trash2, Plus, History, X
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function WBSBudget() {
  const [expandedRow, setExpandedRow] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState(1);

  const projects = [
    { id: 1, name: 'Unitech GBP Servicing of Busduct for DG Sets HVAC' },
    { id: 2, name: '"Godrej Panipat Consultancy Charge for EP Approval' },
    { id: 3, name: '10KWP Solar Power Plant at House No 608 Jhajjar' }
  ];

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      
      {/* Top Header */}
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#0ea5e9' }}>
            <FileText size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>WBS Budget</h2>
        </div>
        
        <div className="breadcrumb" style={{ margin: 0 }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Projects <ChevronRight size={14} /> WBS Budget
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filters Top Bar */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '24px', alignItems: 'flex-end', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Project</label>
            <select 
              className="modern-input modern-select" 
              style={{ width: '100%' }}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Amount In</label>
            <select className="modern-input modern-select" style={{ width: '100%' }}>
              <option>Hide Amount</option>
              <option>Show Amount</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>View Mode</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <input type="radio" name="viewMode" defaultChecked style={{ accentColor: '#0ea5e9', width: '16px', height: '16px' }} /> WBS
              </label>
            </div>
          </div>
          <button className="btn-primary" style={{ background: '#0ea5e9', height: '40px', width: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0 }}>
            <Search size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{ marginBottom: '16px' }}>
          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Reports <ChevronDown size={14} />
          </button>
        </div>

        {/* Complex Data Table */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Task</th>
                  <th colSpan={3} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>Approved Budget</th>
                  <th colSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>Allocated Budget</th>
                  <th colSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>Allocated Estimate</th>
                  <th colSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>Unallocated Budget</th>
                  <th colSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>Estimate</th>
                  <th colSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', fontSize: '0.85rem', borderBottom: '1px solid #38bdf8' }}>Expended</th>
                  <th rowSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '12px', textAlign: 'center', borderBottom: '1px solid #38bdf8', width: '60px' }}></th>
                </tr>
                <tr>
                  {/* Approved Budget */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Built-Up Area</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  
                  {/* Allocated Budget */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  
                  {/* Allocated Estimate */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  
                  {/* Unallocated Budget */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  
                  {/* Estimate */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  
                  {/* Expended */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                
                {/* ROW 1 */}
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div onClick={() => toggleRow(1)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {expandedRow === 1 ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#0ea5e9' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>33-11KV Open Type Sub Stati</span>
                  </td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1,81,43,...</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1,81,43,...</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>4,41,70...</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>4,41,70...</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1,70,01,...</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1,70,01,5...</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>7,00,000...</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>7,00,000...</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1,75,21,...</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>1,75,21,...</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>2,46,80...</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#dc2626', background: '#fecaca', fontWeight: 600 }}>2,46,80...</td>
                  
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <Lock size={14} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                      <Trash2 size={14} color="#10b981" style={{ cursor: 'pointer' }} />
                    </div>
                  </td>
                </tr>

                {/* Expanded Form for ROW 1 */}
                {expandedRow === 1 && (
                  <tr>
                    <td colSpan={15} style={{ padding: '16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ border: '1px solid #e0f2fe', borderRadius: '8px', padding: '20px', position: 'relative' }}>
                        
                        <div style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', color: '#0ea5e9', background: '#e0f2fe', borderRadius: '50%', padding: '2px' }} onClick={() => toggleRow(1)}>
                          <X size={16} />
                        </div>
                        
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', textAlign: 'center', fontWeight: 600 }}>Allocate Budget</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Built-Up Area</label>
                            <input type="text" className="modern-input" defaultValue="1" disabled style={{ width: '100%', background: '#f1f5f9' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Rate: <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" className="modern-input" style={{ width: '100%', background: '#f8fafc' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Amount: <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" className="modern-input" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Budget Head Category <span style={{ color: '#ef4444' }}>*</span></label>
                            <select className="modern-input modern-select" style={{ width: '100%' }}>
                              <option>Select</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Remark: <span style={{ color: '#ef4444' }}>*</span></label>
                          <input type="text" className="modern-input" style={{ width: '100%' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <History size={16} /> View History
                          </button>
                          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> Add Budget
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* ROW 2 */}
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div onClick={() => toggleRow(2)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      {expandedRow === 2 ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#0ea5e9' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>Sample Cable laying</span>
                  </td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>0.00</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#dc2626', background: '#fecaca', fontWeight: 600 }}>0.00</td>
                  
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <Lock size={14} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                      <Trash2 size={14} color="#10b981" style={{ cursor: 'pointer' }} />
                    </div>
                  </td>
                </tr>

                {/* Expanded Form for ROW 2 */}
                {expandedRow === 2 && (
                  <tr>
                    <td colSpan={15} style={{ padding: '16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ border: '1px solid #e0f2fe', borderRadius: '8px', padding: '20px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', color: '#0ea5e9', background: '#e0f2fe', borderRadius: '50%', padding: '2px' }} onClick={() => toggleRow(2)}>
                          <X size={16} />
                        </div>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#0284c7', textAlign: 'center', fontWeight: 600 }}>Allocate Budget</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Built-Up Area</label>
                            <input type="text" className="modern-input" defaultValue="0" disabled style={{ width: '100%', background: '#f1f5f9' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Rate: <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" className="modern-input" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Amount: <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" className="modern-input" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Budget Head Category <span style={{ color: '#ef4444' }}>*</span></label>
                            <select className="modern-input modern-select" style={{ width: '100%' }}>
                              <option>Select</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Remark: <span style={{ color: '#ef4444' }}>*</span></label>
                          <input type="text" className="modern-input" style={{ width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <History size={16} /> View History
                          </button>
                          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> Add Budget
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
