'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, Plus, Edit2, Users } from 'lucide-react';
import '../../purchase.css';
import Link from 'next/link';

export default function SupplierList() {
  const [suppliers] = useState([
    { name: 'A ONE PRINTING COMPANY', group: 'Printing Job Work', owner: '', contact: '98111 68228', status: 'Regular' },
    { name: 'A to Z Electrotrade India Pvt. Ltd', group: 'Miscellaneous', owner: 'Mr. Ashish Gulati', contact: '0910094194', status: 'Regular' },
    { name: 'A.K. ENTERPRISES', group: 'Electrical Material Supplier', owner: 'Mr. Keshav Puri', contact: '9999944527', status: 'Regular' },
    { name: 'A.N TRADING Co.', group: 'Miscellaneous', owner: 'M/s A.N Trading Co.', contact: '9818547814', status: 'Regular' },
    { name: 'Aaditya Polymers', group: 'Hardware Material Supplier', owner: 'Mr. Sumit', contact: '9934664733', status: 'Regular' },
    { name: 'Aarav Telecom Pvt. Ltd.', group: 'Fibre Cable Accessories', owner: 'Mr. S.K Aggarwal', contact: '011-43028585', status: 'Regular' },
    { name: 'AB Pal Electric Pvt Ltd', group: 'Electrical Material Supplier', owner: 'Mr. Jasmeet', contact: '9811577444, 9711724055', status: 'Regular' },
    { name: 'ABB India Pvt. Ltd.', group: 'Electrical Material Supplier', owner: 'Mr. Anil Gupta', contact: '9810127765', status: 'Regular' },
    { name: 'ABC Transformers Pvt. Ltd.', group: 'Electrical Material Supplier', owner: 'Mr. K K Chauhan', contact: '97188 87707', status: 'Regular' },
  ]);

  const [groups, setGroups] = useState([
    'Printing Job Work',
    'Miscellaneous',
    'Electrical Material Supplier',
    'Hardware Material Supplier',
    'Fibre Cable Accessories'
  ]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  const filteredSuppliers = selectedGroup ? suppliers.filter(s => s.group === selectedGroup) : suppliers;

  const handleAddGroup = () => {
    if (newGroup.trim() && !groups.includes(newGroup.trim())) {
      setGroups([...groups, newGroup.trim()]);
      setNewGroup('');
      setShowGroupModal(false);
    }
  };

  return (
    <div className="purchase-container">
      
      <div className="purchase-header">
        <div className="purchase-header-title">
          <Users size={18} />
          Supplier List (Total : 480)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Supplier List
        </div>
      </div>

      <div className="purchase-actions-bar">
        <div className="purchase-filters">
          <div style={{ position: 'relative' }}>
            <input type="text" className="purchase-input" placeholder="Search" style={{ width: '200px' }} />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          
          <select className="purchase-input" style={{ width: '180px' }} value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            <option value="">All Groups</option>
            {groups.map((g, idx) => <option key={idx} value={g}>{g}</option>)}
          </select>

          <button className="btn-cyan" onClick={() => setShowGroupModal(true)}><Plus size={14} /> Add Group</button>
          <Link href="/purchase/suppliers/add-supplier" style={{ textDecoration: 'none' }}>
            <button className="btn-cyan"><Plus size={14} /> Add Supplier</button>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          <span>Show Rows:</span>
          <select className="purchase-input" style={{ width: '60px' }}>
            <option>40</option>
          </select>
          <span>Page 1 of 12</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={{ border: 'none', background: '#17a2b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>1</button>
            <button style={{ border: 'none', background: '#e2e8f0', color: '#64748b', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>2</button>
            <button style={{ border: 'none', background: '#e2e8f0', color: '#64748b', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>3</button>
            <span style={{ margin: '0 4px', color: '#94a3b8' }}>...</span>
            <button style={{ border: 'none', background: '#17a2b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="purchase-table-wrapper">
        <table className="purchase-table">
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Group</th>
              <th>Owner/Contact Person</th>
              <th style={{ width: '150px' }}>Contact No</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((sup, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td style={{ color: '#0284c7', fontWeight: 500 }}>{sup.name}</td>
                <td>{sup.group}</td>
                <td>{sup.owner}</td>
                <td>{sup.contact}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {sup.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Edit2 size={16} className="action-icon" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#17a2b8', fontSize: '1.2rem', fontWeight: 600 }}>Add New Group</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Group Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text" 
                className="purchase-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => { setShowGroupModal(false); setNewGroup(''); }} 
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                className="btn-cyan" 
                onClick={handleAddGroup}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Save Group
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
