'use client';
import React, { useState } from 'react';
import { User, Save, Trash2 } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function SkillsPage() {
  const [skills, setSkills] = useState([
    { id: 1, name: 'Ability to get along with people Skills', description: '' },
    { id: 2, name: 'Analytical Skills', description: '' },
    { id: 3, name: 'Communication Skills', description: '' },
    { id: 4, name: 'Computer Skills', description: '' },
    { id: 5, name: 'Confidence Skills', description: '' },
    { id: 6, name: 'Flexibility & Open Mindedness Skills', description: '' },
    { id: 7, name: 'Follow Up Skills', description: '' },
    { id: 8, name: 'Hiring Skills', description: '' },
    { id: 9, name: 'Integrity Skills', description: '' },
    { id: 10, name: 'Interpersonal Skills', description: '' },
    { id: 11, name: 'Leadership Skills', description: '' },
    { id: 12, name: 'Listening Skills', description: '' },
    { id: 13, name: 'Organizational Skills', description: '' },
    { id: 14, name: 'PayRolls Skills', description: '' },
    { id: 15, name: 'Planning Skills', description: '' },
    { id: 16, name: 'Positive thinking', description: '' },
  ]);

  const [activeSkillId, setActiveSkillId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

  const showDialog = (type, title, message, onConfirm = null) => {
    setDialogConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleSkillClick = (skill) => {
    setActiveSkillId(skill.id);
    setFormData({ name: skill.name, description: skill.description });
  };

  const handleAddSkill = () => {
    setActiveSkillId(null);
    setFormData({ name: '', description: '' });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      showDialog('info', 'Validation Error', 'Skill name is required.', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
      return;
    }

    if (activeSkillId) {
      setSkills(skills.map(s => s.id === activeSkillId ? { ...s, ...formData } : s));
    } else {
      const newId = Date.now();
      setSkills([...skills, { id: newId, ...formData }]);
      setActiveSkillId(newId);
    }
    showDialog('info', 'Success', 'Skill saved successfully!', () => setDialogConfig(prev => ({ ...prev, isOpen: false })));
  };

  const handleDelete = () => {
    if (!activeSkillId) return;
    showDialog('confirm', 'Confirm Delete', 'Are you sure you want to delete this skill?', () => {
      setSkills(skills.filter(s => s.id !== activeSkillId));
      handleAddSkill(); // Reset form
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

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      
      {/* Left List Pane */}
      <div style={{ width: '45%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button 
            onClick={handleAddSkill}
            style={{ padding: '6px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
          >
            Add Skill
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {skills.map(skill => (
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
          ))}
        </div>
      </div>

      {/* Right Details Pane */}
      <div style={{ width: '55%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          Skills Details
        </h3>
        
        <label style={labelStyle}>Name of Skill <span style={{color: '#ef4444'}}>*</span></label>
        <input 
          type="text" 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          style={inputStyle}
          placeholder="Skill"
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
