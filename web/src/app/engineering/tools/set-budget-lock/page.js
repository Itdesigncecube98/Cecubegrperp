'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Home, ChevronRight, Layers, Lock, Unlock, Calendar, User, FileText, CheckCircle, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function SetBudgetLockPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [summary, setSummary] = useState({
    approvedTotal: 0,
    allocatedTotal: 0,
    expendedTotal: 0,
    unallocatedTotal: 0,
    taskCount: 0
  });
  
  const [lockConfig, setLockConfig] = useState({
    isLocked: false,
    lockedAt: '',
    lockedBy: '',
    remarks: '',
    policies: {
      lockApprovedBudget: true,
      blockNewTasks: true,
      freezeRates: true,
      strictDiscrepancy: true
    },
    history: []
  });
  
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectBudgetLock();
    }
  }, [selectedProjectId]);

  const fetchProjectBudgetLock = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/engineering/tools/set-budget-lock?projectId=${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || { approvedTotal: 0, allocatedTotal: 0, expendedTotal: 0, unallocatedTotal: 0, taskCount: 0 });
        const rawLock = data.lockConfig || {};
        setLockConfig({
          isLocked: Boolean(rawLock.isLocked),
          lockedAt: rawLock.lockedAt || '',
          lockedBy: rawLock.lockedBy || '',
          remarks: rawLock.remarks || '',
          policies: rawLock.policies || { lockApprovedBudget: true, blockNewTasks: true, freezeRates: true, strictDiscrepancy: true },
          history: rawLock.history || []
        });
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching budget lock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyChange = (key) => {
    setLockConfig(prev => ({
      ...prev,
      policies: { ...prev.policies, [key]: !prev.policies[key] }
    }));
  };

  const handleToggleLock = async () => {
    const newState = !lockConfig.isLocked;
    
    const remarksTrimmed = (lockConfig.remarks || '').trim();
    const lockedByTrimmed = (lockConfig.lockedBy || '').trim();
    if (newState && (!remarksTrimmed || !lockedByTrimmed || !lockConfig.lockedAt)) {
      alert("Please enter Lock Date, Locked By, and Remarks before applying the Budget Lock.");
      return;
    }

    if (!confirm(`Are you sure you want to ${newState ? 'LOCK' : 'UNLOCK'} the project budget?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/engineering/tools/set-budget-lock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          isLocked: newState,
          lockedDate: lockConfig.lockedAt,
          lockedBy: lockConfig.lockedBy,
          remarks: lockConfig.remarks,
          policies: lockConfig.policies
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLockConfig(data.lockConfig);
        alert(`Project budget successfully ${newState ? 'LOCKED' : 'UNLOCKED'}!`);
        fetchProjectBudgetLock(); // Refresh tasks
      } else {
        alert('Failed to update budget lock');
      }
    } catch (err) {
      console.error('Error updating budget lock:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatRate = (val) => {
    return Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isDiscrepancy = summary.allocatedTotal > summary.approvedTotal;

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> Set Budget Lock
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} color={lockConfig.isLocked ? "#ef4444" : "#4338ca"} />
            Project Budget Lock
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Lock project-level budgets, prevent discrepancies, and block unauthorized additions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            onClick={() => window.open(`/engineering/projects/wbs-budget?projectId=${selectedProjectId}`, '_blank')}
          >
            <ExternalLink size={16} /> Open in WBS Budget
          </button>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Layers size={18} color="#4338ca" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '8px', outline: 'none', minWidth: '220px' }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', color: '#64748b' }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          
          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Approved Budget</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>₹ {formatRate(summary.approvedTotal)}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Total Approved Ceiling</div>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Allocated Budget</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isDiscrepancy ? '#ef4444' : '#0284c7' }}>₹ {formatRate(summary.allocatedTotal)}</div>
                <div style={{ fontSize: '11px', color: isDiscrepancy ? '#ef4444' : '#64748b', marginTop: '4px' }}>
                  {isDiscrepancy ? 'Warning: Exceeds Approved' : 'Total Allocated to Tasks'}
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Unallocated Balance</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>₹ {formatRate(summary.unallocatedTotal)}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Remaining for Allocation</div>
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Expended Amount</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#9333ea' }}>₹ {formatRate(summary.expendedTotal)}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Total Expended So Far</div>
              </div>
            </div>

            {/* Master Lock Configuration Panel */}
            <div style={{ background: 'white', borderRadius: '12px', border: lockConfig.isLocked ? '2px solid #ef4444' : '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ background: lockConfig.isLocked ? '#fef2f2' : '#f8fafc', padding: '16px 24px', borderBottom: lockConfig.isLocked ? '1px solid #fecaca' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: lockConfig.isLocked ? '#fee2e2' : '#e2e8f0', padding: '10px', borderRadius: '50%' }}>
                    {lockConfig.isLocked ? <Lock size={24} color="#ef4444" /> : <Unlock size={24} color="#64748b" />}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: lockConfig.isLocked ? '#ef4444' : '#334155' }}>
                      {lockConfig.isLocked ? 'PROJECT BUDGET IS LOCKED' : 'PROJECT BUDGET IS UNLOCKED'}
                    </h2>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      {lockConfig.isLocked 
                        ? 'Strict rules are active. Modifications to project budget and tasks are prevented.'
                        : 'Budget is currently open. New tasks and budget additions are permitted.'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleToggleLock}
                  disabled={saving}
                  style={{
                    background: lockConfig.isLocked ? '#f8fafc' : '#ef4444',
                    color: lockConfig.isLocked ? '#ef4444' : 'white',
                    border: lockConfig.isLocked ? '1px solid #ef4444' : 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: lockConfig.isLocked ? 'none' : '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : (lockConfig.isLocked ? <Unlock size={16} /> : <Lock size={16} />)}
                  {lockConfig.isLocked ? 'RELEASE LOCK' : 'APPLY MASTER LOCK'}
                </button>
              </div>

              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                
                {/* Lock Metadata Form */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Lock Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        <Calendar size={14} /> Effective Lock Date <span style={{color: '#ef4444'}}>*</span>
                      </label>
                      <input 
                        type="date" 
                        className="modern-input" 
                        style={{ width: '100%' }}
                        value={lockConfig.lockedAt ? lockConfig.lockedAt.split('T')[0] : ''}
                        onChange={(e) => setLockConfig({...lockConfig, lockedAt: e.target.value})}
                        disabled={lockConfig.isLocked}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        <User size={14} /> Locked By <span style={{color: '#ef4444'}}>*</span>
                      </label>
                      <input 
                        type="text" 
                        className="modern-input" 
                        style={{ width: '100%' }}
                        placeholder="e.g. Authorized Signatory"
                        value={lockConfig.lockedBy || ''}
                        onChange={(e) => setLockConfig({...lockConfig, lockedBy: e.target.value})}
                        disabled={lockConfig.isLocked}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      <FileText size={14} /> Reason / Remarks <span style={{color: '#ef4444'}}>*</span>
                    </label>
                    <textarea 
                      className="modern-input" 
                      style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                      placeholder="e.g. Baseline budget frozen after client sign-off. No additional tasks permitted."
                      value={lockConfig.remarks || ''}
                      onChange={(e) => setLockConfig({...lockConfig, remarks: e.target.value})}
                      disabled={lockConfig.isLocked}
                    ></textarea>
                  </div>
                </div>

                {/* Policies Configuration */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Lock Policies</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: lockConfig.isLocked ? 'not-allowed' : 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={lockConfig.policies?.lockApprovedBudget !== false}
                        onChange={() => handlePolicyChange('lockApprovedBudget')}
                        disabled={lockConfig.isLocked}
                        style={{ accentColor: '#4338ca', marginTop: '2px', width: '16px', height: '16px' }} 
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Lock Approved Budget Ceiling</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Prevent increasing total project approved budget amounts.</div>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: lockConfig.isLocked ? 'not-allowed' : 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={lockConfig.policies?.blockNewTasks !== false}
                        onChange={() => handlePolicyChange('blockNewTasks')}
                        disabled={lockConfig.isLocked}
                        style={{ accentColor: '#4338ca', marginTop: '2px', width: '16px', height: '16px' }} 
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Block New Task Creation</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Do not allow adding new tasks into the project's WBS budget.</div>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: lockConfig.isLocked ? 'not-allowed' : 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={lockConfig.policies?.freezeRates !== false}
                        onChange={() => handlePolicyChange('freezeRates')}
                        disabled={lockConfig.isLocked}
                        style={{ accentColor: '#4338ca', marginTop: '2px', width: '16px', height: '16px' }} 
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Freeze Rate & Quantity Edits</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Prevent modifications to existing approved/allocated rates and built-up areas.</div>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: lockConfig.isLocked ? 'not-allowed' : 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={lockConfig.policies?.strictDiscrepancy !== false}
                        onChange={() => handlePolicyChange('strictDiscrepancy')}
                        disabled={lockConfig.isLocked}
                        style={{ accentColor: '#4338ca', marginTop: '2px', width: '16px', height: '16px' }} 
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Strict Discrepancy Prevention</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Reject any saving if allocated budget exceeds approved budget.</div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            {/* Task Breakdown Table */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: 0 }}>Budget Tasks Lockdown Status</h3>
                <span style={{ fontSize: '12px', color: '#64748b', background: 'white', padding: '4px 10px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                  {summary.taskCount} Tasks Found
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#fcfcfc' }}>Task Name</th>
                      <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#fcfcfc' }}>Approved Amt</th>
                      <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#fcfcfc' }}>Allocated Amt</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#fcfcfc' }}>Task Lock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No tasks found in this project.</td></tr>
                    ) : (
                      tasks.map(task => (
                        <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{task.taskName}</td>
                          <td style={{ padding: '12px 20px', fontSize: '13px', color: '#475569', textAlign: 'right' }}>₹ {formatRate(task.approvedAmount)}</td>
                          <td style={{ padding: '12px 20px', fontSize: '13px', color: '#475569', textAlign: 'right' }}>₹ {formatRate(task.allocatedAmount)}</td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            {task.isLocked ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                <Lock size={12} /> LOCKED
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0ea5e9', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                <Unlock size={12} /> UNLOCKED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Audit History Sidebar */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#f59e0b" /> Audit Log & History
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!lockConfig.history || lockConfig.history.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No lock history recorded for this project yet.
                </div>
              ) : (
                lockConfig.history.map((entry, idx) => (
                  <div key={entry.id} style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px solid #e2e8f0' }}>
                    <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: entry.action.includes('Unlocked') ? '#0ea5e9' : '#ef4444' }}></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                      {new Date(entry.date).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      {entry.action}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>
                      <strong>By:</strong> {entry.user}
                    </div>
                    {entry.remarks && (
                      <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '6px', borderRadius: '4px', marginTop: '4px', fontStyle: 'italic' }}>
                        "{entry.remarks}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
