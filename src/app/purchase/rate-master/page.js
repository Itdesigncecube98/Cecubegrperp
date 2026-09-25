'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, Database, Copy, XCircle, ChevronDown } from 'lucide-react';
import '../purchase.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function RateMaster() {
  const [rates] = useState([
    {
      supplier: 'Kartar Singh & Co.',
      material: '40 mm Dia Cu Electrode 3 mtr long',
      hsn: '0',
      unit: 'Nos',
      conv: '1.0000',
      comUnit: 'Nos',
      rate: '11000.0000',
      discount: '0.00',
      credit: '0',
      taxScheme: 'C+SGST 18%',
      tCurr: 'INR',
      tccf: '1.0000',
      tcRate: '1.0000',
      totalTax: '1980',
      netRate: '12980.0000',
      user: 'Pradeep.Kumar',
      entryDate: '22/08/2026',
      status: 'Valid'
    },
    {
      supplier: 'Kartar Singh & Co.',
      material: '12 x 12 inch FRP Earthing Chamber Cover',
      hsn: '0',
      unit: 'Nos',
      conv: '1.0000',
      comUnit: 'Nos',
      rate: '450.0000',
      discount: '0.00',
      credit: '0',
      taxScheme: 'C+SGST 18%',
      tCurr: 'INR',
      tccf: '1.0000',
      tcRate: '1.0000',
      totalTax: '81',
      netRate: '531.0000',
      user: 'Pradeep.Kumar',
      entryDate: '22/08/2026',
      status: 'Valid'
    },
    {
      supplier: 'Kartar Singh & Co.',
      material: 'Bentonite Filling Compound',
      hsn: '0',
      unit: 'Kg',
      conv: '1.0000',
      comUnit: 'Kg',
      rate: '10.0000',
      discount: '0.00',
      credit: '0',
      taxScheme: 'C+SGST 18%',
      tCurr: 'INR',
      tccf: '1.0000',
      tcRate: '1.0000',
      totalTax: '1.8',
      netRate: '11.8000',
      user: 'Pradeep.Kumar',
      entryDate: '22/08/2026',
      status: 'Valid'
    }
  ]);

  return (
    <div className="purchase-container">
      
      {/* Header */}
      <div className="purchase-header">
        <div className="purchase-header-title">
          <Database size={18} />
          Rate Master
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Rate Master
        </div>
      </div>

      {/* Filter Section */}
      <div className="purchase-card" style={{ marginBottom: '24px' }}>
        <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronRight size={16} /> Filter
        </div>
        <div className="purchase-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            
            <FormGroup label="Library" required>
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Amazon Library">
                <option>Amazon Library</option>
              </select>
            </FormGroup>

            <FormGroup label="Rate List">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Material Category">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Material">
              <input type="text" className="purchase-input" placeholder="Enter material name..." style={{ width: '100%', boxSizing: 'border-box' }} />
            </FormGroup>

            <FormGroup label="Supplier">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Status">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="All">
                <option>All</option>
              </select>
            </FormGroup>

            <FormGroup label="From Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-05-26" />
            </FormGroup>

            <FormGroup label="To Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-24" />
            </FormGroup>

            <FormGroup label="Add New Rate List">
              <button className="btn-cyan" style={{ width: 'fit-content' }}>Add New Rate List</button>
            </FormGroup>

            <FormGroup label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', paddingTop: '8px' }}>
                <input type="checkbox" style={{ accentColor: '#17a2b8' }} /> Search By Date
              </label>
            </FormGroup>

            <div style={{ gridColumn: '3 / span 2', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7' }}>
                Reports <ChevronDown size={14} />
              </button>
              <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} /> Reset
              </button>
              <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={14} /> Search
              </button>
            </div>

          </div>
        </div>
      </div>

      <div className="purchase-card" style={{ marginBottom: '24px' }}>
        <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronRight size={16} /> Add New Rates
        </div>
      </div>

      {/* Search Result Section */}
      <div className="purchase-actions-bar" style={{ marginTop: '0', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0284c7' }}>Total Record : 4190</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}>
              <Copy size={14} /> Copy
            </button>
            <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}>
              <RefreshCw size={14} /> Invalidate
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          <span>Show Rows:</span>
          <select className="purchase-input" style={{ width: '60px', padding: '4px' }}>
            <option>40</option>
          </select>
          <span>Page:</span>
          <input type="text" className="purchase-input" defaultValue="1" style={{ width: '40px', padding: '4px', textAlign: 'center' }} />
          <span>of 105</span>
          <button className="btn-cyan" style={{ padding: '4px 8px' }}>Go</button>
          
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button style={{ border: 'none', background: '#17a2b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%' }}>1</button>
            <button style={{ border: 'none', background: '#e2e8f0', color: '#64748b', width: '24px', height: '24px', borderRadius: '50%' }}>2</button>
            <button style={{ border: 'none', background: '#e2e8f0', color: '#64748b', width: '24px', height: '24px', borderRadius: '50%' }}>3</button>
            <span style={{ margin: '0 4px', color: '#94a3b8' }}>...</span>
            <button style={{ border: 'none', background: '#17a2b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="purchase-table-wrapper" style={{ marginTop: 0, borderRadius: '0 0 8px 8px' }}>
        <table className="purchase-table" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ width: '30px' }}><input type="checkbox" /></th>
              <th>Supplier</th>
              <th>Material<br/>HSN Code</th>
              <th>Unit</th>
              <th>Conv. Fact.<br/>Com. Unit</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>Discount %</th>
              <th style={{ textAlign: 'right' }}>Credit</th>
              <th>Tax Scheme</th>
              <th>T Curr</th>
              <th style={{ textAlign: 'right' }}>TCCF<br/>TCRate</th>
              <th style={{ textAlign: 'right' }}>Total Tax</th>
              <th style={{ textAlign: 'right' }}>Net Rate</th>
              <th>Username</th>
              <th>Entry Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td><input type="checkbox" /></td>
                <td style={{ color: '#64748b' }}>{rate.supplier}</td>
                <td>
                  <div style={{ color: '#475569', marginBottom: '2px' }}>{rate.material}</div>
                  <div style={{ color: '#94a3b8' }}>{rate.hsn}</div>
                </td>
                <td>{rate.unit}</td>
                <td>
                  <div style={{ marginBottom: '2px' }}>{rate.conv}</div>
                  <div style={{ color: '#94a3b8' }}>{rate.comUnit}</div>
                </td>
                <td style={{ color: '#0284c7', fontWeight: 600, textAlign: 'right' }}>{rate.rate}</td>
                <td style={{ textAlign: 'right' }}>{rate.discount}</td>
                <td style={{ textAlign: 'right' }}>{rate.credit}</td>
                <td style={{ color: '#0284c7', fontWeight: 600 }}>{rate.taxScheme}</td>
                <td>{rate.tCurr}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '2px' }}>{rate.tccf}</div>
                  <div>{rate.tcRate}</div>
                </td>
                <td style={{ textAlign: 'right' }}>{rate.totalTax}</td>
                <td style={{ textAlign: 'right' }}>{rate.netRate}</td>
                <td>{rate.user}</td>
                <td>{rate.entryDate}</td>
                <td>{rate.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
