'use client';
import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, RefreshCw, Link as LinkIcon, CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../contracting.css';

export default function ContractorGroupMapping() {
  const router = useRouter();
  
  const [contractors, setContractors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 'CONTRACTOR_TO_GROUP' or 'GROUP_TO_CONTRACTOR'
  const [mode, setMode] = useState('CONTRACTOR_TO_GROUP');
  
  const [selectedMainId, setSelectedMainId] = useState('');
  const [checkedIds, setCheckedIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contRes, groupRes] = await Promise.all([
        fetch('/api/contractors'),
        fetch('/api/contractor-groups')
      ]);
      
      if (contRes.ok && groupRes.ok) {
        setContractors(await contRes.json());
        setGroups(await groupRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // When mode or selected main ID changes, calculate which checkboxes should be checked
  useEffect(() => {
    if (!selectedMainId) {
      setCheckedIds([]);
      return;
    }

    if (mode === 'CONTRACTOR_TO_GROUP') {
      // Find the selected contractor and see which groups it has
      const groupIdsLinked = groups
        .filter(g => g.contractors && g.contractors.some(c => c.id === selectedMainId))
        .map(g => g.id);
      setCheckedIds(groupIdsLinked);
    } else {
      // Find the selected group and see which contractors it has
      const group = groups.find(g => g.id === selectedMainId);
      if (group && group.contractors) {
        setCheckedIds(group.contractors.map(c => c.id));
      } else {
        setCheckedIds([]);
      }
    }
  }, [selectedMainId, mode, groups]);

  const handleToggleMode = () => {
    setMode(prev => prev === 'CONTRACTOR_TO_GROUP' ? 'GROUP_TO_CONTRACTOR' : 'CONTRACTOR_TO_GROUP');
    setSelectedMainId('');
    setCheckedIds([]);
  };

  const handleCheckboxChange = (id) => {
    setCheckedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const targetList = mode === 'CONTRACTOR_TO_GROUP' ? groups : contractors;
    if (checkedIds.length === targetList.length) {
      setCheckedIds([]); // deselect all
    } else {
      setCheckedIds(targetList.map(item => item.id)); // select all
    }
  };

  const handleSave = async () => {
    if (!selectedMainId) {
      alert("Please select a record from the dropdown first.");
      return;
    }

    setSaving(true);
    try {
      if (mode === 'CONTRACTOR_TO_GROUP') {
        // We are updating multiple groups to connect/disconnect them to ONE contractor.
        const updates = groups.map(group => {
          const currentlyHas = group.contractors && group.contractors.some(c => c.id === selectedMainId);
          const shouldHave = checkedIds.includes(group.id);
          
          if (currentlyHas !== shouldHave) {
            let newContractorIds = group.contractors ? group.contractors.map(c => c.id) : [];
            if (shouldHave) {
              newContractorIds.push(selectedMainId);
            } else {
              newContractorIds = newContractorIds.filter(id => id !== selectedMainId);
            }
            return fetch(`/api/contractor-groups`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: group.id, name: group.name, contractorIds: newContractorIds })
            });
          }
          return null;
        }).filter(Boolean);

        await Promise.all(updates);

      } else {
        // Mode: GROUP_TO_CONTRACTOR
        // We are updating ONE group to connect it to multiple contractors.
        const group = groups.find(g => g.id === selectedMainId);
        await fetch(`/api/contractor-groups`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedMainId, name: group.name, contractorIds: checkedIds })
        });
      }

      alert("Mapping saved successfully!");
      await fetchData(); // refresh data to get latest mappings
    } catch (e) {
      console.error(e);
      alert("Error saving mapping.");
    } finally {
      setSaving(false);
    }
  };

  const isContractorMode = mode === 'CONTRACTOR_TO_GROUP';
  const mainList = isContractorMode ? contractors : groups;
  const targetList = isContractorMode ? groups : contractors;
  
  const allSelected = targetList.length > 0 && checkedIds.length === targetList.length;

  return (
    <div className="contracting-container">
      
      {/* Header */}
      <div className="contracting-header" style={{ background: 'white', padding: '16px 24px' }}>
        <div className="contracting-header-title" style={{ fontSize: '1.25rem' }}>
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#17a2b8' }}>
            <LinkIcon size={20} />
          </div>
          Contractor & Group Mapping
        </div>
        
        <button className="btn-cyan" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => router.push('/contracting/contractors/contractor-list')}>
          <ArrowLeft size={16} /> Back to List
        </button>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading data...</div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            
            {/* Toggle Mode */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
              <button 
                onClick={handleToggleMode}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 20px', 
                  borderRadius: '30px', cursor: 'pointer', fontWeight: 600, color: '#334155',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={16} color="#0ea5e9" />
                Interchange Mapping Mode
              </button>
            </div>

            <div style={{ marginBottom: '8px', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
              {isContractorMode ? '1. Select a Contractor' : '1. Select a Group'}
            </div>
            <select 
              className="contracting-input" 
              style={{ width: '100%', padding: '12px', fontSize: '1rem', marginBottom: '32px' }}
              value={selectedMainId}
              onChange={(e) => setSelectedMainId(e.target.value)}
            >
              <option value="">-- Select {isContractorMode ? 'Contractor' : 'Group'} --</option>
              {mainList.map(item => (
                <option key={item.id} value={item.id}>
                  {item.companyName || item.name}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                {isContractorMode ? '2. Assign Groups' : '2. Assign Contractors'}
              </div>
              
              {selectedMainId && targetList.length > 0 && (
                <button 
                  onClick={handleSelectAll}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 600 }}
                >
                  {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {!selectedMainId ? (
              <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
                Please select a {isContractorMode ? 'Contractor' : 'Group'} above to see available assignments.
              </div>
            ) : targetList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
                No {isContractorMode ? 'Groups' : 'Contractors'} found in the database.
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {targetList.map(item => {
                    const isChecked = checkedIds.includes(item.id);
                    return (
                      <label 
                        key={item.id} 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                          borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                          background: isChecked ? '#f0f9ff' : 'white',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ color: isChecked ? '#0ea5e9' : '#cbd5e1' }}>
                          {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(item.id)}
                          style={{ display: 'none' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{item.companyName || item.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            {isContractorMode 
                              ? (item.contractors ? `${item.contractors.length} contractors` : 'No contractors') 
                              : (item.email || item.phone || item.contactNo || 'No contact info')}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-cyan" 
                onClick={handleSave} 
                disabled={!selectedMainId || saving}
                style={{ padding: '12px 32px', fontSize: '1rem', opacity: (!selectedMainId || saving) ? 0.5 : 1 }}
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save Mapping'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
