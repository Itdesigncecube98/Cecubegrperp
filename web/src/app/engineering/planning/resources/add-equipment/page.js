'use client';
import React, { useState, Suspense } from 'react';
import { Save, ArrowLeft, Truck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function EquipmentFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const projectId = searchParams.get('projectId');
  
  const [formData, setFormData] = useState({
    equipmentType: '',
    equipmentName: '',
    specification: '',
    linkedActivity: '',
    requiredQty: '',
    unit: 'Nos',
    requiredDate: '',
    rentalRate: '',
    remarks: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.equipmentName || !formData.requiredQty) {
      alert('Equipment Name and Required Qty are required!');
      return;
    }

    try {
      // TODO: Add API call
      alert(editId ? 'Equipment request updated!' : 'Equipment request added!');
      router.push('/engineering/planning/resources');
    } catch (error) {
      console.error(error);
      alert('Failed to save equipment request');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f3e8ff', padding: '8px', borderRadius: '8px', color: '#7c3aed' }}>
            <Truck size={20} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            {editId ? 'Edit Equipment Request' : 'Add Equipment Request'}
          </h1>
        </div>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Equipment Type
            </label>
            <select 
              value={formData.equipmentType}
              onChange={(e) => setFormData({...formData, equipmentType: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">-- Select --</option>
              <option value="Excavator">Excavator</option>
              <option value="Crane">Crane</option>
              <option value="Concrete Mixer">Concrete Mixer</option>
              <option value="JCB">JCB</option>
              <option value="Generator">Generator</option>
              <option value="Welding Machine">Welding Machine</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Equipment Name *
            </label>
            <input 
              type="text" 
              required
              value={formData.equipmentName}
              onChange={(e) => setFormData({...formData, equipmentName: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              placeholder="e.g., 20 Ton Hydraulic Crane"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Specification
            </label>
            <textarea 
              value={formData.specification}
              onChange={(e) => setFormData({...formData, specification: e.target.value})}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              placeholder="Capacity, model, features..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Linked Activity
            </label>
            <input 
              type="text"
              value={formData.linkedActivity}
              onChange={(e) => setFormData({...formData, linkedActivity: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Required Qty *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number"
                required
                value={formData.requiredQty}
                onChange={(e) => setFormData({...formData, requiredQty: e.target.value})}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <select 
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                style={{ width: '100px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="Nos">Nos</option>
                <option value="Days">Days</option>
                <option value="Hours">Hours</option>
                <option value="Shifts">Shifts</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Required Date *
            </label>
            <input 
              type="date"
              required
              value={formData.requiredDate}
              onChange={(e) => setFormData({...formData, requiredDate: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Rental Rate (₹/day)
            </label>
            <input 
              type="number"
              value={formData.rentalRate}
              onChange={(e) => setFormData({...formData, rentalRate: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
              Remarks
            </label>
            <textarea 
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            <Save size={16} /> {editId ? 'Update' : 'Add'} Equipment
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddEquipment() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>}>
      <EquipmentFormContent />
    </Suspense>
  );
}
