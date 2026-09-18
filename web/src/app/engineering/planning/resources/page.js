'use client';
import React, { useState, useEffect } from 'react';
import { Users, Package, Truck, Plus, Save, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ResourcePlan() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useState('Manpower');
  
  const [manpowerData, setManpowerData] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [equipmentData, setEquipmentData] = useState([]);

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/engineering/projects');
      if (res.ok) setProjects(await res.json());
    }
    loadProjects();
  }, []);

  const handleDelete = (type, id) => {
    if (!confirm(`Delete this ${type} request?`)) return;
    
    if (type === 'Manpower') {
      setManpowerData(manpowerData.filter(item => item.id !== id));
    } else if (type === 'Material') {
      setMaterialData(materialData.filter(item => item.id !== id));
    } else if (type === 'Equipment') {
      setEquipmentData(equipmentData.filter(item => item.id !== id));
    }
    alert(`${type} request deleted successfully`);
  };

  const getAddButtonLink = () => {
    if (activeTab === 'Manpower') return `/engineering/planning/resources/add-manpower?projectId=${selectedProjectId}`;
    if (activeTab === 'Material') return `/engineering/planning/resources/add-material?projectId=${selectedProjectId}`;
    if (activeTab === 'Equipment') return `/engineering/planning/resources/add-equipment?projectId=${selectedProjectId}`;
    return '#';
  };

  const getCurrentData = () => {
    if (activeTab === 'Manpower') return manpowerData;
    if (activeTab === 'Material') return materialData;
    if (activeTab === 'Equipment') return equipmentData;
    return [];
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Resource Plan</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Plan Manpower, Material, and Equipment requirements</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
          <Save size={16} /> Publish Plan
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
        <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Select Project *</label>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="">-- Choose Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
          </select>
        </div>

        {selectedProjectId && (
          <>
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <button 
                onClick={() => setActiveTab('Manpower')}
                style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'Manpower' ? '2px solid #7c3aed' : '2px solid transparent', color: activeTab === 'Manpower' ? '#7c3aed' : '#64748b', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} /> Manpower
              </button>
              <button 
                onClick={() => setActiveTab('Material')}
                style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'Material' ? '2px solid #7c3aed' : '2px solid transparent', color: activeTab === 'Material' ? '#7c3aed' : '#64748b', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} /> Material
              </button>
              <button 
                onClick={() => setActiveTab('Equipment')}
                style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'Equipment' ? '2px solid #7c3aed' : '2px solid transparent', color: activeTab === 'Equipment' ? '#7c3aed' : '#64748b', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} /> Equipment
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href={getAddButtonLink()} style={{ textDecoration: 'none' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#7c3aed', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}>
                  <Plus size={14} /> Add {activeTab} Request
                </button>
              </Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Category / Item</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Linked Activity</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Required Qty</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Required Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentData().length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No {activeTab} plan created yet.</td>
                  </tr>
                ) : (
                  getCurrentData().map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>{item.name}</td>
                      <td style={{ padding: '16px', color: '#334155' }}>{item.activity}</td>
                      <td style={{ padding: '16px', color: '#334155' }}>{item.quantity} {item.unit}</td>
                      <td style={{ padding: '16px', color: '#475569' }}>{item.date}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => window.location.href = `${getAddButtonLink()}&id=${item.id}`} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Edit2 size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(activeTab, item.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
