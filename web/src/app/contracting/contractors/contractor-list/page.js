'use client';
import React, { useState } from 'react';
import { Search, Plus, UserPlus, Users, Edit2, Home, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../contracting.css';

export default function ContractorList() {
  const router = useRouter();
  
  const [contractors] = useState([
    { id: 1, name: 'Parveen Kumar', group: 'Water Tanker Supplier', phone: '9416996971', mobile: '9416996971', pan: 'HWKPK5771D', status: 'Regular' },
    { id: 2, name: 'Yammanuru Prem Chand Reddy', group: 'Heavy Vehicle Rental Service Provider', phone: '', mobile: '', pan: 'HDYPR4731P', status: 'Regular' },
    { id: 3, name: 'A.G.ELECTRICALS & ENGINEERS', group: 'Electrical Work Contractor', phone: '9873714078', mobile: '9873714078', pan: 'CNBPS4768K', status: 'Regular' },
    { id: 4, name: 'AADCO TESTING & RESEARCH LAB.P.LTD', group: 'Calibration & Testing', phone: '0120-4265545', mobile: '0120-4265545', pan: 'AAMCA6380J', status: 'Regular' },
    { id: 5, name: 'Aarkay Engineers', group: 'Air-conditioning Services', phone: '', mobile: '9818092429', pan: '', status: 'Regular' },
    { id: 6, name: 'Adhunik Automation India', group: 'VFD AMC and Servicing', phone: '', mobile: '+919971696131', pan: 'ABBFA4510B', status: 'Regular' },
    { id: 7, name: 'Aditya Building Maintenance Services', group: 'Building Maintenance', phone: '011-69269897', mobile: '8287668769', pan: 'IYQPS2460J', status: 'Regular' },
    { id: 8, name: 'ADVJ New Media Pvt Ltd', group: 'Misc. Services', phone: '', mobile: '7042111335', pan: 'AAMCA6784E', status: 'Regular' },
    { id: 9, name: 'Afjal Khan', group: 'Solar Service', phone: '', mobile: '7210695048', pan: 'GREPK9817E', status: 'Regular' },
    { id: 10, name: 'Agrawal Infra Power Solutions', group: 'Civil Contractor', phone: '9990666795', mobile: '9990666795', pan: 'CVWPD0082Q', status: 'Regular' },
    { id: 11, name: 'AI AIRCON', group: 'Air-conditioning Services', phone: '9990405884', mobile: '9990405884', pan: 'BCPPK3207D', status: 'Regular' },
    { id: 12, name: 'ALCOFAB ALUMINIUM WORK & SERVICES', group: 'CCTV PA & FA', phone: '', mobile: '7838944039', pan: 'GBOPK7829G', status: 'Regular' },
    { id: 13, name: 'ALI Electrical Solutions', group: 'Electrical Work Contractor', phone: '9911118048', mobile: '9911118048', pan: 'BSQPA7024P', status: 'Regular' },
  ]);

  const handleEdit = () => {
    router.push('/contracting/contractors/add-contractor');
  };

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <Users size={18} />
          Contractor List ( Total : 231 )
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Contractor List
        </div>
      </div>

      <div className="contracting-actions-bar">
        <div className="contracting-filters">
          <input type="text" className="contracting-input" placeholder="Name" />
          <input type="text" className="contracting-input" placeholder="PAN/PIN No." />
          <Search size={20} color="#666" style={{ cursor: 'pointer', marginLeft: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-cyan"><UserPlus size={14} /> Registered Suppliers</button>
          <button className="btn-cyan"><Users size={14} /> Add Group</button>
          <button className="btn-cyan" onClick={handleEdit}><UserPlus size={14} /> Add Contractor</button>
        </div>
      </div>

      <div className="contracting-table-wrapper">
        <table className="contracting-table">
          <thead>
            <tr>
              <th>Contractor Name</th>
              <th>Group</th>
              <th style={{ width: '120px' }}>Phone No</th>
              <th style={{ width: '120px' }}>Mobile No</th>
              <th style={{ width: '140px' }}>PAN/PIN No</th>
              <th style={{ width: '80px' }}>Status</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {contractors.map((c, index) => (
              <tr key={c.id} style={{ backgroundColor: index === 3 ? '#dbeafe' : 'transparent' }}>
                <td style={{ color: '#0ea5e9' }}>{c.name}</td>
                <td>{c.group}</td>
                <td style={{ textAlign: 'right' }}>{c.phone}</td>
                <td style={{ textAlign: 'right' }}>{c.mobile}</td>
                <td>{c.pan}</td>
                <td>{c.status}</td>
                <td style={{ textAlign: 'center' }}>
                  <Edit2 size={14} className="action-icon" onClick={handleEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
