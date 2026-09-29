'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Copy, FileDown, Save, FileText, Upload, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function EmployeeDeclarationsPage() {
  const router = useRouter();
  const [data, setData] = useState(DECLARATION_ITEMS);
  const [fy, setFy] = useState('2026-2027');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    fetchDeclarations(parsed, '2026-2027');
  }, [router]);

  const fetchDeclarations = async (emp, financialYear) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/declarations?employeeId=${emp.id}&financialYear=${financialYear}`);
      if (res.ok) {
        const result = await res.json();
        if (result.items && result.items.length > 0) {
          const mergedData = DECLARATION_ITEMS.map(baseItem => {
            const savedItem = result.items.find(i => i.itemName === baseItem.item && i.tdsType === baseItem.type);
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
    setLoading(false);
  };

  const handleSearch = () => {
    if (employee) fetchDeclarations(employee, fy);
  };

  const handleSave = async () => {
    if (!employee) return;
    try {
      const res = await fetch('/api/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          financialYear: fy,
          department: employee.department || '',
          panNumber: employee.pan || '',
          items: data
        })
      });
      if (res.ok) {
        alert("Declarations saved successfully!");
      } else {
        const err = await res.json();
        alert("Error saving: " + err.error);
      }
    } catch (err) {
      console.error("Error saving declarations:", err);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  if (loading && !employee) return <div style={{ padding: '2rem' }}>Loading declarations...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh', padding: '24px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <button 
          onClick={() => router.push('/employee/dashboard')}
          style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} color="#475569" />
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>My Income & Investment Declarations</h1>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#64748b', fontWeight: 600 }}>Filter Criteria</h3>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9', border: 'none', padding: '6px 16px', borderRadius: '4px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            <Copy size={14} /> Copy to next year
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <label style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '14px' }}>Financial Year</label>
            <select value={fy} onChange={(e) => setFy(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}>
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button onClick={() => setData(DECLARATION_ITEMS)} style={{ backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={handleSearch} style={{ backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <Search size={14} /> Search
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#64748b', fontWeight: 600 }}>Result</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ backgroundColor: '#0f766e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              <FileText size={14} /> Import From Salary
            </button>
            <button style={{ backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              <FileDown size={14} /> Export to excel
            </button>
            <button onClick={handleSave} style={{ backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: 'white' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>TDS Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>TDS Section</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>Item Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px', width: '140px', textAlign: 'center' }}>Actual Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px', width: '140px', textAlign: 'center' }}>Qualifying Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px', width: '120px', textAlign: 'center' }}>Final Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px', width: '80px', textAlign: 'center' }}>Monthly</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px', width: '80px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                  <td style={{ color: '#475569', fontSize: '13px', padding: '10px 16px' }}>{r.type}</td>
                  <td style={{ color: '#475569', fontSize: '13px', padding: '10px 16px' }}>{r.section}</td>
                  <td style={{ color: '#334155', fontSize: '13px', fontWeight: 600, padding: '10px 16px' }}>{r.item}</td>
                  <td style={{ padding: '6px 16px' }}>
                    <input type="number" value={r.actual} onChange={(e) => handleInputChange(i, 'actual', e.target.value)} style={{ width: '100%', textAlign: 'right', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                  </td>
                  <td style={{ padding: '6px 16px' }}>
                    <input type="number" value={r.qualifying} onChange={(e) => handleInputChange(i, 'qualifying', e.target.value)} style={{ width: '100%', textAlign: 'right', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', padding: '10px 16px', fontSize: '14px' }}>{r.final}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    {r.hasMonthly && (
                      <button style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer' }} title="Monthly Details">
                        <FileText size={16} />
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    <button style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer' }} title="Upload Document">
                      <Upload size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
