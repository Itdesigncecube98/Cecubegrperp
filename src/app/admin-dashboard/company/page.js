'use client';
import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Edit2, Trash2, Shield, Users, Save, X } from 'lucide-react';

export default function CompanySetupPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', legalName: '', gstin: '', pan: '', cin: '', address: '', website: '', email: '', phone: '', status: 'Active' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/company-setup').then(r => r.json());
      setCompanies(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', legalName: '', gstin: '', pan: '', cin: '', address: '', website: '', email: '', phone: '', status: 'Active' }); setModal('add'); };
  const openEdit = (c) => { setSelected(c); setForm({ name: c.name, legalName: c.legalName||'', gstin: c.gstin||'', pan: c.pan||'', cin: c.cin||'', address: c.address||'', website: c.website||'', email: c.email||'', phone: c.phone||'', status: c.status }); setModal('edit'); };

  const handleSave = async () => {
    setSaving(true);
    const url = modal === 'add' ? '/api/admin/company-setup' : `/api/admin/company-setup/${selected.id}`;
    const method = modal === 'add' ? 'POST' : 'PATCH';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    setModal(null);
    load();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={22} color="#10b981" /> Company Setup
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Manage registered companies and their details</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={ghostBtn}><RefreshCw size={14} /></button>
          <button onClick={openAdd} style={primaryBtn}><Plus size={14} /> Add Company</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Company Name', 'Legal Details', 'Contact', 'Users', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.address}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#475569' }}>
                    {c.legalName && <div><span style={{color: '#94a3b8'}}>Legal:</span> {c.legalName}</div>}
                    {c.gstin && <div><span style={{color: '#94a3b8'}}>GST:</span> {c.gstin}</div>}
                    {c.pan && <div><span style={{color: '#94a3b8'}}>PAN:</span> {c.pan}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#475569' }}>
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                    {c.website && <div style={{color: '#10b981'}}>{c.website}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      <Users size={12} /> {c._count?.users || 0}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: c.status === 'Active' ? '#ecfdf5' : '#f8fafc', color: c.status === 'Active' ? '#059669' : '#64748b' }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => openEdit(c)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}><Edit2 size={13} color="#64748b" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{modal === 'add' ? 'Add Company' : 'Edit Company'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}><Field label="Company Name *"><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inp} /></Field></div>
              <div><Field label="Legal Entity Name"><input value={form.legalName} onChange={e => setForm(f => ({...f, legalName: e.target.value}))} style={inp} /></Field></div>
              <div><Field label="GSTIN"><input value={form.gstin} onChange={e => setForm(f => ({...f, gstin: e.target.value}))} style={inp} /></Field></div>
              <div><Field label="PAN"><input value={form.pan} onChange={e => setForm(f => ({...f, pan: e.target.value}))} style={inp} /></Field></div>
              <div><Field label="CIN"><input value={form.cin} onChange={e => setForm(f => ({...f, cin: e.target.value}))} style={inp} /></Field></div>
              <div style={{ gridColumn: '1 / -1' }}><Field label="Address"><textarea value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} style={{...inp, minHeight: 60, resize: 'vertical'}} /></Field></div>
              <div><Field label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} style={inp} /></Field></div>
              <div><Field label="Phone"><input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} style={inp} /></Field></div>
              <div><Field label="Website"><input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} style={inp} /></Field></div>
              <div>
                <Field label="Status">
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={inp}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModal(null)} style={ghostBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={primaryBtn}><Save size={14} /> {saving ? 'Saving…' : 'Save Company'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>{children}</div>;
}

const inp = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };
const primaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghostBtn   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
