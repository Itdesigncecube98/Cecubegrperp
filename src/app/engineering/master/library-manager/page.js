'use client';
import React, { useState } from 'react';
import { 
  Edit, Trash2, Plus, Save, X
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function LibraryManager() {
  const [data, setData] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  React.useEffect(() => {
    fetchLibraries();
  }, []);

  const fetchLibraries = async () => {
    try {
      const res = await fetch('/api/libraries');
      if (res.ok) {
        const libs = await res.json();
        setData(libs);
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
    if (!newName.trim()) {
      alert("Library name is required!");
      return;
    }
    try {
      const res = await fetch('/api/libraries', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, name: newName } : { name: newName })
      });
      if (res.ok) {
        fetchLibraries();
        setNewName('');
        setIsAdding(false);
        setEditingId(null);
      } else {
        alert("Failed to save library");
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
      </div>

      {/* Main Content Table */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '80%' }}>Library Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem', width: '20%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#475569' }}>{row.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <Edit size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} onClick={() => { setEditingId(row.id); setNewName(row.name); setIsAdding(true); }} />
                      <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleDelete(row.id)} />
                    </div>
                  </td>
                </tr>
              ))}

              {/* Add New Row Toggle */}
              {!isAdding && (
                <tr>
                  <td colSpan="2" style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button className="btn-primary" style={{ background: '#0ea5e9', padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => { setEditingId(null); setNewName(''); setIsAdding(true); }}>
                      <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} /> Add Library
                    </button>
                  </td>
                </tr>
              )}

              {/* Add / Edit Row */}
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
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      autoFocus
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <Save size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} onClick={handleSave} />
                      <X size={16} color="#0ea5e9" style={{ cursor: 'pointer' }} onClick={() => { setIsAdding(false); setNewName(''); setEditingId(null); }} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
