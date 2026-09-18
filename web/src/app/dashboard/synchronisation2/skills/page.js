'use client';
import React, { useState, useEffect } from 'react';
import { User, Save, Trash2, Search } from 'lucide-react';
import Dialog from '@/components/Dialog';
import ActionToolbar from '@/components/ActionToolbar';

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSkillId, setActiveSkillId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/synchronisation2/skills');
      if (response.ok) {
        const result = await response.json();
        setSkills(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const showDialog = (type, title, message, onConfirm = null) => {
    setDialogConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleSkillClick = (skill) => {
    setActiveSkillId(skill.id);
    setFormData({ name: skill.name, description: skill.description || '' });
  };

  const handleAddSkill = () => {
    setActiveSkillId(null);
    setFormData({ name: '', description: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showDialog('info', 'Validation Error', 'Skill name is required.', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
      return;
    }

    try {
      if (activeSkillId) {
        const response = await fetch(`/api/synchronisation2/skills/${activeSkillId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          fetchSkills();
          showDialog('info', 'Success', 'Skill updated successfully!', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
        } else {
          const err = await response.json();
          showDialog('info', 'Error', err.error || 'Failed to update skill', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
        }
      } else {
        const response = await fetch('/api/synchronisation2/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          fetchSkills();
          handleAddSkill(); // Reset form
          showDialog('info', 'Success', 'Skill added successfully!', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
        } else {
          const err = await response.json();
          showDialog('info', 'Error', err.error || 'Failed to add skill', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = () => {
    if (!activeSkillId) return;
    showDialog('confirm', 'Confirm Delete', 'Are you sure you want to delete this skill?', async () => {
      try {
        const response = await fetch(`/api/synchronisation2/skills/${activeSkillId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchSkills();
          handleAddSkill(); // Reset form
        } else {
          const err = await response.json();
          console.error(err.error);
        }
      } catch (error) {
        console.error('Error deleting:', error);
      }
      setDialogConfig(prev => ({ ...prev, isOpen: false }));
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#374151',
    outline: 'none',
    background: '#fff',
    marginBottom: '16px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0ea5e9',
    marginBottom: '4px'
  };

  const filteredSkills = skills.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div>
      <ActionToolbar onReset={() => setSearchTerm('')} shareTitle="Skills Configuration" />

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left List Pane */}
        <div style={{ width: '45%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', width: '60%' }}>
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search skills..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '100%' }} 
              />
            </div>
            <button 
              onClick={handleAddSkill}
              style={{ padding: '6px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
            >
              + New Skill
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</div>
            ) : filteredSkills.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No skills found.</div>
            ) : (
              filteredSkills.map(skill => (
                <div 
                  key={skill.id}
                  onClick={() => handleSkillClick(skill)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: activeSkillId === skill.id ? '#f0f9ff' : '#fff',
                    color: activeSkillId === skill.id ? '#0284c7' : '#334155',
                    fontSize: '13px',
                    fontWeight: activeSkillId === skill.id ? 600 : 400,
                  }}
                >
                  <User size={14} color="#0ea5e9" />
                  {skill.name}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Details Pane */}
        <div style={{ width: '55%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
            {activeSkillId ? 'Edit Skill Details' : 'Add New Skill'}
          </h3>
          
          <label style={labelStyle}>Name of Skill <span style={{color: '#ef4444'}}>*</span></label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            style={inputStyle}
            placeholder="Skill Name"
          />

          <label style={labelStyle}>Description</label>
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            placeholder="Description"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button 
              onClick={handleDelete}
              disabled={!activeSkillId}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '8px 24px', 
                background: activeSkillId ? '#60a5fa' : '#93c5fd', 
                color: '#fff', border: 'none', borderRadius: '4px', 
                fontWeight: 600, fontSize: '13px', 
                cursor: activeSkillId ? 'pointer' : 'not-allowed' 
              }}
            >
              <Trash2 size={16} /> Delete
            </button>
            <button 
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      </div>

      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
