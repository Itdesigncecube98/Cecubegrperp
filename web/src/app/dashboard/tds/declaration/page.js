'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Copy, FileDown, Save, FileText, Upload } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';



const DECLARATION_ITEMS = [
  { type: 'Exemptions under Section 10', section: 'Section 10 (13A)', item: 'HRA Exemption', hasMonthly: true },
  { type: 'Exemptions under Section 10', section: 'Section 10(14)', item: 'Conveyance' },
  { type: 'Exemptions under Section 10', section: 'Section 10(14)', item: 'Education Allowance' },
  { type: 'Exemptions under Section 10', section: 'Section 10(14)', item: 'Hostel Allowance' },
  { type: 'Exemptions under Section 10', section: 'Section 17(2)', item: 'Medical Reibursement' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Principal Repayment of Housing Loan' },
  { type: 'Exemptions under Section 10', section: 'Section 10(10A)', item: 'Standard Deduction' },
  { type: 'Exemptions under Section 10', section: 'Section 10(10AA)', item: 'LTA' },
  { type: 'Exemptions under Section 16', section: 'Section 16(iii)', item: 'Profession Tax' },
  { type: 'Exemptions under Section 16', section: 'Section 16 (ia)', item: 'Standard Deduction' },
  { type: 'Income Declaration (Sources Other Than Salary)', section: 'Income Other than Salary', item: 'Other Income' },
  { type: 'Income Declaration (Sources Other Than Salary)', section: 'Income Other than Salary', item: 'Interest on Housing Loan' },
  { type: 'Income Declaration (Sources Other Than Salary)', section: 'Section 24(B)', item: 'Housing Loan Intt' },
  { type: 'Income Declaration (Under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Gross Salary' },
  { type: 'Income Declaration (Under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Bonus' },
  { type: 'Income Declaration (Under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Leave Encashment' },
  { type: 'Income Declaration (Under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'LTA' },
  { type: 'Income Declaration (Under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Incentive' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'PF' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'LIC' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Mutual Fund' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Edu Fee Paid' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'NSC' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Stamp Duty' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'PPF' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Other' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Fixed depo' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80CCD', item: '80CCD' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80E', item: 'Interest on Edu Loan' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80G', item: 'Donation - 100%' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80G', item: 'Donation - 50%' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 25000 - Self' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 50000 - Sr Citizen Parents' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 50000 - Self Sr Citizen' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 25000 - Parents' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80DD', item: 'Exp. Medical Treatement of physically handicapped' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80EE', item: 'Interest on Housing Loan 80EE' },
  { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80CCD(1B)', item: '80 CCD (1B) - 50000' }
].map(r => ({ ...r, actual: '0', qualifying: '0', final: '0', hasMonthly: r.hasMonthly || false }));

export default function Declaration() {
  const [data, setData] = useState(DECLARATION_ITEMS);
  const [fy, setFy] = useState('2026-2027');

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  useEffect(() => {
    fetch('/api/synchronization?type=siteoffices').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const names = d.map(x => x.name || x.siteOfficeName || x).filter(Boolean);
        setBranches(names);
        setSelectedBranches(names);
      }
    }).catch(console.error);

    fetch('/api/synchronization?type=departments').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const names = d.map(x => x.name || x.departmentName || x).filter(Boolean);
        setDepartments(names);
        setSelectedDepartments(names);
      }
    }).catch(console.error);

    fetch('/api/employees').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setEmployees(d);
        setSelectedEmployees(d.map(e => `${e.name} (${e.empId})`));
      }
    }).catch(console.error);
  }, []);

  const activeEmployee = selectedEmployees.length === 1 
    ? employees.find(e => `${e.name} (${e.empId})` === selectedEmployees[0]) 
    : null;
    
  const displayedPan = activeEmployee?.pan || (selectedEmployees.length > 1 ? 'Multiple Selected' : '');

  const handleSearch = async () => {
    if (selectedEmployees.length !== 1) {
      alert("Please select exactly one individual employee to search their declarations.");
      return;
    }
    const empId = activeEmployee.id;
    try {
      const res = await fetch(`/api/declarations?employeeId=${empId}&financialYear=${fy}`);
      if (res.ok) {
        const result = await res.json();
        if (result.items && result.items.length > 0) {
          // Merge fetched items with the base template
          const mergedData = DECLARATION_ITEMS.map(baseItem => {
            const savedItem = result.items.find(i => i.tdsSection === baseItem.section && i.itemName === baseItem.item);
            if (savedItem) {
              return {
                ...baseItem,
                actual: savedItem.actualAmount.toString(),
                qualifying: savedItem.qualifyingAmount.toString(),
                final: savedItem.finalAmount.toString()
              };
            }
            return baseItem;
          });
          setData(mergedData);
        } else {
          setData(DECLARATION_ITEMS);
        }
      }
    } catch (err) {
      console.error("Error fetching declarations:", err);
    }
  };

  const handleSave = async () => {
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee to save declarations.");
      return;
    }
    try {
      let successCount = 0;
      for (const empLabel of selectedEmployees) {
        const emp = employees.find(e => `${e.name} (${e.empId})` === empLabel);
        if (!emp) continue;

        const res = await fetch('/api/declarations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: emp.id,
            financialYear: fy,
            department: emp.department || '',
            panNumber: emp.pan || '',
            items: data
          })
        });
        if (res.ok) successCount++;
      }
      alert(`Declarations saved successfully for ${successCount} employees!`);
    } catch (err) {
      console.error("Error saving declarations:", err);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const filteredEmployees = employees.filter(e => {
    const isAllDepts = selectedDepartments.length === departments.length || departments.length === 0;
    const isAllBranches = selectedBranches.length === branches.length || branches.length === 0;
    
    const deptMatch = isAllDepts || (e.department && selectedDepartments.includes(e.department));
    const branchMatch = isAllBranches || (e.siteOffice && selectedBranches.includes(e.siteOffice));
    return deptMatch && branchMatch;
  });

  return (
    <div>
      <div className="filter-bar" style={{ marginTop: '0.5rem', flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ width: '100%', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Filter Criteria</span>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9', padding: '4px 12px', height: 'auto', fontSize: '0.8rem' }}>
            <Copy size={14} /> Copy to next year
          </button>
        </div>
        <div className="filter-group">
          <label style={{ color: '#0ea5e9', fontWeight: 600 }}>Financial Year</label>
          <select value={fy} onChange={(e) => setFy(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }}>
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
          </select>
        </div>
        <div className="filter-group">
          <label style={{ color: '#0ea5e9', fontWeight: 600 }}>Organization / Branch</label>
          <MultiSelect options={branches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
        </div>
        <div className="filter-group">
          <label style={{ color: '#0ea5e9', fontWeight: 600 }}>Department</label>
          <MultiSelect options={departments} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
        </div>
        <div className="filter-group">
          <label style={{ color: '#0ea5e9', fontWeight: 600 }}>Employee <span style={{ color: 'red' }}>*</span></label>
          <MultiSelect options={filteredEmployees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
        </div>
        <div className="filter-group">
          <label style={{ color: '#0ea5e9', fontWeight: 600 }}>PAN/PAYE No.</label>
          <input
            type="text"
            value={displayedPan}
            readOnly
            style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }}
            placeholder={selectedEmployees.length !== 1 ? 'Select exactly one individual employee' : ''}
          />
        </div>

        <div className="filter-actions" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '1rem', gap: '8px' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={() => setData(DECLARATION_ITEMS)}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={handleSearch}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      <div className="action-bar" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>Result</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0f766e' }}>
            <FileText size={14} /> Import From Salary
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <FileDown size={14} /> Export to excel
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={handleSave}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0ea5e9', color: 'white' }}>
              <th style={{ padding: '10px' }}>TDS Type</th>
              <th style={{ padding: '10px' }}>TDS Section</th>
              <th style={{ padding: '10px' }}>Item Name</th>
              <th style={{ width: '120px', textAlign: 'center', padding: '10px' }}>Actual Amount</th>
              <th style={{ width: '120px', textAlign: 'center', padding: '10px' }}>Qualifying Amount</th>
              <th style={{ width: '100px', textAlign: 'center', padding: '10px' }}>Final Amount</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '10px' }}>Monthly</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                <td style={{ color: '#475569', fontSize: '0.85rem', padding: '8px 10px' }}>{r.type}</td>
                <td style={{ color: '#475569', fontSize: '0.85rem', padding: '8px 10px' }}>{r.section}</td>
                <td style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 500, padding: '8px 10px' }}>{r.item}</td>
                <td style={{ padding: '4px 10px' }}>
                  <input type="number" value={r.actual} onChange={(e) => handleInputChange(i, 'actual', e.target.value)} className="table-input" style={{ width: '100%', textAlign: 'right', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                </td>
                <td style={{ padding: '4px 10px' }}>
                  <input type="number" value={r.qualifying} onChange={(e) => handleInputChange(i, 'qualifying', e.target.value)} className="table-input" style={{ width: '100%', textAlign: 'right', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '8px 10px' }}>{r.final}</td>
                <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                  {r.hasMonthly && (
                    <button style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer' }} title="Monthly Details">
                      <FileText size={18} />
                    </button>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer' }} title="Upload Document">
                    <Upload size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
