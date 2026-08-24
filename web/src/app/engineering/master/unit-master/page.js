'use client';
import React, { useState } from 'react';
import { 
  Edit, Trash2, Search, Save, X, ChevronUp
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function UnitMaster() {
  const [data, setData] = useState([
    { id: 1, name: 'Cft' },
    { id: 2, name: 'cm' },
    { id: 3, name: 'Coupler' },
    { id: 4, name: 'cum' },
    { id: 5, name: 'Dozen' },
    { id: 6, name: 'Drum' },
    { id: 7, name: 'Each' },
    { id: 8, name: 'foot' },
    { id: 9, name: 'Ft.' }
  ]);
  
  const [isAdding, setIsAdding] = useState(true);

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', position: 'relative' }}>
      
      {/* Top Header */}
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <div className="search-wrapper" style={{ position: 'relative', width: '250px' }}>
          <input type="text" className="modern-input" placeholder="Search" style={{ paddingRight: '32px', width: '100%' }} />
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
        
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
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '85%' }}>Unit Library</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '15%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#475569' }}>{row.name}</td>
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
                      style={{ padding: '6px 12px', width: '100%', maxWidth: '300px' }}
                    />
                  </td>
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
      </div>

      {/* Floating Action Button */}
      <div style={{ 
        position: 'absolute', bottom: '24px', right: '24px', 
        width: '40px', height: '40px', borderRadius: '50%', background: '#0ea5e9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(14, 165, 233, 0.3)', cursor: 'pointer'
      }}>
        <ChevronUp size={20} color="white" />
      </div>
    </div>
  );
}
