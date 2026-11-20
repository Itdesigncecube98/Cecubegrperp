'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Save, Printer } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';

export default function PostSalary() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unposting, setUnposting] = useState(false);
  const [missingEmployees, setMissingEmployees] = useState([]);
  const [removingMissing, setRemovingMissing] = useState(false);
  const [filters, setFilters] = useState({ department: 'Select Here', location: 'Select Here', employeeId: 'Select Here', payCycleId: 'Select Here' });
  
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);

  // MultiSelect states
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Checkbox state for rows
  const [selectedRows, setSelectedRows] = useState(new Set());

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchMissingEmployees = async cycleId => {
    if (!cycleId || cycleId === 'Select Here') {
      setMissingEmployees([]);
      return;
    }
    try {
      const response = await fetch(`/api/payroll/cycles/${encodeURIComponent(cycleId)}`, { cache: 'no-store' });
      const cycleData = await response.json();
      setMissingEmployees(response.ok && Array.isArray(cycleData.payrollRecords)
        ? cycleData.payrollRecords.filter(record => record.missingPayrollRecord)
        : []);
    } catch (error) {
      console.error('Could not load missing cycle employees', error);
      setMissingEmployees([]);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [deptRes, locRes, empRes, cyclesRes] = await Promise.all([
        fetch('/api/synchronization?type=departments'),
        fetch('/api/synchronization?type=siteoffices'),
        fetch('/api/employees'),
        fetch('/api/payroll/cycles')
      ]);
      
      if (deptRes.ok) {
        const json = await deptRes.json();
        setDepartments(json);
        setSelectedDepartments(json.map(d => d.name || d));
      }
      if (locRes.ok) {
        const json = await locRes.json();
        setLocations(json);
        setSelectedBranches(json.map(l => l.name || l));
      }
      if (empRes.ok) {
        const json = await empRes.json();
        setEmployees(json);
        setSelectedEmployees(json.map(e => `${e.name} (${e.empId})`));
      }
      if (cyclesRes.ok) {
        const json = await cyclesRes.json();
        setCycles(json);
        if (json.length > 0) {
          const requestedCycleId = new URLSearchParams(window.location.search).get('payCycleId');
          const requestedCycle = json.find(cycle => cycle.id === requestedCycleId);
          const cycleId = requestedCycle?.id || json[0].id;
          setFilters(prev => ({ ...prev, payCycleId: cycleId }));
          await fetchMissingEmployees(cycleId);

          if (requestedCycle) {
            const params = new URLSearchParams({ payCycleId: cycleId, status: 'Unposted' });
            const response = await fetch(`/api/payroll/post-salary?${params.toString()}`);
            const records = await response.json();
            if (!response.ok || !Array.isArray(records)) {
              throw new Error(records.error || 'Failed to load approved salaries for posting.');
            }
            setData(records);
            setSelectedRows(new Set());
          }
        }
      }
    } catch (err) {
      console.error('Error fetching dropdown data', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department && filters.department !== 'Select Here') params.append('department', filters.department);
      if (filters.location && filters.location !== 'Select Here') params.append('location', filters.location);
      if (filters.employeeId && filters.employeeId !== 'Select Here') params.append('employeeId', filters.employeeId);
      if (filters.payCycleId && filters.payCycleId !== 'Select Here') params.append('payCycleId', filters.payCycleId);
      params.append('status', filters.status || 'Unposted');

      const res = await fetch(`/api/payroll/post-salary?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setSelectedRows(new Set());
      }
      await fetchMissingEmployees(filters.payCycleId);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMissingEmployees = async () => {
    const employeeIds = [...new Set(missingEmployees.map(record => record.employeeId))];
    if (!employeeIds.length || !filters.payCycleId || filters.payCycleId === 'Select Here') return;
    if (!window.confirm(`Remove all ${employeeIds.length} missing employee(s) from this pay cycle? Attendance and employee records will remain untouched.`)) return;

    setRemovingMissing(true);
    try {
      const response = await fetch(`/api/payroll/cycles/${encodeURIComponent(filters.payCycleId)}/remove-missing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not remove missing employees.');
      setMissingEmployees([]);
      await fetchData();
      alert(`${result.removedCount} missing employee(s) removed from this pay cycle. Attendance and employee records were not deleted.`);
    } catch (error) {
      alert(error.message || 'Could not remove missing employees.');
    } finally {
      setRemovingMissing(false);
    }
  };

  const postableRows = data.filter(row => row.status === 'APPROVED');
  const selectedPostableCount = postableRows.filter(row => selectedRows.has(row.id)).length;
  const selectedPostableRows = postableRows.filter(row => selectedRows.has(row.id));
  const selectedPostableCycleIds = [...new Set(selectedPostableRows.map(row => row.payCycleId))];

  const handleRowChange = (id, field, value) => {
    setData(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const toggleAllRows = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(postableRows.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const toggleRow = (id) => {
    if (!postableRows.some(row => row.id === id)) return;
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSave = async () => {
    const recordsToPost = postableRows.filter(row => selectedRows.has(row.id));
    if (recordsToPost.length === 0) {
      alert("Select at least one approved, unposted salary record.");
      return;
    }
    
    setSaving(true);
    try {
      const updates = recordsToPost.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        creditAccount: r.creditAccount,
        debitAccount: r.debitAccount,
        budgetHead: r.budgetHead,
        remark: r.remark
      }));

      const res = await fetch('/api/payroll/post-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'POST', updates })
      });
      
      const json = await res.json();
      if (res.ok && json.success) {
        alert("Salary posted successfully!");
        fetchData();
      } else {
        alert(json.error || "Failed to post salary");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while posting salary.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpostToSalaryCalculation = async () => {
    if (selectedPostableRows.length === 0 || selectedPostableCycleIds.length !== 1) return;
    const confirmed = window.confirm(
      `Move ${selectedPostableRows.length} approved, unposted salary record${selectedPostableRows.length === 1 ? '' : 's'} back to Salary Calculation? The approval voucher will be reversed. Attendance approval will remain unchanged.`
    );
    if (!confirmed) return;

    setUnposting(true);
    try {
      const response = await fetch('/api/payroll/records/unpost-to-salary-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordIds: selectedPostableRows.map(row => row.id) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not unpost salary to Salary Calculation.');
      }
      router.push(`/dashboard/payroll/salary-calculation?cycleId=${encodeURIComponent(result.payCycleId)}`);
    } catch (error) {
      alert(error.message || 'Could not unpost salary to Salary Calculation.');
    } finally {
      setUnposting(false);
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', width: '100%', marginBottom: '0.75rem' }}>
          <div className="filter-group">
            <label>Organization / Branch</label>
            <MultiSelect options={locations.map(l => l.name || l)} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
          </div>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect options={departments.map(d => d.name || d)} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect options={employees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
          </div>
        </div>
        <div className="filter-group">
          <label>Pay Cycle</label>
          <select 
            value={filters.payCycleId} 
            onChange={(e) => {
              const payCycleId = e.target.value;
              setFilters(previous => ({ ...previous, payCycleId }));
              fetchMissingEmployees(payCycleId);
            }}
            style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '250px' }}
          >
            <option value="Select Here">-- Select Pay Cycle --</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--pay-glass-border)', paddingBottom: '1rem', alignItems: 'center' }}>
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={filters.status || 'Unposted'} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            style={{ width: '200px', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          >
            <option value="All">All</option>
            <option value="Posted">Posted</option>
            <option value="Unposted">Unposted</option>
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={fetchData}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="summary-badges" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ color: '#0284c7', fontWeight: '600', backgroundColor: '#e0f2fe', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
            Total Records: {data.length}
          </div>
          {missingEmployees.length > 0 && (
            <>
              <div style={{ color: '#b91c1c', fontWeight: 700, backgroundColor: '#fee2e2', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                Missing payroll: {missingEmployees.length}
              </div>
              <button
                className="btn-primary"
                onClick={handleRemoveMissingEmployees}
                disabled={removingMissing || cycles.find(cycle => cycle.id === filters.payCycleId)?.status === 'COMPLETED'}
                title="Remove missing employees from this pay cycle only; attendance and employee records are preserved."
                style={{ backgroundColor: removingMissing ? '#94a3b8' : '#dc2626' }}
              >
                {removingMissing ? 'Removing...' : 'Remove Missing from Cycle'}
              </button>
            </>
          )}
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0f766e' }}>
            <Printer size={16} /> Print ▾
          </button>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: saving || selectedPostableCount === 0 ? '#94a3b8' : '#0ea5e9' }}
            onClick={handleSave}
            disabled={saving || selectedPostableCount === 0}
            title={selectedPostableCount === 0 ? 'Select at least one approved, unposted salary record.' : 'Post selected approved salaries.'}
          >
            {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />} 
            {saving ? 'Posting...' : 'Post Selected'}
          </button>
          <button
            className="btn-primary"
            onClick={handleUnpostToSalaryCalculation}
            disabled={unposting || selectedPostableCount === 0 || selectedPostableCycleIds.length !== 1}
            title={selectedPostableCycleIds.length > 1
              ? 'Select approved salaries from one pay cycle at a time.'
              : 'Reverse selected salary approvals and return them to Salary Calculation.'}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: unposting || selectedPostableCount === 0 || selectedPostableCycleIds.length !== 1 ? '#94a3b8' : '#dc2626' }}
          >
            {unposting ? 'Unposting...' : 'Unpost to Salary Calculation'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#0ea5e9', color: 'white', textAlign: 'left', fontSize: '0.9rem' }}>
              <th style={{ width: '40px', padding: '0.75rem' }}>
                <input 
                  type="checkbox" 
                  aria-label="Select all approved unposted salaries"
                  checked={postableRows.length > 0 && selectedPostableCount === postableRows.length}
                  onChange={toggleAllRows}
                />
              </th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Employee Name</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Pay Cycle</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Arrears</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Bonus / Incentive</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Leave Enc.</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>TDS</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Net Salary</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Credit A/C</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Debit A/C</th>
              <th style={{ padding: '0.75rem', fontWeight: '500' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>No approved records found</td></tr>
            ) : (
              data.slice().sort((a, b) => String(a.empId || '').localeCompare(String(b.empId || ''), undefined, { numeric: true, sensitivity: 'base' })).map((row, index) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white', fontSize: '0.9rem' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedRows.has(row.id)}
                      disabled={row.status !== 'APPROVED'}
                      aria-label={`${row.status === 'APPROVED' ? 'Select' : 'Cannot post'} ${row.name} salary`}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</div>
                    <div style={{ fontSize: '0.75rem' }}>{row.empId}{row.location ? ` | ${row.location}` : ''}</div>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#0369a1', fontWeight: 600 }}>{row.payCycleName}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{row.arrears}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{row.bonusIncentive}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{row.leaveEncashment}</td>
                  <td style={{ padding: '0.75rem', color: '#ef4444' }}>{row.tds}</td>
                  <td style={{ padding: '0.75rem', color: '#16a34a', fontWeight: 700 }}>₹{row.netSalary}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <select 
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}
                      value={row.creditAccount}
                      onChange={(e) => handleRowChange(row.id, 'creditAccount', e.target.value)}
                    >
                      <option value={row.creditAccount || ''}>{row.creditAccount || 'Select Account'}</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <select 
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}
                      value={row.debitAccount}
                      onChange={(e) => handleRowChange(row.id, 'debitAccount', e.target.value)}
                    >
                      <option value={row.debitAccount || ''}>{row.debitAccount || 'Select Account'}</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: row.status === 'APPROVED' ? '#15803d' : '#64748b' }}>
                    {row.status === 'APPROVED' ? 'UNPOSTED' : row.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
