'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';

const CORE_DEFAULTS = {
  tenderNo: '',
  referenceNo: '',
  title: '',
  authority: '',
  clientName: '',
  projectName: '',
  projectLocation: '',
  tenderType: '',
  tenderValue: '',
  tenderDate: '',
  publishedDate: '',
  preBidMeeting: '',
  bidSubLastDate: '',
  techOpeningDate: '',
  finOpeningDate: '',
  status: 'Evaluation',
  ownerId: '',
  source: ''
};

const CORE_FIELDS = [
  'tenderNo', 'referenceNo', 'title', 'authority', 'clientName', 'projectName',
  'projectLocation', 'tenderType', 'tenderValue', 'tenderDate', 'publishedDate',
  'preBidMeeting', 'bidSubLastDate', 'techOpeningDate', 'finOpeningDate',
  'status', 'ownerId', 'source'
];

const DEFAULT_DETAILS = {
  holdingCompany: '',
  briefDescription: '',
  country: 'India',
  state: '',
  city: '',
  location: '',
  billingType: 'Item Rate',
  engineeringLibrary: '',
  engineeringProject: '',
  revenueAccount: '',
  workCategory: '',
  overheadTemplate: '',
  securityDeposit: '0',
  processingTenderFees: '0',
  emd: '0',
  documentCost: '0',
  period: '12',
  periodUnit: 'Month',
  conceptPlanRequired: 'No',
  priority: '',
  hsnSacCode: '',
  enquiryNo: '',
  tenderManagerCategory: '',
  tenderManagerId: '',
  purchaseTillDate: '',
  purchaseDate: '',
  presentationDate: '',
  proposalValidityDays: '0',
  awardedDate: '',
  awardedAmount: '0',
  loiNumber: '',
  expectedCommencementDate: '',
  managementTeam: [
    { stage: 'Tender Manager', category: '', reminder: '', slaDays: '0', startDate: '', endDate: '', status: 'In Progress' },
    { stage: 'Awarded', category: '', reminder: '', slaDays: '0', startDate: '', endDate: '', status: 'Yet To Come' },
    { stage: 'Under Client Review', category: '', reminder: '', slaDays: '0', startDate: '', endDate: '', status: 'Yet To Come' },
    { stage: 'Not Awarded', category: '', reminder: '', slaDays: '0', startDate: '', endDate: '', status: 'Yet To Come' }
  ],
  eligibilityCriteria: [],
  risks: [
    { category: 'Force Majeure', applicability: 'Not acceptable', acceptability: 'Acceptable', description: '', cost: '0' },
    { category: 'Indemnification', applicability: 'Not acceptable', acceptability: 'Acceptable', description: '', cost: '0' },
    { category: 'Dispute Resolution Clauses', applicability: 'Not acceptable', acceptability: 'Acceptable', description: '', cost: '0' },
    { category: 'Arbitration clause', applicability: 'Not acceptable', acceptability: 'Acceptable', description: '', cost: '0' }
  ],
  submissionKit: [],
  communications: []
};

const CORE_FIELD_CONFIG = [
  { name: 'title', label: 'Tender Title', required: true, wide: true },
  { name: 'tenderNo', label: 'Tender No' },
  { name: 'referenceNo', label: 'Reference No' },
  { name: 'authority', label: 'Authority / Holding Client' },
  { name: 'clientName', label: 'Client Company', required: true },
  { name: 'projectName', label: 'Tender Project', required: true },
  { name: 'tenderType', label: 'Tender Type', options: ['', 'Government', 'PSU', 'Private', 'EPC', 'Supply', 'O&M'] },
  { name: 'tenderValue', label: 'Tender Value', type: 'number' },
  { name: 'projectLocation', label: 'Project Location' },
  { name: 'status', label: 'Status', options: ['Evaluation', 'Bid Preparation', 'Approval Pending', 'Submitted', 'Opening', 'Awarded', 'Lost', 'Cancelled'] },
  { name: 'ownerId', label: 'Tender Owner', optionsKey: 'employees' }
];

const OFFICIAL_FIELDS = [
  { name: 'billingType', label: 'Billing Type', options: ['Item Rate', 'Percentage', 'Lump Sum', 'Cost Plus'] },
  { name: 'engineeringLibrary', label: 'Engineering Library' },
  { name: 'engineeringProject', label: 'Engineering Project' },
  { name: 'revenueAccount', label: 'Revenue Account' },
  { name: 'workCategory', label: 'Work Category' },
  { name: 'overheadTemplate', label: 'Default Overhead Template' },
  { name: 'securityDeposit', label: 'Security Deposit', type: 'number' },
  { name: 'processingTenderFees', label: 'Processing / Tender Fees', type: 'number' },
  { name: 'emd', label: 'EMD (Earnest Money Deposit)', type: 'number' },
  { name: 'documentCost', label: 'Document Cost', type: 'number' },
  { name: 'period', label: 'Period', type: 'number' },
  { name: 'periodUnit', label: 'Period Unit', options: ['Day', 'Week', 'Month', 'Year'] },
  { name: 'conceptPlanRequired', label: 'Concept Plan Required', options: ['Yes', 'No'] },
  { name: 'priority', label: 'Priority', options: ['', 'Low', 'Medium', 'High', 'Critical'] },
  { name: 'hsnSacCode', label: 'HSN / SAC Code' },
  { name: 'enquiryNo', label: 'Enquiry No' }
];

const KEY_DATES = [
  { name: 'tenderDate', label: 'Tender Date' },
  { name: 'purchaseTillDate', label: 'Purchase Till Date' },
  { name: 'purchaseDate', label: 'Purchase Date' },
  { name: 'bidSubLastDate', label: 'Submission Date' },
  { name: 'presentationDate', label: 'Presentation Date' },
  { name: 'techOpeningDate', label: 'Technical Opening Date' },
  { name: 'finOpeningDate', label: 'Financial Opening Date' }
];

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function daysUntil(value) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function InputField({ field, value, onChange, employees, required }) {
  const options = field.optionsKey === 'employees'
    ? [{ value: '', label: 'Select employee' }, ...employees.map(employee => ({ value: employee.id, label: employee.name }))]
    : field.options?.map(option => ({ value: option, label: option || 'Select' }));

  return (
    <label className={`tnd-detail-field ${field.wide ? 'wide' : ''}`}>
      <span>{field.label}{(required || field.required) && <b> *</b>}</span>
      {options ? (
        <select value={value ?? ''} required={required || field.required} onChange={event => onChange(field.name, event.target.value)}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea value={value ?? ''} required={required || field.required} rows={4} onChange={event => onChange(field.name, event.target.value)} />
      ) : (
        <input
          type={field.type || 'text'}
          min={field.type === 'number' ? '0' : undefined}
          step={field.type === 'number' ? 'any' : undefined}
          value={value ?? ''}
          required={required || field.required}
          onChange={event => onChange(field.name, event.target.value)}
        />
      )}
    </label>
  );
}

function Section({ title, children, action }) {
  return (
    <section className="tnd-card tnd-detail-section">
      <div className="tnd-detail-section-header">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="tnd-detail-section-body">{children}</div>
    </section>
  );
}

function EditableTable({ columns, rows, onChange, onRemove, emptyText, addLabel, onAdd }) {
  return (
    <>
      <div className="tnd-table-wrapper">
        <table className="tnd-table tnd-detail-table">
          <thead><tr>{columns.map(column => <th key={column.name}>{column.label}</th>)}<th>Action</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id || row.stage || row.category || 'row'}-${index}`}>
                {columns.map(column => (
                  <td key={column.name}>
                    {column.readOnly ? row[column.name] : column.options ? (
                      <select value={row[column.name] ?? ''} onChange={event => onChange(index, column.name, event.target.value)}>
                        {column.options.map(option => <option key={option} value={option}>{option || 'Select'}</option>)}
                      </select>
                    ) : (
                      <input
                        type={column.type || 'text'}
                        min={column.type === 'number' ? '0' : undefined}
                        step={column.type === 'number' ? 'any' : undefined}
                        value={row[column.name] ?? ''}
                        onChange={event => onChange(index, column.name, event.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td><button className="tnd-icon-btn" type="button" aria-label="Remove row" onClick={() => onRemove(index)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="tnd-text-center tnd-text-muted">{emptyText}</td></tr>}
          </tbody>
        </table>
      </div>
      <button className="tnd-btn tnd-btn-outline tnd-detail-add" type="button" onClick={onAdd}><Plus size={15} />{addLabel}</button>
    </>
  );
}

export default function TenderDetailsForm({ id, isNew = false }) {
  const router = useRouter();
  const [formData, setFormData] = useState({ ...CORE_DEFAULTS, ...DEFAULT_DETAILS });
  const [employees, setEmployees] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [requiredDocumentsText, setRequiredDocumentsText] = useState('');
  const [documentListMessage, setDocumentListMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadTender() {
      try {
        const [tenderResponse, employeeResponse] = await Promise.all([
          isNew ? Promise.resolve(null) : fetch(`/api/tender/${id}`),
          fetch('/api/tender/employees')
        ]);
        if (tenderResponse && !tenderResponse.ok) throw new Error('Could not load tender details.');
        const tender = tenderResponse ? await tenderResponse.json() : null;
        const employeeData = employeeResponse.ok ? await employeeResponse.json() : [];
        const employeeList = Array.isArray(employeeData) ? employeeData : employeeData.employees || [];
        if (!active) return;
        const availableEmployees = [...employeeList];
        const savedManagers = [
          tender?.owner,
          tender?.details?.tenderManagerId
            ? { id: tender.details.tenderManagerId, name: tender.details.tenderManagerId }
            : null
        ].filter(Boolean);
        for (const employee of savedManagers) {
          if (!availableEmployees.some(option => option.id === employee.id)) availableEmployees.push(employee);
        }
        const defaults = { ...DEFAULT_DETAILS, ...(tender?.details || {}) };
        const core = Object.fromEntries(CORE_FIELDS.map(field => [field, tender?.[field] ?? CORE_DEFAULTS[field] ?? '']));
        for (const field of ['tenderDate', 'publishedDate', 'preBidMeeting', 'bidSubLastDate', 'techOpeningDate', 'finOpeningDate']) {
          core[field] = dateInputValue(core[field]);
        }
        for (const field of ['purchaseTillDate', 'purchaseDate', 'presentationDate', 'awardedDate', 'expectedCommencementDate']) {
          defaults[field] = dateInputValue(defaults[field]);
        }
        setEmployees(availableEmployees);
        setWarning(employeeResponse.ok ? '' : 'Employee options could not be loaded. Saved employee assignments are still available.');
        setFormData({ ...core, ...defaults });
        setBoqItems(tender?.boqItems || []);
        setAuditLogs(tender?.auditLogs || []);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load tender details.');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (isNew) {
      fetch('/api/tender/employees')
        .then(async response => {
          if (!response.ok) throw new Error('Employee list could not be loaded.');
          return response.json();
        })
        .then(data => {
          if (active) setEmployees(Array.isArray(data) ? data : []);
        })
        .catch(loadError => {
          if (active) setWarning(loadError.message || 'Employee list could not be loaded.');
        });
    } else {
      loadTender();
    }
    return () => { active = false; };
  }, [id, isNew]);

  const setField = (name, value) => {
    setFormData(previous => ({ ...previous, [name]: value }));
    setSavedMessage('');
  };

  const updateRows = (name, index, field, value) => {
    setFormData(previous => ({
      ...previous,
      [name]: previous[name].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)
    }));
    setSavedMessage('');
  };

  const addRow = (name, row) => setFormData(previous => ({ ...previous, [name]: [...previous[name], row] }));
  const removeRow = (name, index) => setFormData(previous => ({ ...previous, [name]: previous[name].filter((_, rowIndex) => rowIndex !== index) }));

  const addRequiredDocuments = () => {
    const names = requiredDocumentsText
      .split(/\r?\n/)
      .map(name => name.trim())
      .filter(Boolean);
    const existing = new Set(formData.submissionKit.map(item => item.document.trim().toLocaleLowerCase()));
    const uniqueNames = [...new Set(names)].filter(name => {
      const key = name.toLocaleLowerCase();
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });

    if (uniqueNames.length === 0) {
      setDocumentListMessage(names.length ? 'Those documents are already in the checklist.' : 'Enter one document per line.');
      return;
    }

    setFormData(previous => ({
      ...previous,
      submissionKit: [
        ...previous.submissionKit,
        ...uniqueNames.map(document => ({ document, source: 'Required', remarks: '' }))
      ]
    }));
    setRequiredDocumentsText('');
    setDocumentListMessage(`${uniqueNames.length} required document${uniqueNames.length === 1 ? '' : 's'} added.`);
  };

  const eligibleCount = useMemo(
    () => formData.eligibilityCriteria.filter(row => row.compliant === 'Yes').length,
    [formData.eligibilityCriteria]
  );
  const riskTotal = useMemo(
    () => formData.risks.reduce((total, row) => total + (Number(row.cost) || 0), 0),
    [formData.risks]
  );
  const boqTotals = useMemo(() => boqItems.reduce((totals, item) => {
    const quantity = Number(item.quantity) || 0;
    totals.tender += quantity * (Number(item.clientRate) || 0);
    totals.estimated += quantity * (Number(item.estimatedRate) || 0);
    return totals;
  }, { tender: 0, estimated: 0 }), [boqItems]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSavedMessage('');
    const details = Object.fromEntries(Object.keys(DEFAULT_DETAILS).map(key => [key, formData[key]]));
    const core = Object.fromEntries(CORE_FIELDS.map(key => [key, formData[key]]));
    try {
      const response = await fetch(isNew ? '/api/tender' : `/api/tender/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...core, details })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save tender details.');
      if (isNew) {
        router.push(`/tender/${result.id}/details`);
        return;
      }
      setSavedMessage('Tender details saved.');
      setAuditLogs(previous => [{
        id: `saved-${Date.now()}`,
        action: 'DetailsUpdated',
        remarks: 'Tender details saved',
        createdAt: new Date().toISOString()
      }, ...previous].slice(0, 10));
    } catch (saveError) {
      setError(saveError.message || 'Failed to save tender details.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="tnd-card tnd-detail-state">Loading tender details...</div>;
  if (error && !formData.title && !isNew) return <div className="tnd-card tnd-detail-state tnd-detail-error">{error}</div>;

  return (
    <form className="tnd-detail-form" onSubmit={handleSave}>
      <div className="tnd-detail-toolbar">
        <div>
          <h2>{isNew ? 'Register Tender' : 'Tender Details'}</h2>
          <p>{isNew ? 'Enter tender information and complete the registration.' : 'Complete and update tender information.'}</p>
        </div>
        <div className="tnd-detail-save">
          {savedMessage && <span role="status" className="tnd-detail-success">{savedMessage}</span>}
          <button className="tnd-btn tnd-btn-primary" type="submit" disabled={saving}>
            <Save size={16} />{saving ? 'Saving...' : isNew ? 'Register Tender' : 'Save Details'}
          </button>
        </div>
      </div>
      {error && <div className="tnd-detail-error" role="alert">{error}</div>}
      {warning && <div className="tnd-detail-warning" role="status">{warning}</div>}

      <Section title="Tender Information">
        <h3 className="tnd-detail-subtitle">Primary Information</h3>
        <div className="tnd-detail-grid">
          {CORE_FIELD_CONFIG.map(field => (
            <InputField key={field.name} field={field} value={formData[field.name]} onChange={setField} employees={employees} />
          ))}
          <InputField field={{ name: 'holdingCompany', label: 'Holding Company' }} value={formData.holdingCompany} onChange={setField} employees={employees} />
          <InputField field={{ name: 'source', label: 'Tender Source' }} value={formData.source} onChange={setField} employees={employees} />
          <InputField field={{ name: 'briefDescription', label: 'Brief Description / Scope of Work', type: 'textarea', wide: true }} value={formData.briefDescription} onChange={setField} employees={employees} />
          {[
            { name: 'country', label: 'Country' },
            { name: 'state', label: 'State' },
            { name: 'city', label: 'City' },
            { name: 'location', label: 'Location' }
          ].map(field => <InputField key={field.name} field={field} value={formData[field.name]} onChange={setField} employees={employees} />)}
        </div>

        <h3 className="tnd-detail-subtitle">Official Information</h3>
        <div className="tnd-detail-grid">
          {OFFICIAL_FIELDS.map(field => <InputField key={field.name} field={field} value={formData[field.name]} onChange={setField} employees={employees} />)}
        </div>
        <div className="tnd-detail-manager">
          <InputField field={{ name: 'tenderManagerCategory', label: 'Tender Manager Category' }} value={formData.tenderManagerCategory} onChange={setField} employees={employees} />
          <InputField field={{ name: 'tenderManagerId', label: 'Tender Manager', optionsKey: 'employees' }} value={formData.tenderManagerId} onChange={setField} employees={employees} />
        </div>
      </Section>

      <Section title="Key Dates">
        <div className="tnd-table-wrapper">
          <table className="tnd-table tnd-detail-table tnd-key-date-table">
            <thead><tr><th>Date / Milestone</th><th>Date</th><th>Days Remaining</th></tr></thead>
            <tbody>
              {KEY_DATES.map(field => {
                const remaining = daysUntil(formData[field.name]);
                return (
                  <tr key={field.name}>
                    <td>{field.label}{['tenderDate', 'bidSubLastDate'].includes(field.name) && <b> *</b>}</td>
                    <td><input type="date" required={['tenderDate', 'bidSubLastDate'].includes(field.name)} value={formData[field.name] || ''} onChange={event => setField(field.name, event.target.value)} /></td>
                    <td className={remaining !== null && remaining < 0 ? 'tnd-detail-overdue' : 'tnd-detail-days'}>
                      {remaining === null ? '—' : remaining < 0 ? `${Math.abs(remaining)} days overdue` : `${remaining} days`}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>Proposal Validity Days</td>
                <td><input type="number" min="0" value={formData.proposalValidityDays} onChange={event => setField('proposalValidityDays', event.target.value)} /></td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <h3 className="tnd-detail-subtitle">Execution Setup</h3>
        <div className="tnd-detail-grid">
          <InputField field={{ name: 'awardedDate', label: 'Awarded Date', type: 'date' }} value={formData.awardedDate} onChange={setField} employees={employees} />
          <InputField field={{ name: 'awardedAmount', label: 'Awarded Amount', type: 'number' }} value={formData.awardedAmount} onChange={setField} employees={employees} />
          <InputField field={{ name: 'loiNumber', label: 'LOI / Work Order No.' }} value={formData.loiNumber} onChange={setField} employees={employees} />
          <InputField field={{ name: 'expectedCommencementDate', label: 'Expected Commencement Date', type: 'date' }} value={formData.expectedCommencementDate} onChange={setField} employees={employees} />
        </div>
      </Section>

      <Section title="Tender Management Team">
        <EditableTable
          columns={[
            { name: 'stage', label: 'Stage' },
            { name: 'category', label: 'Category' },
            { name: 'reminder', label: 'Reminder' },
            { name: 'slaDays', label: 'SLA (in days)', type: 'number' },
            { name: 'startDate', label: 'Start Date', type: 'date' },
            { name: 'endDate', label: 'End Date', type: 'date' },
            { name: 'status', label: 'Status', options: ['Yet To Come', 'In Progress', 'Completed', 'Skipped'] }
          ]}
          rows={formData.managementTeam}
          onChange={(index, field, value) => updateRows('managementTeam', index, field, value)}
          onRemove={index => removeRow('managementTeam', index)}
          emptyText="No management stages added."
          addLabel="Add stage"
          onAdd={() => addRow('managementTeam', { stage: 'New Stage', category: '', reminder: '', slaDays: '0', startDate: '', endDate: '', status: 'Yet To Come' })}
        />
      </Section>

      <Section title="Eligibility Criteria">
        <p className="tnd-detail-help">Compliant criteria: {eligibleCount} / {formData.eligibilityCriteria.length}</p>
        <EditableTable
          columns={[
            { name: 'criterion', label: 'Qualification Norm' },
            { name: 'compliant', label: 'Compliant', options: ['', 'Yes', 'No', 'Partial'] },
            { name: 'remark', label: 'Remark' }
          ]}
          rows={formData.eligibilityCriteria}
          onChange={(index, field, value) => updateRows('eligibilityCriteria', index, field, value)}
          onRemove={index => removeRow('eligibilityCriteria', index)}
          emptyText="No qualification criteria added."
          addLabel="Add criterion"
          onAdd={() => addRow('eligibilityCriteria', { criterion: '', compliant: '', remark: '' })}
        />
      </Section>

      <Section title={`Risk Analysis · ${Number(riskTotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`}>
        <EditableTable
          columns={[
            { name: 'category', label: 'Risk Category' },
            { name: 'applicability', label: 'Applicability', options: ['Not acceptable', 'Applicable', 'Not applicable'] },
            { name: 'acceptability', label: 'Acceptability', options: ['Acceptable', 'Not acceptable', 'Under review'] },
            { name: 'description', label: 'Description' },
            { name: 'cost', label: 'Cost', type: 'number' }
          ]}
          rows={formData.risks}
          onChange={(index, field, value) => updateRows('risks', index, field, value)}
          onRemove={index => removeRow('risks', index)}
          emptyText="No risks recorded."
          addLabel="Add risk"
          onAdd={() => addRow('risks', { category: '', applicability: 'Not acceptable', acceptability: 'Acceptable', description: '', cost: '0' })}
        />
      </Section>

      <Section title="Tender Submission Kit">
        <p className="tnd-detail-help">Checklist items are saved here.{!isNew && <> Upload and manage files in the <Link href={`/tender/${id}/documents`}>Documents</Link> tab.</>}</p>
        <EditableTable
          columns={[
            { name: 'document', label: 'Document' },
            { name: 'source', label: 'Source / Status', options: ['', 'Required', 'From Master', 'Uploaded', 'Pending'] },
            { name: 'remarks', label: 'Remarks' }
          ]}
          rows={formData.submissionKit}
          onChange={(index, field, value) => updateRows('submissionKit', index, field, value)}
          onRemove={index => removeRow('submissionKit', index)}
          emptyText="No documents in the submission checklist."
          addLabel="Add required document"
          onAdd={() => addRow('submissionKit', { document: '', source: 'Required', remarks: '' })}
        />
        <div className="tnd-detail-bulk-documents">
          <label htmlFor="required-document-list">Add multiple required documents</label>
          <textarea
            id="required-document-list"
            rows={4}
            placeholder={'One document per line\nFor example: EMD proof'}
            value={requiredDocumentsText}
            onChange={event => {
              setRequiredDocumentsText(event.target.value);
              setDocumentListMessage('');
            }}
          />
          <div className="tnd-detail-bulk-documents-footer">
            <span className="tnd-detail-help" role="status">{documentListMessage || 'Enter one document name per line.'}</span>
            <button className="tnd-btn tnd-btn-outline" type="button" onClick={addRequiredDocuments}>
              <Plus size={15} />Add documents
            </button>
          </div>
        </div>
      </Section>

      <Section title="BOQ (Bill of Quantities) Details">
        <div className="tnd-detail-boq">
          <div><span>Items</span><strong>{boqItems.length}</strong></div>
          <div><span>Tender Cost</span><strong>{boqTotals.tender.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong></div>
          <div><span>Estimated Cost</span><strong>{boqTotals.estimated.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong></div>
          {!isNew && <Link className="tnd-btn tnd-btn-outline" href={`/tender/${id}/boq`}>Create / View BOQ</Link>}
        </div>
      </Section>

      <Section title="Tender Communication">
        <EditableTable
          columns={[
            { name: 'date', label: 'Date', type: 'date' },
            { name: 'employee', label: 'Employee Details' },
            { name: 'mode', label: 'Mode', options: ['', 'Email', 'Phone', 'Meeting', 'Portal', 'Other'] },
            { name: 'subject', label: 'Subject' },
            { name: 'remark', label: 'Remark' }
          ]}
          rows={formData.communications}
          onChange={(index, field, value) => updateRows('communications', index, field, value)}
          onRemove={index => removeRow('communications', index)}
          emptyText="No tender communications recorded."
          addLabel="Add communication"
          onAdd={() => addRow('communications', { date: new Date().toISOString().slice(0, 10), employee: '', mode: '', subject: '', remark: '' })}
        />
      </Section>

      {!isNew && <Section title="Audit Trail">
        <div className="tnd-table-wrapper">
          <table className="tnd-table tnd-detail-table">
            <thead><tr><th>Date</th><th>Action</th><th>Remarks</th></tr></thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
                  <td>{log.action}</td>
                  <td>{log.remarks || '—'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && <tr><td colSpan="3" className="tnd-text-center tnd-text-muted">No audit activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>}

      <div className="tnd-detail-bottom-save">
        {savedMessage && <span role="status" className="tnd-detail-success">{savedMessage}</span>}
        <button className="tnd-btn tnd-btn-primary" type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving...' : isNew ? 'Register Tender' : 'Save Details'}</button>
      </div>
    </form>
  );
}
