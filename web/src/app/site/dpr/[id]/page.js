'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Pencil, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function DPRDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const [dpr, setDpr] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [draft, setDraft] = useState({});

	useEffect(() => {
		if (!params?.id) return;
		fetch(`/api/engineering/dpr?id=${encodeURIComponent(params.id)}`)
			.then(async response => {
				if (!response.ok) throw new Error('DPR not found');
				return response.json();
			})
			.then(data => { setDpr(data); setDraft(data); })
			.catch(fetchError => setError(fetchError.message || 'Failed to load DPR'))
			.finally(() => setLoading(false));
	}, [params?.id]);

	if (loading) return <div style={{ padding: '24px' }}>Loading DPR...</div>;
	if (error || !dpr) return <div style={{ padding: '24px' }}>{error || 'DPR not found.'}</div>;

	const formatDate = value => value ? new Date(value).toLocaleDateString('en-GB') : '-';
	const fields = [
		['Project', dpr.project?.name],
		['Date', formatDate(dpr.date)],
		['Shift', dpr.shift],
		['Prepared By', dpr.preparedByName],
		['Status', dpr.status],
		['Weather', dpr.weather],
		['Skilled Labour', dpr.skilledLabour],
		['Unskilled Labour', dpr.unskilledLabour],
		['Total Labour', dpr.totalLabour],
	];
	const updateDraft = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
	const saveDpr = async () => {
		setSaving(true);
		try {
			const response = await fetch('/api/engineering/dpr', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, id: dpr.id }) });
			if (!response.ok) throw new Error((await response.json()).error || 'Failed to save DPR');
			const saved = await response.json();
			setDpr(previous => ({ ...previous, ...saved }));
			setDraft(previous => ({ ...previous, ...saved }));
			setEditing(false);
		} catch (saveError) {
			setError(saveError.message);
		} finally {
			setSaving(false);
		}
	};
	const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#1e293b' };
	const editableField = (label, key, type = 'text') => <div key={label}><div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>{label}</div>{editing ? <input type={type} value={key === 'date' ? String(draft[key] || '').slice(0, 10) : draft[key] ?? ''} onChange={event => updateDraft(key, event.target.value)} style={inputStyle} /> : <div style={{ color: '#1e293b', fontWeight: 600 }}>{key === 'date' ? formatDate(dpr[key]) : dpr[key] || '-'}</div>}</div>;

	return (
		<div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<FileText size={22} color="#1e40af" />
					<h1 style={{ margin: 0, color: '#1e293b' }}>Daily Progress Report</h1>
				</div>
				<div style={{ display: 'flex', gap: '8px' }}>
					{editing ? <button type="button" onClick={saveDpr} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 0, borderRadius: '6px', background: saving ? '#94a3b8' : '#1e40af', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button> : <button type="button" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}><Pencil size={16} /> Edit</button>}
					<button type="button" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}><ArrowLeft size={16} /> Back</button>
				</div>
			</div>

			<div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
					{editing ? <>{editableField('Date', 'date', 'date')}{editableField('Shift', 'shift')}{editableField('Prepared By', 'preparedByName')}{editableField('Status', 'status')}{editableField('Weather', 'weather')}{editableField('Skilled Labour', 'skilledLabour', 'number')}{editableField('Unskilled Labour', 'unskilledLabour', 'number')}</> : fields.map(([label, value]) => <div key={label}><div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>{label}</div><div style={{ color: '#1e293b', fontWeight: 600 }}>{value || '-'}</div></div>)}
				</div>
				{[
					['Work Description', dpr.workDescription],
					['Activities Executed', dpr.activitiesExecuted],
					['Equipment Used', dpr.equipmentUsed],
					['Material Consumed', dpr.materialConsumed],
					['Safety Incidents', dpr.safetyIncidents],
					['Remarks', dpr.remarks],
				].map(([label, value]) => (
					<div key={label} style={{ borderTop: '1px solid #e2e8f0', padding: '14px 0' }}>
						<div style={{ color: '#64748b', fontSize: '12px', marginBottom: '5px' }}>{label}</div>
						{editing ? <textarea value={draft[label.replaceAll(' ', '').replace('WorkDescription', 'workDescription').replace('ActivitiesExecuted', 'activitiesExecuted').replace('EquipmentUsed', 'equipmentUsed').replace('MaterialConsumed', 'materialConsumed').replace('SafetyIncidents', 'safetyIncidents').replace('Remarks', 'remarks')] || ''} onChange={event => updateDraft(label.replaceAll(' ', '').replace('WorkDescription', 'workDescription').replace('ActivitiesExecuted', 'activitiesExecuted').replace('EquipmentUsed', 'equipmentUsed').replace('MaterialConsumed', 'materialConsumed').replace('SafetyIncidents', 'safetyIncidents').replace('Remarks', 'remarks'), event.target.value)} rows={3} style={inputStyle} /> : <div style={{ color: '#334155', whiteSpace: 'pre-wrap' }}>{value || '-'}</div>}
					</div>
				))}
				<div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 0' }}>
					<div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}>Supporting Documents</div>
					{Array.isArray(dpr.attachments) && dpr.attachments.length > 0 ? <div style={{ display: 'grid', gap: '8px' }}>{dpr.attachments.map((attachment, index) => <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none' }}>{attachment.name || `Document ${index + 1}`}</a>)}</div> : <div style={{ color: '#334155' }}>No documents attached.</div>}
				</div>
			</div>
		</div>
	);
}
