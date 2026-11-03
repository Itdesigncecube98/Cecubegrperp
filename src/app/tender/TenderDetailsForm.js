'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Plus, Save, Trash2 } from 'lucide-react';

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
  tenderOpeningDate: '',
  tenderClosingDate: '',
  tenderLocation: '',
  kindlyAttention: '',
  faceToFaceMeetings: [],
  paymentStructure: [],
  paymentRevisions: [],
  paymentRevisionEffectiveDate: '',
  paymentRevisionRemarks: '',
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
  { name: 'tenderNo', label: 'Tender No (auto-generated)', readOnly: true },
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
  { name: 'hsnSacCode', label: 'HSN / SAC Code (auto-generated placeholder)' },
  { name: 'enquiryNo', label: 'Enquiry No', readOnly: true }
];

const KEY_DATES = [
  { name: 'tenderDate', label: 'Tender Date' },
  { name: 'tenderOpeningDate', label: 'Tender Opening Date' },
  { name: 'tenderClosingDate', label: 'Tender Closing Date' },
  { name: 'purchaseTillDate', label: 'Purchase Till Date' },
  { name: 'purchaseDate', label: 'Purchase Date' },
  { name: 'bidSubLastDate', label: 'Submission Date' },
  { name: 'presentationDate', label: 'Presentation Date' },
  { name: 'techOpeningDate', label: 'Technical Opening Date' },
  { name: 'finOpeningDate', label: 'Financial Opening Date' }
];

function EmployeeMultiSelect({ employees, selectedIds, onChange, label }) {
  const allSelected = employees.length > 0 && selectedIds.length === employees.length;
  return (
    <label className="tnd-detail-field wide">
      <span>{label}</span>
      <select
        multiple
        size={Math.min(Math.max(employees.length, 4), 8)}
        value={selectedIds}
        onChange={event => onChange(Array.from(event.target.selectedOptions, option => option.value))}
      >
        {employees.map(employee => (
          <option key={employee.id} value={employee.id}>{employee.name}</option>
        ))}
      </select>
      <button
        className="tnd-btn tnd-btn-outline"
        type="button"
        onClick={() => onChange(allSelected ? [] : employees.map(employee => employee.id))}
        style={{ justifySelf: 'start' }}
      >
        {allSelected ? 'Clear employees' : 'Select all employees'}
      </button>
    </label>
  );
}

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
          readOnly={field.readOnly}
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

function EditableTable({ columns, rows, onChange, onRemove, emptyText, addLabel, onAdd, employees = [] }) {
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
                    {column.readOnly ? row[column.name] : column.optionsKey === 'employees' ? (
                      <select value={row[column.name] ?? ''} onChange={event => onChange(index, column.name, event.target.value)}>
                        <option value="">Select employee</option>
                        {employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                        {row[column.name] && !employees.some(employee =>
                          employee.id === row[column.name] || employee.name?.toLocaleLowerCase() === String(row[column.name]).toLocaleLowerCase()
                        ) && <option value={row[column.name]}>{row[column.name]}</option>}
                      </select>
                    ) : column.options ? (
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
  const [boqLibraries, setBoqLibraries] = useState([]);
  const [boqLibraryRetry, setBoqLibraryRetry] = useState(0);
  const [boqLibraryId, setBoqLibraryId] = useState('');
  const [boqTaskGroups, setBoqTaskGroups] = useState([]);
  const [boqTaskLoading, setBoqTaskLoading] = useState(false);
  const [boqTaskError, setBoqTaskError] = useState('');
  const [selectedBoqTaskId, setSelectedBoqTaskId] = useState('');
  const [boqResourceEditor, setBoqResourceEditor] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [numberingReady, setNumberingReady] = useState(!isNew);
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
        const selectedEmployeeFields = ['tenderManagerCategory', 'tenderManagerId', 'kindlyAttention'];
        const defaults = { ...DEFAULT_DETAILS, ...(tender?.details || {}) };
        for (const field of selectedEmployeeFields) {
          const value = defaults[field];
          if (!value) continue;
          const employee = availableEmployees.find(option =>
            option.id === value || option.name?.toLocaleLowerCase() === String(value).toLocaleLowerCase()
          );
          if (employee) {
            defaults[field] = employee.id;
          } else {
            availableEmployees.push({ id: value, name: value });
          }
        }
        defaults.faceToFaceMeetings = (Array.isArray(defaults.faceToFaceMeetings) ? defaults.faceToFaceMeetings : [])
          .map(meeting => {
            const value = meeting.kindlyAttention;
            if (!value) return meeting;
            const employee = availableEmployees.find(option =>
              option.id === value || option.name?.toLocaleLowerCase() === String(value).toLocaleLowerCase()
            );
            if (employee) return { ...meeting, kindlyAttention: employee.id };
            availableEmployees.push({ id: value, name: value });
            return meeting;
          });
        defaults.managementTeam = (Array.isArray(defaults.managementTeam) ? defaults.managementTeam : [])
          .map(stage => {
            const value = stage.category;
            if (!value) return stage;
            const employee = availableEmployees.find(option =>
              option.id === value || option.name?.toLocaleLowerCase() === String(value).toLocaleLowerCase()
            );
            if (employee) return { ...stage, category: employee.id };
            availableEmployees.push({ id: value, name: value });
            return stage;
          });
        if (tender?.owner && !availableEmployees.some(option => option.id === tender.owner.id)) {
          availableEmployees.push(tender.owner);
        }
        const core = Object.fromEntries(CORE_FIELDS.map(field => [field, tender?.[field] ?? CORE_DEFAULTS[field] ?? '']));
        for (const field of ['tenderDate', 'publishedDate', 'preBidMeeting', 'bidSubLastDate', 'techOpeningDate', 'finOpeningDate']) {
          core[field] = dateInputValue(core[field]);
        }
        for (const field of ['tenderOpeningDate', 'tenderClosingDate', 'paymentRevisionEffectiveDate', 'purchaseTillDate', 'purchaseDate', 'presentationDate', 'awardedDate', 'expectedCommencementDate']) {
          defaults[field] = dateInputValue(defaults[field]);
        }
        defaults.faceToFaceMeetings = Array.isArray(defaults.faceToFaceMeetings) ? defaults.faceToFaceMeetings : [];
        defaults.paymentStructure = Array.isArray(defaults.paymentStructure) ? defaults.paymentStructure : [];
        defaults.paymentRevisions = Array.isArray(defaults.paymentRevisions) ? defaults.paymentRevisions : [];
        setEmployees(availableEmployees);
        setWarning(employeeResponse.headers.get('X-Data-Stale') === 'true'
          ? 'Using the last available employee list because the database is temporarily unavailable.'
          : employeeResponse.ok ? '' : 'Employee options could not be loaded. Saved employee assignments are still available.');
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
      Promise.all([
        fetch('/api/tender/employees'),
      ])
        .then(async ([employeeResponse]) => {
          if (!employeeResponse.ok) {
            const result = await employeeResponse.json();
            throw new Error(result.error || 'Employee list could not be loaded.');
          }
          const employeeData = await employeeResponse.json();
          if (!active) return;
          setEmployees(Array.isArray(employeeData) ? employeeData : []);
          if (employeeResponse.headers.get('X-Data-Stale') === 'true') {
            setWarning('Using the last available employee list because the database is temporarily unavailable.');
          }
        })
        .catch(loadError => {
          if (active) {
            setWarning(loadError.message || 'Employee list could not be loaded.');
            setError(loadError.message || 'Employee list could not be loaded.');
          }
        });
    } else {
      loadTender();
    }
    return () => { active = false; };
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew) return;
    let active = true;
    setNumberingReady(false);

    async function loadTenderNumbers() {
      try {
        const tenderYear = /^\d{4}-\d{2}-\d{2}$/.test(formData.tenderDate)
          ? Number(formData.tenderDate.slice(0, 4))
          : new Date().getFullYear();
        const response = await fetch(`/api/tender/enquiry-number?year=${tenderYear}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Tender numbers could not be generated.');
        if (!/^TENENQ-\d{4}-\d{4,}$/.test(data.enquiryNo || '') ||
            !new RegExp(`^TNDNO-${tenderYear}-\\d{4,}$`).test(data.tenderNo || '')) {
          throw new Error('Tender numbers could not be generated in the expected format.');
        }
        if (!active) return;
        setFormData(previous => ({
          ...previous,
          tenderNo: data.tenderNo,
          enquiryNo: data.enquiryNo,
          hsnSacCode: previous.hsnSacCode || String(Math.floor(100000 + Math.random() * 900000)),
        }));
        setNumberingReady(true);
      } catch (loadError) {
        if (active) {
          setNumberingReady(false);
          setError(loadError.message || 'Tender numbers could not be generated.');
        }
      }
    }

    loadTenderNumbers();
    return () => { active = false; };
  }, [formData.tenderDate, isNew]);

  useEffect(() => {
    let active = true;
    async function loadBoqLibraries() {
      try {
        const response = await fetch('/api/libraries');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Task Library options could not be loaded (HTTP ${response.status}).`);
        if (!Array.isArray(data)) throw new Error('Library API returned an invalid response.');
        const available = Array.isArray(data) ? data : [];
        if (!active) return;
        setBoqLibraries(available);
        const initialLibrary = available.find(library => library.name?.toLowerCase().includes('electrical')) || available[0];
        setBoqLibraryId(current => current || initialLibrary?.id || '');
        setBoqTaskError(response.headers.get('X-Data-Stale') === 'true'
          ? 'Using the last available library list because the database is temporarily unavailable.'
          : '');
      } catch (loadError) {
        if (active) {
          console.error('Failed to load BOQ Task Libraries:', loadError);
          setBoqTaskError(loadError.message || 'Task Library options could not be loaded.');
        }
      }
    }
    loadBoqLibraries();
    return () => { active = false; };
  }, [boqLibraryRetry]);

  useEffect(() => {
    if (!boqLibraryId) {
      setBoqTaskGroups([]);
      setSelectedBoqTaskId('');
      return;
    }
    let active = true;
    async function loadBoqTasks() {
      setBoqTaskLoading(true);
      setBoqTaskError('');
      try {
        const response = await fetch(`/api/engineering/task-library?libraryId=${encodeURIComponent(boqLibraryId)}&syncWorkOrders=false`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load tasks from this library.');
        if (!active) return;
        const groups = Array.isArray(data) ? data : [];
        setBoqTaskGroups(groups);
        setSelectedBoqTaskId(groups.flatMap(group => group.tasks || [])[0]?.id || '');
      } catch (loadError) {
        if (active) {
          console.error('Failed to load BOQ Task Library tasks:', loadError);
          setBoqTaskError(loadError.message || 'Could not load tasks from this library.');
          setBoqTaskGroups([]);
        }
      } finally {
        if (active) setBoqTaskLoading(false);
      }
    }
    loadBoqTasks();
    return () => { active = false; };
  }, [boqLibraryId]);

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

  const updateMeeting = (index, field, value) => {
    setFormData(previous => ({
      ...previous,
      faceToFaceMeetings: previous.faceToFaceMeetings.map((meeting, meetingIndex) =>
        meetingIndex === index ? { ...meeting, [field]: value } : meeting)
    }));
    setSavedMessage('');
  };

  const addMeeting = () => addRow('faceToFaceMeetings', {
    date: '',
    time: '',
    location: formData.tenderLocation || '',
    kindlyAttention: formData.kindlyAttention || '',
    employeeIds: [],
    remarks: ''
  });

  const addPaymentRevision = () => addRow('paymentStructure', {
    milestone: '',
    rate: '',
    unit: '',
    paymentTerms: '',
    effectiveDate: formData.paymentRevisionEffectiveDate || ''
  });

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
  const availableBoqTasks = useMemo(
    () => boqTaskGroups.flatMap(group => group.tasks || []),
    [boqTaskGroups]
  );
  const selectedBoqTask = availableBoqTasks.find(task => task.id === selectedBoqTaskId) || null;

  function addTaskToBoq() {
    if (!selectedBoqTask) return;
    const materials = (selectedBoqTask.materials || []).map(material => ({
      id: `task-${selectedBoqTask.id}-${material.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: material.name,
      mode: 'task-library',
      taskLibraryTaskId: selectedBoqTask.id,
      taskLibraryTaskName: selectedBoqTask.name,
      perTaskUnit: true,
      unit: material.unit || 'Nos',
      quantity: Number(material.quantity) || 0,
      rate: Number(material.rate) || 0,
      specification: material.specification || '',
      components: (Array.isArray(material.components) && material.components.length
        ? material.components
        : [material]).map((component, index) => ({
          id: component.sourceId || component.id || `${material.id}-component-${index}`,
          name: component.name || material.name,
          groupPath: component.groupPath || '',
          quantity: Number(component.quantity) || 0,
          unit: component.unit || material.unit || 'Nos',
          rate: Number(component.rate) || 0,
          specification: component.specification || '',
        })),
    }));
    const labours = (selectedBoqTask.labours || []).map(labour => ({
      id: `task-${selectedBoqTask.id}-${labour.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: labour.name,
      mode: 'task-library',
      taskLibraryTaskId: selectedBoqTask.id,
      taskLibraryTaskName: selectedBoqTask.name,
      perTaskUnit: true,
      unit: labour.unit || 'Manday',
      quantity: Number(labour.quantity) || 0,
      rate: Number(labour.rate) || 0,
      specification: labour.specification || '',
      components: (Array.isArray(labour.components) ? labour.components : []).map((component, index) => ({
        id: component.sourceId || `${labour.id}-component-${index}`,
        name: component.name || labour.name,
        groupPath: component.groupPath || '',
        quantity: Number(component.quantity) || 0,
        unit: component.unit || labour.unit || 'Manday',
        rate: Number(component.rate) || 0,
        specification: component.specification || '',
      })),
    }));
    if (!materials.length && !labours.length) {
      setBoqTaskError('This task has no attached materials or labour yet.');
      return;
    }
    const estimatedRate = [...materials, ...labours]
      .reduce((sum, resource) => sum + resource.quantity * resource.rate, 0);
    setBoqItems(previous => [...previous, {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      serialNo: String(previous.length + 1),
      description: selectedBoqTask.name,
      unit: selectedBoqTask.unit || 'Job',
      quantity: Number(selectedBoqTask.quantity) || 1,
      clientRate: 0,
      estimatedRate,
      materials,
      labours,
    }]);
    setBoqTaskError('');
  }

  function openBoqResourceEditor(itemIndex, type) {
    setBoqResourceEditor({
      itemIndex,
      type,
      name: '',
      unit: type === 'Material' ? 'Nos' : 'Manday',
      quantity: '1',
      rate: '0',
      specification: '',
    });
  }

  function addBoqResource(event) {
    event.preventDefault();
    if (!boqResourceEditor || !boqResourceEditor.name.trim()) return;
    const quantity = Number(boqResourceEditor.quantity);
    const rate = Number(boqResourceEditor.rate);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) {
      setBoqTaskError('Resource quantity and rate must be valid non-negative numbers.');
      return;
    }
    const field = boqResourceEditor.type === 'Material' ? 'materials' : 'labours';
    const resource = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: boqResourceEditor.name.trim(),
      mode: 'manual',
      perTaskUnit: true,
      unit: boqResourceEditor.unit.trim() || (field === 'materials' ? 'Nos' : 'Manday'),
      quantity,
      rate,
      specification: boqResourceEditor.specification.trim(),
      components: [{
        id: `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: boqResourceEditor.name.trim(),
        quantity,
        unit: boqResourceEditor.unit.trim() || (field === 'materials' ? 'Nos' : 'Manday'),
        rate,
        specification: boqResourceEditor.specification.trim(),
      }],
    };
    setBoqItems(previous => previous.map((item, index) => {
      if (index !== boqResourceEditor.itemIndex) return item;
      const resources = [...(item[field] || []), resource];
      const allResources = field === 'materials' ? [...resources, ...(item.labours || [])] : [...(item.materials || []), ...resources];
      return {
        ...item,
        [field]: resources,
        estimatedRate: allResources.reduce((sum, entry) =>
          sum + Number(entry.quantity || 0) * Number(entry.rate || 0), 0),
      };
    }));
    setBoqResourceEditor(null);
    setBoqTaskError('');
  }

  function updateBoqResource(itemIndex, type, resourceId, field, value) {
    const resourceField = type === 'Material' ? 'materials' : 'labours';
    setBoqItems(previous => previous.map((item, index) => {
      if (index !== itemIndex) return item;
      const resources = (item[resourceField] || []).map(resource => {
        if (resource.id !== resourceId) return resource;
        const updatedValue = field === 'quantity' || field === 'rate'
          ? (value === '' ? '' : Number(value))
          : value;
        const updated = { ...resource, [field]: updatedValue };
        if ((resource.components || []).length <= 1 &&
            (field === 'quantity' || field === 'rate' || field === 'unit' || field === 'specification' || field === 'name')) {
          updated.components = (resource.components || []).map(component => ({
            ...component,
            [field]: updatedValue,
          }));
        }
        return updated;
      });
      const materials = resourceField === 'materials' ? resources : item.materials || [];
      const labours = resourceField === 'labours' ? resources : item.labours || [];
      return {
        ...item,
        [resourceField]: resources,
        estimatedRate: [...materials, ...labours].reduce((sum, entry) =>
          sum + (Number(entry.quantity) || 0) * (Number(entry.rate) || 0), 0),
      };
    }));
  }

  function updateBoqResourceComponent(itemIndex, type, resourceId, componentId, field, value) {
    const resourceField = type === 'Material' ? 'materials' : 'labours';
    const updatedValue = field === 'quantity'
      ? (value === '' ? '' : Number(value))
      : value;
    setBoqItems(previous => previous.map((item, index) => {
      if (index !== itemIndex) return item;
      return {
        ...item,
        [resourceField]: (item[resourceField] || []).map(resource => resource.id !== resourceId ? resource : {
          ...resource,
          components: (resource.components || []).map(component => component.id !== componentId ? component : {
            ...component,
            [field]: updatedValue,
          }),
        }),
      };
    }));
  }

  function removeBoqResource(itemIndex, type, resourceId) {
    const resourceField = type === 'Material' ? 'materials' : 'labours';
    setBoqItems(previous => previous.map((item, index) => {
      if (index !== itemIndex) return item;
      const resources = (item[resourceField] || []).filter(resource => resource.id !== resourceId);
      const materials = resourceField === 'materials' ? resources : item.materials || [];
      const labours = resourceField === 'labours' ? resources : item.labours || [];
      return {
        ...item,
        [resourceField]: resources,
        estimatedRate: [...materials, ...labours].reduce((sum, entry) =>
          sum + (Number(entry.quantity) || 0) * (Number(entry.rate) || 0), 0),
      };
    }));
  }

  const removeBoqItem = index => setBoqItems(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  const updateBoqItem = (index, field, value) => setBoqItems(previous =>
    previous.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: field === 'description' || field === 'unit' ? value : value === '' ? '' : Number(value) }
      : item)
  );

  async function handleSave(event) {
    event.preventDefault();
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(true);
    setError('');
    setSavedMessage('');
    const details = Object.fromEntries(Object.keys(DEFAULT_DETAILS).map(key => [key, formData[key]]));
    const core = Object.fromEntries(CORE_FIELDS.map(key => [key, formData[key]]));
    try {
      const response = await fetch(isNew ? '/api/tender' : `/api/tender/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...core, details, boqItems })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save tender details.');
      if (isNew) {
        const query = new URLSearchParams({ registered: '1' });
        if (result.tenderNo) query.set('tenderNo', result.tenderNo);
        router.replace(`/tender/register?${query.toString()}`);
        return;
      }
      if (Array.isArray(result.boqItems)) setBoqItems(result.boqItems);
      if (result.details) {
        setFormData(previous => ({
          ...previous,
          paymentRevisions: Array.isArray(result.details.paymentRevisions)
            ? result.details.paymentRevisions
            : previous.paymentRevisions,
          paymentRevisionRemarks: '',
        }));
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
      saveInProgress.current = false;
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
          {isNew && (
            <Link href="/tender/register" className="tnd-btn tnd-btn-outline">
              <ArrowLeft size={16} /> Back to Register
            </Link>
          )}
          <button className="tnd-btn tnd-btn-primary" type="submit" disabled={saving || (isNew && !numberingReady)}>
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
            { name: 'location', label: 'Location' },
            { name: 'tenderLocation', label: 'Tender / Meeting Location' },
            { name: 'kindlyAttention', label: 'Kindly Attention (Contact Person)', optionsKey: 'employees' }
          ].map(field => <InputField key={field.name} field={field} value={formData[field.name]} onChange={setField} employees={employees} />)}
        </div>

        <h3 className="tnd-detail-subtitle">Official Information</h3>
        <div className="tnd-detail-grid">
          {OFFICIAL_FIELDS.map(field => <InputField key={field.name} field={field} value={formData[field.name]} onChange={setField} employees={employees} />)}
        </div>
        <p className="tnd-detail-help">HSN / SAC is auto-filled with a random six-digit placeholder and is not tax-validated. Replace it with the approved code before billing.</p>
        <div className="tnd-detail-manager">
          <InputField field={{ name: 'tenderManagerCategory', label: 'Tender Manager Category', optionsKey: 'employees' }} value={formData.tenderManagerCategory} onChange={setField} employees={employees} />
          <InputField field={{ name: 'tenderManagerId', label: 'Tender Manager', optionsKey: 'employees' }} value={formData.tenderManagerId} onChange={setField} employees={employees} />
        </div>
      </Section>

      <Section title="Face-to-Face Meetings">
        <p className="tnd-detail-help">Add each visit separately. Select multiple employees for each meeting, or select everyone.</p>
        {formData.faceToFaceMeetings.map((meeting, index) => (
          <div key={`meeting-${index}`} className="tnd-card" style={{ marginBottom: 12, padding: 16 }}>
            <div className="tnd-detail-grid">
              <InputField field={{ name: 'date', label: 'Meeting Date', type: 'date' }} value={meeting.date} onChange={(field, value) => updateMeeting(index, field, value)} employees={employees} />
              <InputField field={{ name: 'time', label: 'Meeting Time', type: 'time' }} value={meeting.time} onChange={(field, value) => updateMeeting(index, field, value)} employees={employees} />
              <InputField field={{ name: 'location', label: 'Meeting Location' }} value={meeting.location} onChange={(field, value) => updateMeeting(index, field, value)} employees={employees} />
              <InputField field={{ name: 'kindlyAttention', label: 'Kindly Attention / Contact Person', optionsKey: 'employees' }} value={meeting.kindlyAttention} onChange={(field, value) => updateMeeting(index, field, value)} employees={employees} />
              <InputField field={{ name: 'remarks', label: 'Meeting Details / Remarks', type: 'textarea', wide: true }} value={meeting.remarks} onChange={(field, value) => updateMeeting(index, field, value)} employees={employees} />
              <EmployeeMultiSelect
                employees={employees}
                selectedIds={Array.isArray(meeting.employeeIds) ? meeting.employeeIds : []}
                label="Employees attending"
                onChange={value => updateMeeting(index, 'employeeIds', value)}
              />
            </div>
            <button className="tnd-btn tnd-btn-outline" type="button" onClick={() => removeRow('faceToFaceMeetings', index)}>
              <Trash2 size={15} /> Remove meeting
            </button>
          </div>
        ))}
        <button className="tnd-btn tnd-btn-outline tnd-detail-add" type="button" onClick={addMeeting}>
          <Plus size={15} /> Add face-to-face meeting
        </button>
      </Section>

      <Section title="Payment Structure & Rate Revisions">
        <p className="tnd-detail-help">Change a rate or payment milestone and save to keep a dated revision history; previous revisions remain available below.</p>
        <EditableTable
          columns={[
            { name: 'milestone', label: 'Payment Milestone / Item' },
            { name: 'rate', label: 'Rate / Amount', type: 'number' },
            { name: 'unit', label: 'Unit' },
            { name: 'paymentTerms', label: 'Payment Terms' },
            { name: 'effectiveDate', label: 'Effective From', type: 'date' }
          ]}
          rows={formData.paymentStructure}
          onChange={(index, field, value) => updateRows('paymentStructure', index, field, value)}
          onRemove={index => removeRow('paymentStructure', index)}
          emptyText="No payment milestones or rates added."
          addLabel="Add payment milestone"
          onAdd={addPaymentRevision}
        />
        <div className="tnd-detail-grid" style={{ marginTop: 16 }}>
          <InputField field={{ name: 'paymentRevisionEffectiveDate', label: 'Revision Effective Date', type: 'date' }} value={formData.paymentRevisionEffectiveDate} onChange={setField} employees={employees} />
          <InputField field={{ name: 'paymentRevisionRemarks', label: 'Reason for Rate / Payment Change', type: 'textarea' }} value={formData.paymentRevisionRemarks} onChange={setField} employees={employees} />
        </div>
        {!isNew && (
          <div className="tnd-table-wrapper" style={{ marginTop: 16 }}>
            <table className="tnd-table tnd-detail-table">
              <thead><tr><th>Revision</th><th>Changed</th><th>Effective From</th><th>Reason</th><th>Payment Structure Snapshot</th></tr></thead>
              <tbody>
                {[...formData.paymentRevisions].reverse().map((revision, index) => (
                  <tr key={`${revision.changedAt || 'revision'}-${index}`}>
                    <td>R{revision.revisionNumber || index + 1}</td>
                    <td>{revision.changedAt ? new Date(revision.changedAt).toLocaleString() : '—'}</td>
                    <td>{revision.effectiveDate || '—'}</td>
                    <td>{revision.remarks || '—'}</td>
                    <td>{(revision.structure || []).map(row => `${row.milestone || 'Item'}: ${row.rate ?? '—'}${row.unit ? ` / ${row.unit}` : ''}`).join('; ') || 'No rates'}</td>
                  </tr>
                ))}
                {formData.paymentRevisions.length === 0 && <tr><td colSpan="5" className="tnd-text-center tnd-text-muted">No rate revisions recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
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
            { name: 'category', label: 'Employee', optionsKey: 'employees' },
            { name: 'reminder', label: 'Reminder' },
            { name: 'slaDays', label: 'SLA (in days)', type: 'number' },
            { name: 'startDate', label: 'Start Date', type: 'date' },
            { name: 'endDate', label: 'End Date', type: 'date' },
            { name: 'status', label: 'Status', options: ['Yet To Come', 'In Progress', 'Completed', 'Skipped'] }
          ]}
          rows={formData.managementTeam}
          employees={employees}
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
        {isNew && (
          <div style={{ marginTop: 16, padding: 16, border: '1px solid #dbeafe', borderRadius: 8, background: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Add tasks from Task Library</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
              <label style={{ display: 'grid', gap: 5, flex: '1 1 220px' }}>
                <span className="tnd-detail-help">Library</span>
                <select className="tnd-input" value={boqLibraryId} onChange={event => setBoqLibraryId(event.target.value)} disabled={!boqLibraries.length}>
                  {boqLibraries.map(library => <option key={library.id} value={library.id}>{library.name}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, flex: '2 1 300px' }}>
                <span className="tnd-detail-help">Task</span>
                <select className="tnd-input" value={selectedBoqTaskId} onChange={event => setSelectedBoqTaskId(event.target.value)} disabled={boqTaskLoading || !availableBoqTasks.length}>
                  {boqTaskGroups.map(group => (
                    <optgroup key={group.id} label={group.name}>
                      {(group.tasks || []).map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button type="button" className="tnd-btn tnd-btn-outline" onClick={addTaskToBoq} disabled={!selectedBoqTask || boqTaskLoading}>
                <BookOpen size={15} />Add Task to BOQ
              </button>
            </div>
            {boqTaskLoading && <p className="tnd-detail-help" role="status">Loading Task Library tasks…</p>}
            {!boqTaskLoading && boqTaskError && (
              <div className="tnd-detail-error" role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span>{boqTaskError}</span>
                {!boqLibraryId && (
                  <button type="button" className="tnd-btn tnd-btn-outline" onClick={() => setBoqLibraryRetry(value => value + 1)}>
                    Retry
                  </button>
                )}
              </div>
            )}
            {!boqTaskLoading && !boqTaskError && boqLibraryId && availableBoqTasks.length === 0 && (
              <p className="tnd-detail-help">No tasks found in this library.</p>
            )}
            {selectedBoqTask && (
              <div style={{ marginTop: 12, padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <strong>{selectedBoqTask.name}</strong>
                <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
                  {[['Material', selectedBoqTask.materials || []], ['Labour', selectedBoqTask.labours || []]].map(([label, resources]) => (
                    <div key={label} style={{ color: '#475569', fontSize: '0.82rem' }}>
                      <strong>{label}:</strong>{' '}
                      {resources.length
                        ? resources.map(resource => `${resource.name} (${resource.quantity} ${resource.unit || ''} × ₹${Number(resource.rate || 0).toLocaleString('en-IN')})`).join(', ')
                        : 'None attached'}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 600, color: '#0f766e' }}>
                  Estimated resource rate per task unit: {Number([
                    ...(selectedBoqTask.materials || []),
                    ...(selectedBoqTask.labours || []),
                  ].reduce((sum, resource) => sum + (Number(resource.quantity) || 0) * (Number(resource.rate) || 0), 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
              </div>
            )}
            {boqItems.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 14 }}>
                <table className="tnd-table">
                  <thead>
                    <tr><th>Task / BOQ Description</th><th>Unit</th><th>Quantity</th><th>Client Rate</th><th>Estimated Rate</th><th>Resources</th><th /></tr>
                  </thead>
                  <tbody>
                    {boqItems.map((item, index) => (
                      <React.Fragment key={item.id || index}>
                        <tr>
                          <td>{item.description}</td>
                          <td>{item.unit}</td>
                          <td><input aria-label={`${item.description} quantity`} className="tnd-input" type="number" min="0" step="any" value={item.quantity} onChange={event => updateBoqItem(index, 'quantity', event.target.value)} style={{ width: 90 }} /></td>
                          <td><input aria-label={`${item.description} client rate`} className="tnd-input" type="number" min="0" step="any" value={item.clientRate} onChange={event => updateBoqItem(index, 'clientRate', event.target.value)} style={{ width: 110 }} /></td>
                          <td>{Number(item.estimatedRate || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                          <td>{(item.materials || []).length} materials · {(item.labours || []).length} labour</td>
                          <td><button type="button" className="tnd-btn tnd-btn-outline" title="Remove BOQ task" onClick={() => removeBoqItem(index)}><Trash2 size={15} /></button></td>
                        </tr>
                        <tr>
                          <td colSpan={7} style={{ background: '#f8fafc', padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <strong>Task resources</strong>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" className="tnd-btn tnd-btn-outline" onClick={() => openBoqResourceEditor(index, 'Material')}>
                                  <Plus size={14} />Add Material
                                </button>
                                <button type="button" className="tnd-btn tnd-btn-outline" onClick={() => openBoqResourceEditor(index, 'Labour')}>
                                  <Plus size={14} />Add Labour
                                </button>
                              </div>
                            </div>
                            {[['Material', item.materials || []], ['Labour', item.labours || []]].map(([type, resources]) => (
                              <div key={type} style={{ marginTop: 10 }}>
                                <strong style={{ color: type === 'Material' ? '#0369a1' : '#b45309' }}>{type}</strong>
                                {!resources.length && <span style={{ marginLeft: 8, color: '#64748b' }}>None added</span>}
                                {resources.map(resource => (
                                  <div key={resource.id} style={{ marginTop: 6, padding: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.5fr) minmax(70px, .7fr) minmax(80px, .7fr) minmax(90px, .8fr) minmax(100px, 1fr) 36px', gap: 8, alignItems: 'center' }}>
                                      <input aria-label={`${resource.name} name`} className="tnd-input" value={resource.name} onChange={event => updateBoqResource(index, type, resource.id, 'name', event.target.value)} />
                                      <input aria-label={`${resource.name} quantity`} className="tnd-input" type="number" min="0" step="any" value={resource.quantity} onChange={event => updateBoqResource(index, type, resource.id, 'quantity', event.target.value)} />
                                      <input aria-label={`${resource.name} unit`} className="tnd-input" value={resource.unit} onChange={event => updateBoqResource(index, type, resource.id, 'unit', event.target.value)} />
                                      <input aria-label={`${resource.name} rate`} className="tnd-input" type="number" min="0" step="any" value={resource.rate} onChange={event => updateBoqResource(index, type, resource.id, 'rate', event.target.value)} />
                                      <span style={{ textAlign: 'right', fontWeight: 600 }}>{((Number(resource.quantity) || 0) * (Number(resource.rate) || 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                      <button type="button" className="tnd-btn tnd-btn-outline" aria-label={`Remove ${resource.name}`} onClick={() => removeBoqResource(index, type, resource.id)}><Trash2 size={14} /></button>
                                      <input
                                        aria-label={`${resource.name} specification`}
                                        className="tnd-input"
                                        placeholder="Specification / grade"
                                        value={resource.specification || ''}
                                        onChange={event => updateBoqResource(index, type, resource.id, 'specification', event.target.value)}
                                        style={{ gridColumn: '1 / 6' }}
                                      />
                                    </div>
                                    {resource.components?.length > 1 && (
                                      <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 5 }}>
                                        <strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Individual {type.toLowerCase()} items</strong>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 110px 120px', gap: 8, color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                                          <span>MATERIAL</span><span>QUANTITY</span><span>UNIT</span>
                                        </div>
                                        {resource.components.map(component => (
                                          <div key={component.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 110px 120px', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                            <span style={{ fontSize: 13, color: '#334155' }}>{component.name}</span>
                                            <input
                                              aria-label={`${component.name} individual quantity`}
                                              className="tnd-input"
                                              type="number"
                                              min="0"
                                              step="any"
                                              value={component.quantity ?? 0}
                                              onChange={event => updateBoqResourceComponent(index, type, resource.id, component.id, 'quantity', event.target.value)}
                                            />
                                            <input
                                              aria-label={`${component.name} individual unit`}
                                              className="tnd-input"
                                              value={component.unit || (type === 'Material' ? 'Nos' : 'Manday')}
                                              onChange={event => updateBoqResourceComponent(index, type, resource.id, component.id, 'unit', event.target.value)}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {boqResourceEditor && (
              <form onSubmit={addBoqResource} style={{ marginTop: 14, padding: 14, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                <strong>Add {boqResourceEditor.type} to {boqItems[boqResourceEditor.itemIndex]?.description}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                  <input required className="tnd-input" aria-label={`${boqResourceEditor.type} name`} placeholder={`${boqResourceEditor.type} name`} value={boqResourceEditor.name} onChange={event => setBoqResourceEditor(previous => ({ ...previous, name: event.target.value }))} />
                  <input required className="tnd-input" aria-label={`${boqResourceEditor.type} quantity`} type="number" min="0" step="any" placeholder="Quantity per task" value={boqResourceEditor.quantity} onChange={event => setBoqResourceEditor(previous => ({ ...previous, quantity: event.target.value }))} />
                  <input required className="tnd-input" aria-label={`${boqResourceEditor.type} unit`} placeholder="Unit" value={boqResourceEditor.unit} onChange={event => setBoqResourceEditor(previous => ({ ...previous, unit: event.target.value }))} />
                  <input required className="tnd-input" aria-label={`${boqResourceEditor.type} rate`} type="number" min="0" step="any" placeholder="Rate" value={boqResourceEditor.rate} onChange={event => setBoqResourceEditor(previous => ({ ...previous, rate: event.target.value }))} />
                  <input className="tnd-input" aria-label={`${boqResourceEditor.type} specification`} placeholder="Specification / grade (optional)" value={boqResourceEditor.specification} onChange={event => setBoqResourceEditor(previous => ({ ...previous, specification: event.target.value }))} style={{ gridColumn: '1 / 4' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" className="tnd-btn tnd-btn-outline" onClick={() => setBoqResourceEditor(null)}>Cancel</button>
                    <button type="submit" className="tnd-btn tnd-btn-primary">Add {boqResourceEditor.type}</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
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
