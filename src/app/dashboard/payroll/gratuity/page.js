'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';
import EmployeePayrollHistory from '../EmployeePayrollHistory';
import '../../leaves/leaves.css';

export default function GratuityCalculatorPage() {
  const [gratuityList, setGratuityList] = useState([]);
  const [payCycles, setPayCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [cycleGratuities, setCycleGratuities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pushError, setPushError] = useState('');
  const [pushingEmployeeId, setPushingEmployeeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter States
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);

  useEffect(() => {
    let active = true;
    fetch('/api/payroll/gratuity')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch gratuity data.');
        return data;
      })
      .then(data => { if (active) setGratuityList(data); })
      .catch(error => { if (active) setError(error.message); })
      .finally(() => { if (active) setLoading(false); });

    fetch('/api/payroll/cycles')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch pay cycles.');
        return data;
      })
      .then(cycles => {
        if (!Array.isArray(cycles)) throw new Error('Invalid pay cycle response.');
        if (!active) return;
        setPayCycles(cycles);
        const currentCycle = cycles.find(cycle => cycle.status === 'PROCESSING') ||
          cycles.find(cycle => cycle.status !== 'COMPLETED');
        setSelectedCycleId(currentCycle?.id || '');
      })
      .catch(cycleError => { if (active) setPushError(cycleError.message || 'Failed to fetch pay cycles.'); });

    return () => { active = false; };
  }, []);

  async function fetchGratuityData() {
    try {
      const res = await fetch('/api/payroll/gratuity');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch gratuity data');
      }

      setGratuityList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCycleId) return;

    let active = true;
    fetch(`/api/payroll/bonus?cycleId=${encodeURIComponent(selectedCycleId)}&type=gratuity`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load gratuity history for this pay cycle.');
        return data;
      })
      .then(items => {
        if (active && Array.isArray(items)) setCycleGratuities(items);
      })
      .catch(cycleError => {
        if (active) setPushError(cycleError.message || 'Failed to load gratuity history for this pay cycle.');
      });

    return () => { active = false; };
  }, [selectedCycleId]);

  const handlePushToPayslip = async employee => {
    if (!selectedCycleId) {
      setPushError('Select a pay cycle before pushing gratuity.');
      return;
    }

    setPushingEmployeeId(employee.employeeId);
    setPushError('');
    try {
      const response = await fetch('/api/payroll/gratuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.employeeId, cycleId: selectedCycleId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to push gratuity to the payslip.');
      }

      setCycleGratuities(previous => [
        ...previous.filter(item => item.employeeId !== employee.employeeId),
        result.item,
      ]);
    } catch (pushError) {
      setPushError(pushError.message || 'Failed to push gratuity to the payslip.');
    } finally {
      setPushingEmployeeId('');
    }
  };

  // Derive unique options
  const uniqueDepts = useMemo(() => {
    return [...new Set(gratuityList.map(r => r.department).filter(Boolean))].sort();
  }, [gratuityList]);

  const uniqueEmps = useMemo(() => {
    return [...new Set(gratuityList.map(r => r.employeeName).filter(Boolean))].sort();
  }, [gratuityList]);

  const filteredList = gratuityList.filter(emp => {
    const searchMatch = emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.employeeCode && emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // For MultiSelect, if empty or all selected, it's a match
    const isAllDepts = selectedDepts.length === 0 || selectedDepts.length === uniqueDepts.length;
    const isAllEmps = selectedEmps.length === 0 || selectedEmps.length === uniqueEmps.length;

    const deptMatch = isAllDepts || (emp.department && selectedDepts.includes(emp.department));
    const empMatch = isAllEmps || (emp.employeeName && selectedEmps.includes(emp.employeeName));

    return searchMatch && deptMatch && empMatch;
  });

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', width: '100%' }}>
          <div className="filter-group">
            <label>Current Pay Cycle</label>
            <select value={selectedCycleId} onChange={event => setSelectedCycleId(event.target.value)}>
              <option value="">-- Select Pay Cycle --</option>
              {payCycles.filter(cycle => cycle.status !== 'COMPLETED').map(cycle => (
                <option key={cycle.id} value={cycle.id}>{cycle.name} ({cycle.status})</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect
              options={uniqueDepts}
              selectedOptions={selectedDepts}
              onChange={setSelectedDepts}
              placeholder="Select Departments"
            />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect
              options={uniqueEmps}
              selectedOptions={selectedEmps}
              onChange={setSelectedEmps}
              placeholder="Select Employees"
            />
          </div>
          <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e5e7eb', height: '38px', flex: 1 }}>
              <Search size={16} color="#9ca3af" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>
            <button className="btn btnPrimary" onClick={fetchGratuityData} disabled={loading} style={{ height: '38px', whiteSpace: 'nowrap' }}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {pushError && (
        <div role="alert" style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem' }}>
          {pushError}
        </div>
      )}

      <div className="tableContainer">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Employee Info</th>
              <th>Joined Date</th>
              <th>Service Duration</th>
              <th>Last Drawn Basic</th>
              <th>Gratuity Amount</th>
              <th>Eligibility</th>
              <th>Status</th>
              <th>Current Payslip</th>
              <th>Payroll History</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Loading auto-calculated gratuity data...</td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No employees found.</td>
              </tr>
            ) : (
              filteredList.map((emp) => {
                const currentGratuity = selectedCycleId
                  ? cycleGratuities.find(item => item.employeeId === emp.employeeId)
                  : null;
                const isPushed = currentGratuity?.status === 'ADDED_TO_SALARY';
                return (
                <tr key={emp.employeeId}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{emp.employeeName}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.employeeCode}</div>
                  </td>
                  <td>
                    {emp.joinedDate ? new Date(emp.joinedDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <div>{emp.exactYearsOfService} Yrs</div>
                  </td>
                  <td>₹ {emp.basicSalary.toLocaleString()}</td>
                  <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                    ₹ {parseFloat(emp.gratuityAmount).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      background: emp.isEligible ? '#dcfce7' : '#fee2e2', 
                      color: emp.isEligible ? '#166534' : '#991b1b' 
                    }}>
                      {emp.isEligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      background: emp.status === 'Pending Settlement' ? '#fef3c7' : '#f3f4f6', 
                      color: emp.status === 'Pending Settlement' ? '#92400e' : '#4b5563' 
                    }}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    {emp.isEligible ? (
                      <button
                        type="button"
                        onClick={() => handlePushToPayslip(emp)}
                        disabled={!selectedCycleId || pushingEmployeeId === emp.employeeId}
                        className="btn btnPrimary"
                        style={{ whiteSpace: 'nowrap', opacity: !selectedCycleId || pushingEmployeeId === emp.employeeId ? 0.6 : 1 }}
                      >
                        {pushingEmployeeId === emp.employeeId
                          ? 'Pushing...'
                          : isPushed
                            ? 'Update Current Payslip'
                            : 'Push to Current Payslip'}
                      </button>
                    ) : '—'}
                    {isPushed && <div style={{ marginTop: 4, fontSize: 11, color: '#15803d' }}>Added to payslip</div>}
                  </td>
                  <td><EmployeePayrollHistory employeeId={emp.employeeId} employeeName={`${emp.employeeName} (${emp.employeeCode})`} /></td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
