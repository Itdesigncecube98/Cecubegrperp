'use client';
import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function IssuingAuthorityPage() {
  const [authorities, setAuthorities] = useState([
    { id: 1, name: 'Pune University' },
    { id: 2, name: 'NICMAR' },
    { id: 3, name: 'Delhi University' },
    { id: 4, name: 'BSER' },
    { id: 5, name: 'Jaipur National University' },
    { id: 6, name: 'MDU Rohtak' },
    { id: 7, name: 'HBSE' },
    { id: 8, name: 'Board of UP' },
    { id: 9, name: 'CBSE Board' },
    { id: 10, name: 'Rajiv Gandhi Prodyogiki Vishwavidyalaya' },
    { id: 11, name: 'Kumaon University' },
    { id: 12, name: 'MPBSE' },
    { id: 13, name: 'West Bengal University of Technology' },
    { id: 14, name: 'N.P.T.I.' },
    { id: 15, name: 'SRM' },
    { id: 16, name: 'BSEB' },
    { id: 17, name: 'ITI, Hathua' },
    { id: 18, name: 'JAC Ranchi' },
    { id: 19, name: 'Magadh University' },
    { id: 20, name: 'National ITC' },
  ]);

  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAuthority, setEditingAuthority] = useState(null);

  const showDialog = (type, title, message, onConfirm = null) => {
    setDialogConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleEdit = (id) => {
    const item = authorities.find(a => a.id === id);
    setEditingAuthority({ ...item });
    setEditModalOpen(true);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (editingAuthority && editingAuthority.name.trim()) {
      setAuthorities(authorities.map(a => a.id === editingAuthority.id ? { ...a, name: editingAuthority.name } : a));
      setEditModalOpen(false);
      setEditingAuthority(null);
    }
  };

  const handleDelete = (id) => {
    showDialog('confirm', 'Confirm Delete', 'Are you sure you want to delete this authority?', () => {
      setAuthorities(authorities.filter(a => a.id !== id));
      setDialogConfig(prev => ({ ...prev, isOpen: false }));
    });
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0ea5e9', color: '#fff' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Institute/University</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {authorities.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: index % 2 === 0 ? '#f8fafc' : '#fff' }}>
                <td style={{ padding: '8px 16px', fontSize: '13px', color: '#4b5563' }}>
                  {item.name}
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button onClick={() => handleEdit(item.id)} style={{ padding: 0, color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: 0, color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {authorities.length === 0 && (
              <tr>
                <td colSpan="2" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
              Edit Issuing Authority
            </h3>
            <form onSubmit={saveEdit}>
              <input 
                autoFocus
                type="text" 
                value={editingAuthority?.name || ''} 
                onChange={e => setEditingAuthority({...editingAuthority, name: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', outline: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
