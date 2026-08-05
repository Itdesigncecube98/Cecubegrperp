'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkWeeks, updateWorkWeeks, getLeaveTypes, createLeaveType, deleteLeaveType } from '../../../lib/data';
import { Check, X, Edit2, Plus, Trash2 } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('workweeks');
  const [workWeeks, setWorkWeeks] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    name: '',
    isPaid: true,
    isActive: true,
    includeWeeklyOff: false,
    includeHoliday: false,
    considerAsPresent: false
  });


  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login/admin');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ww = await getWorkWeeks();
      const lt = await getLeaveTypes();
      setWorkWeeks(ww);
      setLeaveTypes(lt);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleWorkDay = async (id, currentStatus) => {
    const updated = workWeeks.map(w => w.id === id ? { ...w, isWorking: !currentStatus } : w);
    setWorkWeeks(updated);
    try {
      await updateWorkWeeks(updated);
      showToast('Successfully Saved');
    } catch (e) {
      showToast('Error saving');
    }
  };

  const handleAddLeave = async () => {
    if (!newLeave.name) return;
    try {
      await createLeaveType(newLeave);
      setShowModal(false);
      fetchData();
      showToast('Successfully Saved');
      setNewLeave({
        name: '', isPaid: true, isActive: true, includeWeeklyOff: false, includeHoliday: false, considerAsPresent: false
      });
    } catch (e) {
      showToast('Error saving');
    }
  };

  const handleDeleteLeave = async (id) => {
    try {
      await deleteLeaveType(id);
      fetchData();
      showToast('Successfully Deleted');
    } catch (e) {
      showToast('Error deleting');
    }
  };

  if (loading) return <div style={{padding: '2rem'}}>Loading setup...</div>;

  const weekDaysOrdered = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const orderedWorkWeeks = [...workWeeks].sort((a,b) => weekDaysOrdered.indexOf(a.day) - weekDaysOrdered.indexOf(b.day));

  return (
    <div className="setup-container">
      {toast && <div className="toast-top">{toast}</div>}
      
      <div className="page-header">
        <a href="/dashboard" className="back-link">{"< Back to Administration & Reports"}</a>
        <h2>Attendance & Leave Setup</h2>
      </div>

      <div className="setup-layout">
        <div className="setup-sidebar">
          <ul>
            <li className={activeTab === 'workweeks' ? 'active' : ''} onClick={() => setActiveTab('workweeks')}>
              <span className="icon">📅</span> Work Weeks <span className="badge">1</span>
            </li>
            <li className={activeTab === 'shifts' ? 'active' : ''} onClick={() => setActiveTab('shifts')}>
              <span className="icon">💼</span> Shifts
            </li>
            <li className={activeTab === 'leaveperiods' ? 'active' : ''} onClick={() => setActiveTab('leaveperiods')}>
              <span className="icon">🗓</span> Leave Periods <span className="badge">1</span>
            </li>
            <li className={activeTab === 'leavetypes' ? 'active' : ''} onClick={() => setActiveTab('leavetypes')}>
              <span className="icon">✈</span> Leave Types <span className="badge">{leaveTypes.length}</span>
            </li>
            <li className={activeTab === 'autoproc' ? 'active' : ''} onClick={() => setActiveTab('autoproc')}>
              <span className="icon">🔄</span> Auto Attendance Process
            </li>
          </ul>
        </div>

        <div className="setup-content">
          {activeTab === 'workweeks' && (
            <div className="content-card">
              <div className="card-header-flex">
                <div>
                  <h3>Work Weeks & Day Configuration</h3>
                  <p className="subtitle">The below table shows the list of work weeks and days can be configured.</p>
                </div>
                <button className="btn-primary">Add</button>
              </div>

              <table className="setup-table">
                <thead>
                  <tr>
                    <th>S.NO</th>
                    <th>WORK WEEK NAME</th>
                    {weekDaysOrdered.map(d => <th key={d}>{d.substring(0,3).toUpperCase()}</th>)}
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Default Work Week</td>
                    {orderedWorkWeeks.map(w => (
                      <td key={w.id}>
                        <button 
                          className={`status-badge ${w.isWorking ? 'working' : 'non-working'}`}
                          onClick={() => toggleWorkDay(w.id, w.isWorking)}
                        >
                          {w.isWorking ? 'Working' : 'Non-working'}
                        </button>
                      </td>
                    ))}
                    <td><Edit2 size={16} color="#666" style={{cursor: 'pointer'}} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'leavetypes' && (
            <div className="content-card">
              <div className="card-header-flex">
                <div>
                  <h3>Leave Types</h3>
                  <p className="subtitle">The below table shows the list of leave types.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>Add</button>
              </div>

              <table className="setup-table">
                <thead>
                  <tr>
                    <th>S.NO</th>
                    <th>NAME</th>
                    <th>IS PAID</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt, idx) => (
                    <tr key={lt.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{lt.name}</td>
                      <td>{lt.isPaid ? 'Yes' : 'No'}</td>
                      <td className="action-links">
                        <span onClick={() => {}}>Edit Config</span>
                        {' | '}
                        <span onClick={() => {}}>Rules</span>
                        {' | '}
                        <span onClick={() => router.push('/dashboard/leaves/entitlements')}>Entitlement Settings</span>
                        {' | '}
                        <span onClick={() => {}}>Advanced Settings</span>
                        <button onClick={() => handleDeleteLeave(lt.id)} style={{ marginLeft: '10px', background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {leaveTypes.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>No leave types configured.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Placeholders for other tabs */}
          {['shifts', 'leaveperiods', 'autoproc'].includes(activeTab) && (
            <div className="content-card">
              <h3>This module is under development</h3>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width: '600px'}}>
            <div className="modal-header">
              <h3>Add Leave Type</h3>
              <X className="close-icon" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body form-grid">
              
              <div className="form-group full-width">
                <label>Leave Type Name</label>
                <input type="text" value={newLeave.name} onChange={e => setNewLeave({...newLeave, name: e.target.value})} placeholder="Casual Leave" />
              </div>

              <div className="form-group">
                <label>Is this a Paid Leave?</label>
                <div className="radio-inline">
                  <label><input type="radio" checked={newLeave.isPaid} onChange={() => setNewLeave({...newLeave, isPaid: true})} /> Yes</label>
                  <label><input type="radio" checked={!newLeave.isPaid} onChange={() => setNewLeave({...newLeave, isPaid: false})} /> No</label>
                </div>
              </div>

              <div className="form-group">
                <label>Is Active?</label>
                <div className="radio-inline">
                  <label><input type="radio" checked={newLeave.isActive} onChange={() => setNewLeave({...newLeave, isActive: true})} /> Yes</label>
                  <label><input type="radio" checked={!newLeave.isActive} onChange={() => setNewLeave({...newLeave, isActive: false})} /> No</label>
                </div>
              </div>

              <div className="form-group full-width">
                <label>While leave dates have Weekly Off/Holiday, do want to include or exclude?</label>
                <div className="split-options">
                  <div>
                    <span className="mini-label">For Weekly Off</span>
                    <label className="block-radio">
                      <input type="radio" checked={newLeave.includeWeeklyOff} onChange={() => setNewLeave({...newLeave, includeWeeklyOff: true})} />
                      Include <span className="light">(Deduct leave balance)</span>
                    </label>
                    <label className="block-radio">
                      <input type="radio" checked={!newLeave.includeWeeklyOff} onChange={() => setNewLeave({...newLeave, includeWeeklyOff: false})} />
                      Exclude <span className="light">(Don't deduct leave balance)</span>
                    </label>
                  </div>
                  <div>
                    <span className="mini-label">For Holiday</span>
                    <label className="block-radio">
                      <input type="radio" checked={newLeave.includeHoliday} onChange={() => setNewLeave({...newLeave, includeHoliday: true})} />
                      Include <span className="light">(Deduct leave balance)</span>
                    </label>
                    <label className="block-radio">
                      <input type="radio" checked={!newLeave.includeHoliday} onChange={() => setNewLeave({...newLeave, includeHoliday: false})} />
                      Exclude <span className="light">(Don't deduct leave balance)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Is this leave type to be considered as Present in the attendance status?</label>
                <div className="radio-inline">
                  <label><input type="radio" checked={newLeave.considerAsPresent} onChange={() => setNewLeave({...newLeave, considerAsPresent: true})} /> Yes</label>
                  <label><input type="radio" checked={!newLeave.considerAsPresent} onChange={() => setNewLeave({...newLeave, considerAsPresent: false})} /> No</label>
                </div>
                <p className="help-text">Choose 'Yes' for leave types like Business Trip, On-Duty. This will mark the attendance status of leave day as Present automatically after approval.</p>
              </div>

            </div>
            <div className="modal-footer" style={{justifyContent: 'flex-end'}}>
              <button className="btn-primary" onClick={handleAddLeave}>Add</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .setup-container { padding: 20px; background: #f4f6f8; min-height: 100vh; font-family: sans-serif; }
        .back-link { color: #007bff; text-decoration: none; font-size: 14px; font-weight: 500; }
        .page-header h2 { margin: 10px 0 20px; font-size: 20px; color: #333; }
        
        .setup-layout { display: flex; gap: 20px; max-width: 1200px; }
        
        .setup-sidebar { width: 260px; }
        .setup-sidebar ul { list-style: none; padding: 0; margin: 0; background: white; border-radius: 8px; border: 1px solid #eaeaea; }
        .setup-sidebar li { padding: 15px 20px; border-bottom: 1px solid #eaeaea; cursor: pointer; display: flex; align-items: center; font-size: 14px; color: #444; }
        .setup-sidebar li:last-child { border-bottom: none; }
        .setup-sidebar li.active { background: #f8f9fa; font-weight: 600; color: #000; border-left: 4px solid #f5a623; }
        .setup-sidebar li .icon { margin-right: 12px; }
        .setup-sidebar li .badge { margin-left: auto; background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        
        .setup-content { flex: 1; }
        .content-card { background: white; border-radius: 8px; padding: 25px; border: 1px solid #eaeaea; }
        .card-header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .card-header-flex h3 { margin: 0 0 8px; font-size: 18px; color: #333; }
        .subtitle { color: #888; font-size: 13px; margin: 0; }
        
        .btn-primary { background: #007bff; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 500; }
        
        .setup-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .setup-table th { background: #f8f9fa; border-top: 1px solid #eaeaea; border-bottom: 1px solid #eaeaea; padding: 12px; text-align: left; font-size: 12px; color: #666; font-weight: 600; }
        .setup-table td { padding: 15px 12px; border-bottom: 1px solid #eaeaea; font-size: 14px; color: #333; }
        
        .status-badge { padding: 4px 10px; border-radius: 4px; font-size: 12px; border: none; cursor: pointer; font-weight: 600; }
        .status-badge.working { background: #dcfce7; color: #16a34a; }
        .status-badge.non-working { background: #fee2e2; color: #dc2626; }
        
        .action-links span { color: #007bff; cursor: pointer; font-size: 13px; margin: 0 5px; }
        
        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 8px; max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 20px; border-bottom: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { margin: 0; font-size: 18px; }
        .close-icon { cursor: pointer; color: #666; }
        
        .modal-body { padding: 20px; }
        .form-grid { display: flex; flex-wrap: wrap; gap: 20px; }
        .form-group { width: calc(50% - 10px); display: flex; flex-direction: column; gap: 8px; }
        .form-group.full-width { width: 100%; }
        .form-group label { font-size: 13px; font-weight: 600; color: #444; }
        .form-group input[type="text"] { padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: #f9f9fc; }
        
        .radio-inline { display: flex; gap: 20px; }
        .radio-inline label { font-weight: normal; font-size: 14px; display: flex; align-items: center; gap: 5px; cursor: pointer; }
        
        .split-options { display: flex; gap: 40px; margin-top: 10px; }
        .mini-label { font-size: 12px; font-weight: 600; color: #666; display: block; margin-bottom: 10px; }
        .block-radio { display: flex; align-items: center; gap: 8px; font-weight: normal; font-size: 14px; margin-bottom: 8px; cursor: pointer; }
        .light { color: #888; font-size: 12px; }
        
        .help-text { font-size: 12px; color: #888; margin-top: 5px; line-height: 1.4; }
        
        .modal-footer { padding: 20px; border-top: 1px solid #eaeaea; display: flex; }
        
        .toast-top { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #16a34a; color: white; padding: 10px 20px; border-radius: 30px; font-weight: 500; z-index: 2000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}
