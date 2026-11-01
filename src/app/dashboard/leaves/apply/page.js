'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';
import { getEmployees, createLeaveRequest, getLeaveTypes } from '../../../../lib/data';
import { supportsHalfDayLeave } from '../../../../lib/leavePolicy';
import '../../attendance/attendance.css';
import '../leaves.css';

export default function ApplyLeave() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavingReasons, setLeavingReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: '',
    isHalfDay: false
  });
  const [attachmentName, setAttachmentName] = useState('');
  const [currentBalance, setCurrentBalance] = useState(null);
  const halfDayAllowed = supportsHalfDayLeave(formData.leaveType);

  useEffect(() => {
    if (formData.employeeId) {
      fetch(`/api/leaves/balance?employeeId=${formData.employeeId}`)
        .then(res => res.json())
        .then(data => setCurrentBalance(data))
        .catch(err => console.error(err));
    } else {
      setCurrentBalance(null);
    }
  }, [formData.employeeId]);

  useEffect(() => {
    async function loadData() {
      try {
        const [empData, typeData] = await Promise.all([
          getEmployees(),
          getLeaveTypes()
        ]);
        setEmployees(empData || []);
        setLeaveTypes((typeData || []).filter(t => t.isActive));
      } catch (err) {
        console.error('Failed to load data', err);
      }
      
      const savedReasons = localStorage.getItem('leavingReasons');
      if (savedReasons) {
        setLeavingReasons(JSON.parse(savedReasons));
      } else {
        setLeavingReasons([
          { id: 1, reason: 'Salary' },
          { id: 2, reason: 'Personal Family' }
        ]);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.leaveType || !formData.startDate || !formData.endDate) {
      alert('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const result = await createLeaveRequest({
        ...formData,
        employeeId: formData.employeeId
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      alert('Leave request submitted successfully!');
      router.push('/dashboard/leaves/requests');
    } catch (err) {
      console.error('Failed to submit leave', err);
      alert(`Failed to submit leave request: ${err.message}`);
    } finally {
      setLoading(false);
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
        setFormData(previous => ({ ...previous, attachment: reader.result }));
      };
      reader.onerror = () => alert('Could not read the selected supporting document.');
      reader.readAsDataURL(file);
    } else {
      setAttachmentName('');
      setFormData(previous => ({ ...previous, attachment: '' }));
    }
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <h1 className="pageTitle">Apply Leave (Admin)</h1>
      <hr style={{ borderTop: '1px solid #e5e7eb', marginBottom: '1.5rem' }} />

      <form className="card" style={{ maxWidth: '1000px' }} onSubmit={handleSubmit}>
        <div className="formGroup">
          <label className="filterLabel">Select Employee <span style={{ color: 'red' }}>*</span></label>
          <select 
            className="formInput"
            value={formData.employeeId}
            onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
            required
          >
            <option value="">-- Select Employee --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="formGroup">
          <label className="filterLabel">Select Category <span style={{ color: 'red' }}>*</span></label>
          <select 
            className="formInput"
            value={formData.leaveType}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({
                ...formData,
                leaveType: val,
                isHalfDay: supportsHalfDayLeave(val) && formData.isHalfDay,
                endDate: formData.isHalfDay && !supportsHalfDayLeave(val) ? formData.startDate : formData.endDate,
              });
            }}
            required
          >
            <option value="">-- Select Category --</option>
            {leaveTypes.map(lt => {
              let isDisabled = false;
              let labelSuffix = '';

              if (currentBalance) {
                if (lt.name === 'Casual' && currentBalance.casualLeaves <= 0) {
                  isDisabled = true;
                  labelSuffix = ' (Balance Exhausted, Use LWP)';
                } else if ((lt.name === 'Earned' || lt.name === 'Paid leave') && currentBalance.earnedLeaves <= 0) {
                  isDisabled = true;
                  labelSuffix = ' (Balance Exhausted, Use LWP)';
                } else if (lt.name === 'COFF' && currentBalance.compensatoryLeaves <= 0) {
                  isDisabled = true;
                  labelSuffix = ' (Balance Exhausted, Use LWP)';
                }
              }

              const baseLabel = lt.name === 'Paid leave' ? 'Earned' : lt.name === 'COFF' ? 'Compensatory Off (COFF)' : lt.name;

              return (
                <option key={lt.id} value={lt.name} disabled={isDisabled}>
                  {baseLabel} {labelSuffix}
                </option>
              );
            })}
          </select>
        </div>
        <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '1rem' }}>
          CL: 12 days credited each 1 April and carried forward. EL: after 8 months, 1 day per 20 calendar days until the next April, then 18 days each April and carried forward. Half-day CL/EL/COFF deducts 0.5 day; half-day LWP deducts half a day of salary.
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label className="filterLabel">Select From Date <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="date" 
              className="formInput" 
              value={formData.startDate}
              onChange={(e) => setFormData({
                ...formData,
                startDate: e.target.value,
                ...(formData.isHalfDay ? { endDate: e.target.value } : {}),
              })}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="filterLabel">Select To Date <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="date" 
              className="formInput" 
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              disabled={formData.isHalfDay}
              required
            />
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
                checked={formData.isHalfDay} 
                onChange={() => setFormData({ ...formData, isHalfDay: true, endDate: formData.startDate })} 
                disabled={!halfDayAllowed}
              /> Yes
            </label>
            <label className="radioLabel">
              <input 
                type="radio" 
                name="halfday" 
                value="no" 
                checked={!formData.isHalfDay} 
                onChange={() => setFormData({...formData, isHalfDay: false})} 
              /> No
            </label>
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
            Half-day leave is available for COFF, Casual Leave, Earned Leave and LWP. CL/EL/COFF deduct 0.5 day from the balance; LWP deducts half a day of salary.
          </div>
        </div>

        <div className="formGroup">
          <label className="filterLabel">Reason for Leave</label>
          <select 
            className="formInput"
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
          >
            <option value="">-- Select Reason --</option>
            {leavingReasons.map(r => (
              <option key={r.id} value={r.reason}>{r.reason}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          {formData.reason === 'Other' && (
            <textarea 
              className="formInput" 
              style={{ marginTop: '0.5rem' }}
              rows={3}
              placeholder="Please specify..."
              onChange={(e) => setFormData({...formData, customReason: e.target.value})}
            ></textarea>
          )}
        </div>
        <div className="formGroup">
          <label className="filterLabel">Supporting document (optional)</label>
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
          <button type="submit" className="btn btnPrimary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
