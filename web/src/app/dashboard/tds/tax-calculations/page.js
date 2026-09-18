'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Calculator, FileDown, Save, Info } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';

export default function TaxCalculations() {
  const [employees, setEmployees] = useState([]);
  const [taxSlabs, setTaxSlabs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filters, setFilters] = useState({
    financialYear: '2026-2027',
    department: '',
    employeeId: '',
    regimeName: 'Old Tax Regime'
  });

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setEmployees(data);
        setSelectedEmployees(data.map(e => `${e.name} (${e.empId})`));
      }
    }).catch(console.error);

    fetch('/api/tax-slabs').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTaxSlabs(data);
    }).catch(console.error);

    fetch('/api/synchronization?type=siteoffices').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const names = data.map(d => d.name || d.siteOfficeName || d).filter(Boolean);
        setBranches(names);
        setSelectedBranches(names);
      }
    }).catch(console.error);

    fetch('/api/synchronization?type=departments').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const names = data.map(d => d.name || d.departmentName || d).filter(Boolean);
        setSelectedDepartments(names);
      }
    }).catch(console.error);
  }, []);

  const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
  const uniqueFinYears = [...new Set(taxSlabs.map(t => t.financialYear).filter(Boolean))].sort().reverse();
  const uniqueRegimes = [...new Set(taxSlabs.map(t => t.name).filter(Boolean))].sort();

  const isAllBranches = selectedBranches.length === branches.length || branches.length === 0;
  const isAllDepts = selectedDepartments.length === uniqueDepartments.length || uniqueDepartments.length === 0;
  const isAllEmps = selectedEmployees.length === employees.length || employees.length === 0;

  const filteredEmployees = employees.filter(e => {
    const branchMatch = isAllBranches || (e.siteOffice && selectedBranches.includes(e.siteOffice));
    const deptMatch = isAllDepts || (e.department && selectedDepartments.includes(e.department));
    const empLabel = `${e.name} (${e.empId})`;
    const empMatch = isAllEmps || selectedEmployees.includes(empLabel);
    return branchMatch && deptMatch && empMatch;
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  return (
    <div>
      <style>{`
        .tax-calc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        .tax-calc-panel {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
        }
        .calc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px dashed var(--border-light);
        }
        .calc-row:last-child {
          border-bottom: none;
        }
        .calc-label {
          font-size: 0.8rem;
          color: var(--text-primary);
          flex: 1;
        }
        .calc-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 160px;
        }
        .calc-input {
          width: 100%;
          padding: 0.25rem 0.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          text-align: right;
          font-size: 0.8rem;
          background: #f8fafc;
        }
        .bottom-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          background: #f8fafc;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-top: 1.5rem;
        }
      `}</style>

      <div className="filter-bar" style={{ flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ width: '100%', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Filter Criteria
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          <div className="filter-group">
            <label>Organization / Branch</label>
            <MultiSelect options={branches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
          </div>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect options={uniqueDepartments} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect options={employees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
          </div>
          <div className="filter-group">
            <label>Financial Year</label>
            <select value={filters.financialYear} onChange={e => handleFilterChange('financialYear', e.target.value)}>
              <option value="2026-2027">2026-2027</option>
              {uniqueFinYears.filter(fy => fy !== '2026-2027').map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Current TDS Scheme</label>
            <select value={filters.regimeName} onChange={e => handleFilterChange('regimeName', e.target.value)}>
              <option value="Old Tax Regime">Old Tax Regime</option>
              {uniqueRegimes.filter(r => r !== 'Old Tax Regime').map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-actions" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={() => { setFilters({ financialYear: '2026-2027', department: '', employeeId: '', regimeName: 'Old Tax Regime' }); setSelectedBranches(branches); setSelectedDepartments(uniqueDepartments); setSelectedEmployees(employees.map(e => `${e.name} (${e.empId})`)); }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      <div className="tax-calc-grid">
        {/* Left Panel */}
        <div className="tax-calc-panel">
          <div className="calc-row">
            <div className="calc-label">Gross Salary</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <Info size={14} color="var(--tds-primary)" />
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Less - Exemptions</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <Info size={14} color="var(--tds-primary)" />
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Income Chargeable under the Head 'Salaries'</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Add - Any Other income reported by the employee</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Gross Total Income</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row" style={{ marginTop: '1rem', borderBottom: 'none' }}>
            <div className="calc-label" style={{ fontWeight: 600 }}>Deductions Under Chapter VI - A</div>
          </div>
          <div className="calc-row">
            <div className="calc-label" style={{ paddingLeft: '1rem' }}>(A) Sections 80C, 80CCC, 80CCD</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <Info size={14} color="var(--tds-primary)" />
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label" style={{ paddingLeft: '1rem' }}>(B) Other Sections (e.g. 80E, 80G etc.) under Chapter VI-A</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <Info size={14} color="var(--tds-primary)" />
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Aggregate of deductible amount under Chapter VI-A</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Total Taxable Income</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="tax-calc-panel">
          <div className="calc-row">
            <div className="calc-label">Tax on Total Income</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <Info size={14} color="var(--tds-primary)" />
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Rebate</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Tax After Rebate</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Relief under section 89</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Tax Payable after Relief</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Surcharge</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Education Cess@4%</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Tax Payable</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row" style={{ marginTop: '1rem', borderBottom: 'none' }}>
            <div className="calc-label" style={{ fontWeight: 600 }}>Less</div>
          </div>
          <div className="calc-row">
            <div className="calc-label" style={{ paddingLeft: '1rem' }}>(a) Tax Deducted at Source u/s 192(1)</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label" style={{ paddingLeft: '1rem' }}>(b) Tax Paid by employer u/s 192(1A) on perquisite u/s 17(2)</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
          <div className="calc-row">
            <div className="calc-label">Tax Payable/Refundable</div>
            <div className="calc-input-wrap">
              <input type="text" className="calc-input" defaultValue="0" />
              <div style={{ width: '14px' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-stats-grid">
        <div className="filter-group">
          <label>TDS deduction effective from</label>
          <input type="text" defaultValue="01/04/2026" style={{ textAlign: 'center' }} />
        </div>
        <div className="filter-group">
          <label>Balance months for TDS</label>
          <input type="text" defaultValue="12" style={{ textAlign: 'center', color: 'red', fontWeight: 600, backgroundColor: '#f1f5f9' }} readOnly />
        </div>
        <div className="filter-group">
          <label>TDS pay per month</label>
          <input type="text" defaultValue="0" style={{ textAlign: 'center', backgroundColor: '#f1f5f9' }} readOnly />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
          <span>Calculation Using Scheme</span>
          <label className="checkbox-inline"><input type="radio" name="scheme" /> Old Scheme</label>
          <label className="checkbox-inline" style={{ color: 'var(--tds-primary)' }}><input type="radio" name="scheme" defaultChecked /> New Scheme</label>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9', marginLeft: '1rem' }}>
            <Calculator size={14} /> Calculate
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <FileDown size={14} /> Export to excel
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
