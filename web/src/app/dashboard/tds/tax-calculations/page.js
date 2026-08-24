'use client';

import React from 'react';
import { Search, RotateCcw, Calculator, FileDown, Save, Info } from 'lucide-react';

export default function TaxCalculations() {
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

      <div className="filter-bar">
        <div style={{ width: '100%', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Filter Criteria
        </div>
        <div className="filter-group">
          <label>Financial Year</label>
          <select defaultValue="2026-2027">
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Department</label>
          <select defaultValue="">
            <option value="">Select Here</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Employee <span style={{color: 'red'}}>*</span></label>
          <select defaultValue="Ajay">
            <option value="Ajay">Ajay - HEL047</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Current TDS Scheme</label>
          <input type="text" defaultValue="Old Tax Regime" readOnly style={{ backgroundColor: '#f8fafc' }} />
        </div>
        
        <div className="filter-actions" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
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
