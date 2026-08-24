'use client';
import React, { useState, useEffect } from 'react';
import { getCandidates, addCandidate, updateCandidate, deleteCandidate, addEmployee } from '../../../lib/data';
import { Users, Plus, Edit, Trash2, CheckCircle, Search, X } from 'lucide-react';
import Dialog from '../../../components/Dialog';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    appliedFor: '',
    status: 'PENDING',
    notes: ''
  });

  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message, onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })) });
  const showConfirm = (title, message, onConfirm) => setDialogConfig({ isOpen: true, type: 'confirm', title, message, onConfirm });

  const fetchCandidatesData = async () => {
    setLoading(true);
    try {
      const data = await getCandidates();
      setCandidates(data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidatesData();
  }, []);

  const handleOpenModal = (candidate = null) => {
    if (candidate) {
      setIsEditMode(true);
      setCurrentCandidate(candidate);
      setFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        department: candidate.department || '',
        appliedFor: candidate.appliedFor || '',
        status: candidate.status || 'PENDING',
        notes: candidate.notes || ''
      });
    } else {
      setIsEditMode(false);
      setCurrentCandidate(null);
      setFormData({ name: '', email: '', phone: '', department: '', appliedFor: '', status: 'PENDING', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCandidate(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showAlert('Notice', 'Candidate Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (isEditMode && currentCandidate) {
        await updateCandidate(currentCandidate.id, formData);
      } else {
        await addCandidate(formData);
      }
      handleCloseModal();
      await fetchCandidatesData();
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to save candidate.');
    }
    setSubmitting(false);
  };

  const handleDelete = (id) => {
    showConfirm('Delete Candidate', 'Are you sure you want to delete this candidate?', async () => {
      setDialogConfig(prev => ({ ...prev, isOpen: false }));
      try {
        await deleteCandidate(id);
        await fetchCandidatesData();
      } catch (err) {
        console.error(err);
        showAlert('Error', 'Failed to delete candidate.');
      }
    });
  };

  const handleConvertToEmployee = (candidate) => {
    showConfirm('Convert to Employee', `Are you sure you want to hire ${candidate.name} and convert them to an employee?`, async () => {
      setDialogConfig(prev => ({ ...prev, isOpen: false }));
      try {
        // Create employee
        const newEmp = await addEmployee({
          name: candidate.name,
          email: candidate.email || `${candidate.name.replace(/\s+/g, '').toLowerCase()}@cecube.com`,
          password: 'password123', // default password
          department: candidate.department || '',
          role: 'EMPLOYEE',
          phone: candidate.phone,
          designation: candidate.appliedFor
        });

        if (newEmp.error) {
          showAlert('Error', newEmp.error);
          return;
        }

        // Mark candidate as HIRED
        await updateCandidate(candidate.id, { status: 'HIRED' });
        
        showAlert('Success', `${candidate.name} has been successfully hired as an Employee!`);
        await fetchCandidatesData();
      } catch (err) {
        console.error(err);
        showAlert('Error', 'Failed to convert candidate to employee.');
      }
    });
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.department && c.department.toLowerCase().includes(search.toLowerCase())) ||
    (c.appliedFor && c.appliedFor.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Users size={28} color="#3b82f6" />
          Candidate Management
        </h1>
        <button 
          onClick={() => handleOpenModal()} 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search candidates..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No candidates found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Contact</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Applied For</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Department</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Assignment</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(candidate => (
                  <tr key={candidate.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{candidate.name}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{candidate.email}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{candidate.phone}</div>
                    </td>
                    <td style={{ padding: '12px', color: '#334155' }}>{candidate.appliedFor || '-'}</td>
                    <td style={{ padding: '12px', color: '#334155' }}>{candidate.department || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      {candidate.orgChartNode ? (
                        <div style={{ fontSize: '13px', background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 600 }}>
                          Assigned: {candidate.orgChartNode.positionTitle}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                          Unassigned
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: candidate.status === 'HIRED' ? '#dcfce7' : candidate.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                        color: candidate.status === 'HIRED' ? '#166534' : candidate.status === 'REJECTED' ? '#991b1b' : '#92400e'
                      }}>
                        {candidate.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {candidate.status !== 'HIRED' && (
                          <button 
                            onClick={() => handleConvertToEmployee(candidate)}
                            title="Convert to Employee"
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenModal(candidate)}
                          style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(candidate.id)}
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
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
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{isEditMode ? 'Edit Candidate' : 'Add Candidate'}</h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Full Name *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Phone</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Applied For (Position)</label>
                    <input type="text" value={formData.appliedFor} onChange={e => setFormData({...formData, appliedFor: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Department</label>
                    <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option value="PENDING">Pending</option>
                    <option value="INTERVIEWING">Interviewing</option>
                    <option value="OFFERED">Offered</option>
                    <option value="HIRED">Hired</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}></textarea>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '10px 16px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 16px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{submitting ? 'Saving...' : 'Save Candidate'}</button>
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
        onCancel={() => setDialogConfig(prev => ({...prev, isOpen: false}))}
      />
    </div>
  );
}
