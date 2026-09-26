'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Home, ChevronRight, Search, RefreshCw, FileText, Printer, Save } from 'lucide-react';
import '../../contracting.css';

const printStyles = `
  @page {
    size: A4 portrait;
    margin: 0.5in;
  }

  @media print {
    .sidebar,
    .contracting-header,
    .work-order-filter,
    .work-order-actions {
      display: none !important;
    }

    .sidebar + div {
      margin-left: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      background: #fff !important;
    }

    .sidebar + div > .contracting-container,
    .contracting-container > div {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .sidebar + div > div:first-child {
      display: none !important;
    }

    html,
    body {
      width: 100% !important;
      min-width: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body > div {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }

    .contracting-container {
      display: block !important;
      padding: 0 !important;
      gap: 0 !important;
      min-height: 0 !important;
      background: #fff !important;
    }

    .contracting-container > div {
      flex: none !important;
    }
    .work-order-preview {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .work-order-preview table {
      page-break-inside: auto;
    }

    .work-order-preview thead {
      display: table-header-group;
    }

    .work-order-preview tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .work-order-summary {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .screen-editable {
      display: none !important;
    }

    .print-wrapped-value {
      display: block !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }

    .subject-editable {
      display: none !important;
    }

    .print-subject {
      display: block !important;
      flex: 1 !important;
      min-width: 0 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
      line-height: 1.35 !important;
    }
  }

  .print-wrapped-value {
    display: none;
  }

  .print-subject {
    display: none;
  }
`;

const FormGroup = ({ label, required, children, error }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
    {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>{error}</div>}
  </div>
);

const previewInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid transparent',
  outline: 'none',
  background: 'transparent',
  color: '#334155',
  font: 'inherit',
  padding: '2px 4px',
};

const PreviewInput = ({ value, onChange, multiline = false, style = {}, className = '' }) => {
  const props = {
    className: `contracting-input ${className}`.trim(),
    value: value || '',
    onChange,
    style: { ...previewInputStyle, ...style },
  };
  return multiline ? <textarea {...props} rows={2} /> : <input {...props} />;
};

export default function RaiseWorkOrder() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') || '';
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  const [woSource, setWoSource] = useState('manual'); // 'manual' | 'quotation'
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [filters, setFilters] = useState({
    projectId: '',
    contractorId: '',
    taskIds: [],
    woType: 'New',
  });

  const [showError, setShowError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [woData, setWoData] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  const [tasks, setTasks] = useState([]);
  const [labourRates, setLabourRates] = useState([]);
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);
  
  // Editable items in the Work Order
  const [items, setItems] = useState([
    { id: 1, description: '', qty: 1.00, unit: 'Job', rate: 0, gstPercent: 18 }
  ]);

  // Fetch projects, contractors, tasks, quotations
  useEffect(() => {
    fetch('/api/engineering/projects')
      .then(res => res.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch('/api/contractors')
      .then(res => res.json())
      .then(data => setContractors(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch('/api/contracting/labour/rates')
      .then(res => res.json())
      .then(data => setLabourRates(Array.isArray(data) ? data : []))
      .catch(console.error);

    // Fetch selected quotations
    fetch('/api/contracting/quotation')
      .then(res => res.json())
      .then(data => {
        const quotationList = Array.isArray(data) ? data : [];
        setAllQuotations(quotationList);
        setQuotations(quotationList.filter(q => q.status === 'Selected'));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!filters.projectId) return;
    fetch(`/api/engineering/task-library?projectId=${encodeURIComponent(filters.projectId)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(groups => {
        if (!Array.isArray(groups)) return;
        const taskMap = new Map();
        groups.forEach(group => {
          (group.tasks || []).forEach(task => taskMap.set(task.id, task));
        });
        setTasks(Array.from(taskMap.values()));
      })
      .catch(console.error);
  }, [filters.projectId]);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/contracting/work-orders?id=${editId}`)
      .then(response => response.json())
      .then(records => {
        const record = Array.isArray(records) ? records[0] : records;
        if (!record) return;
        let stored = {};
        try { stored = record.scope ? JSON.parse(record.scope) : {}; } catch { stored = {}; }
        setItems(stored.items || []);
        setWoData({
          ...(stored.preview || {}),
          woNo: record.woNo,
          date: record.startDate ? new Date(record.startDate).toLocaleDateString('en-GB') : '',
          quotationTerms: stored.quotationTerms || {},
        });
        setShowPreview(true);
      })
      .catch(error => setSaveMessage(error.message || 'Failed to load work order.'));
  }, [editId]);

  useEffect(() => {
    if (!searchParams.get('print') || !showPreview || !woData) return undefined;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [searchParams, showPreview, woData]);

  const findLabourRate = (name) => {
    const normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName) return null;
    return labourRates.find(rate => {
      const designation = String(rate.designation || '').trim().toLowerCase();
      return designation === normalizedName || designation.includes(normalizedName) || normalizedName.includes(designation);
    });
  };

  const firstPositiveRate = (...values) => {
    const value = values.find(candidate => Number(candidate) > 0);
    return value === undefined ? 0 : value;
  };

  const findQuotationRate = (name) => {
    const normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName) return null;
    const matchingItems = allQuotations
      .slice()
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
      .flatMap(quotation => quotation.items || [])
      .filter(item => {
        const taskName = String(item.taskName || '').trim().toLowerCase();
        return taskName === normalizedName || taskName.endsWith(` - ${normalizedName}`) || taskName.includes(normalizedName);
      });
    return matchingItems.find(item => Number(item.rate) > 0) || null;
  };

  const findSelectedQuotationRate = (name, quotation) => {
    const normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName || !quotation) return null;
    const matchingItem = (quotation.items || []).find(item => {
      const taskName = String(item.taskName || '').trim().toLowerCase();
      return taskName === normalizedName
        || taskName.endsWith(` - ${normalizedName}`)
        || taskName.includes(normalizedName)
        || normalizedName.includes(taskName);
    });
    return matchingItem && Number(matchingItem.rate) > 0 ? matchingItem : null;
  };

  // When a quotation is selected, auto-populate fields
  const handleQuotationSelect = (quotationId) => {
    setSelectedQuotationId(quotationId);
    const q = quotations.find(x => x.id === quotationId);
    if (!q) return;
    // Auto-fill contractor
    setFilters(f => ({ ...f, contractorId: q.contractorId }));
    // Auto-fill items from quotation
    setItems(q.items.map((item, idx) => ({
      id: idx + 1,
      description: item.taskName,
      qty: item.qty,
      unit: item.unit || 'Job',
      rate: item.rate,
      gstPercent: item.gstPercent,
    })));
  };

  const handleSearch = () => {
    if (!filters.projectId || !filters.contractorId || filters.taskIds.length === 0) {
      setShowError(true);
      return;
    }
    setShowError(false);

    // Map data for preview
    const project = projects.find(p => p.id === filters.projectId) || {};
    const contractor = contractors.find(c => c.id === filters.contractorId) || {};
    const selectedTasks = tasks.filter(task => filters.taskIds.includes(task.id));
    const selectedQuotation = quotations.find(q => q.id === selectedQuotationId);

    const newItems = selectedTasks.flatMap((task, taskIndex) => {
      const taskLabours = (task.labours || []).map((l, itemIndex) => ({
        id: `lab-${taskIndex}-${itemIndex}`,
        description: `${task.name} - ${l.name}`,
        qty: l.quantity || 1.00,
        unit: l.unit || 'Manday',
        rate: firstPositiveRate(
          findSelectedQuotationRate(l.name, selectedQuotation)?.rate,
          findLabourRate(l.name)?.rate,
          findQuotationRate(l.name)?.rate,
          l.rate,
          l.labourRate
        ),
        gstPercent: 18
      }));
      const taskEquipments = (task.equipments || []).map((e, itemIndex) => ({
        id: `eq-${taskIndex}-${itemIndex}`,
        description: `${task.name} - ${e.name}`,
        qty: e.quantity || 1.00,
        unit: e.unit || 'Hour',
        rate: findSelectedQuotationRate(e.name, selectedQuotation)?.rate
          ?? findQuotationRate(e.name)?.rate
          ?? e.rate
          ?? 0,
        gstPercent: 18
      }));
      return [...taskLabours, ...taskEquipments];
    });

    if (newItems.length === 0) {
      newItems.push({ id: 1, description: selectedTasks.map(task => task.name).join(', '), qty: 1.00, unit: 'Job', rate: 0, gstPercent: 18 });
    }
    
    setItems(newItems);

    setWoData({
      projectId: filters.projectId,
      contractorId: filters.contractorId,
      woNo: '26-27/397', // Placeholder/Auto-generated
      date: new Date().toLocaleDateString('en-GB'),
      
      // Contractor Details
      contractorName: contractor.companyName || 'N/A',
      contractorAddress: contractor.address || 'N/A',
      contractorContact: contractor.phone || 'N/A',
      contractorEmail: contractor.email || 'N/A',
      contractorPan: contractor.panNumber || 'N/A',
      contractorGst: contractor.gstNumber || 'N/A',
      
      // Site Details (Project)
      siteName: project.name || 'N/A',
      siteAddress: project.location || 'N/A',
      siteContactPerson: project.projectManager?.name || 'N/A',
      siteContactPhone: project.projectManager?.phone || 'N/A',
      
      // CeCube Details
      companyName: 'CeCube Engineering India Private Limited',
      companyAddress: 'A-121-122, Phase II, New Palam Vihar, Near St. Soldier School, Gurugram, Haryana-122017',
      companyPan: 'AAXCC2203M',
      companyGst: '06AAXCC2203M1ZT',

      quotationTerms: selectedQuotation ? {
        deliveryTerms: selectedQuotation.deliveryTerms,
        paymentTerms: selectedQuotation.paymentTerms,
        materialInspection: selectedQuotation.materialInspection,
        warranty: selectedQuotation.warranty,
        transactionMode: selectedQuotation.transactionMode,
        insurance: selectedQuotation.insurance,
        taxAndDuties: selectedQuotation.taxAndDuties,
        freightCharges: selectedQuotation.freightCharges,
        otherConditions: selectedQuotation.otherConditions,
      } : {},
      
      subject: selectedTasks.map(task => task.name).join(', ') || 'Work Order Subject'
    });

    setShowPreview(true);
  };

  const updatePreviewField = (field, value) => {
    setWoData(previous => ({ ...previous, [field]: value }));
  };

  const updateQuotationTerm = (field, value) => {
    setWoData(previous => ({
      ...previous,
      quotationTerms: { ...previous.quotationTerms, [field]: value },
    }));
  };

  const handleReset = () => {
    setFilters({ projectId: '', contractorId: '', taskIds: [], woType: 'New' });
    setWoSource('manual');
    setSelectedQuotationId('');
    setShowError(false);
    setShowPreview(false);
    setTaskMenuOpen(false);
    setWoData(null);
    setSaveMessage('');
    setItems([{ id: 1, description: '', qty: 1.00, unit: 'Job', rate: 0, gstPercent: 18 }]);
  };

  const handleSaveWorkOrder = async () => {
    if (!woData || !filters.projectId && !editId) {
      setSaveMessage('Select a project before saving the work order.');
      return;
    }
    const payload = {
      id: editId || undefined,
      projectId: filters.projectId || woData.projectId,
      contractorId: filters.contractorId || null,
      contractorName: woData.contractorName,
      contractorPhone: woData.contractorContact,
      contractorGst: woData.contractorGst,
      contractorPan: woData.contractorPan,
      woNo: woData.woNo,
      woDate: (() => {
        const parts = String(woData.date || '').split('/');
        return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : woData.date;
      })(),
      wbsTask: woData.subject,
      contractValue: grandTotal,
      paymentTerms: woData.quotationTerms?.paymentTerms || null,
      preview: woData,
      items,
      quotationTerms: woData.quotationTerms || {},
    };
    setSaveMessage('');
    try {
      const response = await fetch('/api/contracting/work-orders', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save work order.');
      setSaveMessage(`Work order ${result.woNo} saved successfully.`);
    } catch (error) {
      setSaveMessage(error.message || 'Failed to save work order.');
    }
  };

  // Calculations for Table
  const totalBasic = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const totalCGST = items.reduce((sum, item) => sum + (item.qty * item.rate * (item.gstPercent/2 / 100)), 0);
  const totalSGST = items.reduce((sum, item) => sum + (item.qty * item.rate * (item.gstPercent/2 / 100)), 0);
  const totalGST = totalCGST + totalSGST;
  const grandTotal = totalBasic + totalGST;

  const numberToWords = (value) => {
    const number = Math.round(Number(value) || 0);
    if (number === 0) return 'RUPEES ZERO ONLY.';

    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const underThousand = (amount) => {
      if (amount < 20) return ones[amount];
      if (amount < 100) return `${tens[Math.floor(amount / 10)]}${amount % 10 ? ` ${ones[amount % 10]}` : ''}`;
      return `${ones[Math.floor(amount / 100)]} HUNDRED${amount % 100 ? ` ${underThousand(amount % 100)}` : ''}`;
    };

    const parts = [];
    const crore = Math.floor(number / 10000000);
    const lakh = Math.floor((number % 10000000) / 100000);
    const thousand = Math.floor((number % 100000) / 1000);
    const remainder = number % 1000;
    if (crore) parts.push(`${underThousand(crore)} CRORE`);
    if (lakh) parts.push(`${underThousand(lakh)} LAKH`);
    if (thousand) parts.push(`${underThousand(thousand)} THOUSAND`);
    if (remainder) parts.push(underThousand(remainder));
    return `RUPEES ${parts.join(' ')} ONLY.`;
  };

  return (
    <div className="contracting-container">
      <style>{printStyles}</style>
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          Raise Work Order
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Raise Work Order
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filter Section */}
        <div className="work-order-filter" style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'visible', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Filter
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              <FormGroup label="Project" required error={showError && !filters.projectId ? "Required" : ""}>
                <select 
                  className="contracting-input" 
                  style={{ width: '100%', borderColor: showError && !filters.projectId ? '#ef4444' : '#e2e8f0' }}
                  value={filters.projectId}
                  onChange={(e) => {
                    setTaskMenuOpen(false);
                    setFilters(f => ({ ...f, projectId: e.target.value, taskIds: [] }));
                  }}
                >
                  <option value="">- Select Project -</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FormGroup>
              
              <FormGroup label="Contractor" required error={showError && !filters.contractorId ? "Required" : ""}>
                <select 
                  className="contracting-input" 
                  style={{ width: '100%', borderColor: showError && !filters.contractorId ? '#ef4444' : '#e2e8f0' }}
                  value={filters.contractorId}
                  onChange={(e) => setFilters(f => ({...f, contractorId: e.target.value}))}
                >
                  <option value="">- Select Contractor -</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Task" required error={showError && filters.taskIds.length === 0 ? "Required" : ""}>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="contracting-input"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderColor: showError && filters.taskIds.length === 0 ? '#ef4444' : '#e2e8f0',
                      background: '#fff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis'
                    }}
                    onClick={() => setTaskMenuOpen(open => !open)}
                  >
                    {filters.taskIds.length === 0
                      ? '- Select Task -'
                      : filters.taskIds.length === tasks.length
                        ? 'All tasks selected'
                        : `${filters.taskIds.length} task${filters.taskIds.length === 1 ? '' : 's'} selected`}
                  </button>
                  {taskMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      maxHeight: '300px',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      boxShadow: '0 8px 20px rgba(15,23,42,0.15)'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer', background: '#f8fafc' }}>
                        <input
                          type="checkbox"
                          checked={tasks.length > 0 && filters.taskIds.length === tasks.length}
                          onChange={e => setFilters(f => ({ ...f, taskIds: e.target.checked ? tasks.map(task => task.id) : [] }))}
                        />
                        Select All ({tasks.length})
                      </label>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {tasks.map(task => (
                          <label key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filters.taskIds.includes(task.id)}
                              onChange={e => setFilters(f => ({
                                ...f,
                                taskIds: e.target.checked
                                  ? [...f.taskIds, task.id]
                                  : f.taskIds.filter(id => id !== task.id)
                              }))}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormGroup>

              <FormGroup label="Work Order From">
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={woSource}
                  onChange={e => { setWoSource(e.target.value); setSelectedQuotationId(''); }}
                >
                  <option value="manual">Manual — Task wise WO Generation</option>
                  <option value="quotation">From Approved Quotation</option>
                </select>
              </FormGroup>

              {woSource === 'quotation' && (
                <FormGroup label="Select Quotation" style={{ gridColumn: 'span 4' }}>
                  <select
                    className="contracting-input"
                    style={{ width: '100%' }}
                    value={selectedQuotationId}
                    onChange={e => handleQuotationSelect(e.target.value)}
                  >
                    <option value="">- Select Approved Quotation -</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>{q.quotationNo} — {q.contractorName} ({q.items?.length} tasks)</option>
                    ))}
                  </select>
                </FormGroup>
              )}
              
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan" onClick={handleReset}><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan" onClick={handleSearch}><Search size={14} /> Generate Preview</button>
            </div>
          </div>
        </div>

        {/* WORK ORDER PREVIEW */}
        {showPreview && woData && (
          <div className="work-order-preview" style={{ 
            background: 'white', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px', 
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '40px'
          }}>
            
            {/* Document Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #334155', paddingBottom: '16px', marginBottom: '20px', position: 'relative' }}>
              <PreviewInput value={woData.companyName} onChange={e => updatePreviewField('companyName', e.target.value)} style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.2rem', color: '#1e293b' }} />
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#475569' }}>Work Order</h3>
              <div style={{ position: 'absolute', right: 0, top: 0 }}>
                <img src="/logo.png" alt="CeCube logo" style={{ width: '120px', height: '60px', objectFit: 'contain' }} />
              </div>
            </div>

            {/* Top Details Grid */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <strong>WO No:</strong>
                <PreviewInput value={woData.woNo} onChange={e => updatePreviewField('woNo', e.target.value)} style={{ width: '110px', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <strong>WO Date:</strong>
                <PreviewInput value={woData.date} onChange={e => updatePreviewField('date', e.target.value)} style={{ width: '110px', fontWeight: 600, textAlign: 'right' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #334155' }}>
              {/* Left Column - Contractor */}
              <div style={{ padding: '12px', borderRight: '1px solid #334155' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>To,</div>
                <PreviewInput value={woData.contractorName} onChange={e => updatePreviewField('contractorName', e.target.value)} style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a', marginBottom: '6px' }} />
                <PreviewInput value={woData.contractorAddress} onChange={e => updatePreviewField('contractorAddress', e.target.value)} multiline style={{ fontSize: '0.8rem', marginBottom: '8px', maxWidth: '300px' }} />
                <table style={{ fontSize: '0.8rem', color: '#334155' }}>
                  <tbody>
                    <tr><td style={{ paddingRight: '12px' }}>Contact No:</td><td><PreviewInput value={woData.contractorContact} onChange={e => updatePreviewField('contractorContact', e.target.value)} /></td></tr>
                    <tr><td style={{ paddingRight: '12px' }}>Email:</td><td><PreviewInput value={woData.contractorEmail} onChange={e => updatePreviewField('contractorEmail', e.target.value)} /></td></tr>
                    <tr><td style={{ paddingRight: '12px' }}>PAN No:</td><td><PreviewInput value={woData.contractorPan} onChange={e => updatePreviewField('contractorPan', e.target.value)} /></td></tr>
                    <tr><td style={{ paddingRight: '12px' }}>GST No:</td><td><PreviewInput value={woData.contractorGst} onChange={e => updatePreviewField('contractorGst', e.target.value)} /></td></tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column - CeCube & Site */}
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem' }}>Company Name : <PreviewInput value={woData.companyName} onChange={e => updatePreviewField('companyName', e.target.value)} style={{ fontWeight: 'bold' }} /></div>
                <PreviewInput value={woData.companyAddress} onChange={e => updatePreviewField('companyAddress', e.target.value)} multiline style={{ fontSize: '0.8rem', marginTop: '4px', marginBottom: '12px', maxWidth: '300px' }} />
                <table style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '12px' }}>
                  <tbody>
                    <tr><td style={{ paddingRight: '12px' }}>PAN :</td><td><PreviewInput value={woData.companyPan} onChange={e => updatePreviewField('companyPan', e.target.value)} /></td></tr>
                    <tr><td style={{ paddingRight: '12px' }}>GST No:</td><td><PreviewInput value={woData.companyGst} onChange={e => updatePreviewField('companyGst', e.target.value)} /></td></tr>
                  </tbody>
                </table>
                <table style={{ fontSize: '0.8rem', color: '#334155' }}>
                  <tbody>
                    <tr><td style={{ paddingRight: '12px', verticalAlign: 'top' }}>Site Name:</td><td><PreviewInput value={woData.siteName} onChange={e => updatePreviewField('siteName', e.target.value)} style={{ fontWeight: 600 }} /></td></tr>
                    <tr><td style={{ paddingRight: '12px', verticalAlign: 'top' }}>Site Address:</td><td><PreviewInput value={woData.siteAddress} onChange={e => updatePreviewField('siteAddress', e.target.value)} /></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subject and Site Contact */}
            <div style={{ border: '1px solid #334155', borderTop: 'none', padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
              <strong style={{ width: '80px', flexShrink: 0 }}>Subject :</strong>
              <PreviewInput
                multiline
                className="subject-editable"
                value={woData.subject}
                onChange={e => updatePreviewField('subject', e.target.value)}
                style={{ minHeight: '34px', resize: 'vertical', lineHeight: '1.35' }}
              />
              <span className="print-subject">{woData.subject}</span>
            </div>
            <div style={{ border: '1px solid #334155', borderTop: 'none', padding: '8px 12px', fontSize: '0.85rem', display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flex: 1 }}><strong style={{ width: '150px' }}>Site Contact Person :</strong> <PreviewInput value={woData.siteContactPerson} onChange={e => updatePreviewField('siteContactPerson', e.target.value)} /></div>
            </div>
            <div style={{ border: '1px solid #334155', borderTop: 'none', padding: '8px 12px', fontSize: '0.85rem', display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flex: 1 }}><strong style={{ width: '150px' }}>Site Contact Detail :</strong> <PreviewInput value={woData.siteContactPhone} onChange={e => updatePreviewField('siteContactPhone', e.target.value)} /></div>
            </div>

            {/* Introduction Text */}
            <div style={{ border: '1px solid #334155', borderTop: 'none', padding: '12px', fontSize: '0.85rem', color: '#334155', lineHeight: '1.5' }}>
              <strong>Dear Sir,</strong><br/>
              This has reference to your offer submitted to us for {woData.siteName} work project and our subsequent negotiation meetings, we are immensely pleased to confirm our intention of awarding the captioned subject work to your esteemed organization on the techno-commercial terms & conditions cum stipulations-broadly depicted hereunder in the succeeding paragraphs.
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #334155', borderTop: 'none', fontSize: '0.8rem' }}>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '31%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>
                  {['Sr.No.', 'Item Description', 'Qty', 'Unit', 'Rate Rs.', 'Basic Amount', 'GST%', 'Gross Amount'].map((header, index) => (
                    <th key={header} style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: index === 1 ? 'left' : 'center', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const basic = item.qty * item.rate;
                  const gross = basic + (basic * (item.gstPercent/100));
                  return (
                    <tr key={item.id}>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'center', overflowWrap: 'anywhere' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <textarea 
                          rows={2}
                          className="screen-editable"
                          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', overflowWrap: 'anywhere', resize: 'vertical', font: 'inherit', color: 'inherit' }} 
                          value={item.description} 
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].description = e.target.value;
                            setItems(newItems);
                          }}
                        />
                        <span className="print-wrapped-value">{item.description}</span>
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'center', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <input 
                          type="number" 
                          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', textAlign: 'center' }} 
                          value={item.qty} 
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].qty = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'center', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <input 
                          type="text" 
                          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', textAlign: 'center' }} 
                          value={item.unit} 
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].unit = e.target.value;
                            setItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <input 
                          type="number" 
                          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right' }} 
                          value={item.rate} 
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].rate = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{basic.toFixed(2)}</td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'center', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <input 
                          type="number" 
                          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', textAlign: 'center' }} 
                          value={item.gstPercent} 
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].gstPercent = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '8px 5px', textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{gross.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <table className="work-order-summary" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #334155', borderTop: 'none', fontSize: '0.8rem' }}>
              <tbody>
                <tr>
                  <td colSpan={5} rowSpan={4} style={{ border: '1px solid #334155', borderTop: '2px solid #334155' }}></td>
                  <td colSpan={2} style={{ border: '1px solid #334155', borderTop: '2px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>Contract Amount (A)</td>
                  <td style={{ border: '1px solid #334155', borderTop: '2px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>{totalBasic.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>CGST 9%</td>
                  <td style={{ border: '1px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>{totalCGST.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>SGST 9%</td>
                  <td style={{ border: '1px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>{totalSGST.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>Total GST (B)</td>
                  <td style={{ border: '1px solid #334155', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>{totalGST.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #334155', padding: '8px' }}>
                    <strong>AMOUNT IN WORDS:</strong><br/>
                    <span style={{ color: '#475569' }}>{numberToWords(grandTotal)}</span>
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #334155', padding: '8px', fontWeight: 'bold', textAlign: 'right', fontSize: '0.9rem' }}>Total (A + B)</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', fontWeight: 'bold', textAlign: 'right', fontSize: '0.9rem' }}>{grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Quotation terms */}
            <div style={{ border: '1px solid #334155', borderTop: 'none', padding: '12px', fontSize: '0.8rem', color: '#334155' }}>
              <strong>Quotation Terms &amp; Conditions</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: '8px' }}>
                {[
                  ['Delivery Terms', woData.quotationTerms?.deliveryTerms],
                  ['Payment Terms', woData.quotationTerms?.paymentTerms],
                  ['Material Inspection', woData.quotationTerms?.materialInspection],
                  ['Warranty', woData.quotationTerms?.warranty],
                  ['Transaction Mode', woData.quotationTerms?.transactionMode],
                  ['Insurance', woData.quotationTerms?.insurance],
                  ['Tax & Duties', woData.quotationTerms?.taxAndDuties],
                  ['Freight Charges', woData.quotationTerms?.freightCharges],
                  ['Other Conditions', woData.quotationTerms?.otherConditions],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start' }}><strong style={{ minWidth: '135px' }}>{label}:</strong> <PreviewInput value={value} onChange={e => updateQuotationTerm({
                    'Delivery Terms': 'deliveryTerms',
                    'Payment Terms': 'paymentTerms',
                    'Material Inspection': 'materialInspection',
                    Warranty: 'warranty',
                    'Transaction Mode': 'transactionMode',
                    Insurance: 'insurance',
                    'Tax & Duties': 'taxAndDuties',
                    'Freight Charges': 'freightCharges',
                    'Other Conditions': 'otherConditions',
                  }[label], e.target.value)} /></div>
                ))}
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #334155', borderTop: 'none', padding: '16px 12px 60px 12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>
              <div>For {woData.companyName}</div>
              <div>For <PreviewInput value={woData.contractorName} onChange={e => updatePreviewField('contractorName', e.target.value)} style={{ display: 'inline-block', width: '180px', fontWeight: 'bold' }} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #334155', borderTop: 'none', padding: '8px 12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>
              <div>Authorized Signatory</div>
              <div>Authorized Signatory</div>
            </div>

            {/* Save/Print Actions */}
            <div className="work-order-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn-cyan" onClick={() => window.print()} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                <Printer size={16} /> Print WO
              </button>
              <button className="btn-cyan" onClick={handleSaveWorkOrder}>
                <Save size={16} /> Save Work Order
              </button>
            </div>
            {saveMessage && <div style={{ marginTop: '10px', textAlign: 'right', color: saveMessage.includes('successfully') ? '#166534' : '#b91c1c', fontSize: '0.82rem' }}>{saveMessage}</div>}

          </div>
        )}

      </div>
    </div>
  );
}
