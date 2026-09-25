'use client';
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Calculator, Printer, FileDown, FileText } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';
import SalarySlipModal from './SalarySlipModal';
import Dialog from '@/components/Dialog';

export default function SalaryCalculation() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [records, setRecords] = useState([]);
  const [cycleBonusIncentives, setCycleBonusIncentives] = useState([]);
  const [selectedRecordForSlip, setSelectedRecordForSlip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Dialog state
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null, onCancel: null });
  
  // Filters
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);

  // Checkbox states
  const [considerBonus, setConsiderBonus] = useState(false);
  const [considerLeaveEncash, setConsiderLeaveEncash] = useState(false);
  const [considerTds, setConsiderTds] = useState(true);

  useEffect(() => {
    fetch('/api/payroll/cycles')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setCycles(d);
          if (d.length > 0) setSelectedCycleId(d[0].id);
        }
      });
  }, []);

  const fetchDetails = async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/cycles/${selectedCycleId}`);
      const data = await res.json();
      const recs = data.payrollRecords || [];
      setRecords(recs);
      setCycleBonusIncentives(data.bonusIncentives || []);
      
      const uniqueDepts = [...new Set(recs.map(r => r.employee?.department).filter(Boolean))];
      const uniqueBranches = [...new Set(recs.map(r => r.employee?.branch).filter(Boolean))];
      const uniqueEmps = [...new Set(recs.map(r => r.employee ? `${r.employee.name} (${r.employee.empId})` : null).filter(Boolean))];

      setSelectedDepts(uniqueDepts);
      setSelectedBranches(uniqueBranches);
      setSelectedEmps(uniqueEmps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [selectedCycleId]);

  const handleCalculate = async () => {
    if (!selectedCycleId) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/payroll/cycles/${selectedCycleId}/process`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ considerBonus, considerLeaveEncash, considerTds })
      });
      const json = await res.json();
      if (json.success) {
        await fetchDetails();
        alert(`✅ Processed ${json.processedCount} records successfully!`);
      } else {
        alert(`❌ Error: ${json.error}`);
      }
    } catch (e) {
      alert(`❌ Network error: ${e.message}`);
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const uniqueDepts = [...new Set(records.map(r => r.employee?.department).filter(Boolean))];
  const uniqueBranches = [...new Set(records.map(r => r.employee?.branch).filter(Boolean))];
  const uniqueEmps = [...new Set(records.map(r => r.employee ? `${r.employee.name} (${r.employee.empId})` : null).filter(Boolean))];

  const handleToggleApprove = (id, newStatus) => {
    const isApproving = newStatus === 'APPROVED';
    const msg = isApproving 
      ? 'Are you sure you want to approve this salary record? Once approved, it cannot be modified.' 
      : 'Are you sure you want to unapprove? This will allow modifications again.';
      
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: isApproving ? 'Approve Salary' : 'Unapprove Salary',
      message: msg,
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/payroll/records/${id}/toggle-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          const json = await res.json();
          if (json.success) {
            setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
          } else {
            alert(json.error || 'Failed to update status');
          }
        } catch (e) {
          alert('Error updating status');
          console.error(e);
        }
      }
    });
  };

  const filteredRecords = records.filter(r => {
    const isAllDepts = selectedDepts.length === 0 || selectedDepts.length === uniqueDepts.length;
    const isAllBranches = selectedBranches.length === 0 || selectedBranches.length === uniqueBranches.length;
    const isAllEmps = selectedEmps.length === 0 || selectedEmps.length === uniqueEmps.length;

    const deptMatch = isAllDepts || (r.employee?.department && selectedDepts.includes(r.employee.department));
    const branchMatch = isAllBranches || (r.employee?.branch && selectedBranches.includes(r.employee.branch));
    const empLabel = r.employee ? `${r.employee.name} (${r.employee.empId})` : null;
    const empMatch = isAllEmps || (empLabel && selectedEmps.includes(empLabel));

    return deptMatch && branchMatch && empMatch;
  });

  const totalProcessed = filteredRecords.filter(r => r.status === 'PROCESSED').length;
  const totalNetPay = filteredRecords.reduce((sum, r) => sum + (r.netPay || 0), 0).toFixed(2);

  const handleSlipSaveSuccess = (updatedRecord, updatedBonusIncentives) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r));
    if (updatedBonusIncentives) {
      setCycleBonusIncentives(updatedBonusIncentives);
    }
    setSelectedRecordForSlip(prev => prev && prev.id === updatedRecord.id ? { ...prev, ...updatedRecord } : prev);
  };

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', width: '100%' }}>
          <div className="filter-group">
            <label>Pay Code</label>
            <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Organization / Branch</label>
            <MultiSelect options={uniqueBranches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
          </div>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect options={uniqueDepts} selected={selectedDepts} onChange={setSelectedDepts} placeholder="Select Department" />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect options={uniqueEmps} selected={selectedEmps} onChange={setSelectedEmps} placeholder="Select Employee" />
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={handleCalculate} disabled={processing} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: processing ? '#94a3b8' : '#0ea5e9' }}>
            {processing ? <RefreshCw className="spin" size={16} /> : <Calculator size={16} />} 
            {processing ? 'Processing...' : 'Calculate'}
          </button>
          <button className="btn-primary" onClick={() => window.print()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
      </div>

      <div className="summary-badges">
        <div className="summary-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>{filteredRecords.length} Employees</div>
        <div className="summary-badge green">Salary Processed : {totalProcessed}</div>
        <div className="summary-badge blue">Pending: {filteredRecords.length - totalProcessed}</div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0', minHeight: 300 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
              <th style={{ padding: '10px', width: '40px' }}><input type="checkbox" /></th>
              <th style={{ padding: '10px' }}>EMP NO</th>
              <th style={{ padding: '10px' }}>NAME</th>
              <th style={{ padding: '10px' }}>POSITION</th>
              <th style={{ padding: '10px' }}>DEPT</th>
              <th style={{ padding: '10px' }}>BRANCH</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>W. DAYS</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ABSENT</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>LEAVE ENC.</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>EARNING</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>DEDUCTION</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>NET SALARY</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</td></tr>
            ) : filteredRecords.length === 0 ? (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem' }}>No records found. Click Calculate to process.</td></tr>
            ) : filteredRecords.map((row, idx) => (
              <tr key={row.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <td style={{ padding: '8px' }}><input type="checkbox" /></td>
                <td style={{ padding: '8px', color: '#0284c7', fontWeight: 600 }}>{row.employee?.empId}</td>
                <td style={{ padding: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRecordForSlip(row)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 6px',
                      margin: '-4px -6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#0284c7',
                      fontWeight: 600,
                      font: 'inherit',
                      textAlign: 'left',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e0f2fe';
                      e.currentTarget.style.color = '#0369a1';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#0284c7';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                    title="Click to view & edit Salary Slip"
                  >
                    <span>{row.employee?.name}</span>
                    <FileText size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                  </button>
                </td>
                <td style={{ padding: '8px' }}>{row.employee?.designation}</td>
                <td style={{ padding: '8px' }}>{row.employee?.department || '-'}</td>
                <td style={{ padding: '8px' }}>{row.employee?.branch || '-'}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{row.workingDays}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{row.absentDays}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#d97706' }}>₹{row.leaveEncashment?.toFixed(2) || '0.00'}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>₹{row.grossPay?.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#dc2626' }}>₹{row.totalDeductions?.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#059669', background: '#ecfdf5' }}>₹{row.netPay?.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {row.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleToggleApprove(row.id, 'APPROVED')}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>APPROVED</span>
                      <button 
                        onClick={() => handleToggleApprove(row.id, 'PENDING')}
                        style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Unapprove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleCalculate} disabled={processing} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: processing ? '#94a3b8' : '#0ea5e9' }}>
          {processing ? <RefreshCw className="spin" size={16} /> : <Calculator size={16} />} 
          {processing ? 'Processing...' : 'Calculate'}
        </button>
        <div style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600' }}>
          Total Net: ₹{totalNetPay}
        </div>
      </div>

      {/* Interactive Salary Slip Modal */}
      {selectedRecordForSlip && (
        <SalarySlipModal
          record={selectedRecordForSlip}
          cycleName={cycles.find(c => c.id === selectedCycleId)?.name}
          bonusIncentives={cycleBonusIncentives}
          onClose={() => setSelectedRecordForSlip(null)}
          onSaveSuccess={handleSlipSaveSuccess}
        />
      )}

      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </div>
  );
}
