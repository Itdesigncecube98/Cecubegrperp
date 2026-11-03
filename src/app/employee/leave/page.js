'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import { getLeaveBalance, createLeaveRequest, getLeaveRequests, getLeaveTypes } from '../../../lib/data';
import {
  isFemaleEmployee,
  isMaternityLeave,
  isPaternityLeave,
  supportsHalfDayLeave,
} from '../../../lib/leavePolicy';
import { getLeaveAttachmentLink } from '../../../lib/leaveAttachmentLink';
import '../../dashboard/attendance/attendance.css';
import '../../dashboard/leaves/leaves.css';

export default function EmployeeLeavePage() {
  const [balance, setBalance] = useState({ casualLeaves: 0, leaveWithoutPay: 0, earnedLeaves: 0 });
  const [history, setHistory] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeGender, setEmployeeGender] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  
  const [newRequest, setNewRequest] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: '',
    isHalfDay: false,
    halfDayPeriod: '',
    routeTo: 'SENIOR'
  });
  const [activeTab, setActiveTab] = useState('balances');
  const halfDayAllowed = supportsHalfDayLeave(newRequest.leaveType);

  const router = useRouter();

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(empData);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmployeeId(parsed.id);
    setEmployeeGender(parsed.gender || '');
    fetchData(parsed.id, parsed.gender || '');

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'history') {
      setActiveTab('history');
    }
  }, [router]);

  async function fetchData(id, gender = employeeGender) {
    try {
      const currMonth = new Date().getMonth() + 1;
      const currYear = new Date().getFullYear();
      const currentBalance = await getLeaveBalance(id, currMonth, currYear);
      setBalance({
        ...(currentBalance || {}),
        casualLeaves: currentBalance?.casualLeaves ?? 0,
        earnedLeaves: currentBalance?.earnedLeaves ?? 0,
        compensatoryLeaves: currentBalance?.compensatoryLeaves ?? 0,
        netDaysLwp: -(currentBalance?.netDaysLwp || 0),
        explicitLwp: currentBalance?.explicitLwp || 0
      });
      
      const [reqs, typesData] = await Promise.all([
        getLeaveRequests(null, id),
        getLeaveTypes()
      ]);
      setHistory(reqs || []);
      setLeaveTypes((typesData || []).filter(type =>
        type.isActive &&
        !isPaternityLeave(type.name) &&
        (!isMaternityLeave(type.name) || isFemaleEmployee(gender))
      ));
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
    if (newRequest.isHalfDay && !newRequest.halfDayPeriod) {
      alert('Choose first half or second half for the half-day leave.');
      return;
    }

    try {
      const result = await createLeaveRequest({
        employeeId: employeeId,
        ...newRequest
      });
      
      if (result.error) {
        throw new Error(result.error);
      }

      setNewRequest({ leaveType: '', startDate: '', endDate: '', reason: '', attachment: '', isHalfDay: false, halfDayPeriod: '', routeTo: 'SENIOR' });
      setAttachmentName('');
      fetchData(employeeId, employeeGender);
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error("Error submitting leave", error);
      alert(`Failed to submit leave request: ${error.message}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Supporting documents must be 5 MB or smaller.');
        e.target.value = '';
        return;
      }
      setAttachmentName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRequest(previous => ({ ...previous, attachment: reader.result }));
      };
      reader.onerror = () => alert('Could not read the selected supporting document.');
      reader.readAsDataURL(file);
    } else {
      setAttachmentName('');
      setNewRequest(previous => ({ ...previous, attachment: '' }));
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
      
      <h1 className="pageTitle">Leave Management</h1>
      <hr style={{ borderTop: '1px solid #e5e7eb', marginBottom: '1.5rem' }} />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('balances')}
          style={{ 
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '16px', fontWeight: activeTab === 'balances' ? '600' : '400', 
            color: activeTab === 'balances' ? '#059669' : '#6b7280', borderBottom: activeTab === 'balances' ? '2px solid #059669' : 'none', cursor: 'pointer'
          }}
        >
          Balances
        </button>
        <button 
          onClick={() => setActiveTab('apply')}
          style={{ 
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '16px', fontWeight: activeTab === 'apply' ? '600' : '400', 
            color: activeTab === 'apply' ? '#059669' : '#6b7280', borderBottom: activeTab === 'apply' ? '2px solid #059669' : 'none', cursor: 'pointer'
          }}
        >
          Apply Leave
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '16px', fontWeight: activeTab === 'history' ? '600' : '400', 
            color: activeTab === 'history' ? '#059669' : '#6b7280', borderBottom: activeTab === 'history' ? '2px solid #059669' : 'none', cursor: 'pointer'
          }}
        >
          Your Leave Appn (History)
        </button>
      </div>

      {activeTab === 'balances' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #3b82f6', padding: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Casual Leave (CL)</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{balance.casualLeaves ?? 0}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>days remaining</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>12 days credited on joining and each joining anniversary; unused CL carries forward.</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #10b981', padding: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Earned Leave (EL)</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{balance.earnedLeaves ?? 0}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>days remaining</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>18 days after 8 months of service, then 18 days each joining anniversary; unused EL carries forward.</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #8b5cf6', padding: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Comp. Off (C-off)</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{balance.compensatoryLeaves ?? 0}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>days available</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Leave Without Pay</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{balance.explicitLwp ?? 0}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>days used</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #ef4444', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Net Days LWP</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{balance.netDaysLwp ?? 0}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>net days</p>
          </div>
        </div>
      )}

      {activeTab === 'apply' && (
        <form className="card" style={{ maxWidth: '1000px', marginBottom: '2rem' }} onSubmit={handleApply}>
        <div className="formGroup">
          <label className="filterLabel">Select Category <span style={{ color: 'red' }}>*</span></label>
          <select 
            className="formInput"
            value={newRequest.leaveType}
            onChange={(e) => {
              const val = e.target.value;
              setNewRequest({
                ...newRequest,
                leaveType: val,
                isHalfDay: supportsHalfDayLeave(val) && newRequest.isHalfDay,
                halfDayPeriod: supportsHalfDayLeave(val) ? newRequest.halfDayPeriod : '',
                endDate: newRequest.isHalfDay && !supportsHalfDayLeave(val) ? newRequest.startDate : newRequest.endDate,
              });
            }}
            required
          >
            <option value="">-- Select Category --</option>
            {leaveTypes.map(lt => (
              <option key={lt.id} value={lt.name}>
                {lt.name === 'Paid leave' ? 'Earned' : lt.name === 'COFF' ? 'Compensatory Off (COFF)' : lt.name}
              </option>
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
              onChange={(e) => setNewRequest({
                ...newRequest,
                startDate: e.target.value,
                ...(newRequest.isHalfDay ? { endDate: e.target.value } : {}),
              })}
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
              disabled={newRequest.isHalfDay}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="filterLabel">Route To <span style={{ color: 'red' }}>*</span></label>
            <select 
              className="formInput" 
              value={newRequest.routeTo}
              onChange={(e) => setNewRequest({...newRequest, routeTo: e.target.value})}
              required
            >
              <option value="SENIOR">Immediate Senior</option>
              <option value="NEXT_SENIOR">Next Senior</option>
            </select>
          </div>
        </div>

        <div className="formGroup">
          <label className="formLabel">Are there any Half Days? <Info size={16} style={{ color: '#f59e0b' }} /></label>
          <div className="radioGroup">
            <label className="radioLabel" style={{ opacity: halfDayAllowed ? 1 : 0.5 }}>
              <input 
                type="radio" 
                name="halfday" 
                value="yes" 
                checked={newRequest.isHalfDay} 
                onChange={() => setNewRequest(previous => ({
                  ...previous,
                  isHalfDay: true,
                  endDate: previous.startDate,
                }))}
                disabled={!halfDayAllowed}
              /> Yes
            </label>
            <label className="radioLabel">
              <input 
                type="radio" 
                name="halfday" 
                value="no" 
                checked={!newRequest.isHalfDay} 
                onChange={() => setNewRequest(previous => ({ ...previous, isHalfDay: false, halfDayPeriod: '' }))} 
              /> No
            </label>
          </div>
          {newRequest.isHalfDay && (
            <div style={{ marginTop: '0.75rem' }}>
              <span className="filterLabel">Which half of the day? <span style={{ color: 'red' }}>*</span></span>
              <div className="radioGroup">
                <label className="radioLabel">
                  <input
                    type="radio"
                    name="halfDayPeriod"
                    value="FIRST_HALF"
                    checked={newRequest.halfDayPeriod === 'FIRST_HALF'}
                    onChange={() => setNewRequest(previous => ({ ...previous, halfDayPeriod: 'FIRST_HALF' }))}
                    required
                  /> First Half
                </label>
                <label className="radioLabel">
                  <input
                    type="radio"
                    name="halfDayPeriod"
                    value="SECOND_HALF"
                    checked={newRequest.halfDayPeriod === 'SECOND_HALF'}
                    onChange={() => setNewRequest(previous => ({ ...previous, halfDayPeriod: 'SECOND_HALF' }))}
                    required
                  /> Second Half
                </label>
              </div>
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
            {halfDayAllowed
              ? "Half-day leave is available for the selected category and deducts 0.5 day from its balance."
              : 'Select CL, EL, or COFF above to enable the half-day option.'}
            {' '}Maternity Leave is available only to female employees, up to 6 months; Paternity Leave is not available.
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
          <label className="filterLabel">Upload supporting document (optional)</label>
          <input 
            type="file" 
            style={{ fontSize: '12px' }} 
            onChange={handleFileChange} 
            accept=".pdf,.png,.jpeg,.jpg,.docx"
          />
          {attachmentName && <div style={{ fontSize: '12px', marginTop: 4 }}>{attachmentName}</div>}
          <div className="fileHelpText">(Allowed file extensions are .pdf, .png, .jpeg, .jpg, .docx)</div>
        </div>

        <div className="formActions">
          <button type="button" className="btn btnSecondaryAction" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btnPrimary">Submit</button>
        </div>
      </form>
      )}

      {activeTab === 'history' && (
        <div className="card" style={{ maxWidth: '1000px' }}>
        <table className="dataTable">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>DATES</th>
              <th>REASON</th>
              <th>SUPPORTING DOCUMENT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? (
              history.map(req => (
                <tr key={req.id}>
                  <td>{req.leaveType}</td>
                  <td>{req.startDate} to {req.endDate}{req.isHalfDay ? ` (Half day${req.halfDayPeriod ? `, ${req.halfDayPeriod === 'FIRST_HALF' ? 'First Half' : 'Second Half'}` : ''})` : ''}</td>
                  <td>{req.reason}</td>
                  <td>
                    {(() => {
                      const attachment = getLeaveAttachmentLink(req.attachment);
                      return attachment
                        ? <a href={attachment.href} target="_blank" rel="noopener noreferrer" download={attachment.download}>Open document</a>
                        : '—';
                    })()}
                  </td>
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No leave requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
