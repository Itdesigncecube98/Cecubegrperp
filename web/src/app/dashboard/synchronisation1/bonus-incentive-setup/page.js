'use client';
import React, { useState } from 'react';
import { Save, Plus, Trash2, Edit2, Printer, ArrowLeft } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function BonusIncentiveSetupPage() {
  const [items, setItems] = useState([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('bonusIncentives');
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      setItems([
        { id: 1, computationBasis: '250000', percentage: '100', tds: '10' }
      ]);
    }
  }, []);

  React.useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('bonusIncentives', JSON.stringify(items));
    }
  }, [items]);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [dialogState, setDialogState] = useState({ isOpen: false, type: 'info', message: '', onConfirm: null });
  
  const [formData, setFormData] = useState({
    computationBasis: '',
    percentage: '',
    tds: ''
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      message: 'Are you sure you want to delete this setup?',
      onConfirm: () => {
        const updated = items.filter(item => item.id !== id);
        setItems(updated);
        localStorage.setItem('bonusIncentives', JSON.stringify(updated));
        setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null });
      }
    });
  };

  const handleEdit = (item) => {
    setFormData({
      computationBasis: item.computationBasis,
      percentage: item.percentage,
      tds: item.tds
    });
    setEditingId(item.id);
    setView('edit');
  };

  const handleSave = () => {
    if (!formData.computationBasis) {
      setDialogState({
        isOpen: true,
        type: 'info',
        message: 'Computation basis is required',
        onConfirm: () => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null })
      });
      return;
    }

    if (view === 'add') {
      setItems([...items, { ...formData, id: Date.now() }]);
    } else {
      setItems(items.map(item => item.id === editingId ? { ...item, ...formData } : item));
    }
    
    setDialogState({
      isOpen: true,
      type: 'info',
      message: `Bonus/Incentive Setup ${view === 'add' ? 'added' : 'updated'} successfully!`,
      onConfirm: () => {
        setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null });
        setView('list');
      }
    });
  };

  if (view === 'list') {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Bonus/Incentive Setups</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={() => {
                setFormData({ computationBasis: '', percentage: '', tds: '' });
                setView('add');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <Plus size={16} /> Add New
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Computation Basis</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Percentage</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>TDS</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280', width: '150px' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No setups found. Add a new setup.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.computationBasis}</td>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.percentage}</td>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.tds}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }} className="no-print">
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => handleEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .no-print { display: none !important; }
            body { background: white; }
          }
        `}} />
        <Dialog 
          isOpen={dialogState.isOpen} 
          type={dialogState.type} 
          message={dialogState.message} 
          onConfirm={dialogState.onConfirm || (() => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null }))} 
          onCancel={dialogState.type === 'confirm' ? () => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null }) : undefined} 
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} color="#6b7280" />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            {view === 'add' ? 'Add Bonus/Incentive Setup' : 'Edit Bonus/Incentive Setup'}
          </h2>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
              Formula - For Computation Basis
            </label>
            <input
              type="text"
              value={formData.computationBasis}
              onChange={e => setFormData({ ...formData, computationBasis: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.95rem', outline: 'none' }}
              placeholder="e.g. 250000"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
              Formula - For Percentage
            </label>
            <input
              type="text"
              value={formData.percentage}
              onChange={e => setFormData({ ...formData, percentage: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.95rem', outline: 'none' }}
              placeholder="e.g. 100"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
              Formula - For TDS
            </label>
            <input
              type="text"
              value={formData.tds}
              onChange={e => setFormData({ ...formData, tds: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.95rem', outline: 'none' }}
              placeholder="e.g. 0"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
            <button
              onClick={() => setView('list')}
              style={{ padding: '0.5rem 1rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      </div>
      <Dialog 
        isOpen={dialogState.isOpen} 
        type={dialogState.type} 
        message={dialogState.message} 
        onConfirm={dialogState.onConfirm || (() => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null }))} 
        onCancel={dialogState.type === 'confirm' ? () => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null }) : undefined} 
      />
    </div>
  );
}
