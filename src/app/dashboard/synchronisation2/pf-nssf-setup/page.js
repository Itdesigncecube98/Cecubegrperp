'use client';
import React, { useState, useEffect } from 'react';
import { Save, Plus, Settings } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function PfNssfSetupPage() {
  const defaultFormData = {
    fromDate: '',
    toDate: '',
    employerEpfFpsPercent: '',
    employerFpsPercent: '',
    employeeEpfFpsPercent: '',
    employeeFpsPercent: '',
    ac02EpfAdminCharges: '',
    ac02RoundValue: '',
    ac02RoundSide: 'Both',
    ac21EdliPercent: '',
    ac21RoundValue: '',
    ac21RoundSide: 'Both',
    ac22EdliAdminCharges: '',
    ac22RoundValue: '',
    ac22RoundSide: 'Both',
    ac22InspectionCharges: '',
    grossWagesFormula: '',
    employeeSalaryEpfLimit: '',
    employeeSalaryFpsLimit: '',
    employerSalaryEpfLimit: '',
    employerSalaryFpsLimit: '',
    pfNssfSalary: '',
    roundSideLimit: 'Both',
    exemptionAgeLimit: '',
    employeeEpfInterestRate: '',
    employeeFpsInterestRate: '',
    employerEpfInterestRate: '',
    employerFpsInterestRate: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

  const fetchSetup = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/synchronisation2/pf-nssf-setup');
      if (res.ok) {
        const data = await res.json();
        // Fallback to empty string for null values
        const parsedData = Object.keys(defaultFormData).reduce((acc, key) => {
          acc[key] = data[key] !== null && data[key] !== undefined ? data[key] : '';
          return acc;
        }, {});
        setFormData(parsedData);
      }
    } catch (error) {
      console.error('Error fetching PF/NSSF Setup:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetup();
  }, []);

  const showDialog = (type, title, message, onConfirm = null) => {
    setDialogConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/synchronisation2/pf-nssf-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showDialog('info', 'Success', 'PF/NSSF Setup saved successfully!', () => setDialogConfig({ ...dialogConfig, isOpen: false }));
      } else {
        const err = await res.json();
        showDialog('info', 'Error', err.error || 'Failed to save setup', () => setDialogConfig({ ...dialogConfig, isOpen: false }));
      }
    } catch (error) {
      console.error('Error saving:', error);
      showDialog('info', 'Error', 'Failed to save setup', () => setDialogConfig({ ...dialogConfig, isOpen: false }));
    }
  };

  const handleNew = () => {
    showDialog('confirm', 'Confirm New', 'Clear form to create new setup?', () => {
      setFormData(defaultFormData);
      setDialogConfig({ ...dialogConfig, isOpen: false });
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#374151',
    outline: 'none',
    background: '#fff'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0ea5e9',
    marginBottom: '4px'
  };

  const requiredAsterisk = <span style={{color: '#ef4444'}}>*</span>;

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading setup...</div>;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: 0 }}>PF/NSSF Setup</h2>
        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}>
          <Settings size={16} /> ESI/NHIF Setup
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
        
        {/* PF/NSSF Details */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          PF/NSSF Details {requiredAsterisk}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>From Date</label>
            <input type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>To Date</label>
            <input type="date" name="toDate" value={formData.toDate} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Employer EPF FPS % {requiredAsterisk}</label>
            <input type="number" name="employerEpfFpsPercent" value={formData.employerEpfFpsPercent} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employer FPS % {requiredAsterisk}</label>
            <input type="number" name="employerFpsPercent" value={formData.employerFpsPercent} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employee EPF FPS % {requiredAsterisk}</label>
            <input type="number" name="employeeEpfFpsPercent" value={formData.employeeEpfFpsPercent} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employee FPS %</label>
            <input type="number" name="employeeFpsPercent" value={formData.employeeFpsPercent} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>A/c 02 EPF Administrative Charges %</label>
            <input type="number" name="ac02EpfAdminCharges" value={formData.ac02EpfAdminCharges} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>A/c 02 Round Value</label>
            <input type="number" name="ac02RoundValue" value={formData.ac02RoundValue} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>A/c 02 Round Side</label>
            <select name="ac02RoundSide" value={formData.ac02RoundSide} onChange={handleChange} style={inputStyle}>
              <option value="Both">Both</option>
              <option value="Lower">Lower</option>
              <option value="Upper">Upper</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>A/c 21 EDLI %</label>
            <input type="number" name="ac21EdliPercent" value={formData.ac21EdliPercent} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>A/c 21 Round Value</label>
            <input type="number" name="ac21RoundValue" value={formData.ac21RoundValue} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>A/c 21 Round Side</label>
            <select name="ac21RoundSide" value={formData.ac21RoundSide} onChange={handleChange} style={inputStyle}>
              <option value="Both">Both</option>
              <option value="Lower">Lower</option>
              <option value="Upper">Upper</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>A/c 22 EDLI Administrative Charges %</label>
            <input type="number" name="ac22EdliAdminCharges" value={formData.ac22EdliAdminCharges} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>A/c 22 Round Value</label>
            <input type="number" name="ac22RoundValue" value={formData.ac22RoundValue} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>A/c 22 Round Side</label>
            <select name="ac22RoundSide" value={formData.ac22RoundSide} onChange={handleChange} style={inputStyle}>
              <option value="Both">Both</option>
              <option value="Lower">Lower</option>
              <option value="Upper">Upper</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>A/c 22 Inspection Charges %</label>
            <input type="number" name="ac22InspectionCharges" value={formData.ac22InspectionCharges} onChange={handleChange} style={inputStyle} />
          </div>
          
          <div style={{ gridColumn: 'span 4' }}>
            <label style={labelStyle}>Gross Wages Formula</label>
            <input type="text" name="grossWagesFormula" value={formData.grossWagesFormula} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {/* PF/NSSF Salary Limit */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          PF/NSSF Salary Limit
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Employee Salary EPF Limit {requiredAsterisk}</label>
            <input type="number" name="employeeSalaryEpfLimit" value={formData.employeeSalaryEpfLimit} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employee Salary FPS Limit {requiredAsterisk}</label>
            <input type="number" name="employeeSalaryFpsLimit" value={formData.employeeSalaryFpsLimit} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employer Salary EPF Limit {requiredAsterisk}</label>
            <input type="number" name="employerSalaryEpfLimit" value={formData.employerSalaryEpfLimit} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employer Salary FPS Limit {requiredAsterisk}</label>
            <input type="number" name="employerSalaryFpsLimit" value={formData.employerSalaryFpsLimit} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>PF/NSSF Salary</label>
            <input type="number" name="pfNssfSalary" value={formData.pfNssfSalary} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Round Side</label>
            <select name="roundSideLimit" value={formData.roundSideLimit} onChange={handleChange} style={inputStyle}>
              <option value="Both">Both</option>
              <option value="Lower">Lower</option>
              <option value="Upper">Upper</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>PF/NSSF Exmption Age Limit (Years) {requiredAsterisk}</label>
            <input type="number" name="exemptionAgeLimit" value={formData.exemptionAgeLimit} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {/* PF/NSSF Interest Rate */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          PF/NSSF Interest Rate
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div>
            <label style={labelStyle}>Employee EPF Interest Rate (%)</label>
            <input type="number" name="employeeEpfInterestRate" value={formData.employeeEpfInterestRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employee FPS Interest Rate (%)</label>
            <input type="number" name="employeeFpsInterestRate" value={formData.employeeFpsInterestRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employer EPF Interest Rate (%)</label>
            <input type="number" name="employerEpfInterestRate" value={formData.employerEpfInterestRate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Employer FPS Interest Rate (%)</label>
            <input type="number" name="employerFpsInterestRate" value={formData.employerFpsInterestRate} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <button 
            onClick={handleNew}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <Plus size={16} /> New
          </button>
          <button 
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <Save size={16} /> Save
          </button>
        </div>

      </div>
      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
