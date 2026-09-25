'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, CheckCircle, Clock } from 'lucide-react';
import '../dashboard/employee.css';

export default function EmployeeAppraisalPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('self');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) {
      router.push('/login/employee');
      return;
    }
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    fetchAssignments(parsed.id);
  }, [router]);

  const fetchAssignments = async (empId) => {
    try {
      const res = await fetch(`/api/employee/appraisals?employeeId=${empId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error('Error fetching appraisals:', err);
    }
    setLoading(false);
  };

  const getFilteredAssignments = () => {
    if (activeTab === 'self') {
      return assignments.filter(a => a.employeeId === employee?.id);
    } else if (activeTab === 'appraiser') {
      return assignments.filter(a => a.appraiserId === employee?.id);
    } else if (activeTab === 'reviewer') {
      return assignments.filter(a => a.reviewerId === employee?.id);
    }
    return [];
  };

  const handleSelectAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    
    // Initialize form responses
    const initialResponses = {};
    if (assignment.questionSet?.questions) {
      assignment.questionSet.questions.forEach(q => {
        const existingResp = assignment.responses?.find(r => r.questionId === q.id);
        if (activeTab === 'self') {
          initialResponses[q.id] = { score: existingResp?.selfScore || '', comment: existingResp?.selfComment || '' };
        } else if (activeTab === 'appraiser') {
          initialResponses[q.id] = { score: existingResp?.appraiserScore || '', comment: existingResp?.appraiserComment || '' };
        } else if (activeTab === 'reviewer') {
          initialResponses[q.id] = { score: existingResp?.reviewerScore || '', comment: existingResp?.reviewerComment || '' };
        }
      });
    }
    setResponses(initialResponses);
  };

  const handleResponseChange = (questionId, field, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const handleSubmit = () => {
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const payload = {
        assignmentId: selectedAssignment.id,
        employeeId: employee.id,
        role: activeTab,
        responses: Object.entries(responses).map(([questionId, data]) => ({
          questionId,
          score: data.score,
          comment: data.comment
        }))
      };

      const res = await fetch('/api/employee/appraisals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Appraisal submitted successfully!');
        setSelectedAssignment(null);
        fetchAssignments(employee.id);
      } else {
        const data = await res.json();
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting appraisal.');
    }
    setSubmitting(false);
  };

  const isEditable = () => {
    if (activeTab === 'self') {
      const diffDays = (new Date() - new Date(selectedAssignment.createdAt)) / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    }
    if (activeTab === 'appraiser') return true;
    if (activeTab === 'reviewer') return true;
    return false;
  };

  const getStatusBadge = (status) => {
    let bg = '#e2e8f0'; let color = '#475569';
    if (status === 'Submitted' || status === 'Approved') { bg = '#dcfce7'; color = '#166534'; }
    if (status === 'Pending Appraiser' || status === 'Pending Reviewer') { bg = '#fef9c3'; color = '#854d0e'; }
    return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{status}</span>;
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading appraisals...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', sticky: 'top', zIndex: 10 }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 600, borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>Appraisals</h1>
      </div>

      <div style={{ maxWidth: '1000px', margin: '24px auto', padding: '0 24px' }}>
        {selectedAssignment ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <button onClick={() => setSelectedAssignment(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', marginBottom: '8px' }}>
                  <ArrowLeft size={14} /> Back to List
                </button>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{selectedAssignment.questionSet?.name || 'Question Set'}</h2>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                  Employee: <strong style={{ color: '#0f172a' }}>{selectedAssignment.employee?.name}</strong> • 
                  Status: {getStatusBadge(selectedAssignment.assignmentStatus)}
                </div>
              </div>
              {isEditable() && (
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  <Save size={16} /> {submitting ? 'Submitting...' : 'Submit Appraisal'}
                </button>
              )}
            </div>

            <div style={{ padding: '20px' }}>
              {!isEditable() && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <Clock size={16} /> This form is locked for editing at this stage.
                </div>
              )}

              {selectedAssignment.questionSet?.questions?.map((q, idx) => {
                const existingResp = selectedAssignment.responses?.find(r => r.questionId === q.id);
                return (
                  <div key={q.id} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px', fontSize: '15px' }}>
                      {idx + 1}. {q.question}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                      Type: {q.type} • Weightage: {q.weightage}% {q.objective ? `• Objective: ${q.objective}` : ''}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {/* Self Appraisal Column */}
                      <div style={{ flex: 1, minWidth: '250px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: activeTab === 'self' && isEditable() ? '2px solid #3b82f6' : '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: activeTab === 'self' ? '#2563eb' : '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Self Appraisal {activeTab === 'self' && isEditable() ? '(Your Assessment)' : ''}
                        </div>
                        {activeTab === 'self' && isEditable() ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Score (out of {q.weightage})</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <select 
                                  value={responses[q.id]?.score ?? ''}
                                  onChange={e => handleResponseChange(q.id, 'score', e.target.value)}
                                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                                >
                                  <option value="">-- Select --</option>
                                  {Array.from({ length: Math.ceil(Number(q.weightage)) + 1 }, (_, i) => (
                                    <option key={i} value={i}>{i}</option>
                                  ))}
                                </select>
                                {responses[q.id]?.score !== undefined && responses[q.id]?.score !== '' && (
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                    Grade: {Math.round((Number(responses[q.id].score) / Number(q.weightage)) * 5)}/5
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Comments / Justification</label>
                              <textarea 
                                value={responses[q.id]?.comment ?? ''}
                                onChange={e => handleResponseChange(q.id, 'comment', e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Score:</strong> {existingResp?.selfScore ?? '-'} / {q.weightage} 
                              {existingResp?.selfScore !== null && existingResp?.selfScore !== undefined && (
                                <span style={{ color: '#3b82f6', marginLeft: '8px', fontWeight: 600 }}>(Grade: {Math.round((Number(existingResp.selfScore) / q.weightage) * 5)}/5)</span>
                              )}
                            </div>
                            <div><strong>Comment:</strong> {existingResp?.selfComment || '-'}</div>
                          </>
                        )}
                      </div>
                      
                      {/* Appraiser (Supervisor) Column */}
                      <div style={{ flex: 1, minWidth: '250px', background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: activeTab === 'appraiser' && isEditable() ? '2px solid #0284c7' : '1px solid #bae6fd' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: activeTab === 'appraiser' ? '#0369a1' : '#0284c7', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Appraiser Review {activeTab === 'appraiser' && isEditable() ? '(Your Assessment)' : ''}
                        </div>
                        {activeTab === 'appraiser' && isEditable() ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: '#0369a1', marginBottom: '4px' }}>Score (out of {q.weightage})</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <select 
                                  value={responses[q.id]?.score ?? ''}
                                  onChange={e => handleResponseChange(q.id, 'score', e.target.value)}
                                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none', background: '#fff' }}
                                >
                                  <option value="">-- Select --</option>
                                  {Array.from({ length: Math.ceil(Number(q.weightage)) + 1 }, (_, i) => (
                                    <option key={i} value={i}>{i}</option>
                                  ))}
                                </select>
                                {responses[q.id]?.score !== undefined && responses[q.id]?.score !== '' && (
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                    Grade: {Math.round((Number(responses[q.id].score) / Number(q.weightage)) * 5)}/5
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: '#0369a1', marginBottom: '4px' }}>Comments / Justification</label>
                              <textarea 
                                value={responses[q.id]?.comment ?? ''}
                                onChange={e => handleResponseChange(q.id, 'comment', e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none', resize: 'vertical' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Score:</strong> {existingResp?.appraiserScore ?? '-'} / {q.weightage}
                              {existingResp?.appraiserScore !== null && existingResp?.appraiserScore !== undefined && (
                                <span style={{ color: '#0369a1', marginLeft: '8px', fontWeight: 600 }}>(Grade: {Math.round((Number(existingResp.appraiserScore) / q.weightage) * 5)}/5)</span>
                              )}
                            </div>
                            <div><strong>Comment:</strong> {existingResp?.appraiserComment || '-'}</div>
                          </>
                        )}
                      </div>

                      {/* Reviewer Column */}
                      <div style={{ flex: 1, minWidth: '250px', background: '#f5f3ff', padding: '12px', borderRadius: '8px', border: activeTab === 'reviewer' && isEditable() ? '2px solid #7c3aed' : '1px solid #ddd6fe' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: activeTab === 'reviewer' ? '#6d28d9' : '#7c3aed', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Reviewer Assessment {activeTab === 'reviewer' && isEditable() ? '(Your Assessment)' : ''}
                        </div>
                        {activeTab === 'reviewer' && isEditable() ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: '#6d28d9', marginBottom: '4px' }}>Score (out of {q.weightage})</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <select 
                                  value={responses[q.id]?.score ?? ''}
                                  onChange={e => handleResponseChange(q.id, 'score', e.target.value)}
                                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #c4b5fd', outline: 'none', background: '#fff' }}
                                >
                                  <option value="">-- Select --</option>
                                  {Array.from({ length: Math.ceil(Number(q.weightage)) + 1 }, (_, i) => (
                                    <option key={i} value={i}>{i}</option>
                                  ))}
                                </select>
                                {responses[q.id]?.score !== undefined && responses[q.id]?.score !== '' && (
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#6d28d9', background: '#ede9fe', padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                    Grade: {Math.round((Number(responses[q.id].score) / Number(q.weightage)) * 5)}/5
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', color: '#6d28d9', marginBottom: '4px' }}>Comments / Justification</label>
                              <textarea 
                                value={responses[q.id]?.comment ?? ''}
                                onChange={e => handleResponseChange(q.id, 'comment', e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #c4b5fd', outline: 'none', resize: 'vertical' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Score:</strong> {existingResp?.reviewerScore ?? '-'} / {q.weightage}
                              {existingResp?.reviewerScore !== null && existingResp?.reviewerScore !== undefined && (
                                <span style={{ color: '#6d28d9', marginLeft: '8px', fontWeight: 600 }}>(Grade: {Math.round((Number(existingResp.reviewerScore) / q.weightage) * 5)}/5)</span>
                              )}
                            </div>
                            <div><strong>Comment:</strong> {existingResp?.reviewerComment || '-'}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
              <button 
                onClick={() => setActiveTab('self')}
                style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: activeTab === 'self' ? '#3b82f6' : '#64748b', borderBottom: activeTab === 'self' ? '2px solid #3b82f6' : 'none', marginBottom: '-2px' }}
              >
                My Appraisals
              </button>
              <button 
                onClick={() => setActiveTab('appraiser')}
                style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: activeTab === 'appraiser' ? '#3b82f6' : '#64748b', borderBottom: activeTab === 'appraiser' ? '2px solid #3b82f6' : 'none', marginBottom: '-2px' }}
              >
                Team Appraisals
              </button>
              <button 
                onClick={() => setActiveTab('reviewer')}
                style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: activeTab === 'reviewer' ? '#3b82f6' : '#64748b', borderBottom: activeTab === 'reviewer' ? '2px solid #3b82f6' : 'none', marginBottom: '-2px' }}
              >
                Reviewer Appraisals
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {getFilteredAssignments().length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No appraisals found for this section.
                </div>
              ) : (
                getFilteredAssignments().map(assignment => (
                  <div key={assignment.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 600 }}>
                        <FileText size={18} />
                        {assignment.process?.name || 'Appraisal Process'}
                      </div>
                      {getStatusBadge(assignment.assignmentStatus)}
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#475569' }}>
                      <strong>Question Set:</strong> {assignment.questionSet?.name || 'N/A'}
                    </div>

                    {(activeTab === 'appraiser' || activeTab === 'reviewer') && (
                      <div style={{ fontSize: '14px', color: '#475569' }}>
                        <strong>Employee:</strong> {assignment.employee?.name}
                      </div>
                    )}

                    <button 
                      onClick={() => handleSelectAssignment(assignment)}
                      style={{ marginTop: 'auto', background: '#f1f5f9', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={e => e.target.style.background = '#f1f5f9'}
                    >
                      View & Update
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.25rem' }}>Confirm Submission</h3>
            <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to submit? You will not be able to edit these scores and comments later.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeSubmit}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
