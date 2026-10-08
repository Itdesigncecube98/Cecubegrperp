'use client';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Save, Plus, Trash2, UploadCloud, Landmark, UserRound } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const emptyBank = { bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', state: '', verified: false };
const emptyAlias = { name: '', email: '', contact: '', address: '', pincode: '', pan: '' };
const initialForm = {
  code: '', name: '', legalChequeName: '', groupId: '', company: '', branch: '',
  contactPerson: '', address: '', buildingNo: '', street: '', city: '', district: '', state: '', country: 'Indian', pinCode: '',
  mobile: '', phone: '', email: '', nature: '', vatNo: '', corporateIdNo: '', pan: '', panStatus: '', panRefNo: '',
  itDeclarationStatus: '', taxMasterCode: '', msmeCategory: '', msmeRegistrationNo: '', msmeType: '', msmeActivity: '',
  gstin: '', gstApplicable: false, acCategory1: '', acCategory2: '', acCategory3: '', interestRate: 0, minBalance: 0,
  status: 'Active', remarks: '', serviceTaxNo: '', tinNo: '', cstNo: '', localBodyTaxNo: '',
  bankDetails: [], additionalNames: [], documents: [], openingBalance: '', balanceType: 'Dr',
};

const control = { width: '100%', boxSizing: 'border-box', height: 38, padding: '8px 10px', border: '1px solid #d5dee8', borderRadius: 5, background: '#fff', color: '#344054', font: 'inherit', fontSize: 13 };
const button = { border: '1px solid #d3e0e8', borderRadius: 5, background: '#fff', padding: '7px 10px', color: '#265365', cursor: 'pointer', fontSize: 13, fontWeight: 600 };

function ContractorForm() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [form, setForm] = useState(initialForm);
  const [groups, setGroups] = useState([]);
  const [nationality, setNationality] = useState('Indian');
  const [otherNationality, setOtherNationality] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const groupOptions = useMemo(() => {
    const children = new Map([[null, []]]);
    groups.forEach(group => children.set(group.id, []));
    groups.forEach(group => {
      const parentId = group.parentId ?? null;
      if (children.has(parentId)) children.get(parentId).push(group);
    });
    const result = [];
    const visit = (parentId, depth) => (children.get(parentId) || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(group => {
      result.push({ ...group, depth });
      visit(group.id, depth + 1);
    });
    visit(null, 0);
    return result;
  }, [groups]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/accounts/groups', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load groups.'); return data; }),
      id ? fetch(`/api/accounts/ledgers?id=${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load contractor.'); return data[0] || null; }) : Promise.resolve(null),
    ]).then(([groupData, account]) => {
      if (cancelled) return;
      setGroups(Array.isArray(groupData) ? groupData : []);
      if (account) {
        const storedNationality = String(account.country || '');
        const isIndian = !storedNationality || storedNationality.toLowerCase() === 'indian' || storedNationality.toLowerCase() === 'india';
        setNationality(isIndian ? 'Indian' : 'Other');
        setOtherNationality(isIndian ? '' : storedNationality);
        setForm(current => ({ ...current, ...account, subGroupId: undefined, bankDetails: Array.isArray(account.bankDetails) ? account.bankDetails : [], additionalNames: Array.isArray(account.additionalNames) ? account.additionalNames : [], documents: Array.isArray(account.documents) ? account.documents : [] }));
      }
      else setForm(current => ({ ...current, groupId: params.get('groupId') || params.get('subGroupId') || '' }));
    }).catch(cause => { if (!cancelled) setError(cause.message || 'Unable to load form.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, params]);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateRow = (key, index, field, value) => update(key, form[key].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  const submit = async event => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      if (nationality === 'Other' && !otherNationality.trim()) throw new Error('Please specify the nationality.');
      const response = await fetch('/api/accounts/ledgers', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, country: nationality === 'Indian' ? 'Indian' : otherNationality.trim(), id: id || undefined }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to save contractor / party.');
      router.push('/accounts/ledgers');
    } catch (cause) { setError(cause.message || 'Unable to save contractor / party.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!id || !window.confirm(`Delete contractor / party "${form.name}"?`)) return;
    const response = await fetch(`/api/accounts/ledgers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || 'Unable to delete contractor / party.'); return; }
    router.push('/accounts/ledgers');
  };

  const textField = (label, key, options = {}) => <label key={key} style={{ display: 'grid', gap: 5, minWidth: 0, color: '#455468', fontSize: 12, fontWeight: 500, gridColumn: options.full ? '1 / -1' : options.span ? `span ${options.span}` : undefined }}>{label}{options.select ? <select value={form[key] ?? ''} onChange={event => update(key, event.target.value)} style={control}><option value="">Select</option>{options.select.map(item => <option key={item} value={item}>{item}</option>)}</select> : options.textarea ? <textarea value={form[key] ?? ''} onChange={event => update(key, event.target.value)} rows={2} style={{ ...control, height: 'auto', minHeight: 58, resize: 'vertical' }} /> : <input type={options.type || 'text'} value={form[key] ?? ''} onChange={event => update(key, event.target.value)} style={control} required={options.required} />}</label>;

  const section = (title, children, icon = null) => <section style={{ border: '1px solid #e1e7ee', borderRadius: 7, background: '#fff', marginTop: 12, overflow: 'hidden' }}><div style={{ padding: '9px 12px', borderBottom: '1px solid #e5eaf0', color: '#3d5364', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{icon}{title}</div><div style={{ padding: 13 }}>{children}</div></section>;
  const grid = (children, columns = 4) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 2 ? 260 : 180}px, 1fr))`, gap: '12px 15px' }}>{children}</div>;

  const addDocument = async file => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Each document must be 5 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => update('documents', [...form.documents, { documentType: '', fileName: file.name, fileType: file.type || 'application/octet-stream', fileData: reader.result }]);
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsDataURL(file);
  };

  return <div style={{ minHeight: '100vh', padding: '18px clamp(12px,2vw,28px) 32px', background: '#f4f7fa', color: '#22313f' }}>
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><div style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 7, background: '#e5f4f6', color: '#16879a' }}><Building2 size={18} /></div><div><h1 style={{ margin: 0, fontSize: 21 }}>{id ? 'Edit Contractor / Party' : 'Add Contractor / Party'}</h1><div style={{ marginTop: 2, color: '#718096', fontSize: 12 }}>Chart of Accounts · Group → Subgroup → Contractor</div></div></div>
        <button type="button" onClick={() => router.push('/accounts/ledgers')} style={{ ...button, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={14} /> Back to Chart</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0 2px' }}><button type="button" onClick={() => router.push('/accounts/ledgers')} style={{ ...button, background: '#199fb3', color: '#fff', borderColor: '#199fb3' }}><Plus size={13} /> Manage Groups</button><span style={{ alignSelf: 'center', marginLeft: 8, fontSize: 12, color: '#758497' }}>Choose a group or subgroup before saving this account.</span></div>

      {loading ? <div style={{ padding: 35, textAlign: 'center' }}>Loading…</div> : <form onSubmit={submit}>
        {error && <div role="alert" style={{ marginTop: 10, padding: 10, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>{error}</div>}
        {section('Basic Information', grid(<>
          {textField('Account Name *', 'name', { required: true, span: 2 })}{textField('Legal / Cheque Name', 'legalChequeName', { span: 2 })}
          <label style={{ display: 'grid', gap: 5, color: '#455468', fontSize: 12, fontWeight: 500 }}>Group / Subgroup<select required value={form.groupId} onChange={event => update('groupId', event.target.value)} style={control}><option value="">{groups.length ? 'Select Group or Subgroup' : 'No groups created yet'}</option>{groupOptions.map(group => <option key={group.id} value={group.id}>{'　'.repeat(group.depth)}{group.depth ? '↳ ' : ''}{group.name}</option>)}</select>{!groups.length && !error && <span style={{ color: '#9a5412', fontSize: 11 }}>Create a group first, then return here to select it. <button type="button" onClick={() => router.push('/accounts/ledgers')} style={{ border: 0, background: 'none', padding: 0, color: '#0369a1', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>Manage groups</button></span>}</label>
          {textField('Account Code', 'code')}
        </>, 2), <UserRound size={14} />)}

        {section('Contact Details', grid(<>
          {textField('Contact Person', 'contactPerson')}{textField('Address', 'address')}{textField('Building No', 'buildingNo')}{textField('Street', 'street')}
          {textField('City', 'city')}{textField('District', 'district')}{textField('State', 'state', { select: ['Haryana','Delhi','Uttar Pradesh','Rajasthan','Punjab','Maharashtra','Gujarat','Karnataka','Tamil Nadu','Other'] })}<label style={{ display: 'grid', gap: 5, color: '#455468', fontSize: 12, fontWeight: 500 }}>Nationality<select value={nationality} onChange={event => setNationality(event.target.value)} style={control}><option value="Indian">Indian</option><option value="Other">Other</option></select></label>{nationality === 'Other' && <label style={{ display: 'grid', gap: 5, color: '#455468', fontSize: 12, fontWeight: 500 }}>Please specify nationality<input required value={otherNationality} onChange={event => setOtherNationality(event.target.value)} placeholder="Enter nationality" style={control} /></label>}
          {textField('PIN Code', 'pinCode')}{textField('Mobile No', 'mobile', { type: 'tel' })}{textField('Phone No', 'phone', { type: 'tel' })}{textField('Email', 'email', { type: 'email' })}
        </>, 4))}

        {section('Legal Details', grid(<>
          {textField('Nature', 'nature', { select: ['Company','Individual','Partnership','Proprietorship','LLP','Trust','HUF','Other'] })}{textField('VAT No', 'vatNo')}{textField('Corporate ID No', 'corporateIdNo')}{textField('PAN No', 'pan')}
          {textField('PAN Status', 'panStatus', { select: ['Select','Valid','Invalid','Pending','Not Applicable'] })}{textField('PAN Ref No', 'panRefNo')}{textField('IT Declaration Status', 'itDeclarationStatus', { select: ['Select','Received','Pending','Not Applicable'] })}{textField('Tax Master Code', 'taxMasterCode')}
          {textField('MSME Category', 'msmeCategory', { select: ['Select','Micro','Small','Medium','Not Registered'] })}{textField('MSME Registration No', 'msmeRegistrationNo')}{textField('MSME Type', 'msmeType', { select: ['Select','Manufacturing','Services','Not Applicable'] })}{textField('MSME Activity', 'msmeActivity')}
          {textField('GST No', 'gstin')}
        </>, 4))}

        {section('Bank Details', <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 7 }}><button type="button" onClick={() => update('bankDetails', [...form.bankDetails, { ...emptyBank }])} style={{ ...button, background: '#199fb3', color: '#fff', borderColor: '#199fb3' }}><Plus size={13} /> Add Bank</button></div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 830, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#1ba5b9', color: '#fff' }}>{['Bank Name','Acc Holder Name','Bank A/C No','IFSC Code','State','Verified','Action'].map(label => <th key={label} style={{ textAlign: 'left', padding: 8 }}>{label}</th>)}</tr></thead><tbody>
            {form.bankDetails.length ? form.bankDetails.map((bank, index) => <tr key={index}>{[['bankName','text'],['accountHolderName','text'],['accountNumber','text'],['ifscCode','text'],['state','text']].map(([key,type]) => <td key={key} style={{ padding: 5 }}><input type={type} value={bank[key] || ''} onChange={event => updateRow('bankDetails', index, key, event.target.value)} style={{ ...control, height: 32 }} /></td>)}<td style={{ padding: 5 }}><input type="checkbox" checked={Boolean(bank.verified)} onChange={event => updateRow('bankDetails', index, 'verified', event.target.checked)} /></td><td><button type="button" onClick={() => update('bankDetails', form.bankDetails.filter((_, rowIndex) => rowIndex !== index))} style={{ ...button, color: '#b42318' }}><Trash2 size={13} /></button></td></tr>) : <tr><td colSpan="7" style={{ padding: 14, textAlign: 'center', color: '#8794a3' }}>No bank details added.</td></tr>}
          </tbody></table></div>
        </> , <Landmark size={14} />)}

        {section('Categories', grid(<>{textField('A/C Category 1', 'acCategory1', { select: ['Contractor','Supplier','Customer','Employee','Other'] })}{textField('A/C Category 2', 'acCategory2', { select: ['Related Party','Domestic','International','Other'] })}{textField('A/C Category 3', 'acCategory3', { select: ['Regular','MSME','Government','Other'] })}</>, 3))}

        {section('Others', grid(<>{textField('Branch Division', 'branch')}{textField('Interest Rate', 'interestRate', { type: 'number' })}{textField('Min Balance', 'minBalance', { type: 'number' })}{textField('Status', 'status', { select: ['Active','Inactive','Blocked'] })}{textField('Remarks', 'remarks', { textarea: true, full: true })}</>, 4))}

        {section('More Information', grid(<>{textField('Service Tax No', 'serviceTaxNo')}{textField('TIN No', 'tinNo')}{textField('CST No', 'cstNo')}{textField('Local Body Tax No', 'localBodyTaxNo')}</>, 4))}

        {section('Additional Names', <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 7 }}><button type="button" onClick={() => update('additionalNames', [...form.additionalNames, { ...emptyAlias }])} style={{ ...button, background: '#199fb3', color: '#fff', borderColor: '#199fb3' }}><Plus size={13} /> Add Name</button></div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#1ba5b9', color: '#fff' }}>{['Name','Email','Contact','Address','Pincode','PAN','Action'].map(label => <th key={label} style={{ textAlign: 'left', padding: 8 }}>{label}</th>)}</tr></thead><tbody>
            {form.additionalNames.length ? form.additionalNames.map((alias, index) => <tr key={index}>{['name','email','contact','address','pincode','pan'].map(key => <td key={key} style={{ padding: 5 }}><input value={alias[key] || ''} onChange={event => updateRow('additionalNames', index, key, event.target.value)} style={{ ...control, height: 32, minWidth: 100 }} /></td>)}<td><button type="button" onClick={() => update('additionalNames', form.additionalNames.filter((_, rowIndex) => rowIndex !== index))} style={{ ...button, color: '#b42318' }}><Trash2 size={13} /></button></td></tr>) : <tr><td colSpan="7" style={{ padding: 14, textAlign: 'center', color: '#8794a3' }}>No additional names added.</td></tr>}
          </tbody></table></div>
        </>)}

        {section('Document Upload', <div style={{ display: 'grid', gap: 10 }}><label style={{ display: 'grid', gap: 6, maxWidth: 360, color: '#455468', fontSize: 12 }}>Select document<input type="file" onChange={event => addDocument(event.target.files?.[0])} style={{ ...control, height: 'auto' }} /></label><div style={{ fontSize: 11, color: '#718096' }}>PDF, image, or office document · maximum 5 MB each</div>{form.documents.map((document, index) => <div key={`${document.fileName}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 8, border: '1px solid #e1e7ee', borderRadius: 5 }}><input placeholder="Document type" value={document.documentType || ''} onChange={event => updateRow('documents', index, 'documentType', event.target.value)} style={{ ...control, maxWidth: 230 }} /><span style={{ flex: 1, minWidth: 150, fontSize: 12, color: '#475569' }}><UploadCloud size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />{document.fileName}</span><button type="button" onClick={() => update('documents', form.documents.filter((_, rowIndex) => rowIndex !== index))} style={{ ...button, color: '#b42318' }}><Trash2 size={13} /></button></div>)}</div>)}

        {section('Opening Balance', grid(<>{textField('Amount', 'openingBalance', { type: 'number' })}{textField('Balance Type', 'balanceType', { select: ['Dr','Cr'] })}</>, 2))}

        <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, padding: '10px 12px', border: '1px solid #dfe6ed', borderRadius: 7, background: 'rgba(255,255,255,.97)', boxShadow: '0 -4px 14px rgba(15,23,42,.05)' }}>{id && <button type="button" onClick={remove} style={{ ...button, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 7, color: '#b42318', borderColor: '#fecaca' }}><Trash2 size={14} /> Delete Contractor</button>}<button type="button" onClick={() => router.push('/accounts/ledgers')} style={button}>Cancel</button><button disabled={saving} style={{ ...button, display: 'flex', alignItems: 'center', gap: 7, color: '#fff', background: '#168da1', borderColor: '#168da1' }}><Save size={14} /> {saving ? 'Saving…' : id ? 'Update Contractor' : 'Save Contractor'}</button></div>
      </form>}
    </div>
  </div>;
}

export default function NewContractor() { return <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}><ContractorForm /></Suspense>; }
