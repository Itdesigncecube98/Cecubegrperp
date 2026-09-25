'use client';
import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Printer, Save, X } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function LeavingReasonsPage() {
  const [reasons, setReasons] = useState([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('leavingReasons');
    if (saved) {
      setReasons(JSON.parse(saved));
    } else {
      setReasons([
        { id: 1, reason: 'Salary' },
        { id: 2, reason: 'Personal Family' },
        { id: 3, reason: 'Pregnancy' },
        { id: 4, reason: 'Location' },
        { id: 5, reason: 'Absconded' },
        { id: 6, reason: 'Better Opportunity' },
        { id: 7, reason: 'Terminated' }
      ]);
    }
  }, []);

  React.useEffect(() => {
    if (reasons.length > 0) {
      localStorage.setItem('leavingReasons', JSON.stringify(reasons));
    }
  }, [reasons]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [reasonText, setReasonText] = useState('');

  const [dialogState, setDialogState] = useState({ isOpen: false, type: 'info', message: '', onConfirm: null });

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      message: 'Are you sure you want to delete this reason?',
      onConfirm: () => {
        const updated = reasons.filter(item => item.id !== id);
        setReasons(updated);
        localStorage.setItem('leavingReasons', JSON.stringify(updated));
        setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null });
      }
    });
  };

  const handleEdit = (item) => {
    setReasonText(item.reason);
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setReasonText('');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!reasonText.trim()) {
      setDialogState({
        isOpen: true,
        type: 'info',
        message: 'Reason cannot be empty',
        onConfirm: () => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null })
      });
      return;
    }

    if (editingId) {
      setReasons(reasons.map(item => item.id === editingId ? { ...item, reason: reasonText } : item));
    } else {
      setReasons([...reasons, { id: Date.now(), reason: reasonText }]);
    }
    
    setIsModalOpen(false);
    setReasonText('');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Leaving Reasons</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#e0f2fe' }}>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#0369a1', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Leaving Reason
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#0369a1', letterSpacing: '0.05em', textTransform: 'uppercase', width: '150px' }} className="no-print">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {reasons.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No leaving reasons found. Add a new one.</td>
              </tr>
            ) : (
              reasons.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: index === reasons.length - 1 ? 'none' : '1px solid #f1f5f9', background: '#fff', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#e0f2fe'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                    {item.reason}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }} className="no-print">
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', padding: 0 }}>
                        <Edit2 size={18} strokeWidth={2} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', padding: 0 }}>
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb' }} className="no-print">
          <button 
            onClick={handleAddNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.4rem 0.75rem',
              background: '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>
                {editingId ? 'Edit Leaving Reason' : 'Add Leaving Reason'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#6b7280" />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Reason <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={reasonText}
                onChange={e => setReasonText(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none' }}
                placeholder="Enter reason..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog 
        isOpen={dialogState.isOpen} 
        type={dialogState.type} 
        message={dialogState.message} 
        onConfirm={dialogState.onConfirm || (() => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null }))} 
        onCancel={dialogState.type === 'confirm' ? () => setDialogState({ isOpen: false, type: 'info', message: '', onConfirm: null }) : undefined} 
      />

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}} />
    </div>
  );
}
