'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import { getLeaveBalance, createLeaveRequest, getLeaveRequests, getLeaveTypes } from '../../../lib/data';
import '../../dashboard/attendance/attendance.css';
import '../../dashboard/leaves/leaves.css';

export default function EmployeeLeavePage() {
  const [balance, setBalance] = useState({ casualLeaves: 0, sickLeaves: 0, earnedLeaves: 0 });
  const [history, setHistory] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  
  const [newRequest, setNewRequest] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false
  });

  const router = useRouter();

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(empData);
    setEmployeeId(parsed.id);
    fetchData(parsed.id);
  }, [router]);

  async function fetchData(id) {
    try {
      const bal = await getLeaveBalance(id);
      setBalance(bal || { casual: 0, sick: 0, earned: 0, lwp: 0 });
      
      const [reqs, typesData] = await Promise.all([
        getLeaveRequests(null, id),
        getLeaveTypes()
      ]);
      setHistory(reqs || []);
      setLeaveTypes((typesData || []).filter(t => t.isActive));
    } catch (e) {
      console.error('Failed to load leave data', e);
    } finally {
      setLoading(false);
    }
  }

  const handleApply = async (e) => {
    e.preventDefault();
    if (!newRequest.leaveType || !newRequest.startDate || !newRequest.endDate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await createLeaveRequest({
        employeeId: employeeId,
        ...newRequest
      });
      setNewRequest({ leaveType: '', startDate: '', endDate: '', reason: '', isHalfDay: false });
      fetchData(employeeId);
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error("Error submitting leave", error);
      alert('Failed to submit leave request');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#666' }}>Loading...</div>;
  }

  return (
    <div className="pageContainer">
      <Link href="/employee/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <h1 className="pageTitle">Apply Leave</h1>
      <hr style={{ borderTop: '1px solid #e5e7eb', marginBottom: '1.5rem' }} />

      <form className="card" style={{ maxWidth: '1000px', marginBottom: '2rem' }} onSubmit={handleApply}>
        <div className="formGroup">
          <label className="filterLabel">Select Category <span style={{ color: 'red' }}>*</span></label>
          <select 
            className="formInput"
            value={newRequest.leaveType}
            onChange={(e) => setNewRequest({...newRequest, leaveType: e.target.value})}
            required
          >
            <option value="">-- Select Category --</option>
            {leaveTypes.map(lt => (
              <option key={lt.id} value={lt.name}>{lt.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label className="filterLabel">Select From Date <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="date" 
              className="formInput" 
              value={newRequest.startDate}
              onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="filterLabel">Select To Date <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="date" 
              className="formInput" 
              value={newRequest.endDate}
              onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="formGroup">
          <label className="formLabel">Are there any Half Days? <Info size={16} style={{ color: '#f59e0b' }} /></label>
          <div className="radioGroup">
            <label className="radioLabel">
              <input 
                type="radio" 
                name="halfday" 
                value="yes" 
                checked={newRequest.isHalfDay} 
                onChange={() => setNewRequest({...newRequest, isHalfDay: true})} 
              /> Yes
            </label>
            <label className="radioLabel">
              <input 
                type="radio" 
                name="halfday" 
                value="no" 
                checked={!newRequest.isHalfDay} 
                onChange={() => setNewRequest({...newRequest, isHalfDay: false})} 
              /> No
            </label>
          </div>
        </div>

        <div className="formGroup">
          <label className="filterLabel">Reason for Leave</label>
          <textarea 
            className="formInput" 
            rows={5}
            value={newRequest.reason}
            onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
          ></textarea>
        </div>

        <div className="formGroup">
          <input type="file" style={{ fontSize: '12px' }} />
          <div className="fileHelpText">(Allowed file extensions are .pdf, .png, .jpeg, .jpg, .docx)</div>
        </div>

        <div className="formActions">
          <button type="button" className="btn btnSecondaryAction" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btnPrimary">Submit</button>
        </div>
      </form>

      <h2 className="tableTitle" style={{ marginBottom: '1rem' }}>My Leave History</h2>
      <div className="card" style={{ maxWidth: '1000px' }}>
        <table className="dataTable">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>DATES</th>
              <th>REASON</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? (
              history.map(req => (
                <tr key={req.id}>
                  <td>{req.leaveType}</td>
                  <td>{req.startDate} to {req.endDate}</td>
                  <td>{req.reason}</td>
                  <td>
                    <span style={{
                        backgroundColor: req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                        color: req.status === 'PENDING' ? '#d97706' : req.status === 'APPROVED' ? '#16a34a' : '#dc2626',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No leave requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
