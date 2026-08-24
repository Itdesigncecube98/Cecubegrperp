'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Save, ArrowLeft, Plus, Edit2, Trash2, Banknote, Printer } from 'lucide-react';
import Link from 'next/link';
import Dialog from '@/components/Dialog';

export default function AdvancesPage() {
  const [applications, setApplications] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const saved = localStorage.getItem('advanceApplications');
    if (saved) {
      setApplications(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (applications.length > 0) {
      localStorage.setItem('advanceApplications', JSON.stringify(applications));
    }
  }, [applications]);

  const [formData, setFormData] = useState({
    employeeName: 'Anjani Kumar Tripathi [Supervisor] - CGEPL015',
    advanceType: '',
    dateOfApplication: '2026-08-21',
    reason: '',
    advanceAmount: '',
    previousBalance: '',
    totalAmount: '',
    noOfInstallments: '',
    payBackInstallment: '',
    payableFrom: '2026-08-21',
    paymentMode: 'Cash',
    cashBankAccount: '',
    chequeNo: '',
    rateOfInterest: ''
  });

  const resetForm = () => {
    setFormData({
      employeeName: 'Anjani Kumar Tripathi [Supervisor] - CGEPL015',
      advanceType: '',
      dateOfApplication: new Date().toISOString().split('T')[0],
      reason: '',
      advanceAmount: '',
      previousBalance: '',
      totalAmount: '',
      noOfInstallments: '',
      payBackInstallment: '',
      payableFrom: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      cashBankAccount: '',
      chequeNo: '',
      rateOfInterest: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (app) => {
    setFormData({ ...app });
    setEditingId(app.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = () => {
    setApplications(applications.filter(a => a.id !== deleteDialog.id));
    setDeleteDialog({ isOpen: false, id: null });
    const remaining = applications.filter(a => a.id !== deleteDialog.id);
    localStorage.setItem('advanceApplications', JSON.stringify(remaining));
  };

  const handleSave = () => {
    if (!formData.advanceType || !formData.reason || !formData.advanceAmount || !formData.totalAmount) {
      setInfoDialog({ isOpen: true, title: 'Validation Error', message: 'Please fill all required fields' });
      return;
    }

    if (editingId) {
      setApplications(applications.map(a => a.id === editingId ? { ...formData, id: editingId } : a));
    } else {
      setApplications([...applications, { ...formData, id: Date.now() }]);
    }
    resetForm();
  };
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#374151',
    outline: 'none',
    background: '#fff'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0ea5e9',
    marginBottom: '4px'
  };

  if (!isFormOpen) {
    return (
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '18px', fontWeight: 700 }}>
            <Banknote size={24} />
            Advance Applications
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', background: '#f3f4f6', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Printer size={18} /> Print
            </button>
            <button
              onClick={handleAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', background: '#0ea5e9', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Add Application
            </button>
          </div>
        </div>
        
        {applications.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#6b7280' }}>
            No advance applications found. Click "Add Application" to create one.
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Employee Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Advance Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Installments</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.dateOfApplication}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{app.employeeName}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.advanceType}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>₹{app.totalAmount}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{app.noOfInstallments}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(app)} style={{ padding: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(app.id)} style={{ padding: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog
          isOpen={deleteDialog.isOpen}
          type="confirm"
          title="Delete Application"
          message="Are you sure you want to delete this advance application?"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
        />
        <Dialog
          isOpen={infoDialog.isOpen}
          type="info"
          title={infoDialog.title}
          message={infoDialog.message}
          onConfirm={() => setInfoDialog({ isOpen: false, title: '', message: '' })}
          onCancel={() => setInfoDialog({ isOpen: false, title: '', message: '' })}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '16px', fontWeight: 600 }}>
          <Calendar size={20} />
          Add Advance Application
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>🏠 Home {'>'} Advance Application</div>
          <button onClick={resetForm} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Employee Name</label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
            👤 Anjani Kumar Tripathi [Supervisor] - CGEPL015
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Advance Type <span style={{color: '#ef4444'}}>*</span></label>
            <select value={formData.advanceType} onChange={e => setFormData({...formData, advanceType: e.target.value})} style={inputStyle}>
              <option value="">Select</option>
              <option value="Salary Advance">Salary Advance</option>
              <option value="Personal Loan">Personal Loan</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date of Application</label>
            <div style={{ position: 'relative' }}>
              <input type="date" value={formData.dateOfApplication} onChange={e => setFormData({...formData, dateOfApplication: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reason <span style={{color: '#ef4444'}}>*</span></label>
            <input type="text" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Advance Amount <span style={{color: '#ef4444'}}>*</span></label>
            <input type="number" value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Previous Balance</label>
            <input type="number" value={formData.previousBalance} onChange={e => setFormData({...formData, previousBalance: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Total Amount <span style={{color: '#ef4444'}}>*</span></label>
            <input type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>No. of Installments</label>
            <input type="number" value={formData.noOfInstallments} onChange={e => setFormData({...formData, noOfInstallments: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Pay Back Installment <span style={{color: '#ef4444'}}>*</span></label>
            <input type="number" value={formData.payBackInstallment} onChange={e => setFormData({...formData, payBackInstallment: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Payable From</label>
            <input type="date" value={formData.payableFrom} onChange={e => setFormData({...formData, payableFrom: e.target.value})} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <label style={labelStyle}>Payment Mode <span style={{color: '#ef4444'}}>*</span></label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: formData.paymentMode === 'Cash' ? 600 : 400 }}>
                <input type="radio" name="paymentMode" value="Cash" checked={formData.paymentMode === 'Cash'} onChange={e => setFormData({...formData, paymentMode: e.target.value})} style={{ accentColor: '#0ea5e9' }} /> Cash
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: formData.paymentMode === 'Cheque' ? 600 : 400 }}>
                <input type="radio" name="paymentMode" value="Cheque" checked={formData.paymentMode === 'Cheque'} onChange={e => setFormData({...formData, paymentMode: e.target.value})} style={{ accentColor: '#0ea5e9' }} /> Cheque
              </label>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Cash/Bank Accounts <span style={{color: '#ef4444'}}>*</span></label>
            <select value={formData.cashBankAccount} onChange={e => setFormData({...formData, cashBankAccount: e.target.value})} style={inputStyle}>
              <option>Select</option>
              <option>Main Cash Account</option>
              <option>HDFC Bank</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Cheque No.</label>
            <input type="text" value={formData.chequeNo} onChange={e => setFormData({...formData, chequeNo: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Rate of Interest (Per Annum)</label>
            <input type="number" value={formData.rateOfInterest} onChange={e => setFormData({...formData, rateOfInterest: e.target.value})} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            <Save size={16} /> Save
          </button>
        </div>

      </div>
    </div>
  );
}
