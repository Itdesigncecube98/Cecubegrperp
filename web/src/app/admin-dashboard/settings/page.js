'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Save, DollarSign, Mail, MessageSquare, Hash, Bell, Database, RefreshCw } from 'lucide-react';

function Section({ title, icon: Icon, color, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa' }}>
        <Icon size={16} color={color} />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{title}</span>
      </div>
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{desc}</div>}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: value ? '#6366f1' : '#cbd5e1', borderRadius: 24, transition: '0.3s' }}>
          <span style={{ position: 'absolute', height: 18, width: 18, left: value ? 23 : 3, bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.3s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </span>
      </label>
    </div>
  );
}

export default function SystemSettingsPage() {
  const [data,   setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    fetch('/api/admin/system-settings').then(r => r.json()).then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/admin/system-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading system settings…</div>;

  const inp = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={22} color="#6366f1" /> System Settings
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Configure ERP-wide defaults, integrations, and numbering</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: saved ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.3s' }}>
          <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* General */}
      <Section title="General" icon={Settings} color="#6366f1">
        <Field label="Financial Year Start">
          <select value={data.financialYearStart} onChange={e => set('financialYearStart', e.target.value)} style={inp}>
            {['January','April'].map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select value={data.currency} onChange={e => set('currency', e.target.value)} style={inp}>
            {[['INR','₹ Indian Rupee'],['USD','$ US Dollar'],['EUR','€ Euro'],['AED','د.إ UAE Dirham']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Date Format">
          <select value={data.dateFormat} onChange={e => set('dateFormat', e.target.value)} style={inp}>
            {['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD','DD-MM-YYYY'].map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Number Format">
          <select value={data.numberFormat} onChange={e => set('numberFormat', e.target.value)} style={inp}>
            <option value="Indian">Indian (1,00,000)</option>
            <option value="International">International (100,000)</option>
          </select>
        </Field>
        <Field label="Timezone">
          <select value={data.timezone} onChange={e => set('timezone', e.target.value)} style={inp}>
            {['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Europe/London','America/New_York'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </Section>

      {/* GST */}
      <Section title="GST Settings" icon={DollarSign} color="#10b981">
        <Toggle label="GST Enabled" desc="Enable GST calculations across all modules" value={data.gstEnabled} onChange={v => set('gstEnabled', v)} />
        <Field label="GSTIN">
          <input value={data.gstin || ''} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" style={inp} />
        </Field>
        <Field label="GST Filing Frequency">
          <select value={data.gstFilingFrequency} onChange={e => set('gstFilingFrequency', e.target.value)} style={inp}>
            {['Monthly','Quarterly','Annually'].map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>
      </Section>

      {/* SMTP */}
      <Section title="Email (SMTP)" icon={Mail} color="#0ea5e9">
        <Field label="SMTP Host">
          <input value={data.smtpHost || ''} onChange={e => set('smtpHost', e.target.value)} placeholder="smtp.gmail.com" style={inp} />
        </Field>
        <Field label="SMTP Port">
          <input type="number" value={data.smtpPort} onChange={e => set('smtpPort', +e.target.value)} style={inp} />
        </Field>
        <Field label="SMTP Username">
          <input value={data.smtpUser || ''} onChange={e => set('smtpUser', e.target.value)} style={inp} />
        </Field>
        <Field label="SMTP Password">
          <input type="password" value={data.smtpPassword || ''} onChange={e => set('smtpPassword', e.target.value)} style={inp} />
        </Field>
        <Field label="From Name">
          <input value={data.smtpFromName} onChange={e => set('smtpFromName', e.target.value)} style={inp} />
        </Field>
        <Field label="From Email">
          <input type="email" value={data.smtpFromEmail || ''} onChange={e => set('smtpFromEmail', e.target.value)} style={inp} />
        </Field>
        <Toggle label="Use SSL/TLS" value={data.smtpSecure} onChange={v => set('smtpSecure', v)} />
      </Section>

      {/* SMS/WhatsApp */}
      <Section title="SMS & WhatsApp" icon={MessageSquare} color="#25D366">
        <Field label="SMS Gateway">
          <input value={data.smsGateway || ''} onChange={e => set('smsGateway', e.target.value)} placeholder="e.g. Twilio, MSG91" style={inp} />
        </Field>
        <Field label="SMS API Key">
          <input type="password" value={data.smsApiKey || ''} onChange={e => set('smsApiKey', e.target.value)} style={inp} />
        </Field>
        <Field label="WhatsApp API Key">
          <input type="password" value={data.whatsappApiKey || ''} onChange={e => set('whatsappApiKey', e.target.value)} style={inp} />
        </Field>
        <Field label="WhatsApp From Number">
          <input value={data.whatsappFromNumber || ''} onChange={e => set('whatsappFromNumber', e.target.value)} placeholder="+91XXXXXXXXXX" style={inp} />
        </Field>
      </Section>

      {/* Numbering */}
      <Section title="Document Numbering" icon={Hash} color="#f59e0b">
        <Field label="PO Prefix"><input value={data.poPrefix} onChange={e => set('poPrefix', e.target.value)} style={inp} /></Field>
        <Field label="PO Start Number"><input type="number" value={data.poStartNumber} onChange={e => set('poStartNumber', +e.target.value)} style={inp} /></Field>
        <Field label="Employee Prefix"><input value={data.empPrefix} onChange={e => set('empPrefix', e.target.value)} style={inp} /></Field>
        <Field label="Employee Start Number"><input type="number" value={data.empStartNumber} onChange={e => set('empStartNumber', +e.target.value)} style={inp} /></Field>
        <Field label="Invoice Prefix"><input value={data.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value)} style={inp} /></Field>
        <Field label="Invoice Start Number"><input type="number" value={data.invoiceStartNumber} onChange={e => set('invoiceStartNumber', +e.target.value)} style={inp} /></Field>
        <Toggle label="Auto Numbering Enabled" value={data.autoNumberingEnabled} onChange={v => set('autoNumberingEnabled', v)} />
        <Toggle label="Reset Numbering Every Year" value={data.resetNumberingYearly} onChange={v => set('resetNumberingYearly', v)} />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell} color="#8b5cf6">
        <Toggle label="Email Notifications" desc="Send notifications via email" value={data.emailNotifications} onChange={v => set('emailNotifications', v)} />
        <Toggle label="SMS Notifications" desc="Send notifications via SMS" value={data.smsNotifications} onChange={v => set('smsNotifications', v)} />
        <Toggle label="WhatsApp Notifications" desc="Send notifications via WhatsApp" value={data.whatsappNotifications} onChange={v => set('whatsappNotifications', v)} />
      </Section>

      {/* Backup */}
      <Section title="Backup Settings" icon={Database} color="#14b8a6">
        <Toggle label="Auto Backup" desc="Automatically backup the database" value={data.autoBackupEnabled} onChange={v => set('autoBackupEnabled', v)} />
        <Field label="Backup Frequency">
          <select value={data.backupFrequency} onChange={e => set('backupFrequency', e.target.value)} style={inp}>
            {['Daily','Weekly','Monthly'].map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Retain Backups For">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" value={data.backupRetentionDays} onChange={e => set('backupRetentionDays', +e.target.value)} style={{ ...inp, width: 80 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>days</span>
          </div>
        </Field>
      </Section>
    </div>
  );
}
