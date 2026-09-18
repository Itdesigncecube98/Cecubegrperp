'use client';
import React, { useState, useEffect } from 'react';
import { Search, Save, Users, Trash2, Plus, Shield } from 'lucide-react';

export default function TeamAllocation() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [formData, setFormData] = useState({
    role: '',
    permission: 'View',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const [projRes, empRes] = await Promise.all([
          fetch('/api/engineering/projects'),
          fetch('/api/employees') // Assuming this endpoint exists, or we mock it
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (empRes.ok) setEmployees(await empRes.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function loadTeam() {
      if (!selectedProjectId) {
        setTeamMembers([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/engineering/projects/${selectedProjectId}/team`);
        if (res.ok) setTeamMembers(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, [selectedProjectId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleEmployeeSelection = (empId) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
    } else {
      setSelectedEmployees([...selectedEmployees, empId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const filteredEmployees = employees.filter(e => 
    `${e.firstName} ${e.lastName} ${e.employeeId}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return alert('Select a project first');
    if (selectedEmployees.length === 0) return alert('Select at least one employee');
    
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedEmployees.map(empId =>
          fetch(`/api/engineering/projects/${selectedProjectId}/team`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, ...formData })
          }).then(res => res.json())
        )
      );
      
      setTeamMembers([...teamMembers, ...results]);
      setSelectedEmployees([]);
      setShowEmployeeSelector(false);
      setFormData({ role: '', permission: 'View', startDate: '', endDate: '' });
      alert(`${results.length} employee(s) assigned successfully`);
    } catch (err) {
      console.error(err);
      alert('Failed to assign employees');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      const res = await fetch(`/api/engineering/projects/${selectedProjectId}/team?memberId=${memberId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== memberId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Team Allocation</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Assign roles and module permissions for this project</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Select Project *</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Choose Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
            </select>
          </div>
        </div>

        {selectedProjectId && (
          <>
            <form onSubmit={handleAssign} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#7c3aed" /> Assign Team Members
              </h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
                  Select Employees ({selectedEmployees.length} selected)
                </label>
                
                {!showEmployeeSelector ? (
                  <button 
                    type="button"
                    onClick={() => setShowEmployeeSelector(true)}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px dashed #cbd5e1', background: '#fff', cursor: 'pointer', color: '#64748b', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> Click to Select Employees
                  </button>
                ) : (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="text"
                        placeholder="Search employees..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        style={{ flex: 1, padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.875rem' }}
                      />
                      <button 
                        type="button"
                        onClick={toggleSelectAll}
                        style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowEmployeeSelector(false)}
                        style={{ padding: '6px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Done
                      </button>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {filteredEmployees.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <label 
                            key={emp.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedEmployees.includes(emp.id) ? '#f3e8ff' : 'transparent' }}
                          >
                            <input 
                              type="checkbox"
                              checked={selectedEmployees.includes(emp.id)}
                              onChange={() => toggleEmployeeSelection(emp.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.875rem' }}>
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {emp.employeeId} • {emp.designation || 'N/A'}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {selectedEmployees.length > 0 && !showEmployeeSelector && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedEmployees.map(empId => {
                      const emp = employees.find(e => e.id === empId);
                      return (
                        <span key={empId} style={{ background: '#7c3aed', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {emp?.firstName} {emp?.lastName}
                          <button type="button" onClick={() => toggleEmployeeSelection(empId)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}>×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Project Role *</label>
                  <select name="role" required value={formData.role} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}>
                    <option value="">-- Role --</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Planning Engineer">Planning Engineer</option>
                    <option value="Site Engineer">Site Engineer</option>
                    <option value="Billing Engineer">Billing Engineer</option>
                    <option value="QA/QC">QA/QC</option>
                    <option value="Safety Officer">Safety Officer</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Permission Level *</label>
                  <select name="permission" required value={formData.permission} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}>
                    <option value="View">View Only</option>
                    <option value="Edit">Edit Access</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>Start Date</label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                </div>
                <div>
                  <button type="submit" disabled={loading || selectedEmployees.length === 0} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', background: selectedEmployees.length === 0 ? '#cbd5e1' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: selectedEmployees.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.875rem', marginTop: '18px' }}>
                    <Plus size={14} /> Assign Team
                  </button>
                </div>
              </div>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Employee</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Role</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Permissions</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Duration</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{member.employee?.firstName} {member.employee?.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.employee?.employeeId} | {member.employee?.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '500', color: '#0f172a' }}>{member.role}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        background: member.permission === 'Edit' ? '#fef08a' : '#f1f5f9', 
                        color: member.permission === 'Edit' ? '#854d0e' : '#475569', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500',
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        <Shield size={12} /> {member.permission}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#475569' }}>
                      {member.startDate ? new Date(member.startDate).toLocaleDateString() : '-'} to {member.endDate ? new Date(member.endDate).toLocaleDateString() : 'Ongoing'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button onClick={() => removeMember(member.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No team members allocated to this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
