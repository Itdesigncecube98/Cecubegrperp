'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';
import { getEmployees, createLeaveRequest, getLeaveTypes } from '../../../../lib/data';
import '../../attendance/attendance.css';
import '../leaves.css';

export default function ApplyLeave() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false
  });

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
      await createLeaveRequest({
        ...formData,
        employeeId: formData.employeeId
      });
      alert('Leave request submitted successfully!');
      router.push('/dashboard/leaves/requests');
    } catch (err) {
      console.error('Failed to submit leave', err);
      alert('Failed to submit leave request');
    } finally {
      setLoading(false);
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
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
            ))}
          </select>
        </div>

        <div className="formGroup">
          <label className="filterLabel">Select Category <span style={{ color: 'red' }}>*</span></label>
          <select 
            className="formInput"
            value={formData.leaveType}
            onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
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
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
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
                checked={formData.isHalfDay} 
                onChange={() => setFormData({...formData, isHalfDay: true})} 
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
        </div>

        <div className="formGroup">
          <label className="filterLabel">Reason for Leave</label>
          <textarea 
            className="formInput" 
            rows={5}
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
          ></textarea>
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
