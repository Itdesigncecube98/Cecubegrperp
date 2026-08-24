'use client';
import React, { useState } from 'react';
import { Save, ArrowLeft, Calendar, Plus, Trash2, Edit2, Printer } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function GratuitySetupPage() {
  const [items, setItems] = useState([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('gratuitySetups');
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      setItems([
        { 
          id: 1, 
          fromDate: '2026-08-21', 
          toDate: '2027-03-31', 
          minServedLimit: '60', 
          maxPayableLimit: '2000000', 
          formula: 'Basic * 15 / 26 * Years',
          monthsRoundOff: 'No',
          denominator: '26',
          subtractor: '0'
        }
      ]);
    }
  }, []);

  React.useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('gratuitySetups', JSON.stringify(items));
    }
  }, [items]);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [dialogState, setDialogState] = useState({ isOpen: false, type: 'info', message: '', onConfirm: null });

  const initialForm = {
    fromDate: '2026-08-21',
    toDate: '2026-08-21',
    minServedLimit: '',
    maxPayableLimit: '',
    formula: '',
    monthsRoundOff: 'No',
    denominator: '',
    subtractor: ''
  };

  const [formData, setFormData] = useState(initialForm);

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
        localStorage.setItem('gratuitySetups', JSON.stringify(updated));
        setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null });
      }
    });
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setView('edit');
  };

  const handleSave = () => {
    if (!formData.minServedLimit || !formData.maxPayableLimit) {
      setDialogState({
        isOpen: true,
        type: 'info',
        message: 'Minimum Served Limit and Maximum Payable Limit are required.',
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
      message: `Gratuity Setup ${view === 'add' ? 'added' : 'updated'} successfully!`,
      onConfirm: () => {
        setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null });
        setView('list');
      }
    });
  };

  if (view === 'list') {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }} className="no-print">
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
            Gratuity Setup <span style={{ fontWeight: 'normal', color: '#6b7280', fontSize: '0.9rem', marginLeft: '0.5rem' }}>View all details</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={() => {
                setFormData(initialForm);
                setView('add');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <Plus size={16} /> Add Setup
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>From Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>To Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Min Limit (Months)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Max Limit</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280', width: '150px' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No setups found. Add a new setup.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.fromDate}</td>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.toDate}</td>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.minServedLimit}</td>
                    <td style={{ padding: '1rem', color: '#111827' }}>{item.maxPayableLimit}</td>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
          Gratuity Setup <span style={{ fontWeight: 'normal', color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>View all details</span>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} color="#666" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#333', margin: 0 }}>
              {view === 'add' ? 'Add Gratuity Setup' : 'Edit Gratuity Setup'}
            </h2>
          </div>
          <button 
            onClick={() => setView('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.75rem',
              background: '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                From Date
              </label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={e => setFormData({ ...formData, fromDate: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                To Date
              </label>
              <input
                type="date"
                value={formData.toDate}
                onChange={e => setFormData({ ...formData, toDate: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                Minimum Served Limit in Months <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="number"
                value={formData.minServedLimit}
                onChange={e => setFormData({ ...formData, minServedLimit: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                Gratuity Payable Amount Maximum Limit <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="number"
                value={formData.maxPayableLimit}
                onChange={e => setFormData({ ...formData, maxPayableLimit: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
              Formula - Gratuity Computation Basis
            </label>
            <input
              type="text"
              value={formData.formula}
              onChange={e => setFormData({ ...formData, formula: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                Months Round Off <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={formData.monthsRoundOff}
                onChange={e => setFormData({ ...formData, monthsRoundOff: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                Denominator for Gratuity Calculation (Days)
              </label>
              <input
                type="number"
                value={formData.denominator}
                onChange={e => setFormData({ ...formData, denominator: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '0.5rem' }}>
                Substractor for Gratuity Calculation (Days)
              </label>
              <input
                type="number"
                value={formData.subtractor}
                onChange={e => setFormData({ ...formData, subtractor: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
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
