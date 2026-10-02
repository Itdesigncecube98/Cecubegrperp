'use client';
import { useState, useEffect, useMemo, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Eye, EyeOff, CalendarCheck, Plus, Edit2, Trash2, X, PanelLeft, PanelLeftClose, ChevronLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';

const TABS = [
  { key: 'basic', label: 'Basic Details' },
  { key: 'job', label: 'Job Details' },
  { key: 'contact', label: 'Contact Details' },
  { key: 'dependent', label: 'Dependent Details' },
  { key: 'education', label: 'Education' },
  { key: 'experience', label: 'Experience' },
  { key: 'bank', label: 'Bank Details' },
  { key: 'documents', label: 'Documents' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'location', label: 'Location' },
  { key: 'offdays', label: 'Off Days' },
  { key: 'salary', label: 'Salary Info' }
];

const calculateRevisionCtc = (revision) => {
  if (!revision?.components?.length) return null;

  const earningTotal = revision.components.reduce((total, component) => {
    const headType = component.salaryHead?.headType?.name?.toLowerCase() || '';
    return headType === 'earning' ? total + (Number(component.amount) || 0) : total;
  }, 0);
  const employerPf = revision.components.reduce((total, component) => {
    const headName = component.salaryHead?.description?.toLowerCase() || '';
    return headName === 'employer pf' ? total + (Number(component.amount) || 0) : total;
  }, 0);
  const monthlyCtc = earningTotal + employerPf;

  return monthlyCtc > 0
    ? { monthlyCtc: monthlyCtc.toFixed(2), annualCtc: (monthlyCtc * 12).toFixed(2), earningTotal, employerPf }
    : null;
};

const getOrganizationCode = (organization) => {
  const name = String(organization || '').trim().toLowerCase();
  if (name.includes('green energy')) return { prefix: 'CGEPL', width: 2 };
  if (name.includes('cecube') && name.includes('engineering')) return { prefix: 'CEIPL', width: 3 };
  return null;
};

export default function EmployeeProfilePage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState('basic');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [siteOffices, setSiteOffices] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [grades, setGrades] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [showAddSalaryModal, setShowAddSalaryModal] = useState(false);
  const [religions, setReligions] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [salaryRevisions, setSalaryRevisions] = useState([]);
  const [activeRevisionIndex, setActiveRevisionIndex] = useState(0);
  const [newRevisionForm, setNewRevisionForm] = useState({ effectiveFrom: '', remark: '', components: {} });
  const [editingRevisionId, setEditingRevisionId] = useState(null);
  const [salaryHeads, setSalaryHeads] = useState([]);
  const [headTypes, setHeadTypes] = useState([]);
  const [leavingReasons, setLeavingReasons] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [docUploadDates, setDocUploadDates] = useState({});
  const [docUploadDetails, setDocUploadDetails] = useState({});
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminateForm, setTerminateForm] = useState({ date: '', reasonId: '' });
  const [weekoffTypes, setWeekoffTypes] = useState([]);
  const ctcSaveTimerRef = useRef(null);
  const [ctcAutoSaving, setCtcAutoSaving] = useState(false);

  const normalizeGender = (value) => {
    const gender = String(value ?? '').trim();
    if (!gender) return '';
    const normalized = gender.toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'Male';
    if (normalized === 'female' || normalized === 'f') return 'Female';
    return 'Other';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [supRes, deptRes, branchRes, siteRes, orgRes, gradeRes, desigRes, relRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/synchronization?type=departments'),
        fetch('/api/synchronization?type=branches'),
        fetch('/api/synchronization?type=siteoffices'),
        fetch('/api/synchronization?type=organizations'),
        fetch('/api/synchronization?type=grades'),
        fetch('/api/synchronization?type=designations'),
        fetch('/api/synchronisation2/religion')
      ]);
      
      const sups = await supRes.json();
      const supList = Array.isArray(sups) ? sups : [];
      setAllEmployees(supList);
      setSupervisors(supList.filter(s => s.id !== id));
      
      const depts = await deptRes.json();
      setDepartments(Array.isArray(depts) ? depts : []);
      
      const brnch = await branchRes.json();
      setBranches(Array.isArray(brnch) ? brnch : []);
      
      const sites = await siteRes.json();
      setSiteOffices(Array.isArray(sites) ? sites : []);
      
      const orgs = await orgRes.json();
      setOrganizations(Array.isArray(orgs) ? orgs : []);

      const grd = await gradeRes.json();
      setGrades(Array.isArray(grd) ? grd : []);
      
      const desigs = await desigRes.json();
      setDesignations(Array.isArray(desigs) ? desigs : []);

      const rels = await relRes.json();
      setReligions(Array.isArray(rels) ? rels : []);

      // Fetch Master Salary Data
      const [headsRes, headTypesRes, leavingReasonsRes, relationshipsRes, docTypesRes, shiftsRes, weekoffTypesRes] = await Promise.all([
        fetch('/api/setup/salary-heads'),
        fetch('/api/setup/head-types'),
        fetch('/api/setup/leaving-reasons'),
        fetch('/api/synchronisation2/relationship'),
        fetch('/api/synchronisation2/document-types'),
        fetch('/api/synchronisation2/shift'),
        fetch('/api/synchronisation2/weekoff-types')
      ]);
      const typesData = await headTypesRes.json();
      if (Array.isArray(typesData)) setHeadTypes(typesData);
      
      const headsData = await headsRes.json();
      if (Array.isArray(headsData)) setSalaryHeads(headsData.map(h => ({ ...h, category: h.headType?.name || 'Other' })));

      const reasonsData = leavingReasonsRes.ok
        ? await leavingReasonsRes.json().catch(() => [])
        : [];
      if (Array.isArray(reasonsData)) setLeavingReasons(reasonsData.filter(r => r.isActive));

      const relData = await relationshipsRes.json();
      if (Array.isArray(relData)) setRelationships(relData.filter(r => r.isActive));

      if (docTypesRes.ok) {
        const docTypesData = await docTypesRes.json();
        if (Array.isArray(docTypesData)) setDocumentTypes(docTypesData);
      }

      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        if (Array.isArray(shiftsData)) setAvailableShifts(shiftsData);
      }

      if (weekoffTypesRes.ok) {
        let weekoffData = await weekoffTypesRes.json();
        if (Array.isArray(weekoffData)) {
          const hasCecube = weekoffData.some(w => w.name.toLowerCase().includes('cecube'));
          if (!hasCecube) {
            weekoffData = [{ id: 'cecube-group-holidays', name: 'CeCube Group Holidays', days: [] }, ...weekoffData];
          }
          setWeekoffTypes(weekoffData);
        }
      }

      if (id === 'new') {
        const newEmp = { employmentStatus: 'Working', role: 'EMPLOYEE' };
        setEmployee(newEmp);
        setForm(newEmp);
      } else {
        const empRes = await fetch(`/api/employees/${id}`);
        const emp = await empRes.json();
        
        const decodedId = decodeURIComponent(id);
        if (emp.empId && decodedId !== emp.empId) {
          window.history.replaceState(null, '', `/dashboard/employees/${encodeURIComponent(emp.empId)}`);
        }
        
        setEmployee(emp);
        setForm({
          ...emp,
          monthlyCtc: emp.monthlyCtc || (emp.annualCtc ? (Number(emp.annualCtc) / 12).toFixed(2) : ''),
          dependents: emp.dependents || [],
          bankDetails: emp.bankDetails || [],
          workExperiences: emp.workExperiences || [],
          educations: emp.educations || [],
          assignedGpsLocations: emp.assignedGpsLocations || []
          ,emergencyContacts: emp.emergencyContacts?.length ? emp.emergencyContacts : (emp.emergencyContact || emp.emergencyPhone ? [{ name: emp.emergencyContact || '', phone: emp.emergencyPhone || '', relationship: '' }] : [])
        });

        // Fetch salary revisions
        try {
          const revsRes = await fetch(`/api/employees/${id}/salary`);
          if (revsRes.ok) {
            const revsData = await revsRes.json();
            if (Array.isArray(revsData)) {
              setSalaryRevisions(revsData);
              const calculatedCtc = calculateRevisionCtc(revsData[0]);
              if (calculatedCtc) {
                setForm(prev => ({
                  ...prev,
                  monthlyCtc: calculatedCtc.monthlyCtc,
                  annualCtc: calculatedCtc.annualCtc
                }));
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch salary revisions', e);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login/admin');
      return;
    }
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [router, fetchData]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const extractOcrText = async (file) => {
    const worker = await createWorker('eng');
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        const result = await worker.recognize(file);
        return result.data.text.trim();
      }

      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), disableWorker: true }).promise;
      const pageTexts = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const result = await worker.recognize(canvas);
        pageTexts.push(result.data.text.trim());
      }

      return pageTexts.filter(Boolean).join('\n\n');
    } finally {
      await worker.terminate();
    }
  };

  const extractDocumentNumber = (ocrText, documentName) => {
    const normalizedName = String(documentName || '').toLowerCase();
    const compactText = String(ocrText || '').replace(/\s+/g, ' ');

    if (normalizedName.includes('aadhaar') || normalizedName.includes('aadhar')) {
      const aadhaar = compactText.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
      return aadhaar ? aadhaar[0].replace(/[\s-]/g, '') : '';
    }

    if (normalizedName.includes('pan')) {
      const pan = compactText.match(/\b[A-Z]{5}\s?\d{4}\s?[A-Z]\b/i);
      return pan ? pan[0].replace(/\s/g, '').toUpperCase() : '';
    }

    if (normalizedName.includes('passport')) {
      const passport = compactText.match(/\b[A-Z][0-9]{7}\b/i);
      return passport ? passport[0].toUpperCase() : '';
    }

    return '';
  };

  const handleDocUpload = async (docType, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !employee?.id) return;

    const oversizedFile = files.find(file => file.size > 2 * 1024 * 1024);
    if (oversizedFile) {
      showToast(`"${oversizedFile.name}" exceeds the 2MB limit`, 'error');
      e.target.value = null;
      return;
    }

    const effDate = docUploadDates[docType.id] || '';
    const docDetails = docUploadDetails[docType.id] || {};

    try {
      let uploadSuccessCount = 0;
      setUploading(true);

      for (const file of files) {
        setOcrStatus(`Reading ${file.name}...`);
        const fileData = await readFileAsDataUrl(file);
        let ocrText = '';
        try {
          ocrText = await extractOcrText(file);
        } catch (ocrError) {
          console.warn(`OCR failed for ${file.name}`, ocrError);
        }
        const documentNumber = extractDocumentNumber(ocrText, docType.type);
        const normalizedDocumentName = String(docType.type || '').toLowerCase();
        if (documentNumber) {
          setDocUploadDetails(prev => ({
            ...prev,
            [docType.id]: { ...prev[docType.id], documentNumber }
          }));
        }
        if (documentNumber && (normalizedDocumentName.includes('aadhaar') || normalizedDocumentName.includes('aadhar'))) {
          set('aadharNo', documentNumber);
        }
        if (documentNumber && normalizedDocumentName.includes('pan')) {
          set('pan', documentNumber);
        }
        const payload = {
          employeeId: employee.id,
          documentType: docType.category || 'Employee',
          documentName: docType.type,
          effectiveDate: effDate || null,
          fileData,
          fileName: file.name,
          fileType: file.type,
          ocrText,
          documentNumber: documentNumber || docDetails.documentNumber || null,
          expiryDate: docDetails.expiryDate || null,
        };

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        uploadSuccessCount += 1;
      }

      showToast(uploadSuccessCount > 1 ? `${uploadSuccessCount} documents uploaded successfully!` : 'Document uploaded successfully!');
      await refreshEmployeeDocs();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
      setOcrStatus('');
      e.target.value = null;
    }
  };

  const formatDocumentDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const datePart = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
    return `${datePart}, ${timePart}`;
  };

  const handleView = (doc) => {
    if (doc.fileData) {
      if (doc.fileType?.includes('pdf') || doc.fileType?.includes('image')) {
        const newWindow = window.open();
        newWindow.document.write(`<iframe src="${doc.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        handleDownload(doc);
      }
    }
  };

  const refreshEmployeeDocs = async () => {
    try {
      const res = await fetch(`/api/employees/${id}`);
      const data = await res.json();
      if (!data.error) {
        setEmployee(data); // Refresh entire employee object smoothly
      }
    } catch (e) {
      console.error("Failed to refresh employee", e);
    }
  };

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ id: null, effectiveFrom: '', validTill: '', shiftId: '', remark: '' });

  const handleSaveShift = async () => {
    if (!shiftForm.effectiveFrom || !shiftForm.shiftId) {
      showToast('Please fill all required fields (Effective From, Shift Name)', 'error');
      return;
    }
    let adminName = 'HR Admin';
    try {
      const adminStr = sessionStorage.getItem('adminData');
      if (adminStr) adminName = JSON.parse(adminStr).name || 'HR Admin';
    } catch(e) {}
    
    const payload = { ...shiftForm, employeeId: employee?.id || id, modifiedBy: adminName };
    const method = shiftForm.id ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/employee-shifts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Shift ${shiftForm.id ? 'updated' : 'added'} successfully`);
        setShiftModalOpen(false);
        refreshEmployeeDocs();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to save shift', 'error');
      }
    } catch (e) {
      showToast('Failed to save shift', 'error');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      const res = await fetch(`/api/employee-shifts?id=${shiftId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Shift deleted successfully');
        refreshEmployeeDocs();
      } else {
        showToast('Failed to delete shift', 'error');
      }
    } catch (e) {
      showToast('Failed to delete shift', 'error');
    }
  };

  const handleDownload = (doc) => {
    if (doc.fileData) {
      const link = document.createElement('a');
      link.href = doc.fileData;
      link.download = doc.fileName || doc.documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Document deleted successfully!');
        await refreshEmployeeDocs();
      } else {
        showToast('Failed to delete document', 'error');
      }
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  const [savingDateDocId, setSavingDateDocId] = useState(null);

  const handleUpdateDocDate = async (docId, newDate) => {
    setSavingDateDocId(docId);
    try {
      const res = await fetch(`/api/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, effectiveDate: newDate })
      });
      if (res.ok) {
        showToast('Effective Date updated!');
        await refreshEmployeeDocs();
      } else {
        showToast('Failed to update date', 'error');
      }
    } catch (err) {
      showToast('Failed to update date', 'error');
    }
    setSavingDateDocId(null);
  };

  const duplicateEmpCodeOwner = useMemo(() => {
    const code = (form.empId || '').toString().trim().toLowerCase();
    if (!code) return null;
    return allEmployees.find(e => 
      e.id !== (employee?.id || (id !== 'new' ? id : null)) && 
      (e.empId || '').toString().trim().toLowerCase() === code
    ) || null;
  }, [form.empId, allEmployees, employee?.id, id]);

  const isEmpCodeDuplicate = Boolean(duplicateEmpCodeOwner);

  const handleSave = async () => {
    if (isEmpCodeDuplicate) {
      showToast(`Employee Code "${(form.empId || '').trim()}" is already assigned to ${duplicateEmpCodeOwner.name}. Employee Code cannot be duplicated.`, 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        password: String(form.password ?? '').trim() || undefined,
        nationality: String(form.nationality ?? '').trim() === 'Other' && String(form.nationalityOther ?? '').trim()
          ? 'Other'
          : String(form.nationality ?? '').trim(),
        nationalityOther: String(form.nationalityOther ?? '').trim() || undefined
      };
      const url = id === 'new' ? '/api/employees' : `/api/employees/${id}`;
      const method = id === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        setEmployee(data);
        showToast(id === 'new' ? 'Employee added successfully!' : 'Profile updated successfully!');
        if (id === 'new') {
          setTimeout(() => router.push(`/dashboard/employees/${data.id}`), 1000);
        }
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (e) {
      showToast('Error saving profile.', 'error');
    }
    setSaving(false);
  };

  const queueCtcAutoSave = (nextValues) => {
    setForm(prev => ({ ...prev, ...nextValues }));
    if (id === 'new') return;

    if (ctcSaveTimerRef.current) clearTimeout(ctcSaveTimerRef.current);
    ctcSaveTimerRef.current = setTimeout(async () => {
      setCtcAutoSaving(true);
      try {
        const response = await fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextValues)
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || 'Failed to save CTC');
        setEmployee(prev => ({ ...prev, ...nextValues }));
      } catch (error) {
        console.error('Failed to auto-save CTC', error);
        showToast('CTC auto-save failed. Please try again.', 'error');
      } finally {
        setCtcAutoSaving(false);
      }
    }, 700);
  };

  useEffect(() => () => {
    if (ctcSaveTimerRef.current) clearTimeout(ctcSaveTimerRef.current);
  }, []);

  const f = (field) => form[field] || '';
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleTerminate = async () => {
    if (!terminateForm.date || !terminateForm.reasonId) {
      showToast('Please select a date and reason', 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/employees/${id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminationDate: terminateForm.date,
          leavingReasonId: terminateForm.reasonId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Employee terminated successfully');
        setShowTerminateModal(false);
        fetchData();
      } else {
        showToast(data.error || 'Failed to terminate', 'error');
      }
    } catch (e) {
      showToast('Error terminating employee', 'error');
    }
    setSaving(false);
  };

  const handleSaveRevision = async () => {
    try {
      setSaving(true);
      const components = Object.entries(newRevisionForm.components).map(([salaryHeadId, amount]) => ({
        salaryHeadId,
        amount,
        rule: '(None)'
      }));
      const payload = {
        effectiveFrom: newRevisionForm.effectiveFrom,
        remark: newRevisionForm.remark,
        components
      };

      let res;
      if (editingRevisionId) {
        // Update existing revision
        res = await fetch(`/api/employees/${id}/salary`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revisionId: editingRevisionId, ...payload })
        });
      } else {
        // Create new revision
        res = await fetch(`/api/employees/${id}/salary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingRevisionId ? 'Salary revision updated!' : 'Salary revision saved!');
        setShowAddSalaryModal(false);
        setEditingRevisionId(null);
        fetchData();
      } else {
        showToast('Failed to save salary revision', 'error');
      }
    } catch (e) {
      showToast('Error saving salary revision', 'error');
    }
    setSaving(false);
  };

  const handleEditRevision = (rev) => {
    // Pre-fill the form with existing revision data
    const comps = {};
    rev.components.forEach(c => {
      comps[c.salaryHeadId] = c.amount;
    });
    setNewRevisionForm({
      effectiveFrom: rev.effectiveFrom || '',
      remark: rev.remark || '',
      components: comps
    });
    setEditingRevisionId(rev.id);
    setShowAddSalaryModal(true);
  };

  const handleDeleteRevision = async (revId) => {
    if (!window.confirm('Are you sure you want to delete this salary revision?')) return;
    try {
      const res = await fetch(`/api/employees/${id}/salary?revisionId=${revId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Revision deleted!');
        setActiveRevisionIndex(0);
        fetchData();
      } else {
        showToast('Failed to delete revision', 'error');
      }
    } catch (e) {
      showToast('Error deleting revision', 'error');
    }
  };

  // Style constants
  const labelSm = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' };
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const disabledInputStyle = { ...inputStyle, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' };

  // Employment-status badge colours, mirroring the employee list page so the
  // profile header reflects the real status instead of always reading "WORKING".
  const statusBadgeStyle = (status) => {
    const current = status || 'Working';
    if (['Resigned', 'Retired', 'Terminated', 'Inactive'].includes(current)) return { background: '#fee2e2', color: '#b91c1c' };
    if (current === 'Transfer') return { background: '#fff7ed', color: '#c2410c' };
    if (current === 'Apprenticeship') return { background: '#e0f2fe', color: '#0369a1' };
    return { background: '#dcfce7', color: '#166534' };
  };

  // Completed years of age for a "YYYY-MM-DD" string, or null when unusable.
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
    return age;
  };

  const handleDateOfBirthChange = (value) => {
    set('dateOfBirth', value);
    const age = calculateAge(value);
    if (age !== null && age > 60) {
      showToast(`Date of Birth indicates the employee is ${age} years old (above 60). Please verify.`, 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      const result = await res.json();
      if (result.url) {
        setForm(prev => ({ ...prev, photoUrl: result.url }));
        setEmployee(prev => ({ ...prev, photoUrl: result.url }));
        showToast('Photo uploaded successfully!');
      }
    } catch(err) {
      console.error(err);
      showToast('Error uploading photo', 'error');
    }
    setUploading(false);
    e.target.value = '';
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading employee profile...</div>;
  if (!employee) return <div style={{ padding: '2rem' }}>Employee not found.</div>;

  const handleSendLoginInstruction = async () => {
    try {
      const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cecubeerp.duckdns.org';
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Your Portal Login Instructions',
          message: `Hello ${employee.name},\n\nYour login instructions for the Cecube HR portal are as follows:\n\nPortal Login URL: ${dashboardUrl}/login\nEmployee App Login URL: ${dashboardUrl}/employeedashboard/login\nEmployee Code: ${employee.empId}\nEmail: ${employee.email}\nPassword: ${employee.password || 'Please contact HR to set a password.'}\n\nPlease keep this information secure.\n\nBest regards,\nHR Department`,
          recipientIds: [employee.id],
          emailType: 'login-instruction'
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast('Login instructions sent via email!');
      } else {
        showToast(result.error || 'Failed to send email', 'error');
      }
    } catch (err) {
      showToast('Error sending login instructions', 'error');
    }
  };

  const handleExportProfileExcel = () => {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Employee Code', employee.empId || ''],
      ['Name', employee.name || ''],
      ['Father Name', employee.fatherName || ''],
      ['Official Email', employee.email || ''],
      ['Personal Email', employee.otherEmail || ''],
      ['Official Phone', employee.workTelephone || ''],
      ['Personal Phone', employee.phone || ''],
      ['Department', employee.department || ''],
      ['Designation', employee.designation || ''],
      ['Branch', employee.branch || ''],
      ['Organization', employee.organisation || ''],
      ['Role', employee.role || ''],
      ['Employee Type', employee.employeeType || ''],
      ['Status', employee.employmentStatus || ''],
      ['Joined Date', employee.joinedDate || ''],
      ['Date of Birth', employee.dateOfBirth || ''],
      ['Gender', employee.gender || ''],
      ['Marital Status', employee.maritalStatus || ''],
      ['Blood Group', employee.bloodGroup || ''],
      ['Languages Known', `Read: ${employee.langRead || '-'}, Write: ${employee.langWrite || '-'}, Speak: ${employee.langSpeak || '-'}`],
      ['Passport No', employee.passportNo || ''],
      ['Identification Mark', employee.identificationMark || ''],
      ['Charge Type', employee.chargeType || ''],
      ['Supervisor', employee.supervisor?.name || ''],
      ['Grade', employee.grade || ''],
      ['Address', `${employee.addressStreet1 || ''} ${employee.addressStreet2 || ''}, ${employee.city || ''}, ${employee.state || ''} ${employee.zipCode || ''}`.trim() || employee.address || ''],
      ['Emergency Contacts', (employee.emergencyContacts || []).map(c => `${c.name || ''} (${c.phone || ''})`).join(' | ') || `${employee.emergencyContact || ''} (${employee.emergencyPhone || ''})`],
      ['Employment Status', employee.employmentStatus || 'Working'],
      ['Termination Date', employee.employmentToDate || ''],
      ['PAN / PAYE', employee.pan || ''],
      ['Aadhar No', employee.aadharNo || ''],
      ['UAN Number', employee.uan || ''],
      ['Bank Name', employee.bankName || ''],
      ['Bank Account No', employee.bankAccountNo || ''],
      ['IFSC Code', employee.ifscCode || ''],
      ['Annual CTC', employee.annualCtc || ''],
      ['Basic Salary', employee.basicSalary || ''],
      ['HRA', employee.hra || ''],
      ['Conveyance', employee.conveyance || ''],
      ['Medical', employee.medical || ''],
      ['Special Allowance', employee.specialAllowance || ''],
      ['Bonus', employee.bonus || ''],
      ['Deductions', employee.deductions || ''],
      ['PF Employee (%)', employee.pfEmployee || ''],
      ['PF Employer (%)', employee.pfEmployer || ''],
      ['Professional Tax', employee.professionalTax || ''],
      ['TDS / Income Tax', employee.tds || ''],
      ['ESIC No', employee.esicNo || ''],
      ['Work Experience', (employee.workExperiences || []).map(w => `${w.jobTitle} at ${w.companyName} (${w.fromDate} to ${w.toDate})`).join(' | ')],
      ['Family / Dependents', (employee.dependents || []).map(d => `${d.name} (${d.relationship}) - Ph: ${d.phone || 'N/A'}`).join(' | ')]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Profile");
    XLSX.writeFile(workbook, `${employee.name || 'employee'}_profile.xlsx`);
  };

  return (
    <>
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Back Bar */}
      <div className="em-save-bar hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard/employees')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to EmployeeList
          </button>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <button 
            type="button"
            onClick={() => setShowSidebar(prev => !prev)} 
            style={{ 
              background: showSidebar ? '#f8fafc' : '#eff6ff', 
              border: showSidebar ? '1px solid #cbd5e1' : '1px solid #38bdf8', 
              color: showSidebar ? '#475569' : '#0284c7', 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'all 0.15s ease'
            }}
            title={showSidebar ? 'Hide Sections Sidebar' : 'Show Sections Sidebar'}
          >
            {showSidebar ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            <span>{showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.open(`/employee-card/${employee.id}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'none', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            🪪 View Card
          </button>
          <button onClick={handleExportProfileExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', background: 'none', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
            🖨️ Export Profile Excel
          </button>
          {employee?.employmentStatus !== 'Terminated' && id !== 'new' && (
            <button onClick={() => setShowTerminateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              Terminate
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <style>{`.profile-photo-container:hover .photo-overlay { opacity: 1 !important; }`}</style>
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div className="profile-photo-container" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: 'white', overflow: 'hidden', position: 'relative' }}>
                {employee.photoUrl ? (
                  <>
                    <img src={employee.photoUrl} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                    <div style={{ width: '100%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center' }}>{employee.name?.charAt(0).toUpperCase()}</div>
                  </>
                ) : (
                  employee.name?.charAt(0).toUpperCase()
                )}
                <div className="photo-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', color: 'white' }} title="Upload Photo">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{id === 'new' ? 'New Employee' : [employee.title, employee.name].filter(Boolean).join(' ')}</h2>
              {id !== 'new' && (
                <>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{employee.empId || 'N/A'}</span>
                  <span style={{ ...statusBadgeStyle(employee.employmentStatus), padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{(employee.employmentStatus || 'Working').toUpperCase()}</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[
                { label: 'Supervisor', value: employee.supervisor?.name || '—' },
                { label: '📱 Mobile', value: employee.phone || '—' },
                { label: '✉ E-Mail', value: employee.email },
                { label: 'Joined Date', value: employee.joinedDate ? employee.joinedDate.split('-').reverse().join('-') : '—' },
                { label: 'Designation', value: employee.designation || '—' },
                { label: 'Branch', value: employee.branch || '—' },
                { label: 'Department', value: employee.department || '—' },
                { label: 'Site Office', value: employee.siteOffice || '—' },
                { label: 'Organisation', value: employee.organisation || 'Cecube Engineering India Pvt Ltd' },
              ].map(({ label, value }) => (
                <div key={label} style={{ fontSize: '12px' }}>
                  <div style={{ color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>{value}</div>
                </div>
              ))}
            </div>
            {id !== 'new' && (
              <button onClick={handleSendLoginInstruction} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                Send Login Instruction
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', maxWidth: '1200px', margin: '24px auto', gap: '20px', padding: '0 24px' }}>
        {/* Left Sidebar */}
        {showSidebar && (
          <div style={{ width: '240px', flexShrink: 0 }}>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sections</span>
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  title="Hide Sidebar"
                >
                  <ChevronLeft size={14} /> Hide
                </button>
              </div>
              {TABS.map((tab, i) => (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: activeTab === tab.key ? '#f0f9ff' : 'white',
                    border: 'none',
                    borderLeft: activeTab === tab.key ? '4px solid #007bff' : '4px solid transparent',
                    borderBottom: i < TABS.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    fontSize: '13px',
                    color: activeTab === tab.key ? '#007bff' : '#374151',
                    transition: '0.2s',
                    textAlign: 'left'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{ color: '#9ca3af' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Content */}
        <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '28px' }}>
          {!showSidebar && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => setShowSidebar(true)} 
                style={{ 
                  background: '#f0f9ff', 
                  border: '1px solid #bae6fd', 
                  color: '#0284c7', 
                  cursor: 'pointer', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <PanelLeft size={15} /> <span>Show Sidebar</span>
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Go to Section:</span>
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  {TABS.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {activeTab === 'basic' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600, color: '#111827' }}>Basic Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelSm}>Title & Name</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select value={['Mr.', 'Mrs.', 'Ms.', ''].includes(f('title') || '') ? (f('title') || '') : 'Other'} onChange={e => {
                         if(e.target.value !== 'Other') {
                           set('title', e.target.value);
                         } else {
                           set('title', 'Other...'); // arbitrary value to trigger the input box
                         }
                      }} style={{ ...inputStyle, width: '100px', padding: '10px 8px' }}>
                        <option value="">Title</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Other">Other</option>
                      </select>
                      {!['Mr.', 'Mrs.', 'Ms.', ''].includes(f('title') || '') && (
                        <input value={f('title') === 'Other...' ? '' : (f('title') || '')} onChange={e => set('title', e.target.value)} style={{ ...inputStyle, width: '100px' }} placeholder="Specify" />
                      )}
                      <input value={f('name') || ''} onChange={e => set('name', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Full Name" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={labelSm}>Employee Code</label>
                      {isEmpCodeDuplicate && (
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                          ⚠️ Already in use by {duplicateEmpCodeOwner?.name}
                        </span>
                      )}
                    </div>
                    <input 
                      value={f('empId') || ''} 
                      onChange={e => set('empId', e.target.value)} 
                      style={{
                        ...inputStyle,
                        borderColor: isEmpCodeDuplicate ? '#ef4444' : inputStyle.borderColor,
                        backgroundColor: isEmpCodeDuplicate ? '#fef2f2' : (inputStyle.backgroundColor || 'white')
                      }} 
                      placeholder="e.g. CEIPL084"
                    />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Date of Birth</label>
                    <input type="date" value={f('dateOfBirth')} onChange={e => handleDateOfBirthChange(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSm}>Employment Status</label>
                    <select value={f('employmentStatus') || 'Working'} onChange={e => set('employmentStatus', e.target.value)} style={inputStyle}>
                      <option value="Working">Working</option>
                      <option value="Apprenticeship">Apprenticeship</option>
                      <option value="Resigned">Resigned</option>
                      <option value="Retired">Retired</option>
                      <option value="Terminated">Terminated</option>
                      <option value="Transfer">Transfer</option>
                    </select>
                  </div>
                  {['Resigned', 'Retired', 'Terminated', 'Transfer', 'Inactive'].includes(f('employmentStatus')) && (
                    <div>
                      <label style={labelSm}>To Date (End Date)</label>
                      <input type="date" value={f('employmentToDate')} onChange={e => set('employmentToDate', e.target.value)} style={inputStyle} />
                    </div>
                  )}
                  <div>
                    <label style={labelSm}>Father Name</label>
                    <input value={f('fatherName')} onChange={e => set('fatherName', e.target.value)} style={inputStyle} placeholder="Father Name" />
                  </div>
                  <div>
                    <label style={labelSm}>Passport No</label>
                    <input value={f('passportNo')} onChange={e => set('passportNo', e.target.value)} style={inputStyle} placeholder="Passport No" />
                  </div>
                  <div>
                    <label style={labelSm}>Identification Mark</label>
                    <input value={f('identificationMark')} onChange={e => set('identificationMark', e.target.value)} style={inputStyle} placeholder="Identification Mark" />
                  </div>
                  <div>
                    <label style={labelSm}>Gender</label>
                    <select value={normalizeGender(f('gender'))} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Marital Status</label>
                    <select 
                      value={f('maritalStatus') === 'Single' ? 'Unmarried' : f('maritalStatus')} 
                      onChange={e => set('maritalStatus', e.target.value)} 
                      style={inputStyle}
                    >
                      <option value="">Select</option>
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Nationality</label>
                    <select
                      value={['Indian', 'Other'].includes(String(f('nationality') ?? '').trim()) ? f('nationality') : (String(f('nationality') ?? '').trim().toLowerCase() === 'india' || String(f('nationality') ?? '').trim().toLowerCase() === 'indian' ? 'Indian' : 'Other')}
                      onChange={e => set('nationality', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select</option>
                      <option value="Indian">Indian</option>
                      <option value="Other">Other</option>
                    </select>
                    {String(f('nationality') ?? '').trim() === 'Other' && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={labelSm}>Please specify</label>
                        <input
                          value={f('nationalityOther')}
                          onChange={e => set('nationalityOther', e.target.value)}
                          style={inputStyle}
                          placeholder="Enter nationality"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelSm}>Blood Group</label>
                    <select value={f('bloodGroup')} onChange={e => set('bloodGroup', e.target.value)} style={inputStyle}>
                      <option value="">Select</option>
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>O+</option><option>O-</option>
                      <option>AB+</option><option>AB-</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Charge Type</label>
                    <input value={f('chargeType')} onChange={e => set('chargeType', e.target.value)} style={inputStyle} placeholder="e.g. Regular" />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Read</label>
                    <input value={f('langRead')} onChange={e => set('langRead', e.target.value)} style={inputStyle} placeholder="e.g. English, Hindi" />
                  </div>
                  <div>
                    <label style={labelSm}>Write</label>
                    <input value={f('langWrite')} onChange={e => set('langWrite', e.target.value)} style={inputStyle} placeholder="e.g. English, Hindi" />
                  </div>
                  <div>
                    <label style={labelSm}>Speak</label>
                    <input value={f('langSpeak')} onChange={e => set('langSpeak', e.target.value)} style={inputStyle} placeholder="e.g. English, Hindi" />
                  </div>
                  <div>
                    <label style={labelSm}>NDA No</label>
                    <input value={f('ndaNo')} onChange={e => set('ndaNo', e.target.value)} style={inputStyle} placeholder="NDA Number" />
                  </div>
                </div>


              </div>
            </div>
          )}

          {activeTab === 'job' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Job Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelSm}>Designation</label>
                  <select value={f('designation') || ''} onChange={e => set('designation', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Designation --</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                        {d.description ? ` — ${d.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Position (Type manually)</label>
                  <input value={f('position') || ''} onChange={e => set('position', e.target.value)} style={inputStyle} placeholder="e.g. Site Engineer, Accountant" />
                </div>
                <div>
                  <label style={labelSm}>Date of Joining</label>
                  <input type="date" value={f('joinedDate')} onChange={e => {
                      const newJoinedDate = e.target.value;
                      set('joinedDate', newJoinedDate);
                      if (f('probationPeriod') && !isNaN(f('probationPeriod')) && newJoinedDate) {
                         const jd = new Date(newJoinedDate);
                         jd.setMonth(jd.getMonth() + parseInt(f('probationPeriod'), 10));
                         set('confirmationDate', jd.toISOString().split('T')[0]);
                      }
                  }} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Organization</label>
                  <select 
                    value={f('organisation') || ''} 
                    onChange={e => {
                      const organisation = e.target.value;
                      set('organisation', organisation);
                      if (id === 'new') {
                        const selectedOrg = organizations.find(org => org.name === organisation);
                        const configuredCode = getOrganizationCode(organisation);
                        const prefix = configuredCode?.prefix || selectedOrg?.code?.trim().toUpperCase();
                        const codeWidth = configuredCode?.width || 3;
                        if (prefix) {
                          const usedNumbers = allEmployees
                            .map(employee => {
                              const match = (employee.empId || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
                              return match ? Number(match[1]) : 0;
                            });
                          const nextNumber = Math.max(0, ...usedNumbers) + 1;
                          set('empId', `${prefix}${String(nextNumber).padStart(codeWidth, '0')}`);
                        }
                      }
                    }} 
                    style={inputStyle}
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.name}>{org.name}{org.code ? ` (${org.code})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Department</label>
                  <select value={f('department') || ''} onChange={e => set('department', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Department --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Branch</label>
                  <select value={f('branch') || ''} onChange={e => set('branch', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Branch --</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.name}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Site Office</label>
                  <select value={f('siteOffice') || ''} onChange={e => set('siteOffice', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Site Office --</option>
                    <option value="Not Applicable">Not Applicable</option>
                    {siteOffices.map(site => (
                      <option key={site.id} value={site.name}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Grade {f('designation') ? `(for ${f('designation')})` : ''}</label>
                  <select value={f('grade') || ''} onChange={e => set('grade', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Grade --</option>
                    {(f('designation')
                      ? grades.filter(g => g.designation === f('designation'))
                      : grades
                    ).map(g => (
                      <option key={g.id} value={g.name}>
                        {f('designation') ? g.name : `[${g.designation || 'No Designation'}] ${g.name}`}
                        {g.description ? ` — ${g.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Employee Type</label>
                  <select value={f('employeeType')} onChange={e => set('employeeType', e.target.value)} style={inputStyle}>
                    <option value="">Select Type</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Trainee">Trainee</option>
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Probation Period (Months)</label>
                  <input 
                    type="number"
                    min="0"
                    value={f('probationPeriod') || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      set('probationPeriod', val);
                      if (val && !isNaN(val) && f('joinedDate')) {
                         const jd = new Date(f('joinedDate'));
                         jd.setMonth(jd.getMonth() + parseInt(val, 10));
                         set('confirmationDate', jd.toISOString().split('T')[0]);
                      } else {
                         set('confirmationDate', '');
                      }
                    }} 
                    style={inputStyle} 
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label style={labelSm}>Confirmation Date</label>
                  <input type="date" value={f('confirmationDate') || ''} onChange={e => set('confirmationDate', e.target.value)} style={inputStyle} />
                </div>

                <div>
                  <label style={labelSm}>Portal Login Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={f('password')} 
                      onChange={e => set('password', e.target.value)} 
                      placeholder="••••••••" 
                      style={{ ...inputStyle, paddingRight: '40px' }} 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <label style={labelSm}>Job Description</label>
                <textarea 
                  value={f('jobDescription')} 
                  onChange={e => set('jobDescription', e.target.value)} 
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} 
                  placeholder="Enter detailed job description here..."
                />
              </div>
              {employee.jobHistories && employee.jobHistories.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#374151' }}>Transfer & Promotion Timeline</h4>
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 500 }}>From Date</th>
                          <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 500 }}>To Date</th>
                          <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 500 }}>Designation</th>
                          <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 500 }}>Department</th>
                          <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 500 }}>Branch</th>
                          <th style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 500 }}>Site Office</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.jobHistories.map((h, i) => (
                          <tr key={h.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 16px', color: '#111827' }}>
                              {h.fromDate ? h.fromDate.split('T')[0].split('-').reverse().join('-') : ''}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#111827' }}>
                              {h.toDate ? h.toDate.split('T')[0].split('-').reverse().join('-') : <span style={{color:'#10b981', fontWeight:500}}>Current</span>}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{h.designation || '-'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{h.department || '-'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{h.branch || '-'}</td>
                            <td style={{ padding: '12px 16px', color: '#374151' }}>{h.siteOffice || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div style={{ marginTop: '24px' }}>
                <label style={labelSm}>Supervisor</label>
                <select value={f('supervisorId') || ''} onChange={e => set('supervisorId', e.target.value || null)} style={{ ...inputStyle, maxWidth: '400px' }}>
                  <option value="">-- No Supervisor --</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.empId || s.id})</option>)}
                </select>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>Current supervisor: <strong>{employee.supervisor?.name || 'None assigned'}</strong></p>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Contact Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelSm}>COMPANY EMAIL ADDRESS</label>
                  <input type="email" value={f('email')} onChange={e => set('email', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>COMPANY MOBILE NUMBER</label>
                  <input type="text" value={f('workTelephone')} onChange={e => set('workTelephone', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelSm}>PERSONAL EMAIL ADDRESS</label>
                  <input type="email" value={f('otherEmail')} onChange={e => set('otherEmail', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>PERSONAL MOBILE NUMBER</label>
                  <input type="text" value={f('phone')} onChange={e => set('phone', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelSm}>PERMANENT ADDRESS</label>
                  <textarea value={f('address')} onChange={e => set('address', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Permanent address..." />
                </div>
                <div>
                  <label style={labelSm}>COMMUNICATION ADDRESS</label>
                  <textarea value={f('addressStreet1')} onChange={e => set('addressStreet1', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Communication address..." />
                </div>
              </div>
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600 }}>Emergency Contacts (up to 3)</h4>
                {(f('emergencyContacts') || []).map((contact, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}>
                    <div><label style={labelSm}>Name</label><input value={contact.name || ''} onChange={e => set('emergencyContacts', (f('emergencyContacts') || []).map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} style={inputStyle} /></div>
                    <div><label style={labelSm}>Phone</label><input value={contact.phone || ''} onChange={e => set('emergencyContacts', (f('emergencyContacts') || []).map((item, i) => i === idx ? { ...item, phone: e.target.value } : item))} style={inputStyle} /></div>
                    <div><label style={labelSm}>Relationship</label><input value={contact.relationship || ''} onChange={e => set('emergencyContacts', (f('emergencyContacts') || []).map((item, i) => i === idx ? { ...item, relationship: e.target.value } : item))} style={inputStyle} /></div>
                    <button type="button" onClick={() => set('emergencyContacts', (f('emergencyContacts') || []).filter((_, i) => i !== idx))} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px' }}>Remove</button>
                  </div>
                ))}
                {(f('emergencyContacts') || []).length < 3 && <button type="button" onClick={() => set('emergencyContacts', [...(f('emergencyContacts') || []), { name: '', phone: '', relationship: '' }])} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Emergency Contact</button>}
              </div>
            </div>
          )}

          {activeTab === 'dependent' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Dependent Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      dependents: [...(prev.dependents || []), { name: '', relationship: '', dateOfBirth: '', phone: '' }]
                    }));
                  }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    + Add Dependent
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {saving ? 'Saving...' : 'Save Dependents'}
                  </button>
                </div>
              </div>
              
              {(!form.dependents || form.dependents.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No dependents added yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {form.dependents.map((dep, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                      <button onClick={() => {
                        setForm(prev => {
                          const newDeps = [...prev.dependents];
                          newDeps.splice(idx, 1);
                          return { ...prev, dependents: newDeps };
                        });
                      }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        Remove
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingRight: '40px' }}>
                        <div>
                          <label style={labelSm}>Name</label>
                          <input value={dep.name} onChange={e => {
                            setForm(prev => {
                              const newDeps = [...prev.dependents];
                              newDeps[idx].name = e.target.value;
                              return { ...prev, dependents: newDeps };
                            });
                          }} style={inputStyle} placeholder="Full Name" />
                        </div>
                        <div>
                          <label style={labelSm}>Relationship</label>
                          <select value={dep.relationship} onChange={e => {
                            setForm(prev => {
                              const newDeps = [...prev.dependents];
                              newDeps[idx].relationship = e.target.value;
                              return { ...prev, dependents: newDeps };
                            });
                          }} style={inputStyle}>
                            <option value="">Select</option>
                            {relationships.map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelSm}>Date of Birth</label>
                          <input type="date" value={dep.dateOfBirth} onChange={e => {
                            setForm(prev => {
                              const newDeps = [...prev.dependents];
                              newDeps[idx].dateOfBirth = e.target.value;
                              return { ...prev, dependents: newDeps };
                            });
                          }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelSm}>Phone</label>
                          <input value={dep.phone} onChange={e => {
                            setForm(prev => {
                              const newDeps = [...prev.dependents];
                              newDeps[idx].phone = e.target.value;
                              return { ...prev, dependents: newDeps };
                            });
                          }} style={inputStyle} placeholder="Phone Number" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'education' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Education Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      const newEd = [...(f('educations') || []), { institution: '', degree: '', course: '', year: '', grade: '' }];
                      set('educations', newEd);
                    }}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add Education
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {saving ? 'Saving...' : 'Save Education'}
                  </button>
                </div>
              </div>
              
              {!(f('educations') && f('educations').length > 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No education records found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(f('educations') || []).map((edu, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                      <button 
                        onClick={() => {
                          const newEd = [...f('educations')];
                          newEd.splice(idx, 1);
                          set('educations', newEd);
                        }}
                        style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={labelSm}>School / Institution</label>
                          <input value={edu.institution || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].institution = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. XYZ School" />
                        </div>
                        <div>
                          <label style={labelSm}>Degree Level</label>
                          <select value={edu.degree || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].degree = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle}>
                            <option value="">Select Level</option>
                            <option value="Class 10th">Class 10th</option>
                            <option value="Class 12th">Class 12th</option>
                            <option value="Diploma">Diploma</option>
                            <option value="Bachelors">Bachelors</option>
                            <option value="Masters">Masters</option>
                            <option value="MBA">MBA</option>
                            <option value="Ph.D">Ph.D</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelSm}>Course / Specialization</label>
                          <input value={edu.course || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].course = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. B.Tech in CSE" />
                        </div>
                        <div>
                          <label style={labelSm}>Year of Passing</label>
                          <input type="text" value={edu.year || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].year = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. 2020" />
                        </div>
                        <div>
                          <label style={labelSm}>Grade / Percentage</label>
                          <input type="text" value={edu.grade || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].grade = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. 85%" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'experience' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Work Experience</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => {
                      const newExp = [...(f('workExperiences') || []), { companyName: '', jobTitle: '', fromDate: '', toDate: '', jobDescription: '' }];
                      set('workExperiences', newExp);
                    }}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add Experience
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {saving ? 'Saving...' : 'Save Experience'}
                  </button>
                </div>
              </div>
              
              {!(f('workExperiences') && f('workExperiences').length > 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No experience records found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(f('workExperiences') || []).map((exp, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                      <button 
                        onClick={() => {
                          const newExp = [...f('workExperiences')];
                          newExp.splice(idx, 1);
                          set('workExperiences', newExp);
                        }}
                        style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={labelSm}>Company Name</label>
                          <input value={exp.companyName || ''} onChange={e => {
                            const newExp = [...f('workExperiences')];
                            newExp[idx].companyName = e.target.value;
                            set('workExperiences', newExp);
                          }} style={inputStyle} placeholder="E.g. XYZ Corp" />
                        </div>
                        <div>
                          <label style={labelSm}>Job Title</label>
                          <input value={exp.jobTitle || ''} onChange={e => {
                            const newExp = [...f('workExperiences')];
                            newExp[idx].jobTitle = e.target.value;
                            set('workExperiences', newExp);
                          }} style={inputStyle} placeholder="E.g. Software Engineer" />
                        </div>
                        <div>
                          <label style={labelSm}>From Date</label>
                          <input type="date" value={exp.fromDate || ''} onChange={e => {
                            const newExp = [...f('workExperiences')];
                            newExp[idx].fromDate = e.target.value;
                            set('workExperiences', newExp);
                          }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelSm}>To Date</label>
                          <input type="date" value={exp.toDate || ''} onChange={e => {
                            const newExp = [...f('workExperiences')];
                            newExp[idx].toDate = e.target.value;
                            set('workExperiences', newExp);
                          }} style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bank' && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Statutory Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={labelSm}>PAN Number</label>
                    <input value={f('pan')} onChange={e => set('pan', e.target.value)} style={inputStyle} placeholder="E.g. ABCDE1234F" />
                  </div>
                  <div>
                    <label style={labelSm}>Aadhaar Number</label>
                    <input value={f('aadharNo')} onChange={e => set('aadharNo', e.target.value)} style={inputStyle} placeholder="12-digit Aadhaar" />
                  </div>
                  <div>
                    <label style={labelSm}>UAN Number</label>
                    <input value={f('uan')} onChange={e => set('uan', e.target.value)} style={inputStyle} placeholder="12-digit UAN" />
                  </div>
                  <div>
                    <label style={labelSm}>ESIC No</label>
                    <input value={f('esicNo')} onChange={e => set('esicNo', e.target.value)} style={inputStyle} placeholder="ESIC Number" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Account Linking</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={labelSm}>Debit Account</label>
                    <input value={f('debitAccount')} onChange={e => set('debitAccount', e.target.value)} style={inputStyle} placeholder="e.g. AAYUSHEE VARSHNEY_CEIPL084" />
                  </div>
                  <div>
                    <label style={labelSm}>Credit Account</label>
                    <input value={f('creditAccount')} onChange={e => set('creditAccount', e.target.value)} style={inputStyle} placeholder="e.g. AAYUSHEE VARSHNEY_CEIPL084" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Bank Accounts</h3>
                <button 
                  onClick={() => {
                    const newBank = [...(f('bankDetails') || []), { bankName: '', accountName: '', accountNumber: '', ifscCode: '', branch: '', branchCode: '', address: '', isPrimary: false }];
                    set('bankDetails', newBank);
                  }}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Bank Account
                </button>
              </div>
              
              {!(f('bankDetails') && f('bankDetails').length > 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No bank records found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(f('bankDetails') || []).map((bank, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                      <button 
                        onClick={() => {
                          const newBank = [...f('bankDetails')];
                          newBank.splice(idx, 1);
                          set('bankDetails', newBank);
                        }}
                        style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={labelSm}>Bank Name</label>
                          <select value={bank.bankName || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].bankName = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle}>
                            <option value="">Select Bank Name</option>
                            <option value="State Bank of India">State Bank of India</option>
                            <option value="HDFC Bank">HDFC Bank</option>
                            <option value="ICICI Bank">ICICI Bank</option>
                            <option value="Axis Bank">Axis Bank</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelSm}>Account Name</label>
                          <input value={bank.accountName || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].accountName = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle} placeholder="Name as per bank" />
                        </div>
                        <div>
                          <label style={labelSm}>Account Number</label>
                          <input value={bank.accountNumber || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].accountNumber = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle} placeholder="Account Number" />
                        </div>
                        <div>
                          <label style={labelSm}>IFSC Code</label>
                          <input value={bank.ifscCode || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].ifscCode = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle} placeholder="IFSC" />
                        </div>
                        <div>
                          <label style={labelSm}>Branch</label>
                          <input value={bank.branch || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].branch = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle} placeholder="Branch Name" />
                        </div>
                        <div>
                          <label style={labelSm}>Branch Code</label>
                          <input value={bank.branchCode || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].branchCode = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle} placeholder="Branch Code" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelSm}>Address for Future Correspondence</label>
                          <textarea value={bank.address || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].address = e.target.value;
                            set('bankDetails', newBank);
                          }} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Bank Address" />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="checkbox" 
                            checked={bank.isPrimary || false} 
                            onChange={e => {
                              const newBank = [...f('bankDetails')].map((b, i) => ({
                                ...b,
                                isPrimary: i === idx ? e.target.checked : (e.target.checked ? false : b.isPrimary)
                              }));
                              set('bankDetails', newBank);
                            }} 
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                            id={`primary-bank-${idx}`}
                          />
                          <label htmlFor={`primary-bank-${idx}`} style={{ fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Make this the Primary Bank Account</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Employee Documents</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {documentTypes.map(docType => {
                  const docsForType = (employee?.documents || [])
                    .filter(d => d.documentName === docType.type)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                  const isSubmitted = docsForType.length > 0;
                  const latestDocDate = isSubmitted ? new Date(docsForType[0].createdAt).toLocaleDateString() : null;
                  
                  return (
                    <div key={docType.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{docType.type}</div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          backgroundColor: isSubmitted ? '#dcfce7' : '#fee2e2',
                          color: isSubmitted ? '#166534' : '#991b1b'
                        }}>
                          {isSubmitted ? `${docsForType.length} Submitted` : 'Not Submitted'}
                        </span>
                        {isSubmitted && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                            Latest: {latestDocDate}
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'left' }}>Document Number</label>
                        <input
                          type="text"
                          value={docUploadDetails[docType.id]?.documentNumber || ''}
                          onChange={e => setDocUploadDetails(prev => ({ ...prev, [docType.id]: { ...prev[docType.id], documentNumber: e.target.value } }))}
                          placeholder="Auto-filled by OCR"
                          disabled={uploading}
                          style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'left' }}>Expiry Date</label>
                        <input
                          type="date"
                          value={docUploadDetails[docType.id]?.expiryDate || ''}
                          onChange={e => setDocUploadDetails(prev => ({ ...prev, [docType.id]: { ...prev[docType.id], expiryDate: e.target.value } }))}
                          disabled={uploading}
                          style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Effective Date</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="date" 
                            value={docUploadDates[docType.id] !== undefined ? docUploadDates[docType.id] : ''} 
                            onChange={e => setDocUploadDates(prev => ({ ...prev, [docType.id]: e.target.value }))}
                            style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: isSubmitted ? '16px' : 0 }}>
                        <input 
                          type="file" 
                          id={`file-upload-${docType.id}`} 
                          style={{ display: 'none' }} 
                          multiple
                          onChange={(e) => handleDocUpload(docType, e)}
                        />
                        <label htmlFor={`file-upload-${docType.id}`} style={{ padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'inline-block' }}>
                          {uploading ? 'Reading...' : (isSubmitted ? 'Add More' : 'Upload')}
                        </label>
                      </div>
                      {uploading && ocrStatus && (
                        <div style={{ marginBottom: '12px', fontSize: '11px', color: '#2563eb' }}>{ocrStatus}</div>
                      )}

                      {isSubmitted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                          {docsForType.map((doc) => {
                            const docDateKey = `doc-${doc.id}`;
                            const currentEffectiveDate =
                              docUploadDates[docDateKey] !== undefined ? docUploadDates[docDateKey] : (doc.effectiveDate || '');

                            return (
                              <div key={doc.id} style={{ border: '1px solid #dbe4ee', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>{doc.fileName || doc.documentName}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                  Uploaded: {formatDocumentDateTime(doc.createdAt)}
                                </div>
                                {doc.ocrText && (
                                  <details style={{ marginTop: '10px' }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>View OCR text</summary>
                                    <pre style={{ margin: '8px 0 0', padding: '8px', maxHeight: '180px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', borderRadius: '4px', fontSize: '11px', color: '#334155' }}>{doc.ocrText}</pre>
                                  </details>
                                )}
                                <div style={{ marginTop: '10px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Effective Date</label>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <input
                                      type="date"
                                      value={currentEffectiveDate}
                                      onChange={e => setDocUploadDates(prev => ({ ...prev, [docDateKey]: e.target.value }))}
                                      style={{ flex: 1, minWidth: '120px', padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    />
                                    <button
                                      onClick={() => handleUpdateDocDate(doc.id, currentEffectiveDate)}
                                      disabled={savingDateDocId === doc.id}
                                      style={{ padding: '6px 12px', background: savingDateDocId === doc.id ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: savingDateDocId === doc.id ? 'not-allowed' : 'pointer' }}
                                    >
                                      {savingDateDocId === doc.id ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                  <button onClick={() => handleView(doc)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                    View
                                  </button>
                                  <button onClick={() => handleDownload(doc)} style={{ padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                    Download
                                  </button>
                                  <button onClick={() => handleDeleteDoc(doc.id)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {documentTypes.length === 0 && (
                  <div style={{ color: '#64748b' }}>No document types configured.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Shift Assignment</h3>
                <button 
                  onClick={() => {
                    setShiftForm({ id: null, effectiveFrom: '', validTill: '', shiftId: '', remark: '' });
                    setShiftModalOpen(true);
                  }}
                  style={{ background: '#0891b2', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead style={{ background: '#0891b2', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Effective From</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Valid Till</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Shift</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>In Time</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Out Time</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Remark</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>Modified By</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!employee?.shifts || employee.shifts.length === 0) ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No shift assignments found.</td>
                      </tr>
                    ) : (
                      employee.shifts.map((shift, idx) => (
                        <tr key={shift.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.effectiveFrom}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.validTill || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.shift?.shiftName || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.shift?.startTime || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.shift?.endTime || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.remark || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{shift.modifiedBy || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button onClick={() => { setShiftForm({ ...shift, shiftId: shift.shiftId.toString() }); setShiftModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#0891b2', cursor: 'pointer', marginRight: '8px' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteShift(shift.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Assigned GPS Locations</h3>
                <button onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    assignedGpsLocations: [...(prev.assignedGpsLocations || []), { location: employee.siteOffice || '', effectiveDate: '', budgetHead: '' }]
                  }));
                }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  + Add Location
                </button>
              </div>

              {(!form.assignedGpsLocations || form.assignedGpsLocations.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', marginBottom: '32px' }}>
                  No GPS locations assigned.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {form.assignedGpsLocations.map((loc, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                      <button onClick={() => {
                        setForm(prev => {
                          const newLocs = [...prev.assignedGpsLocations];
                          newLocs.splice(idx, 1);
                          return { ...prev, assignedGpsLocations: newLocs };
                        });
                      }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        Remove
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', paddingRight: '40px' }}>
                        <div>
                          <label style={labelSm}>Location</label>
                          <select value={loc.location || ''} onChange={e => {
                            setForm(prev => {
                              const newLocs = [...prev.assignedGpsLocations];
                              newLocs[idx].location = e.target.value;
                              return { ...prev, assignedGpsLocations: newLocs };
                            });
                          }} style={inputStyle}>
                            <option value="">Select Site Office</option>
                            {siteOffices.map(site => (
                              <option key={site.id} value={site.name}>{site.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelSm}>Effective Date</label>
                          <input type="date" value={loc.effectiveDate} onChange={e => {
                            setForm(prev => {
                              const newLocs = [...prev.assignedGpsLocations];
                              newLocs[idx].effectiveDate = e.target.value;
                              return { ...prev, assignedGpsLocations: newLocs };
                            });
                          }} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelSm}>Budget Head</label>
                          <input value={loc.budgetHead} onChange={e => {
                            setForm(prev => {
                              const newLocs = [...prev.assignedGpsLocations];
                              newLocs[idx].budgetHead = e.target.value;
                              return { ...prev, assignedGpsLocations: newLocs };
                            });
                          }} style={inputStyle} placeholder="Budget Head" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', marginBottom: '24px' }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Saving...' : 'Save Locations'}
                </button>
              </div>


            </div>
          )}

          {activeTab === 'offdays' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderBottom: 'none', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                <CalendarCheck size={16} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#475569' }}>Off Days</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#1e40af', color: 'white', padding: '12px', fontWeight: 500, borderRight: '1px solid #1e3a8a' }}>Template</th>
                    <th style={{ background: '#1e40af', color: 'white', padding: '12px', width: '50px', textAlign: 'center' }}>
                      <input type="checkbox" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weekoffTypes.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No week off types found.</td>
                    </tr>
                  ) : weekoffTypes.map((templateObj, idx) => {
                    const templateName = templateObj.name;
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{templateName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={form.offDaysTemplates ? form.offDaysTemplates.includes(templateName) : false} 
                            onChange={(e) => {
                              let current = form.offDaysTemplates || [];
                              if (e.target.checked) {
                                set('offDaysTemplates', [...current, templateName]);
                              } else {
                                set('offDaysTemplates', current.filter(t => t !== templateName));
                              }
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'salary' && (
            <div style={{ background: '#fff', borderRadius: '8px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarCheck size={20} color="#0ea5e9" />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Salary Info</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setNewRevisionForm({ effectiveFrom: new Date().toISOString().split('T')[0], remark: '', components: {} }); setShowAddSalaryModal(true); }} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
                    + Add Revision
                  </button>
                  <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    🖨️ Print
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #bae6fd', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <label style={{ ...labelSm, color: '#0369a1' }}>Annual CTC</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={f('annualCtc')}
                  onChange={e => {
                    const annualCtc = e.target.value;
                    queueCtcAutoSave({
                      annualCtc,
                      monthlyCtc: annualCtc === '' ? '' : (Number(annualCtc) / 12).toFixed(2)
                    });
                  }}
                  style={{ ...inputStyle, maxWidth: '360px', background: '#fff', fontSize: '16px', fontWeight: 600 }}
                  placeholder="Enter Annual CTC"
                />
                <label style={{ ...labelSm, color: '#0369a1', marginTop: '12px' }}>Monthly CTC</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={f('monthlyCtc')}
                  onChange={e => {
                    const monthlyCtc = e.target.value;
                    queueCtcAutoSave({
                      monthlyCtc,
                      annualCtc: monthlyCtc === '' ? '' : (Number(monthlyCtc) * 12).toFixed(2)
                    });
                  }}
                  style={{ ...inputStyle, maxWidth: '360px', background: '#fff', fontSize: '16px', fontWeight: 600 }}
                  placeholder="Enter Monthly CTC"
                />
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                  Annual CTC = Monthly CTC × 12. HR placeholders: <code>{'{{annualCtc}}'}</code>, <code>{'{{monthlyCtc}}'}</code>.
                  {ctcAutoSaving && <span style={{ marginLeft: '8px', color: '#0284c7' }}>Saving automatically...</span>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const calculatedCtc = calculateRevisionCtc(salaryRevisions[0]);
                    if (!calculatedCtc) {
                      showToast('Add an earning salary revision with Employer PF before calculating CTC.', 'error');
                      return;
                    }
                    queueCtcAutoSave({
                      monthlyCtc: calculatedCtc.monthlyCtc,
                      annualCtc: calculatedCtc.annualCtc
                    });
                    showToast(`Monthly CTC = ₹${calculatedCtc.earningTotal.toLocaleString('en-IN')} + ₹${calculatedCtc.employerPf.toLocaleString('en-IN')} Employer PF. Saving automatically.`);
                  }}
                  style={{ marginTop: '12px', padding: '8px 14px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Calculate: Gross Earnings + Employer PF
                </button>
              </div>

              {/* No revisions state */}
              {salaryRevisions.length === 0 ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                  <CalendarCheck size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>No Salary Revision Added</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Click &quot;Add Revision&quot; to create the first salary revision for this employee.</div>
                  <button onClick={() => { setNewRevisionForm({ effectiveFrom: new Date().toISOString().split('T')[0], remark: '', components: {} }); setShowAddSalaryModal(true); }} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                    + Add First Revision
                  </button>
                </div>
              ) : (
                <>
                  {/* Revision Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Salary Revision *</label>
                      <select
                        style={{ ...inputStyle, background: '#fff' }}
                        value={activeRevisionIndex}
                        onChange={(e) => setActiveRevisionIndex(parseInt(e.target.value))}
                      >
                        {salaryRevisions.map((rev, i) => (
                          <option key={rev.id} value={i}>
                            Revision {salaryRevisions.length - i} — {rev.effectiveFrom ? new Date(rev.effectiveFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Effect From Date</label>
                      <input type="date" readOnly value={salaryRevisions[activeRevisionIndex]?.effectiveFrom || ''} style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#3b82f6', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Remark</label>
                      <input type="text" readOnly value={salaryRevisions[activeRevisionIndex]?.remark || ''} placeholder="—" style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => {
                          const rev = salaryRevisions[activeRevisionIndex];
                          if (rev) handleEditRevision(rev);
                        }}
                        style={{ padding: '8px 14px', background: '#eff6ff', color: '#3b82f6', border: '1.5px solid #bfdbfe', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          const rev = salaryRevisions[activeRevisionIndex];
                          if (rev) handleDeleteRevision(rev.id);
                        }}
                        style={{ padding: '8px 14px', background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  {/* Head Types + Components */}
                  {headTypes.length === 0 ? (
                    <div style={{ padding: '24px', background: '#fef9c3', borderRadius: '8px', color: '#92400e', fontSize: '13px' }}>
                      ⚠️ No Head Types configured. Go to Synchronization 2 → Head Types to add them.
                    </div>
                  ) : headTypes.filter(ht => ht.isActive).map(ht => {
                    const activeRevision = salaryRevisions[activeRevisionIndex];
                    const comps = activeRevision ? activeRevision.components.filter(c => c.salaryHead?.headType?.name === ht.name) : [];
                    const categoryAmount = comps.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

                    return (
                      <div key={ht.id || ht.name} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '14px' }}>▸ {ht.name} Details</div>
                          <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '14px' }}>Total: ₹{categoryAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        {comps.length > 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#0ea5e9' }}>
                              <tr>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'white' }}>Head Name</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'white', width: '30%' }}>Rule</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: 'white', width: '20%' }}>Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comps.map((comp, i) => (
                                <tr key={comp.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{comp.salaryHead?.description}</td>
                                  <td style={{ padding: '6px 16px' }}>
                                    <input type="text" readOnly value={comp.rule || '(None)'} style={{ width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '13px', background: '#f8fafc', color: '#64748b' }} />
                                  </td>
                                  <td style={{ padding: '6px 16px', textAlign: 'right' }}>
                                    <input type="text" readOnly value={parseFloat(comp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} style={{ width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '13px', textAlign: 'right', background: '#f8fafc', color: '#1e293b', fontWeight: 600 }} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ padding: '20px 18px', fontSize: '13px', color: '#94a3b8' }}>No {ht.name} components in this revision.</div>
                        )}
                      </div>
                    );
                  })}

                  {/* Net Salary Footer */}
                  {(() => {
                    const rev = salaryRevisions[activeRevisionIndex];
                    if (!rev) return null;
                    const earnings = rev.components.filter(c => c.salaryHead?.headType?.name === 'Earning').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    const deductions = rev.components.filter(c => c.salaryHead?.headType?.name === 'Deduction').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    const net = earnings - deductions;
                    return (
                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)', color: 'white', padding: '14px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                          Net Salary: ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {shiftModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {shiftForm.id ? '✏️ Edit Shift Assignment' : '+ Add Shift Assignment'}
              </h3>
              <button onClick={() => setShiftModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelSm}>Effective From *</label>
                <input type="date" value={shiftForm.effectiveFrom} onChange={e => setShiftForm({ ...shiftForm, effectiveFrom: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelSm}>Valid Till</label>
                <input type="date" value={shiftForm.validTill || ''} onChange={e => setShiftForm({ ...shiftForm, validTill: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelSm}>Shift Name *</label>
                <select 
                  value={shiftForm.shiftId} 
                  onChange={e => setShiftForm({ ...shiftForm, shiftId: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="">Select Shift</option>
                  {availableShifts.map(s => (
                    <option key={s.id} value={s.id}>{s.shiftName} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelSm}>Remark</label>
                <input type="text" value={shiftForm.remark || ''} onChange={e => setShiftForm({ ...shiftForm, remark: e.target.value })} style={inputStyle} placeholder="e.g. Temporary" />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShiftModalOpen(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveShift} style={{ padding: '8px 16px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Save Shift</button>
            </div>
          </div>
        </div>
      )}

      {showAddSalaryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', width: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {editingRevisionId ? '✏️ Edit Salary Revision' : '+ Add New Salary Revision'}
              </h3>
              <button onClick={() => { setShowAddSalaryModal(false); setEditingRevisionId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div>
                <label style={labelSm}>Effective From Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" value={newRevisionForm.effectiveFrom} onChange={e => setNewRevisionForm({...newRevisionForm, effectiveFrom: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelSm}>Remark</label>
                <input type="text" placeholder="e.g. Annual Increment" value={newRevisionForm.remark} onChange={e => setNewRevisionForm({...newRevisionForm, remark: e.target.value})} style={inputStyle} />
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
              {headTypes.filter(ht => ht.isActive).map(ht => (
                <div key={ht.name} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: 600 }}>
                      <span>^</span> {ht.name} Details
                    </div>
                    <div style={{ color: '#6366f1', fontWeight: 600 }}>Amount: {
                      salaryHeads.filter(h => h.category === ht.name && h.isActive).reduce((sum, h) => sum + (parseFloat(newRevisionForm.components[h.id]) || 0), 0).toFixed(2)
                    }</div>
                  </div>
                  {salaryHeads.filter(h => h.category === ht.name && h.isActive).length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#17a2b8', color: 'white', fontSize: '14px' }}>
                        <tr>
                          <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 500 }}>Heads</th>
                          <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 500, width: '30%' }}>Rule</th>
                          <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, width: '20%' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHeads.filter(h => h.category === ht.name && h.isActive).map((headObj, i) => {
                          const head = headObj.description;
                          return (
                          <tr key={headObj.id} style={{ borderBottom: '1px solid #f3f4f6', background: i%2===1 ? '#f8fafc' : 'white' }}>
                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#4b5563' }}>{head}</td>
                            <td style={{ padding: '4px 16px' }}><input type="text" disabled defaultValue={headObj.calculationType === 'Fixed Amount' ? '(None)' : '(Not Applicable)'} style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }} /></td>
                            <td style={{ padding: '4px 16px' }}>
                              <input 
                                type="number" 
                                value={newRevisionForm.components[headObj.id] || ''} 
                                onChange={(e) => setNewRevisionForm({
                                  ...newRevisionForm, 
                                  components: { ...newRevisionForm.components, [headObj.id]: e.target.value }
                                })} 
                                style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }} 
                              />
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowAddSalaryModal(false)} style={{ padding: '8px 24px', background: 'white', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleSaveRevision} disabled={saving} style={{ padding: '8px 24px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

        {showTerminateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#dc2626' }}>Terminate Employee</h3>
                <button onClick={() => setShowTerminateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>✕</button>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelSm}>Termination Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" value={terminateForm.date} onChange={e => setTerminateForm({...terminateForm, date: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelSm}>Reason for Leaving <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={terminateForm.reasonId} onChange={e => setTerminateForm({...terminateForm, reasonId: e.target.value})} style={inputStyle}>
                  <option value="">Select Reason</option>
                  {leavingReasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowTerminateModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button onClick={handleTerminate} disabled={saving} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>{saving ? 'Processing...' : 'Confirm Termination'}</button>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
        @media print {
          body { background: white !important; }
          .hide-on-print { display: none !important; }
        }
      `}</style>
    </>
  );
}

const labelSm = { fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: '#fafafa' };
