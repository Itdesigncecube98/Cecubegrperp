'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText, Copy, Info, ChevronDown } from 'lucide-react';
import '../../purchase.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function RequisitionBrowse() {
  const [requisitions] = useState([
    { reqNo: '5261', date: '27-06-2026', project: 'Chintels 7.9Acre Sec-109 SITC of External&Sub work', material: 'Feeder Pillar SSFP-1A (NEW) ESS-1A-TR3 (IP 55 Protection)', unit: 'Nos', reqdDate: '27-06-2026', reqQty: '3.0000', appQty: '1.0000', status: 'Approved' },
    { reqNo: '3190', date: '12-06-2025', project: 'Indiabulls SEL_ATH_CIT Sec 111 GGN 33 KV Swtch Stn', material: '250 W LED lamp water proof fitting', unit: 'Nos', reqdDate: '12-06-2025', reqQty: '10.0000', appQty: '4.0000', status: 'Approved' },
    { reqNo: '2931', date: '25-04-2025', project: 'Reliance METL Sec 2A & 3 Jhajjar', material: 'MS Strip 50mm x 6mm', unit: 'Mtr', reqdDate: '26-04-2025', reqQty: '2200.0000', appQty: '1765.0000', status: 'Approved' },
    { reqNo: '2006', date: '29-12-2024', project: 'Reliance Model Economic Township Ltd. Sec 2B & 7A', material: 'MS Chequered plate thickness 3mm', unit: 'Kg', reqdDate: '29-12-2024', reqQty: '1500.0000', appQty: '900.0000', status: 'Approved' },
    { reqNo: '1880', date: '09-12-2024', project: 'Rehmat Reality 100KW New Electrical Connection', material: '50mm x 50mm x 6mm MS Angle', unit: 'Mtr', reqdDate: '09-12-2024', reqQty: '60.0000', appQty: '13.3500', status: 'Approved' },
    { reqNo: '1879', date: '09-12-2024', project: 'Rehmat Reality 100KW New Electrical Connection', material: '40mm x 40mm x 5mm MS Angle', unit: 'Mtr', reqdDate: '09-12-2024', reqQty: '230.0000', appQty: '76.6600', status: 'Approved' },
  ]);

  return (
    <div className="purchase-container">
      
      {/* Header */}
      <div className="purchase-header">
        <div className="purchase-header-title">
          <FileText size={18} />
          Requisition Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Requisition Browse
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
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Electrical Work Library">
                <option>Electrical Work Library</option>
              </select>
            </FormGroup>

            <FormGroup label="Project List" required>
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="193 all selected!">
                <option>193 all selected!</option>
              </select>
            </FormGroup>

            <FormGroup label="Select">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '36px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>
                  <input type="radio" name="selectType" defaultChecked style={{ accentColor: '#17a2b8' }} /> Requisition
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>
                  <input type="radio" name="selectType" style={{ accentColor: '#17a2b8' }} /> Requirement
                </label>
              </div>
            </FormGroup>

            <FormGroup label="WBS Filter">
              <div style={{ position: 'relative' }}>
                <input type="text" className="purchase-input" placeholder="Select WBS Task" style={{ width: '100%', boxSizing: 'border-box' }} />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>

            <FormGroup label="Material Category">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Material">
              <input type="text" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} />
            </FormGroup>

            <FormGroup label="From Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2020-07-24" />
            </FormGroup>

            <FormGroup label="To Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-24" />
            </FormGroup>

            <FormGroup label="Only Extra Requisition">
              <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#17a2b8', cursor: 'pointer' }} />
              </div>
            </FormGroup>

            <FormGroup label="Status">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Approved">
                <option>Approved</option>
                <option>Pending</option>
              </select>
            </FormGroup>

            <FormGroup label="Select Role (Req. Entered by)">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px', height: '100%', paddingBottom: '16px' }}>
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

      {/* Actions and Table */}
      <div className="purchase-actions-bar" style={{ marginTop: '0', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Total Record : 9</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
              <input type="radio" name="viewType" defaultChecked style={{ accentColor: '#17a2b8' }} /> Summary
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
              <input type="radio" name="viewType" style={{ accentColor: '#17a2b8' }} /> Detail
            </label>
          </div>
          <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}>
            Reports <ChevronDown size={14} />
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          <span>Show Rows:</span>
          <select className="purchase-input" style={{ width: '60px', padding: '4px' }}>
            <option>40</option>
          </select>
          <span>Page:</span>
          <input type="text" className="purchase-input" defaultValue="1" style={{ width: '40px', padding: '4px', textAlign: 'center' }} />
          <span>of 1</span>
          <button className="btn-cyan" style={{ padding: '4px 8px' }}>Go</button>
          
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button style={{ border: '1px solid #cbd5e1', background: 'white', color: '#94a3b8', width: '28px', height: '28px', cursor: 'not-allowed' }}>{'<<'}</button>
            <button style={{ border: '1px solid #cbd5e1', background: 'white', color: '#94a3b8', width: '28px', height: '28px', cursor: 'not-allowed' }}>{'<'}</button>
            <button style={{ border: 'none', background: '#17a2b8', color: 'white', width: '28px', height: '28px' }}>1</button>
            <button style={{ border: '1px solid #cbd5e1', background: 'white', color: '#94a3b8', width: '28px', height: '28px', cursor: 'not-allowed' }}>{'>'}</button>
            <button style={{ border: '1px solid #cbd5e1', background: 'white', color: '#94a3b8', width: '28px', height: '28px', cursor: 'not-allowed' }}>{'>>'}</button>
          </div>
        </div>
      </div>

      <div className="purchase-table-wrapper" style={{ marginTop: 0, borderRadius: '0 0 8px 8px' }}>
        <table className="purchase-table">
          <thead>
            <tr>
              <th>Req Sr No.</th>
              <th>Req. Date</th>
              <th>Project Name</th>
              <th>Material Name</th>
              <th>Unit</th>
              <th>Reqd Date</th>
              <th style={{ textAlign: 'right' }}>Req Qty</th>
              <th style={{ textAlign: 'right' }}>Approved Qty</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.map((req, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td style={{ color: '#0284c7', fontWeight: 500 }}>{req.reqNo} ↓</td>
                <td>{req.date}</td>
                <td>{req.project}</td>
                <td style={{ color: '#0284c7', fontWeight: 500 }}>
                  {req.material} ↓ <Info size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                </td>
                <td>{req.unit}</td>
                <td>{req.reqdDate}</td>
                <td style={{ textAlign: 'right' }}>{req.reqQty}</td>
                <td style={{ textAlign: 'right' }}>{req.appQty}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: '#22c55e', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {req.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Copy size={16} className="action-icon" style={{ color: '#10b981' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
