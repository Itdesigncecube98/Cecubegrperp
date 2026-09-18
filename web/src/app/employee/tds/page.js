'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit3 } from 'lucide-react';
import AppModal from '@/components/AppModal';

const monthsHeader = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export default function EmployeeTDS() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState('2026-2027');
  const [employeeId, setEmployeeId] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const empData = localStorage.getItem('employeeData');
      if (empData) {
        const parsed = JSON.parse(empData);
        setEmployeeId(parsed.id);
      }
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchData();
    }
  }, [employeeId, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use adminView=true to get the employee structured with their 12-month filings
      const res = await fetch(`/api/tds?adminView=true&employeeId=${employeeId}&year=${year}`);
      if (res.ok) {
        const employees = await res.json();
        const mappedData = employees.map(emp => {
          let total = 0;
          const monthsData = Array(12).fill(null).map((_, i) => {
            const m = monthsHeader[i];
            const filing = emp.tdsFilings.find(f => f.month === m);
            if (filing) {
              total += filing.amount;
              return { amount: filing.amount.toFixed(2), filingId: filing.id };
            }
            return { amount: '0.00', filingId: null };
          });
          
          return {
            id: emp.id,
            empNo: emp.empId || 'N/A',
            name: emp.name || 'Unknown',
            dept: emp.department || 'N/A',
            position: emp.position || 'N/A',
            total: total.toFixed(2),
            months: monthsData
          };
        });
        
        setData(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch TDS data', error);
    }
    setLoading(false);
  };

  const openEditModal = (monthIndex, cellData) => {
    setEditingCell({
      employeeId: employeeId,
      month: monthsHeader[monthIndex],
      year: year,
      filingId: cellData.filingId
    });
    setEditAmount(cellData.amount === '0.00' ? '' : cellData.amount);
    setModalOpen(true);
  };

  const handleSaveTds = async () => {
    if (!editAmount || isNaN(editAmount)) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      if (editingCell.filingId) {
        await fetch('/api/tds', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCell.filingId, amount: editAmount })
        });
      } else {
        await fetch('/api/tds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: editingCell.employeeId,
            month: editingCell.month,
            year: editingCell.year,
            amount: editAmount
          })
        });
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save TDS', error);
      alert('Failed to save TDS');
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 500, padding: '0.4rem 0.8rem', background: '#e2e8f0', borderRadius: '6px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>My TDS Filings</h1>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>Financial Year:</label>
            <select 
              value={year} 
              onChange={e => setYear(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <table style={{ minWidth: '1200px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Emp No</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Department</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#0ea5e9' }}>Total TDS</th>
                {monthsHeader.map(m => (
                  <th key={m} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="16" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="16" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No data available</td></tr>
              ) : (
                data.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{r.empNo}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{r.dept}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0ea5e9' }}>{r.total}</td>
                    {r.months.map((m, idx) => (
                      <td key={idx} style={{ padding: '0.4rem', textAlign: 'center' }}>
                        <div 
                          onClick={() => openEditModal(idx, m)}
                          style={{ 
                            cursor: 'pointer', 
                            padding: '0.4rem', 
                            borderRadius: '4px',
                            backgroundColor: parseFloat(m.amount) > 0 ? '#ecfdf5' : '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            color: parseFloat(m.amount) > 0 ? '#059669' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0ea5e9'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                          title="Click to file/edit TDS"
                        >
                          <span>{m.amount}</span>
                          <Edit3 size={12} style={{ opacity: 0.5 }} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal isOpen={modalOpen} title={`Update TDS for ${editingCell?.month} ${editingCell?.year}`} onClose={() => setModalOpen(false)} onConfirm={handleSaveTds} confirmLabel="Save TDS" size="sm">
        <div style={{ padding: '1rem 0' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>TDS Amount *</label>
          <input 
            type="number" 
            step="0.01" 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} 
            value={editAmount} 
            onChange={(e) => setEditAmount(e.target.value)}
            placeholder="Enter amount (e.g. 1500.00)"
            autoFocus
          />
        </div>
      </AppModal>
    </div>
  );
}
