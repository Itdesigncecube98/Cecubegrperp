'use client';
import React, { useState } from 'react';
import { 
  Home, ChevronRight, Edit, Trash2, Search, Plus, Save, X
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function LibraryManager() {
  const [data, setData] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  
  React.useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      const res = await fetch('/api/libraries');
      if (res.ok) {
        const libs = await res.json();
        // Since original UI had desc string, we can mock it or leave it blank
        const mapped = libs.map(l => ({ ...l, desc: l.desc || '0 Material(s), 0 Labour(s), 0 Task(s)' }));
        setData(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this library?")) {
      try {
        const res = await fetch('/api/libraries', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) fetchLibraries();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async () => {
    if (!newName) {
      alert("Library name is required!");
      return;
    }
    try {
      const res = await fetch('/api/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, type: 'General' })
      });
      if (res.ok) {
        fetchLibraries();
        setNewName('');
        setIsAdding(false);
      } else {
        alert("Failed to add library");
      }
    } catch (err) {
      console.error(err);
    }
  };

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
                      <Trash2 size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} onClick={() => handleDelete(row.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {/* Add New Row Toggle */}
              {!isAdding && (
                <tr>
                  <td colSpan="3" style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => setIsAdding(true)}>
                      <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} /> Add Library
                    </button>
                  </td>
                </tr>
              )}
              
              {/* Add New Row */}
              {isAdding && (
                <tr>
                  <td style={{ padding: '12px 16px' }}>
                    <input 
                      type="text" 
                      className="modern-input" 
                      style={{ padding: '6px 12px', width: '100%' }}
                      placeholder="Enter library name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <Save size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} onClick={handleSave} />
                      <X size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} onClick={() => { setIsAdding(false); setNewName(''); }} />
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
