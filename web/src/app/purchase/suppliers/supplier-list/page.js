'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, Search, Plus, Edit2, Users } from 'lucide-react';
import '../../purchase.css';
import Link from 'next/link';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/supplier-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchGroups();
  }, []);

  const filteredSuppliers = selectedGroup ? suppliers.filter(s => s.group === selectedGroup) : suppliers;

  const handleSaveGroup = async () => {
    if (newGroup.trim()) {
      try {
        const res = await fetch('/api/supplier-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newGroup.trim() })
        });
        if (res.ok) {
          fetchGroups();
        }
      } catch (error) {
        console.error('Error creating group:', error);
      }
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
          
          <select className="purchase-input" style={{ width: '250px' }} value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
            <option value="">All Groups</option>
            {loadingGroups ? (
              <option disabled>Loading...</option>
            ) : (
              groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)
            )}
          </select>

          <button className="btn-cyan" onClick={() => setShowGroupModal(true)}><Plus size={14} /> Add Group</button>
          <Link href="/purchase/suppliers/add-supplier" style={{ textDecoration: 'none' }}>
            <button className="btn-cyan"><Plus size={14} /> Add Supplier</button>
          </Link>
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
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading suppliers...</td></tr>
            ) : filteredSuppliers.map((sup, idx) => (
              <tr key={sup.id || idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td style={{ color: '#0284c7', fontWeight: 500 }}>{sup.name}</td>
                <td>{sup.group}</td>
                <td>{sup.owner}</td>
                <td>{sup.contactNo || sup.contact}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {sup.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Link href={`/purchase/suppliers/add-supplier?id=${sup.id}`} style={{ color: 'inherit' }}>
                    <Edit2 size={16} className="action-icon" style={{ cursor: 'pointer' }} />
                  </Link>
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
                onClick={handleSaveGroup}
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
