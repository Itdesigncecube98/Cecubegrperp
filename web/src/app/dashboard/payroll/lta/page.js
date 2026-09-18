'use client';
import React, { useState, useEffect } from 'react';

export default function LtaPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [ltas, setLtas] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    applicationNo: '',
    applicationDate: '',
    ltaAvailFrom: '',
    ltaAvailTo: '',
    availLeavesForLta: '',
    remark: '',
    amount: '',
    dateOfAdvancePaid: '',
    advanceAmount: '',
    bankAccount: '',
    chequeNo: '',
    amountPaid: '',
    balanceAmount: ''
  });

  // Auto-filled employee fields
  const [empNo, setEmpNo] = useState('');
  const [position, setPosition] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [yearsMonthServed, setYearsMonthServed] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  useEffect(() => {
    fetchLtas();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        const uniqueDepts = [...new Set(data.map(emp => emp.department).filter(Boolean))];
        setDepartments(uniqueDepts);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchLtas = async () => {
    try {
      const res = await fetch('/api/payroll/lta');
      if (res.ok) {
        setLtas(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch LTAs', err);
    }
  };

  const handleEmployeeSearchChange = (e) => {
    const val = e.target.value;
    setEmployeeSearch(val);
    
    // Check if the value exactly matches one of our datalist options
    const matched = employees.find(emp => `${emp.name} (${emp.empId})` === val);
    if (matched) {
      handleEmployeeChange(matched.id);
    } else {
      handleEmployeeChange('');
    }
  };

  const handleEmployeeChange = (empId) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      if (!selectedDepartment && emp.department) {
        setSelectedDepartment(emp.department);
      }
      setEmpNo(emp.empId || '');
      setPosition(emp.position || '');
      // Example DOJ logic (Assuming createdAt is DOJ if DOJ missing)
      const doj = emp.createdAt ? new Date(emp.createdAt).toISOString().split('T')[0] : '';
      setDateOfJoining(doj);

      // Calculate years and months served
      if (doj) {
        const joinDate = new Date(doj);
        const today = new Date();
        let years = today.getFullYear() - joinDate.getFullYear();
        let months = today.getMonth() - joinDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < joinDate.getDate())) {
          years--;
          months += 12;
        }
        setYearsMonthServed(`${years} years, ${months} months`);
      }
    } else {
      setEmpNo('');
      setPosition('');
      setDateOfJoining('');
      setYearsMonthServed('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      // Auto-calculate Balance Amount = Amount - Advance Amount
      if (name === 'amount' || name === 'advanceAmount') {
        const amt = parseFloat(name === 'amount' ? value : next.amount) || 0;
        const adv = parseFloat(name === 'advanceAmount' ? value : next.advanceAmount) || 0;
        next.balanceAmount = (amt - adv).toString();
      }
      
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !formData.amount || !formData.advanceAmount || !formData.bankAccount) {
      alert('Please fill out all required fields (*)');
      return;
    }

    try {
      const res = await fetch('/api/payroll/lta', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editId,
          employeeId: selectedEmployeeId
        })
      });

      if (res.ok) {
        alert(editId ? 'LTA Updated Successfully!' : 'LTA Saved Successfully!');
        fetchLtas();
        handleReset();
        setShowForm(false);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      alert('Failed to save LTA');
    }
  };

  const handleEdit = (lta) => {
    setEditId(lta.id);
    setSelectedDepartment(lta.employee?.department || '');
    handleEmployeeChange(lta.employeeId);
    setFormData({
      applicationNo: lta.applicationNo || '',
      applicationDate: lta.applicationDate ? lta.applicationDate.split('T')[0] : '',
      ltaAvailFrom: lta.ltaAvailFrom ? lta.ltaAvailFrom.split('T')[0] : '',
      ltaAvailTo: lta.ltaAvailTo ? lta.ltaAvailTo.split('T')[0] : '',
      availLeavesForLta: lta.availLeavesForLta || '',
      remark: lta.remark || '',
      amount: lta.amount || '',
      dateOfAdvancePaid: lta.dateOfAdvancePaid ? lta.dateOfAdvancePaid.split('T')[0] : '',
      advanceAmount: lta.advanceAmount || '',
      bankAccount: lta.bankAccount || '',
      chequeNo: lta.chequeNo || '',
      amountPaid: lta.amountPaid || '',
      balanceAmount: lta.balanceAmount || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this LTA application?')) return;
    try {
      const res = await fetch(`/api/payroll/lta?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Deleted successfully');
        fetchLtas();
      } else {
        alert('Failed to delete');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/payroll/lta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, statusOnly: true })
      });
      if (res.ok) {
        fetchLtas();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReset = () => {
    setEditId(null);
    setSelectedEmployeeId('');
    setEmployeeSearch('');
    setFormData({
      applicationNo: '',
      applicationDate: '',
      ltaAvailFrom: '',
      ltaAvailTo: '',
      availLeavesForLta: '',
      remark: '',
      amount: '',
      dateOfAdvancePaid: '',
      advanceAmount: '',
      bankAccount: '',
      amountPaid: '',
      balanceAmount: ''
    });
    setEmpNo('');
    setPosition('');
    setDateOfJoining('');
    setYearsMonthServed('');
  };

  const [listDepartmentFilter, setListDepartmentFilter] = useState('');
  const [listEmployeeFilter, setListEmployeeFilter] = useState('');

  const filteredLtas = ltas.filter(lta => {
    const textMatch = !searchTerm || 
      (lta.employee?.name && lta.employee.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lta.employee?.empId && lta.employee.empId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lta.applicationNo && lta.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const deptMatch = !listDepartmentFilter || lta.employee?.department === listDepartmentFilter;
    const empMatch = !listEmployeeFilter || lta.employeeId === listEmployeeFilter;
    
    return textMatch && deptMatch && empMatch;
  });

  return (
    <div style={{ padding: '2rem' }}>
      
      {!showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>LTA Management</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select 
                value={listDepartmentFilter} 
                onChange={e => { setListDepartmentFilter(e.target.value); setListEmployeeFilter(''); }}
                style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}
              >
                <option value="">Search by dept</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                value={listEmployeeFilter} 
                onChange={e => setListEmployeeFilter(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', width: '200px' }}
              >
                <option value="">Search by employee</option>
                {employees.filter(e => !listDepartmentFilter || e.department === listDepartmentFilter).map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
                ))}
              </select>
              <button onClick={() => setShowForm(true)} style={{ background: '#0891b2', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                + Add LTA
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>Add LTA</h2>
            <button onClick={() => setShowForm(false)} style={{ background: '#64748b', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
              Back
            </button>
          </div>

          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600' }}>Department</label>
                <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="">Select Here</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600' }}>Employee <span style={{ color: 'red' }}>*</span></label>
                <select value={selectedEmployeeId} onChange={(e) => handleEmployeeChange(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="">Select</option>
                  {employees.filter(e => !selectedDepartment || e.department === selectedDepartment).map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
                  ))}
                </select>
              </div>
            </div>

        {/* Form Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Employee No.</label>
                <input type="text" value={empNo} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Position</label>
                <input type="text" value={position} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Date of Joining</label>
                <input type="text" value={dateOfJoining} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f1f5f9' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Application No.</label>
                <input type="text" name="applicationNo" value={formData.applicationNo} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Application Date</label>
                <input type="date" name="applicationDate" value={formData.applicationDate} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Years, Month served</label>
                <input type="text" value={yearsMonthServed} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f1f5f9' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>LTA avail. From</label>
                <input type="date" name="ltaAvailFrom" value={formData.ltaAvailFrom} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>LTA avail. To</label>
                <input type="date" name="ltaAvailTo" value={formData.ltaAvailTo} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Avail leaves for LTA</label>
                <input type="text" name="availLeavesForLta" value={formData.availLeavesForLta} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Remark</label>
              <textarea name="remark" value={formData.remark} onChange={handleChange} rows={3} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}></textarea>
            </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ position: 'relative' }}>
             <div style={{ position: 'absolute', left: '-1rem', top: 0, bottom: 0, width: '2px', background: '#e2e8f0' }}></div>
             
             {/* Right Column */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Amount <span style={{ color: 'red' }}>*</span></label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Date of advance paid</label>
                    <input type="date" name="dateOfAdvancePaid" value={formData.dateOfAdvancePaid} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Advance amount <span style={{ color: 'red' }}>*</span></label>
                    <input type="number" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Bank Accounts <span style={{ color: 'red' }}>*</span></label>
                    <select name="bankAccount" value={formData.bankAccount} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      <option value="">Select</option>
                      <option value="HDFC">HDFC Bank</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="SBI">SBI</option>
                      <option value="AXIS">Axis Bank</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Amount Paid</label>
                    <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Cheque No</label>
                    <input type="text" name="chequeNo" value={formData.chequeNo} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#0891b2', fontWeight: '600', fontSize: '0.9rem' }}>Balance Amount</label>
                  <input type="number" name="balanceAmount" value={formData.balanceAmount} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                </div>
             </div>
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={handleReset} style={{ background: '#0891b2', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             Reset
          </button>
          <button onClick={handleSubmit} style={{ background: '#0891b2', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             {editId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
      </>
      )}

      {/* LTA Records Table */}
      <div style={{ marginTop: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Previous LTA Applications</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem' }}>Employee</th>
                <th style={{ padding: '0.75rem' }}>App No.</th>
                <th style={{ padding: '0.75rem' }}>Amount</th>
                <th style={{ padding: '0.75rem' }}>Advance</th>
                <th style={{ padding: '0.75rem' }}>Balance</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLtas.map(lta => (
                <tr key={lta.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem' }}>{lta.employee?.name} ({lta.employee?.empId})</td>
                  <td style={{ padding: '0.75rem' }}>{lta.applicationNo}</td>
                  <td style={{ padding: '0.75rem' }}>₹{lta.amount}</td>
                  <td style={{ padding: '0.75rem' }}>₹{lta.advanceAmount}</td>
                  <td style={{ padding: '0.75rem' }}>₹{lta.balanceAmount}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      background: lta.status === 'Approved' ? '#dcfce7' : lta.status === 'Paid' ? '#dbeafe' : lta.status === 'Posted to Salary' ? '#f3e8ff' : '#fef9c3',
                      color: lta.status === 'Approved' ? '#166534' : lta.status === 'Paid' ? '#1e40af' : lta.status === 'Posted to Salary' ? '#6b21a8' : '#854d0e',
                      fontWeight: '500'
                    }}>
                      {lta.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{new Date(lta.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {lta.status === 'Pending' && (
                      <button onClick={() => handleUpdateStatus(lta.id, 'Approved')} style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Approve
                      </button>
                    )}
                    {(lta.status === 'Pending' || lta.status === 'Approved') && (
                      <button onClick={() => handleUpdateStatus(lta.id, 'Paid')} style={{ background: '#3b82f6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Mark Paid
                      </button>
                    )}
                    {lta.status === 'Paid' && (
                      <button onClick={() => handleUpdateStatus(lta.id, 'Posted to Salary')} style={{ background: '#8b5cf6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Post Salary
                      </button>
                    )}
                    <button onClick={() => handleEdit(lta)} style={{ background: '#f59e0b', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(lta.id)} style={{ background: '#ef4444', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLtas.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
