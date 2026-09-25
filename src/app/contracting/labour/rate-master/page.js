'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText, Copy, Trash2, Printer } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function LabourRateMaster() {
  const [rates] = useState([
    { id: 1, labour: 'Hydra Charges', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Santosh Crane Service', rate: '44000.0000', discount: '0.00', taxScheme: 'C+SGST 18%', totalTax: '7920.00', credit: '0', user: 'Pradeep.Kumar', date: '22/08/2026', netRate: '51920.00' },
    { id: 2, labour: 'SITC of PVC Drift Eliminator 600X600', estUnit: 'Nos', convFact: '1.00000', convUnit: 'Nos', contractor: 'BK Systems', rate: '450.0000', discount: '0.00', taxScheme: 'IGST 18%', totalTax: '81.00', credit: '0', user: 'Pradeep.Kumar', date: '20/08/2026', netRate: '531.00' },
    { id: 3, labour: 'SITC of PVC film 600X300X150 mm', estUnit: 'Nos', convFact: '1.00000', convUnit: 'Nos', contractor: 'BK Systems', rate: '128.0000', discount: '0.00', taxScheme: 'IGST 18%', totalTax: '23.04', credit: '0', user: 'Pradeep.Kumar', date: '20/08/2026', netRate: '151.04' },
    { id: 4, labour: '01/07/2026 Under Ground 33 KV HT Cable Hipot', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Megger Electrical co.', rate: '5000.0000', discount: '0.00', taxScheme: 'C+SGST 18%', totalTax: '900.00', credit: '0', user: 'Pradeep.Kumar', date: '10/08/2026', netRate: '5900.00' },
    { id: 5, labour: 'Testing & analysis UnderGround 11KV cable hipot', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Megger Electrical co.', rate: '4000.0000', discount: '0.00', taxScheme: 'C+SGST 18%', totalTax: '720.00', credit: '0', user: 'Pradeep.Kumar', date: '15/08/2026', netRate: '4720.00' },
    { id: 6, labour: 'Underground 11KV Cable Route Tracing', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Megger Electrical co.', rate: '10000.0000', discount: '0.00', taxScheme: 'C+SGST 18%', totalTax: '1800.00', credit: '0', user: 'Pradeep.Kumar', date: '10/08/2026', netRate: '11800.00' },
    { id: 7, labour: 'Manpower and extra cable laying work', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Prakash Electricals', rate: '113400.0000', discount: '0.00', taxScheme: 'Cgst Exempted', totalTax: '0.00', credit: '0', user: 'Pradeep.Kumar', date: '15/08/2026', netRate: '113400.00' },
    { id: 8, labour: 'Rental charges for Crane', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Guddu Crane Service', rate: '30000.0000', discount: '0.00', taxScheme: 'C+SGST 18%', totalTax: '5400.00', credit: '0', user: 'Pradeep.Kumar', date: '17/08/2026', netRate: '35400.00' },
    { id: 9, labour: 'JCB Charges', estUnit: 'Job', convFact: '1.00000', convUnit: 'Job', contractor: 'Yogendra Construction', rate: '15435.0000', discount: '0.00', taxScheme: 'C+SGST 18%', totalTax: '2778.30', credit: '0', user: 'Pradeep.Kumar', date: '17/08/2026', netRate: '18213.30' },
  ]);

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          Labour Rate Master
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour Rate Master
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filter Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Filter
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              <FormGroup label="Library" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>CeCube Green Energy</option></select>
              </FormGroup>
              
              <div style={{ gridColumn: 'span 2' }}>
                <FormGroup label="Rate List">
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="contracting-input" style={{ width: '100%', paddingRight: '30px' }} />
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </FormGroup>
              </div>

              <FormGroup label="Labour Category">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="Contractor">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>

              <FormGroup label="Search By Date">
                <div style={{ marginTop: '10px' }}>
                  <input type="checkbox" />
                </div>
              </FormGroup>

              <FormGroup label="From Date">
                <input type="date" className="contracting-input" defaultValue="2026-05-25" style={{ width: '100%' }} />
              </FormGroup>
              
              <FormGroup label="To Date">
                <input type="date" className="contracting-input" defaultValue="2026-08-25" style={{ width: '100%' }} />
              </FormGroup>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan"><Search size={14} /> Search</button>
            </div>
          </div>
        </div>

        {/* Search Result Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Search Result
          </div>
          <div style={{ padding: '16px' }}>
            
            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button className="btn-cyan" style={{ padding: '4px 12px', fontSize: '0.8rem' }}><Copy size={12} style={{ marginRight: '4px' }} /> Copy</button>
              <button className="btn-cyan" style={{ padding: '4px 12px', fontSize: '0.8rem' }}><Trash2 size={12} style={{ marginRight: '4px' }} /> Invalidate</button>
              <button className="btn-cyan" style={{ padding: '4px 12px', fontSize: '0.8rem' }}><Printer size={12} style={{ marginRight: '4px' }} /> Print</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="contracting-table" style={{ minWidth: '1500px', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" /></th>
                    <th>Labour</th>
                    <th>Est./Tech. Unit</th>
                    <th style={{ textAlign: 'right' }}>Conv. Fact.</th>
                    <th>Conv. Unit</th>
                    <th>Contractor</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Discount</th>
                    <th>Tax Scheme</th>
                    <th style={{ textAlign: 'right' }}>Total Tax</th>
                    <th style={{ textAlign: 'right' }}>Credit (Days)</th>
                    <th>User</th>
                    <th>Entry Date</th>
                    <th>Remark</th>
                    <th style={{ textAlign: 'right' }}>Material Rate</th>
                    <th style={{ textAlign: 'right' }}>Net Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r, index) => (
                    <tr key={r.id} style={{ background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                      <td style={{ color: '#17a2b8', fontWeight: 600 }}>{r.labour}</td>
                      <td>{r.estUnit}</td>
                      <td style={{ textAlign: 'right' }}>{r.convFact}</td>
                      <td>{r.convUnit}</td>
                      <td>{r.contractor}</td>
                      <td style={{ textAlign: 'right' }}>{r.rate}</td>
                      <td style={{ textAlign: 'right' }}>{r.discount}</td>
                      <td style={{ color: '#17a2b8' }}>{r.taxScheme}</td>
                      <td style={{ textAlign: 'right' }}>{r.totalTax}</td>
                      <td style={{ textAlign: 'right' }}>{r.credit}</td>
                      <td>{r.user}</td>
                      <td>{r.date}</td>
                      <td>Auto-generated Rate entry...</td>
                      <td style={{ textAlign: 'right' }}>0.00</td>
                      <td style={{ textAlign: 'right' }}>{r.netRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
