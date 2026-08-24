'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, Edit2, Trash2, Tag } from 'lucide-react';
import '../../purchase.css';

export default function BrandMaster() {
  const [brands, setBrands] = useState([
    '3M',
    'ABB',
    'ACC Cement',
    'Accord',
    'Adani',
    'Adinath LA',
    'AKG',
    'Anchor',
    'ASHLOK',
    'Asian Paints',
    'Astral',
    'Bangur Cement',
    'BEC',
    'Bosch',
    'Burger',
    'Cellpack',
    'CG',
    'Comet',
    'Commel',
    'Complementary',
    'Concord',
    'concurrent',
    'CP Plus',
    'CRC',
    'Creator Polymer',
    'Crompton Greaves',
    'D-Link',
    'Dewalt'
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const handleSaveBrand = () => {
    if (newBrand.trim()) {
      if (editIndex !== null) {
        const updatedBrands = [...brands];
        updatedBrands[editIndex] = newBrand.trim();
        setBrands(updatedBrands);
      } else {
        setBrands([newBrand.trim(), ...brands]);
      }
      setNewBrand('');
      setShowModal(false);
      setEditIndex(null);
    }
  };

  const handleEdit = (idx) => {
    setEditIndex(idx);
    setNewBrand(brands[idx]);
    setShowModal(true);
  };

  const handleDelete = (idx) => {
    setDeleteIndex(idx);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      const updatedBrands = brands.filter((_, i) => i !== deleteIndex);
      setBrands(updatedBrands);
      setDeleteIndex(null);
    }
  };

  return (
    <div className="purchase-container">
      
      <div className="purchase-header">
        <div className="purchase-header-title">
          <Tag size={18} />
          Brand Master (Total : {brands.length})
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Brand Master
        </div>
      </div>

      <div className="purchase-actions-bar">
        <div className="purchase-filters">
          <div style={{ position: 'relative' }}>
            <input type="text" className="purchase-input" placeholder="Search Brand..." style={{ width: '250px' }} />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button className="btn-cyan" onClick={() => setShowModal(true)}>
            <Tag size={14} /> Add Brand
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          <span>Show Rows:</span>
          <select className="purchase-input" style={{ width: '60px' }}>
            <option>40</option>
          </select>
          <span>Page 1 of 3</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={{ border: 'none', background: '#17a2b8', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>1</button>
            <button style={{ border: 'none', background: '#e2e8f0', color: '#64748b', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>2</button>
            <button style={{ border: 'none', background: '#e2e8f0', color: '#64748b', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }}>3</button>
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
              <th>Brand Name</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td>{brand}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <Edit2 size={16} className="action-icon" onClick={() => handleEdit(idx)} />
                    <Trash2 size={16} className="action-icon" onClick={() => handleDelete(idx)} style={{ color: '#ef4444' }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#17a2b8', fontSize: '1.2rem', fontWeight: 600 }}>{editIndex !== null ? 'Edit Brand' : 'Add New Brand'}</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Brand Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text" 
                className="purchase-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => { setShowModal(false); setNewBrand(''); setEditIndex(null); }} 
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                className="btn-cyan" 
                onClick={handleSaveBrand}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                {editIndex !== null ? 'Update Brand' : 'Save Brand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#ef4444', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={20} /> Delete Brand
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete the brand <strong>"{brands[deleteIndex]}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setDeleteIndex(null)} 
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
