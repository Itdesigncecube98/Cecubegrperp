'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

export default function TaxSlab() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Male' },
    { id: 2, name: 'Female' },
    { id: 3, name: 'Senior Citizen' },
    { id: 4, name: 'Optional Scheme' },
    { id: 5, name: 'Super Senior Citizen' },
  ]);

  const [regimes, setRegimes] = useState([]);

  useEffect(() => {
    const savedCategories = localStorage.getItem('tdsCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
    fetchRegimes();
  }, []);

  const fetchRegimes = async () => {
    try {
      const res = await fetch('/api/tax-slabs');
      if (res.ok) {
        const data = await res.json();
        // data from API is array of { id, name, financialYear, brackets: [{...}] }
        // We need to group them by category for the UI
        const formattedRegimes = data.map(regime => {
          const subSlabs = {};
          regime.brackets.forEach(b => {
            if (!subSlabs[b.category]) subSlabs[b.category] = [];
            subSlabs[b.category].push(b);
          });
          return {
            id: regime.id,
            name: regime.name,
            fy: regime.financialYear,
            subSlabs
          };
        });
        setRegimes(formattedRegimes);
      }
    } catch (error) {
      console.error('Failed to fetch regimes:', error);
    }
  };

  const [modal, setModal] = useState({ open: false, mode: 'add' });
  
  // Form State
  const [formRegimeId, setFormRegimeId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formFy, setFormFy] = useState('2025-2026');
  const [formCategory, setFormCategory] = useState('Male');
  const [formBrackets, setFormBrackets] = useState([]);

  const [delModal, setDelModal] = useState({ open: false, regimeId: null, category: null });

  const openAdd = () => { 
    setFormRegimeId(null);
    setFormName('');
    setFormFy('2025-2026');
    setFormCategory(categories.length > 0 ? categories[0].name : '');
    setFormBrackets([{ id: Date.now(), lower: '', upper: '', rate: '' }]);
    setModal({ open: true, mode: 'add' }); 
  };

  const openEdit = (regime, category, brackets) => { 
    setFormRegimeId(regime.id);
    setFormName(regime.name);
    setFormFy(regime.fy);
    setFormCategory(category);
    // clone brackets
    setFormBrackets(JSON.parse(JSON.stringify(brackets)));
    setModal({ open: true, mode: 'edit' }); 
  };

  const openDel = (regimeId, category) => setDelModal({ open: true, regimeId, category });

  const handleAddBracketRow = () => {
    setFormBrackets([...formBrackets, { id: Date.now(), lower: '', upper: '', rate: '' }]);
  };

  const handleRemoveBracketRow = (id) => {
    setFormBrackets(formBrackets.filter(b => b.id !== id));
  };

  const handleBracketChange = (id, field, value) => {
    setFormBrackets(formBrackets.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSave = async () => {
    if (!formName.trim() || formBrackets.length === 0 || !formCategory) {
      alert("Please fill in the required fields and add at least one tax bracket.");
      return;
    }

    const payload = {
      regimeId: formRegimeId,
      name: formName,
      financialYear: formFy,
      category: formCategory,
      brackets: formBrackets.map(b => ({
        lowerLimit: b.lower,
        upperLimit: b.upper || null,
        rate: b.rate
      }))
    };

    try {
      const method = formRegimeId ? 'PUT' : 'POST';
      const res = await fetch('/api/tax-slabs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchRegimes();
        setModal({ open: false });
      } else {
        const err = await res.json();
        alert("Error saving: " + err.error);
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleDelete = async () => {
    const { regimeId, category } = delModal;
    try {
      const res = await fetch('/api/tax-slabs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regimeId, category })
      });
      if (res.ok) {
        fetchRegimes();
        setDelModal({ open: false, regimeId: null, category: null });
      } else {
        const err = await res.json();
        alert("Error deleting: " + err.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Financial Year</label>
          <select defaultValue="2025-2026">
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select defaultValue="">
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-primary"><Search size={14} /> Search</button>
        </div>
      </div>

      <ActionToolbar onReset={() => {}} shareTitle="TDS Tax Slabs" />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Result</span>
        <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Tax Slab</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Tax Regime & FY</th>
              <th style={{ width: '15%' }}>Category</th>
              <th style={{ width: '50%' }}>Income Brackets & Rates</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {regimes.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No tax slabs defined.</td>
              </tr>
            )}
            {regimes.map(regime => (
              Object.entries(regime.subSlabs).map(([category, brackets], index) => (
                <tr key={`${regime.id}-${category}`}>
                  {index === 0 && (
                    <td rowSpan={Object.keys(regime.subSlabs).length} style={{ verticalAlign: 'top', fontWeight: 600, color: '#334155', background: '#f8fafc' }}>
                      <div style={{ marginBottom: 4 }}>{regime.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#0ea5e9' }}>FY: {regime.fy}</div>
                    </td>
                  )}
                  <td style={{ verticalAlign: 'top' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {category}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {brackets.map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px' }}>
                          <span>
                            {b.lowerLimit ? `₹${Number(b.lowerLimit).toLocaleString()}` : '0'} 
                            {b.upperLimit ? ` – ₹${Number(b.upperLimit).toLocaleString()}` : ' & Above'}
                          </span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{b.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="icon-btn edit-btn" onClick={() => openEdit(regime, category, brackets.map(b => ({ id: b.id, lower: b.lowerLimit, upper: b.upperLimit, rate: b.rate }))) }><Pencil size={14} /></button>
                      <button className="icon-btn delete-btn" onClick={() => openDel(regime.id, category)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Tax Slab Category' : 'Edit Tax Slab Category'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Save' : 'Update'} size="lg">
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Regime Name *</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. New Tax Regime"
              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }} />
          </div>
          <div style={{ width: '150px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Financial Year *</label>
            <select value={formFy} onChange={e => setFormFy(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
          <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Category *</label>
            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} disabled={modal.mode === 'edit'}
              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', background: modal.mode === 'edit' ? '#f1f5f9' : 'white' }}>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>Income Brackets</h4>
          <button onClick={handleAddBracketRow} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0ea5e9', border: 'none', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={12} /> Add Bracket
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
          {formBrackets.map((b, index) => (
            <div key={b.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', background: '#f1f5f9', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {index + 1}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {index === 0 && <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Lower Limit (₹)</label>}
                <input type="number" placeholder="0" value={b.lower} onChange={e => handleBracketChange(b.id, 'lower', e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {index === 0 && <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Upper Limit (₹)</label>}
                <input type="number" placeholder="Leave blank if Above" value={b.upper} onChange={e => handleBracketChange(b.id, 'upper', e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>
              <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {index === 0 && <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Rate (%)</label>}
                <input type="number" placeholder="%" value={b.rate} onChange={e => handleBracketChange(b.id, 'rate', e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>
              <div style={{ paddingTop: index === 0 ? '16px' : '0' }}>
                <button onClick={() => handleRemoveBracketRow(b.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={delModal.open} title="Delete Tax Slab Category"
        onClose={() => setDelModal({ open: false, regimeId: null, category: null })} onConfirm={handleDelete}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Are you sure you want to delete the brackets for <strong>{delModal.category}</strong>? This cannot be undone.
        </p>
      </AppModal>
    </div>
  );
}
