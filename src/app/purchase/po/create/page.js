'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Save, Printer, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function numberToWords(num) {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.toUpperCase();
}

function generateHsnSacCode(name, index = 0) {
  const text = String(name || '').trim().toUpperCase();
  if (!text) return `HSN-${String(index + 1).padStart(4, '0')}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 1000000;
  return String(hash || index + 1).padStart(6, '0');
}

function formatIndianAmount(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CreatePOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') || '';
  const rfqId = searchParams.get('rfqId') || '';
  const vendorIdParam = searchParams.get('vendorId') || '';
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [prs, setPrs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [unitList, setUnitList] = useState([]);

  const [formData, setFormData] = useState({
    poNumber: '', vendorId: '', indentId: '', taskId: '', project: '', site: '',
    poDate: new Date().toISOString().slice(0, 10), currency: 'INR', deliveryLoc: '', expectedDate: '',
    paymentTerms: '', warranty: '', deliveryTerms: '', discount: 0, freight: 0, otherCharges: 0,
    subject: 'Supply of Materials / Services', siteContactPerson: '', siteContactDetail: '',
    materialInspection: '', transactionMode: 'Bank Transfer', taxAndDuties: 'As applicable',
    otherConditions: '', insurance: ''
  });

  const activeProject = projects.find(project => project.name === formData.project) || null;

  const [items, setItems] = useState([
    { item: '', specification: '', hsnCode: '', quantity: '', unit: '', rate: '', itemDiscount: 0, gstPercent: 18, cgstPercent: 9, sgstPercent: 9 }
  ]);

  const activeVendor = vendors.find(vendor => vendor.id === formData.vendorId) || null;

  useEffect(() => {
    async function loadData() {
      try {
        const [vRes, pRes, projectRes, taskRes, unitRes] = await Promise.all([
          fetch('/api/purchase/vendors'),
          fetch('/api/purchase/pr'),
          fetch('/api/projects'),
          fetch('/api/engineering/task-library'),
          fetch('/api/engineering/unit-library?_t=' + Date.now(), { cache: 'no-store' })
        ]);
        if (vRes.ok) setVendors(await vRes.json());
        if (pRes.ok) setPrs(await pRes.json());
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProjects(Array.isArray(projectData) ? projectData : []);
        }
        if (taskRes.ok) {
          const groups = await taskRes.json();
          const taskMap = new Map();
          if (Array.isArray(groups)) {
            groups.forEach(group => {
              (group.tasks || []).forEach(task => taskMap.set(task.id, task));
            });
          }
          setTasks(Array.from(taskMap.values()));
        }
        if (unitRes.ok) {
          const units = await unitRes.json();
          setUnitList(Array.from(new Set((Array.isArray(units) ? units : [])
            .map(unit => typeof unit === 'string' ? unit : unit.name)
            .filter(Boolean))));
        }
        if (editId) {
          const poRes = await fetch(`/api/purchase/po?id=${editId}`);
          const poData = await poRes.json();
          const po = Array.isArray(poData) ? poData[0] : poData;
          if (po) {
            let extra = {
              discount: 0, freight: 0, otherCharges: 0, subject: '', siteContactPerson: '',
              siteContactDetail: '', materialInspection: '', transactionMode: '', taxAndDuties: '',
              otherConditions: '', insurance: ''
            };
            if (po.remarks) {
              try {
                const parsed = JSON.parse(po.remarks);
                if (parsed && typeof parsed === 'object') extra = { ...extra, ...parsed };
                if (typeof parsed?.remarks === 'string') {
                  const nested = JSON.parse(parsed.remarks);
                  if (nested && typeof nested === 'object') extra = { ...extra, ...nested };
                }
              } catch (error) {
                console.warn('Unable to parse PO remarks:', error);
              }
            }
            setFormData(prev => ({
              ...prev,
              poNumber: po.poNumber || '',
              vendorId: po.supplierId || '',
              project: po.projectName || '',
              deliveryLoc: po.deliveryAddress || '',
              poDate: po.poDate ? new Date(po.poDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              paymentTerms: po.paymentTerms || '',
              warranty: po.scopeOfWork || '',
              deliveryTerms: po.deliverySchedule || '',
              discount: extra.discount || 0,
              freight: extra.freight || 0,
              otherCharges: extra.otherCharges || 0,
              subject: extra.subject || 'Supply of Materials / Services',
              siteContactPerson: extra.siteContactPerson || po.deliveryContact || '',
              siteContactDetail: extra.siteContactDetail || po.deliveryPhone || '',
              materialInspection: extra.materialInspection || '',
              transactionMode: extra.transactionMode || 'Bank Transfer',
              taxAndDuties: extra.taxAndDuties || 'As applicable',
              otherConditions: extra.otherConditions || '',
              insurance: extra.insurance || ''
            }));
            setItems((po.items || []).map((item, index) => ({ item: item.description || '', specification: item.specifications || '', hsnCode: item.hsnCode || generateHsnSacCode(item.description, index), quantity: item.quantity || 0, unit: item.unit || '', rate: item.rate || 0, itemDiscount: item.discountPercent || 0, gstPercent: item.gstPercent ?? ((item.cgstPercent || 9) + (item.sgstPercent || 9)), cgstPercent: item.cgstPercent || 9, sgstPercent: item.sgstPercent || 9 })));
          }
        } else if (rfqId && vendorIdParam) {
          const [qRes, rRes] = await Promise.all([
            fetch(`/api/purchase/quotation?rfqId=${rfqId}`),
            fetch(`/api/purchase/rfq?id=${rfqId}`)
          ]);
          if (qRes.ok && rRes.ok) {
            const quotations = await qRes.json();
            const fullRfq = await rRes.json();
            const quote = quotations.find(q => q.vendorId === vendorIdParam);
            if (quote) {
              const approvedItems = quote.items.filter(item => item.isSelected);
              setFormData(prev => ({
                ...prev,
                vendorId: vendorIdParam,
                project: fullRfq.project || '',
                deliveryLoc: projects.find(project => project.name === fullRfq.project)?.location
                  || projects.find(project => project.name === fullRfq.project)?.address
                  || projects.find(project => project.name === fullRfq.project)?.state
                  || fullRfq.site
                  || '',
                indentId: fullRfq.indentId || '',
                paymentTerms: quote.paymentTerms || '',
                warranty: quote.warranty || '',
                deliveryTerms: quote.deliveryTerms || '',
                freight: parseFloat(quote.freightCharges) || 0,
                otherCharges: parseFloat(quote.otherConditions) || 0,
                discount: 0
              }));
              if (approvedItems.length > 0) {
                const indentItems = fullRfq.indent?.items || [];
                setItems(approvedItems.map((item, index) => {
                  const indentItem = indentItems.find(entry => entry.id === item.indentItemId)
                    || indentItems.find(entry => String(entry.item).trim().toLowerCase() === String(item.item).trim().toLowerCase());
                  return {
                    item: item.item,
                    specification: item.brand || indentItem?.specification || '',
                    hsnCode: item.hsnCode || generateHsnSacCode(item.item, index),
                    quantity: item.quantity || indentItem?.quantity || 0,
                    unit: indentItem?.unit || item.uom || '',
                    rate: item.rate,
                    itemDiscount: 0,
                    cgstPercent: item.gst ? item.gst / 2 : 9,
                    sgstPercent: item.gst ? item.gst / 2 : 9
                  };
                }));
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load dropdown data', err);
      }
    }
    loadData();
  }, [editId, rfqId, vendorIdParam]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    if (name === 'project') {
      const project = projects.find(entry => entry.name === value);
      setFormData(prev => ({
        ...prev,
        project: value,
        deliveryLoc: project?.location || project?.address || project?.state || ''
      }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'taskId' && value) {
      const task = tasks.find(t => t.id === value);
      if (task && task.materials && task.materials.length > 0) {
        const newItems = task.materials.map(m => ({
          item: m.name,
          specification: m.specification || '',
          hsnCode: m.hsnCode || generateHsnSacCode(m.name, 0),
          quantity: m.quantity || 1,
          unit: m.unit || '',
          rate: m.rate || 0,
          itemDiscount: 0,
          gstPercent: 18,
          cgstPercent: 9,
          sgstPercent: 9
        }));
        setItems(newItems);
      }
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    if (name === 'gstPercent') {
      newItems[index].gstPercent = value;
      newItems[index].cgstPercent = (parseFloat(value) || 0) / 2;
      newItems[index].sgstPercent = (parseFloat(value) || 0) / 2;
    } else {
      newItems[index][name] = value;
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { item: '', specification: '', hsnCode: generateHsnSacCode('', items.length), quantity: '', unit: unitList[0] || '', rate: '', itemDiscount: 0, gstPercent: 18, cgstPercent: 9, sgstPercent: 9 }]);

  let totalBasic = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  items.forEach(item => {
    const amt = parseFloat(item.quantity || 0) * parseFloat(item.rate || 0);
    const taxable = amt - parseFloat(item.itemDiscount || 0);
    totalBasic += taxable;
    const gstPercent = item.gstPercent ?? ((parseFloat(item.cgstPercent || 0) + parseFloat(item.sgstPercent || 0)) || 0);
    totalCgst += taxable * (gstPercent / 2 / 100);
    totalSgst += taxable * (gstPercent / 2 / 100);
  });

  const discountVal = parseFloat(formData.discount || 0);
  totalBasic -= discountVal;

  const totalGst = totalCgst + totalSgst;
  const freightVal = parseFloat(formData.freight || 0);
  const otherVal = parseFloat(formData.otherCharges || 0);
  const grandTotal = totalBasic + totalGst + freightVal + otherVal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const vendor = vendors.find(item => item.id === formData.vendorId);
      const remarksData = {
        discount: parseFloat(formData.discount || 0),
        freight: parseFloat(formData.freight || 0),
        otherCharges: parseFloat(formData.otherCharges || 0),
        subject: formData.subject,
        siteContactPerson: formData.siteContactPerson,
        siteContactDetail: formData.siteContactDetail,
        materialInspection: formData.materialInspection,
        transactionMode: formData.transactionMode,
        taxAndDuties: formData.taxAndDuties,
        otherConditions: formData.otherConditions,
        insurance: formData.insurance
      };
      const payload = {
        ...formData,
        id: editId || undefined,
        supplierId: formData.vendorId || null,
        supplierName: vendor?.name || '',
        supplierAddress: vendor?.address || '',
        supplierContact: vendor?.contactPerson || null,
        supplierPhone: vendor?.mobile || vendor?.phone || null,
        supplierEmail: vendor?.email || null,
        supplierGstin: vendor?.gstin || vendor?.gstNo || null,
        supplierPan: vendor?.pan || vendor?.panNumber || null,
        poDate: formData.poDate || new Date().toISOString().slice(0, 10),
        projectName: formData.project,
        deliveryAddress: formData.deliveryLoc || activeProject?.location || activeProject?.address || activeProject?.state || '',
        deliveryContact: formData.siteContactPerson || null,
        deliveryPhone: formData.siteContactDetail || null,
        cgstAmount: totalCgst.toFixed(2),
        sgstAmount: totalSgst.toFixed(2),
        items: items.map(item => ({ ...item, transportCharges: 0, otherCharges: 0 })),
        remarks: JSON.stringify(remarksData),
        createdById: JSON.parse(localStorage.getItem('employeeData'))?.id || null
      };
      const res = await fetch('/api/purchase/po', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/purchase/po');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create PO');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
      <div className="po-page-root" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        .doc-input { border: 1px solid transparent; background: transparent; padding: 4px; font-family: inherit; font-size: inherit; width: 100%; transition: all 0.2s; outline: none; }
        .doc-input:hover { border-color: #cbd5e1; background: #f8fafc; }
        .doc-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        .doc-input::placeholder { color: #94a3b8; font-style: italic; }
        .doc-select { border: 1px solid transparent; background: transparent; padding: 4px; font-family: inherit; font-size: inherit; width: 100%; outline: none; appearance: auto; }
        .doc-select:hover { border-color: #cbd5e1; background: #f8fafc; }
        .doc-table { width: 100%; border-collapse: collapse; }
        .doc-table th, .doc-table td { border: 1px solid #000; padding: 6px 6px; vertical-align: middle; }
        .doc-table th { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #1e3a8a; text-align: center; white-space: nowrap; }
        .items-table td { vertical-align: middle; }
        .items-table td:nth-child(2) { vertical-align: top; }
        .items-table td:nth-child(3), .items-table td:nth-child(4), .items-table td:nth-child(5), .items-table td:nth-child(6), .items-table td:nth-child(7), .items-table td:nth-child(8), .items-table td:nth-child(9) { white-space: nowrap; text-align: center; }
        .items-table td:nth-child(6), .items-table td:nth-child(7), .items-table td:nth-child(9) { text-align: right; }
        .print-value { display: none; }
        .amount-words-box { border: 1px solid #000; border-top: none; padding: 8px 10px; background: #fff; }
        @media print {
          @page { size: A4 portrait; margin: 0.5in; }
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          .sidebar + div { margin-left: 0 !important; width: 100% !important; height: auto !important; min-height: 0 !important; overflow: visible !important; background: white !important; }
          .sidebar + div > div:first-child { display: none !important; }
          html, body, body > div { background: white !important; width: 100% !important; min-width: 0 !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          html::-webkit-scrollbar, body::-webkit-scrollbar, .document-frame::-webkit-scrollbar { display: none !important; width: 0 !important; }
          html, body, .document-frame { scrollbar-width: none !important; -ms-overflow-style: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          form { display: block !important; }
          .document-frame { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 auto !important; max-width: 100% !important; width: 100% !important; min-height: 0 !important; height: auto !important; box-sizing: border-box !important; overflow: visible !important; }
          .document-frame, .document-frame * { overflow: visible !important; }
          .doc-table th, .doc-table td { overflow-wrap: anywhere !important; word-break: break-word !important; }
          .doc-table th { white-space: nowrap !important; }
          .items-table td:nth-child(2) { white-space: normal !important; }
          .doc-input, .doc-select { display: none !important; }
          .print-value { display: block !important; white-space: pre-wrap !important; overflow-wrap: anywhere !important; word-break: break-word !important; line-height: 1.35 !important; min-height: 1em !important; }
          .print-value.inline { display: inline-block !important; vertical-align: top; }
          .doc-table tr { page-break-inside: avoid; break-inside: avoid; }
          .amount-words-box { page-break-inside: avoid !important; break-inside: avoid !important; }
          .po-terms { padding-top: 4px !important; padding-bottom: 4px !important; margin-top: 4px !important; page-break-after: auto !important; break-after: auto !important; }
          .po-page-root { padding: 0 !important; min-height: 0 !important; height: auto !important; background: #fff !important; }
          .po-terms table { margin-top: 4px !important; }
          .po-terms td { padding-top: 1px !important; padding-bottom: 1px !important; line-height: 1.15 !important; }
          .po-sign-block { break-inside: avoid !important; page-break-inside: avoid !important; margin-top: 12px !important; }
          .po-sign-block tr { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px 24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Project *</label>
          <select name="project" required value={formData.project} onChange={handleHeaderChange} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}>
            <option value="">-- Select Project --</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Vendor / Contractor *</label>
          <select name="vendorId" required value={formData.vendorId} onChange={handleHeaderChange} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}>
            <option value="">-- Select Vendor --</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Load from Task (Optional)</label>
          <select name="taskId" value={formData.taskId} onChange={handleHeaderChange} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}>
            <option value="">-- Select Task --</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Purchase Request (Optional)</label>
          <select name="indentId" value={formData.indentId} onChange={handleHeaderChange} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}>
            <option value="">-- Select PR --</option>
            {prs.map(pr => <option key={pr.id} value={pr.id}>{pr.prNo}</option>)}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="document-frame" style={{ backgroundColor: '#fff', width: '100%', maxWidth: '1500px', padding: '32px 42px 180px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px', position: 'relative' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 4px 0' }}>CeCube Engineering India Private Limited</h1>
            <h2 style={{ fontSize: '14px', margin: 0, fontWeight: 'normal' }}>Purchase Order</h2>
            <div style={{ position: 'absolute', top: 0, right: 0 }}>
              <img src="/logo.png" alt="CeCube Logo" style={{ width: '60px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
            </div>
          </div>

          <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '8px 0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
            <div>PO No: {formData.poNumber || (editId ? 'Pending Number' : 'Generated on Save')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              PO Date: <input type="date" name="poDate" value={formData.poDate} onChange={handleHeaderChange} className="doc-input" style={{ width: '130px', fontWeight: 'bold', padding: 0 }} /><span className="print-value inline">{formData.poDate ? new Date(`${formData.poDate}T00:00:00`).toLocaleDateString('en-GB') : 'N/A'}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
            <div style={{ borderRight: '1px solid #000', padding: '8px', fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>To,</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>{activeVendor ? activeVendor.name : 'Select Vendor Above'}</div>
              <table style={{ width: '100%', fontSize: '11px' }}>
                <tbody>
                  <tr><td style={{ width: '130px', color: '#4b5563' }}>Contact Person</td><td><input type="text" className="doc-input" placeholder="N/A" value={activeVendor?.contactPerson || ''} readOnly /><span className="print-value">{activeVendor?.contactPerson || 'N/A'}</span></td></tr>
                  <tr><td style={{ color: '#4b5563' }}>Email</td><td><input type="text" className="doc-input" placeholder="N/A" value={activeVendor?.email || ''} readOnly /><span className="print-value">{activeVendor?.email || 'N/A'}</span></td></tr>
                  <tr><td style={{ color: '#4b5563' }}>WhatsApp / Mobile</td><td><input type="text" className="doc-input" placeholder="N/A" value={activeVendor?.whatsappNo || activeVendor?.mobile || activeVendor?.phone || ''} readOnly /><span className="print-value">{activeVendor?.whatsappNo || activeVendor?.mobile || activeVendor?.phone || 'N/A'}</span></td></tr>
                  <tr><td style={{ color: '#4b5563' }}>Vendor Address</td><td><textarea className="doc-input" rows="2" placeholder="N/A" value={activeVendor?.address || ''} readOnly /><span className="print-value">{activeVendor?.address || 'N/A'}</span></td></tr>
                  <tr><td style={{ color: '#4b5563' }}>GST No.</td><td><input type="text" className="doc-input" placeholder="N/A" value={activeVendor?.gstin || activeVendor?.gstNo || ''} readOnly /><span className="print-value">{activeVendor?.gstin || activeVendor?.gstNo || 'N/A'}</span></td></tr>
                  <tr><td style={{ color: '#4b5563' }}>PAN No.</td><td><input type="text" className="doc-input" placeholder="N/A" value={activeVendor?.pan || activeVendor?.panNumber || ''} readOnly /><span className="print-value">{activeVendor?.pan || activeVendor?.panNumber || 'N/A'}</span></td></tr>
                </tbody>
              </table>
            </div>

            <div style={{ padding: '8px', fontSize: '11px' }}>
              <div style={{ color: '#4b5563', marginBottom: '2px' }}>Company Name:</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CeCube Engineering India Private Limited</div>
              <div style={{ marginBottom: '12px' }}>A-121-122, Phase II, New Palam Vihar, Near St. Soldier School, Gurugram, Haryana-122017</div>
              <table style={{ width: '100%', fontSize: '11px' }}>
                <tbody>
                  <tr><td style={{ width: '80px', color: '#4b5563' }}>PAN No</td><td style={{ fontWeight: 'bold' }}>AAJCC2203M</td></tr>
                  <tr><td style={{ color: '#4b5563' }}>GST No</td><td style={{ fontWeight: 'bold' }}>06AAJCC2203M1ZT</td></tr>
                  <tr><td style={{ color: '#4b5563', verticalAlign: 'top', paddingTop: '8px' }}>Shipped To</td><td><input type="text" name="project" value={formData.project} onChange={handleHeaderChange} className="doc-input" placeholder="E.g. Project Name" style={{ fontWeight: 'bold', paddingTop: '8px' }} /><span className="print-value">{formData.project || 'N/A'}</span></td></tr>
                  <tr><td style={{ color: '#4b5563', verticalAlign: 'top' }}>Shipped To Address</td><td><textarea name="deliveryLoc" value={formData.deliveryLoc || activeProject?.location || activeProject?.address || activeProject?.state || ''} onChange={handleHeaderChange} className="doc-input" rows="3" placeholder="Project address..." /><span className="print-value">{formData.deliveryLoc || activeProject?.location || activeProject?.address || activeProject?.state || 'N/A'}</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid #000', padding: '8px', fontSize: '11px' }}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '120px', fontWeight: 'bold' }}>Subject:</td>
                  <td><input type="text" name="subject" value={formData.subject} onChange={handleHeaderChange} className="doc-input" style={{ fontWeight: 'bold' }} /><span className="print-value">{formData.subject || 'N/A'}</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Site Contact Person:</td>
                  <td><input type="text" name="siteContactPerson" value={formData.siteContactPerson} onChange={handleHeaderChange} className="doc-input editable-contact" placeholder="Enter contact person" autoComplete="name" /><span className="print-value">{formData.siteContactPerson || 'N/A'}</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Site Contact Detail:</td>
                  <td><input type="text" name="siteContactDetail" value={formData.siteContactDetail} onChange={handleHeaderChange} className="doc-input editable-contact" placeholder="Enter phone or email" autoComplete="tel" /><span className="print-value">{formData.siteContactDetail || 'N/A'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <table className="doc-table items-table">
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th>SR NO</th>
                <th>ITEM DESCRIPTION</th>
                <th>HSN/SAC</th>
                <th>QTY</th>
                <th>UNIT</th>
                <th>RATE RS.</th>
                <th>BASIC AMOUNT</th>
                <th>GST %</th>
                <th>GROSS AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const amt = parseFloat(item.quantity || 0) * parseFloat(item.rate || 0);
                const taxable = amt - parseFloat(item.itemDiscount || 0);
                const gstPercent = item.gstPercent ?? ((parseFloat(item.cgstPercent || 0) + parseFloat(item.sgstPercent || 0)) || 0);
                const itemCgst = taxable * (gstPercent / 2 / 100);
                const itemSgst = taxable * (gstPercent / 2 / 100);
                const itemGross = taxable + itemCgst + itemSgst;
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      <textarea name="item" value={item.item} onChange={e => handleItemChange(idx, e)} className="doc-input" placeholder="Item Name..." style={{ fontWeight: 'bold', minHeight: '28px', resize: 'vertical' }} required />
                      <textarea name="specification" value={item.specification} onChange={e => handleItemChange(idx, e)} className="doc-input" placeholder="Specifications..." style={{ fontSize: '10px', minHeight: '24px', resize: 'vertical' }} />
                      <span className="print-value">{item.item}{item.specification ? `\n${item.specification}` : ''}</span>
                    </td>
                    <td><input type="text" name="hsnCode" value={item.hsnCode || generateHsnSacCode(item.item, idx)} readOnly className="doc-input" style={{ textAlign: 'center' }} /><span className="print-value" style={{ textAlign: 'center' }}>{item.hsnCode || generateHsnSacCode(item.item, idx)}</span></td>
                    <td><input type="number" step="any" name="quantity" value={item.quantity} onChange={e => handleItemChange(idx, e)} className="doc-input" style={{ textAlign: 'center' }} required /><span className="print-value" style={{ textAlign: 'center' }}>{item.quantity || '0'}</span></td>
                    <td>
                      <select name="unit" value={item.unit || ''} onChange={e => handleItemChange(idx, e)} className="doc-select" style={{ textAlign: 'center' }}>
                        <option value="">Select Unit</option>
                        {item.unit && !unitList.includes(item.unit) && <option value={item.unit}>{item.unit}</option>}
                        {unitList.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                      </select><span className="print-value" style={{ textAlign: 'center' }}>{item.unit || 'N/A'}</span>
                    </td>
                    <td><input type="number" step="any" name="rate" value={item.rate} onChange={e => handleItemChange(idx, e)} className="doc-input" style={{ textAlign: 'right' }} required /><span className="print-value" style={{ textAlign: 'right' }}>{formatIndianAmount(item.rate)}</span></td>
                    <td style={{ textAlign: 'right' }}>{formatIndianAmount(taxable)}</td>
                    <td>
                      <select name="gstPercent" value={item.gstPercent ?? ((parseFloat(item.cgstPercent || 0) + parseFloat(item.sgstPercent || 0)) || 0)} onChange={e => handleItemChange(idx, e)} className="doc-select" style={{ textAlign: 'center' }}>
                        <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                      </select><span className="print-value" style={{ textAlign: 'center' }}>{`${gstPercent}%`}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatIndianAmount(itemGross)}</td>
                  </tr>
                );
              })}
              <tr className="no-print">
                <td colSpan="9" style={{ textAlign: 'center', padding: '4px', cursor: 'pointer', color: '#3b82f6', backgroundColor: '#eff6ff' }} onClick={addItem}>
                  + Add Another Item row
                </td>
              </tr>
              <tr>
                <td colSpan="8" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>Basic Amount (A)</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatIndianAmount(totalBasic)}</td>
              </tr>
              <tr>
                <td colSpan="8" style={{ textAlign: 'right', fontSize: '10px' }}>CGST</td>
                <td style={{ textAlign: 'right' }}>{formatIndianAmount(totalCgst)}</td>
              </tr>
              <tr>
                <td colSpan="8" style={{ textAlign: 'right', fontSize: '10px' }}>SGST</td>
                <td style={{ textAlign: 'right' }}>{formatIndianAmount(totalSgst)}</td>
              </tr>
              <tr>
                <td colSpan="8" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>Total GST (B)</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatIndianAmount(totalGst)}</td>
              </tr>
              <tr>
                <td colSpan="8" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9' }}>Total (A + B) + Charges</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f1f5f9' }}>{formatIndianAmount(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div className="amount-words-box">
            <span style={{ fontWeight: 'bold', fontSize: '10px' }}>AMOUNT IN WORDS: </span>
            <span style={{ fontSize: '11px', color: '#1e3a8a', fontStyle: 'italic' }}>{numberToWords(Math.round(grandTotal))}</span>
          </div>

          <div className="po-terms" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '8px 0', fontSize: '10px', marginTop: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>PO Terms & Conditions</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ width: '120px', padding: '2px 0' }}>Delivery Terms</td><td><input type="text" name="deliveryTerms" value={formData.deliveryTerms} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.deliveryTerms || 'N/A'}</span></td></tr>
                  <tr><td style={{ padding: '2px 0' }}>Material Inspection</td><td><input type="text" name="materialInspection" value={formData.materialInspection} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.materialInspection || 'N/A'}</span></td></tr>
                  <tr><td style={{ padding: '2px 0' }}>Transaction Mode</td><td><input type="text" name="transactionMode" value={formData.transactionMode} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.transactionMode || 'N/A'}</span></td></tr>
                  <tr><td style={{ padding: '2px 0' }}>Tax & Duties</td><td><input type="text" name="taxAndDuties" value={formData.taxAndDuties} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.taxAndDuties || 'N/A'}</span></td></tr>
                  <tr><td style={{ padding: '2px 0' }}>Other Conditions</td><td><input type="text" name="otherConditions" value={formData.otherConditions} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.otherConditions || 'N/A'}</span></td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '18px' }}>
                <tbody>
                  <tr><td style={{ width: '120px', padding: '2px 0' }}>Payment Terms</td><td><input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.paymentTerms || 'N/A'}</span></td></tr>
                  <tr><td style={{ padding: '2px 0' }}>Warranty</td><td><input type="text" name="warranty" value={formData.warranty} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.warranty || 'N/A'}</span></td></tr>
                  <tr><td style={{ padding: '2px 0' }}>Insurance</td><td><input type="text" name="insurance" value={formData.insurance} onChange={handleHeaderChange} className="doc-input" /><span className="print-value">{formData.insurance || 'N/A'}</span></td></tr>
                  <tr>
                    <td style={{ padding: '2px 0', fontWeight: 'bold' }}>Freight / Trans. (₹)</td>
                    <td><input type="number" step="any" name="freight" value={formData.freight} onChange={handleHeaderChange} className="doc-input" style={{ fontWeight: 'bold' }} /><span className="print-value">{formatIndianAmount(formData.freight)}</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0', fontWeight: 'bold' }}>Other Charges (₹)</td>
                    <td><input type="number" step="any" name="otherCharges" value={formData.otherCharges} onChange={handleHeaderChange} className="doc-input" style={{ fontWeight: 'bold' }} /><span className="print-value">{formatIndianAmount(formData.otherCharges)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

           <div className="po-sign-block" style={{ borderTop: '1px solid #000', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', height: '70px', verticalAlign: 'top', paddingTop: '12px', fontSize: '11px', fontWeight: 'bold' }}>For CeCube Engineering India Private Limited</td>
                  <td style={{ width: '50%', height: '70px', verticalAlign: 'top', paddingTop: '12px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}>For {activeVendor ? activeVendor.name : 'Supplier'}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '10px', color: '#4b5563' }}>Authorized Signatory</td>
                  <td style={{ fontSize: '10px', color: '#4b5563', textAlign: 'right' }}>Authorized Signatory</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <div className="no-print" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <button type="button" onClick={() => router.push('/purchase/po')} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              <Printer size={16} /> Print PO
            </button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
              {editId ? 'Update PO' : 'Save PO'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreatePO() {
  return <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}><CreatePOContent /></Suspense>;
}