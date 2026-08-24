'use client';
import React from 'react';
import { Search, RefreshCw, Calculator, Printer, FileDown } from 'lucide-react';

export default function Gratuity() {
  const [data, setData] = React.useState([
    { id: 1, empNo: 'CEIPL084', name: 'Aayushee Varshney', dept: 'General Administration', pos: 'Design Engineer', status: 'Working', salary: '25000.00', doj: '01/01/2021', dol: '', uptoDate: '31/08/2026', period: '0', amount: '0.00' },
    { id: 2, empNo: 'CEIPL065', name: 'Abhijit Chatterjee', dept: 'General Administration', pos: 'Manager -E&C', status: 'Working', salary: '50000.00', doj: '10/04/2015', dol: '', uptoDate: '31/08/2026', period: '0', amount: '0.00' },
    { id: 3, empNo: 'HEL047', name: 'Ajay', dept: 'Operations / Projects', pos: 'Helper', status: 'Working', salary: '15000.00', doj: '01/01/2018', dol: '', uptoDate: '31/08/2026', period: '0', amount: '0.00' },
    { id: 4, empNo: 'CEIPL111', name: 'Ajeet Kushwaha', dept: 'Operations / Projects', pos: 'Civil Engineer', status: 'Working', salary: '30000.00', doj: '01/10/2020', dol: '', uptoDate: '31/08/2026', period: '0', amount: '0.00' },
    { id: 5, empNo: 'CEIPL110', name: 'Amit Kumar', dept: 'Marketing & Business Development', pos: 'Senior Manager', status: 'Working', salary: '60000.00', doj: '16/09/2010', dol: '', uptoDate: '31/08/2026', period: '0', amount: '0.00' }
  ]);

  const handleCalculate = () => {
    const saved = localStorage.getItem('gratuitySetups');
    if (saved) {
      const setups = JSON.parse(saved);
      if (setups.length > 0) {
        const setup = setups[0];
        const minLimit = parseInt(setup.minServedLimit) || 60; // in months
        
        setData(data.map(item => {
          // simple mock calculation
          const startYear = parseInt(item.doj.split('/')[2]);
          const currentYear = 2026;
          const yearsServed = currentYear - startYear;
          const monthsServed = yearsServed * 12;
          
          let gratuityAmt = 0;
          if (monthsServed >= minLimit) {
            const baseSalary = parseFloat(item.salary);
            gratuityAmt = (baseSalary * 15 / 26) * yearsServed;
          }
          
          return {
            ...item,
            period: yearsServed.toString(),
            amount: gratuityAmt.toFixed(2)
          };
        }));
      }
    } else {
      alert("No Gratuity setup found. Please configure it in Synchronisation 1.");
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
          <label>Employee</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Employee Status</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Upto Date</label>
          <input type="month" defaultValue="2026-08" />
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'center' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="calculated" />
          <label htmlFor="calculated">Calculated</label>
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
          <button onClick={handleCalculate} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Calculator size={16} /> Calculate
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
        
        <div className="pagination-controls" style={{ marginTop: 0 }}>
          <span>Show Rows:</span>
          <select defaultValue="40"><option>40</option><option>100</option></select>
          <span>Page: 1 of 4</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Go</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<<'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<'}</button>
            <button className="btn-primary" style={{ padding: '0.25rem 0.5rem' }}>1</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>2</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>3</button>
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
              <th>message</th>
              <th>emp no</th>
              <th>emp name</th>
              <th>department</th>
              <th>position</th>
              <th>emp status</th>
              <th>salary</th>
              <th>date of joining</th>
              <th>upto date</th>
              <th>period served</th>
              <th>gratuity amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td><input type="checkbox" disabled /></td>
                <td>{row.empNo}</td>
                <td style={{ color: 'var(--text-color)', fontWeight: '500' }}>{row.name}</td>
                <td>{row.dept}</td>
                <td>{row.pos}</td>
                <td>{row.status}</td>
                <td>{row.salary}</td>
                <td>{row.doj}</td>
                <td>{row.uptoDate}</td>
                <td>{row.period}</td>
                <td>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
