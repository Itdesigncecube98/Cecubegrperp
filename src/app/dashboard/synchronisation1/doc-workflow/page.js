'use client';
import React, { useState, useEffect } from 'react';
import { Save, User, Building, Landmark, Settings, Network } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function DocWorkflowConfigPage() {
  const [employees, setEmployees] = useState([]);
  
  // Mappings is an object keyed by employeeId: { hodId, hrId, accountsId }
  const [mappings, setMappings] = useState({});
  const [globalHR, setGlobalHR] = useState('');
  const [globalAccounts, setGlobalAccounts] = useState('');

  useEffect(() => {
    // We would typically fetch employees from API, but we'll fetch them from localStorage if they exist, or fetch from API
    fetchEmployees();
    
    const savedMappings = localStorage.getItem('docGenerator_workflowConfig');
    if (savedMappings) {
      try {
        setMappings(JSON.parse(savedMappings));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error('Failed to fetch employees', e);
    }
  };

  const handleMappingChange = (empId, field, value) => {
    setMappings(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [field]: value
      }
    }));
  };

  const saveMappings = () => {
    localStorage.setItem('docGenerator_workflowConfig', JSON.stringify(mappings));
    alert('Workflow configuration saved successfully!');
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Doc Generator Workflow Configuration</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Configure the approval chain for each employee's document requests.</p>
        </div>
        <button 
          onClick={saveMappings}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0ea5e9', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Save size={18} /> Save Configurations
        </button>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>Global Synchronisation</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Global HR</label>
            <select value={globalHR} onChange={e => setGlobalHR(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', width: '200px' }}>
              <option value="">Select HR...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Global Accounts</label>
            <select value={globalAccounts} onChange={e => setGlobalAccounts(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', width: '200px' }}>
              <option value="">Select Accounts...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button 
            onClick={() => {
              const newMap = { ...mappings };
              employees.forEach(emp => {
                newMap[emp.id] = {
                  ...(newMap[emp.id] || {}),
                  hrId: globalHR || newMap[emp.id]?.hrId,
                  accountsId: globalAccounts || newMap[emp.id]?.accountsId
                };
              });
              setMappings(newMap);
            }}
            style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
          >
            Apply to All
          </button>
          <div style={{ flex: 1 }}></div>
          <button 
            onClick={() => {
              const newMap = { ...mappings };
              employees.forEach(emp => {
                let current = emp;
                const visited = new Set();
                while (current.supervisorId && !visited.has(current.id)) {
                  visited.add(current.id);
                  const sup = employees.find(e => e.id === current.supervisorId);
                  if (!sup) break;
                  current = sup;
                }
                newMap[emp.id] = {
                  ...(newMap[emp.id] || {}),
                  hodId: current.id !== emp.id ? current.id : ''
                };
              });
              setMappings(newMap);
              alert('HODs derived from Organization Structure (Supervisor Tree)!');
            }}
            style={{ padding: '8px 16px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Network size={16} /> Sync HOD from Org Structure
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Employee</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>HOD (Level 2)</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>HR (Level 3)</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Accounts (Level 4)</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{emp.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.department} • {emp.designation}</div>
                  <div style={{ fontSize: '12px', color: '#0ea5e9', marginTop: '2px' }}>Supervisor: {employees.find(e => e.id === emp.supervisorId)?.name || 'None (Fallback to HOD)'}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <select
                    value={mappings[emp.id]?.hodId || ''}
                    onChange={(e) => handleMappingChange(emp.id, 'hodId', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select HOD...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '16px' }}>
                  <select
                    value={mappings[emp.id]?.hrId || ''}
                    onChange={(e) => handleMappingChange(emp.id, 'hrId', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select HR...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '16px' }}>
                  <select
                    value={mappings[emp.id]?.accountsId || ''}
                    onChange={(e) => handleMappingChange(emp.id, 'accountsId', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Select Accounts...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading employees or no employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
