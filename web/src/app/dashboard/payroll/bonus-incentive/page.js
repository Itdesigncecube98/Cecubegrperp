'use client';
import React from 'react';
import { Search, RefreshCw, Calculator, FileDown } from 'lucide-react';

export default function BonusIncentive() {
  const [data, setData] = React.useState([
    { id: 1, empNo: 'CEIPL084', name: 'Aayushee Varshney', dept: 'General Administration', pos: 'Design Engineer', status: 'Working', doj: '01/01/2025', basis: 0, percent: 0, amount: 0, message: '0' },
    { id: 2, empNo: 'CEIPL065', name: 'Abhijit Chatterjee', dept: 'General Administration', pos: 'Manager -E&C', status: 'Working', doj: '10/04/2024', basis: 0, percent: 0, amount: 0, message: '0' },
    { id: 3, empNo: 'HEL047', name: 'Ajay', dept: 'Operations / Projects', pos: 'Helper', status: 'Working', doj: '01/01/2025', basis: 0, percent: 0, amount: 0, message: '0' },
    { id: 4, empNo: 'CEIPL111', name: 'Ajeet Kushwaha', dept: 'Operations / Projects', pos: 'Civil Engineer', status: 'Working', doj: '01/10/2025', basis: 0, percent: 0, amount: 0, message: '0' },
    { id: 5, empNo: 'CEIPL110', name: 'Amit Kumar', dept: 'Marketing & Business Development', pos: 'Senior Manager', status: 'Working', doj: '16/09/2025', basis: 0, percent: 0, amount: 0, message: '0' }
  ]);

  const handleCalculate = () => {
    const saved = localStorage.getItem('bonusIncentives');
    if (saved) {
      const setups = JSON.parse(saved);
      if (setups.length > 0) {
        const setup = setups[0];
        const newBasis = parseFloat(setup.computationBasis) || 0;
        const newPercent = parseFloat(setup.percentage) || 0;
        
        setData(data.map(item => ({
          ...item,
          basis: newBasis,
          percent: newPercent,
          amount: (newBasis * newPercent) / 100
        })));
      }
    } else {
      alert("No Bonus/Incentive setup found. Please configure it in Synchronisation 1.");
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group">
          <label>Department</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Location</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Religion</label>
          <select><option>Select Here</option></select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem' }}>
        <div className="filter-group">
          <label>From Date</label>
          <input type="date" defaultValue="2026-08-01" />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input type="date" defaultValue="2026-08-31" />
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select><option>Calculate</option></select>
        </div>
        <div className="filter-group" style={{ justifyContent: 'flex-end', paddingBottom: '0.5rem' }}>
          <div className="radio-group">
            <label>
              <input type="radio" name="bonusType" value="bonus" defaultChecked />
              Bonus
            </label>
            <label>
              <input type="radio" name="bonusType" value="incentive" />
              Incentive
            </label>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'center' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="resigned" />
          <label htmlFor="resigned">Show Resigned Employees</label>
        </div>

        <div className="filter-actions">
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="summary-badges" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="summary-badge" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
            Total Records: 40
          </div>
          <button onClick={handleCalculate} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Calculator size={16} /> Calculate
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
        
        <div className="pagination-controls" style={{ marginTop: 0 }}>
          <span>Show Rows:</span>
          <select defaultValue="40"><option>40</option><option>100</option></select>
          <span>Page: 1 of 1</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Go</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<<'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<'}</button>
            <button className="btn-primary" style={{ padding: '0.25rem 0.5rem' }}>1</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'>'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'>>'}</button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" /></th>
              <th>emp no</th>
              <th>name</th>
              <th>dept</th>
              <th>position</th>
              <th>status</th>
              <th>date of joining</th>
              <th>basis</th>
              <th>%</th>
              <th>amount</th>
              <th>message</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td>{row.empNo}</td>
                <td style={{ color: 'var(--text-color)', fontWeight: '500' }}>{row.name}</td>
                <td>{row.dept}</td>
                <td>{row.pos}</td>
                <td>{row.status}</td>
                <td>{row.doj}</td>
                <td>{row.basis}</td>
                <td>{row.percent}</td>
                <td>{row.amount}</td>
                <td>{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
