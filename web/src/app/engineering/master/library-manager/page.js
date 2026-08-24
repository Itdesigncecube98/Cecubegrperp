'use client';
import React, { useState } from 'react';
import { 
  Home, ChevronRight, Edit, Trash2, Search, Plus, Save, X
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function LibraryManager() {
  const [data, setData] = useState([
    { id: 1, name: 'Government Tenders', desc: '39 Material(s), 36 Labour(s), 70 Task(s), 0 Equipment(s)' },
    { id: 2, name: 'HT Fault Maintenance Work', desc: '46 Material(s), 14 Labour(s), 22 Task(s), 0 Equipment(s)' },
    { id: 3, name: 'HVAC Works', desc: '7 Material(s), 37 Labour(s), 38 Task(s), 0 Equipment(s)' },
    { id: 4, name: 'Misc. Project Expenses', desc: '2 Material(s), 0 Labour(s), 2 Task(s), 0 Equipment(s)' },
    { id: 5, name: 'STP', desc: '0 Material(s), 21 Labour(s), 21 Task(s), 0 Equipment(s)' },
    { id: 6, name: 'Tender Test Library', desc: '57 Material(s), 50 Labour(s), 62 Task(s), 0 Equipment(s)' },
    { id: 7, name: 'Test Library 2', desc: '129 Material(s), 70 Labour(s), 127 Task(s), 0 Equipment(s)' },
    { id: 8, name: 'Unitech Library', desc: '893 Material(s), 3172 Labour(s), 3546 Task(s), 0 Equipment(s)' }
  ]);
  
  const [isAdding, setIsAdding] = useState(true);

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      
      {/* Top Header */}
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>Library Manager</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#64748b' }}>
            <span>Page:</span>
            <input type="text" defaultValue="1" style={{ width: '40px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
            <span>of 1</span>
            <button className="btn-primary" style={{ background: '#0ea5e9', padding: '4px 12px', fontSize: '0.8rem', borderRadius: '16px' }}>Go</button>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '30%' }}>Library Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '55%' }}>Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '15%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#475569' }}>{row.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#64748b' }}>{row.desc}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <Edit size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                      <Trash2 size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Add New Row */}
              {isAdding && (
                <tr>
                  <td style={{ padding: '12px 16px' }}>
                    <input 
                      type="text" 
                      className="modern-input" 
                      style={{ padding: '6px 12px', width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <Save size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                      <X size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Text */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Powered by Kanix Infotech Pvt. Ltd.</span>
          <span style={{ color: '#0ea5e9' }}>India's first Construction ERP Software. Ver: 33.00.00</span>
        </div>
      </div>
    </div>
  );
}
