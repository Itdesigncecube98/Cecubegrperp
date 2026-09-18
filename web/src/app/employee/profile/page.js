'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Plus, Trash2, Camera, Eye, EyeOff, FileDown, PanelLeft, PanelLeftClose, ChevronLeft } from 'lucide-react';
import '../dashboard/employee.css';

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

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [showSidebar, setShowSidebar] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});
  const [relationships, setRelationships] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [docUploadDates, setDocUploadDates] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [weekoffTypes, setWeekoffTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: '', accountNo: '', ifscCode: '', accountType: 'Savings' });
  const [salaryRevisions, setSalaryRevisions] = useState([]);
  const [headTypes, setHeadTypes] = useState([]);
  const [activeRevisionIndex, setActiveRevisionIndex] = useState(0);

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
        
        // Auto-save photo to database immediately
        await fetch(`/api/employees/${employee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: result.url })
        });
        
        showToast('Photo uploaded successfully!');
      }
    } catch(err) {
      console.error(err);
      showToast('Error uploading photo', 'error');
    }
    setUploading(false);
    e.target.value = ''; // Reset input so the same file can be uploaded again
  };

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) { router.push('/login/employee'); return; }
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    setForm({
      ...parsed,
      dependents: parsed.dependents || [],
      workExperiences: parsed.workExperiences || [],
      educations: parsed.educations || []
    });
    fetchData(parsed.id);
  }, [router]);

  const fetchData = async (id) => {
    setLoading(true);
    try {
      const [empRes, relRes, docTypesRes, weekoffTypesRes, revsRes, headTypesRes] = await Promise.all([
        fetch(`/api/employees/${id}`),
        fetch('/api/synchronisation2/relationship'),
        fetch('/api/synchronisation2/document-types'),
        fetch('/api/synchronisation2/weekoff-types'),
        fetch(`/api/employees/${id}/salary`),
        fetch('/api/setup/head-types')
      ]);
      const emp = await empRes.json();
      
      if (!empRes.ok || emp.error) {
        showToast(emp.error || 'Failed to fetch details', 'error');
        setEmployee(null);
        setLoading(false);
        return;
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

      if (headTypesRes.ok) {
        const typesData = await headTypesRes.json();
        if (Array.isArray(typesData)) setHeadTypes(typesData);
      }

      if (revsRes.ok) {
        const revsData = await revsRes.json();
        if (Array.isArray(revsData)) {
          setSalaryRevisions(revsData);
        }
      }

      setEmployee(emp);
      setForm({
        ...emp,
        dependents: emp.dependents || [],
        bankDetails: emp.bankDetails || [],
        workExperiences: emp.workExperiences || [],
        educations: emp.educations || [],
        emergencyContacts: emp.emergencyContacts?.length ? emp.emergencyContacts : (emp.emergencyContact || emp.emergencyPhone ? [{ name: emp.emergencyContact || '', phone: emp.emergencyPhone || '', relationship: '' }] : [])
      });

      const relData = await relRes.json();
      if (Array.isArray(relData)) setRelationships(relData.filter(r => r.isActive));

      if (docTypesRes.ok) {
        const docTypesData = await docTypesRes.json();
        if (Array.isArray(docTypesData)) setDocumentTypes(docTypesData);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDocUpload = async (docType, e) => {
    const file = e.target.files[0];
    if (!file || !employee?.id) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error');
      e.target.value = null;
      return;
    }

    const effDate = docUploadDates[docType.id] || '';

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const payload = {
          employeeId: employee.id,
          documentType: docType.category || 'Employee',
          documentName: docType.type,
          effectiveDate: effDate || null,
          fileData: reader.result,
          fileName: file.name,
          fileType: file.type,
        };

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.error) {
          showToast(data.error, 'error');
        } else {
          showToast('Document uploaded successfully!');
          fetchData(employee.id); // reload employee data to show new document
        }
      };
    } catch (err) {
      console.error(err);
      showToast('Failed to upload document', 'error');
    }
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
        fetchData(employee.id);
      } else {
        showToast('Failed to delete document', 'error');
      }
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  const handleUpdateDocDate = async (docId, newDate) => {
    try {
      const res = await fetch(`/api/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, effectiveDate: newDate })
      });
      if (res.ok) {
        showToast('Effective Date updated!');
        fetchData(employee.id);
      } else {
        showToast('Failed to update date', 'error');
      }
    } catch (err) {
      showToast('Failed to update date', 'error');
    }
  };

  const handleSave = async () => {
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
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        setEmployee(data);
        localStorage.setItem('employeeData', JSON.stringify(data));
        showToast('Profile updated successfully!');
      } else {
        console.error("Save error:", data);
        showToast(data.error || 'Failed to save profile', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving profile.', 'error');
    }
    setSaving(false);
  };

  const f = (field) => form[field] || '';
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addDependent = () => {
    setForm(prev => ({
      ...prev,
      dependents: [...(prev.dependents || []), { name: '', relationship: '', dateOfBirth: '', phone: '' }]
    }));
  };

  const updateDependent = (index, field, value) => {
    setForm(prev => {
      const newDeps = [...prev.dependents];
      newDeps[index][field] = value;
      return { ...prev, dependents: newDeps };
    });
  };

  const removeDependent = (index) => {
    setForm(prev => {
      const newDeps = [...prev.dependents];
      newDeps.splice(index, 1);
      return { ...prev, dependents: newDeps };
    });
  };

  if (loading && !employee) return <div style={{ padding: '2rem' }}>Loading your profile...</div>;
  if (!employee && !loading) return <div style={{ padding: '2rem' }}>Profile not found.</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Back Bar */}
      <div style={{ background: 'white', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/employee/dashboard')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to Dashboard
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { if (employee?.id) router.push(`/employee-card/${employee.id}`); }}>
            <FileDown size={14} /> Download Emp Card
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: 'white', overflow: 'hidden' }}>
              {employee.photoUrl ? (
                <>
                  <img src={employee.photoUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                  <div style={{ width: '100%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center' }}>{employee.name?.charAt(0).toUpperCase()}</div>
                </>
              ) : (
                employee.name?.charAt(0).toUpperCase()
              )}
            </div>
            <label style={{ position: 'absolute', bottom: -5, right: -5, background: '#10b981', color: 'white', borderRadius: '50%', padding: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <Camera size={14} />
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{employee.name}</h2>
              <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{employee.empId || 'N/A'}</span>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{employee.employmentStatus || 'WORKING'}</span>
            </div>
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              {[
                { label: 'Supervisor', value: employee.supervisor?.name || '—' },
                { label: 'Personal Phone', value: employee.phone || '—' },
                { label: 'Company Email', value: employee.email },
                { label: 'Joined Date', value: employee.joinedDate ? new Date(employee.joinedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                { label: 'Designation', value: employee.designation || '—' },
                { label: 'Department', value: employee.department },
              ].map(({ label, value }) => (
                <div key={label} style={{ fontSize: '12px' }}>
                  <div style={{ color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>{value}</div>
                </div>
              ))}
            </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
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
                    <label style={labelSm}>Employee Code</label>
                    <input value={f('empId') || ''} disabled style={disabledInputStyle} />
                  </div>
                </div>

                <div style={{ color: '#374151', fontSize: '14px', fontWeight: 500, paddingTop: '10px' }}>Organization Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Organization</label>
                    <input value={f('organisation') || 'Cecube Engineering India Pvt Ltd'} disabled style={disabledInputStyle} />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Gender</label>
                    <select
                      value={['Male', 'Female', 'Other'].includes(String(f('gender') ?? '').trim()) ? f('gender') : (String(f('gender') ?? '').trim().toLowerCase() === 'male' ? 'Male' : String(f('gender') ?? '').trim().toLowerCase() === 'female' ? 'Female' : 'Other')}
                      onChange={e => set('gender', e.target.value)}
                      style={inputStyle}
                    >
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
                    <label style={labelSm}>Date of Birth</label>
                    <input type="date" value={f('dateOfBirth')} onChange={e => set('dateOfBirth', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSm}>Father Name</label>
                    <input value={f('fatherName')} onChange={e => set('fatherName', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSm}>Passport No</label>
                    <input value={f('passportNo')} onChange={e => set('passportNo', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSm}>Identification Mark</label>
                    <input value={f('identificationMark')} onChange={e => set('identificationMark', e.target.value)} style={inputStyle} />
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


                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
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
                </div>

              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600, color: '#111827' }}>Bank & Statutory Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Statutory Details */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Statutory Details</div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
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
                </div>

                {/* Account Linking */}
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Account Linking</div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                      <div>
                        <label style={labelSm}>Debit Account</label>
                        <input value={f('debitAccount')} onChange={e => set('debitAccount', e.target.value)} style={inputStyle} placeholder="e.g. JOHN_DOE_CEIPL084" />
                      </div>
                      <div>
                        <label style={labelSm}>Credit Account</label>
                        <input value={f('creditAccount')} onChange={e => set('creditAccount', e.target.value)} style={inputStyle} placeholder="e.g. JOHN_DOE_CEIPL084" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Accounts */}
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>Bank Accounts</div>
                    <button
                      type="button"
                      onClick={() => {
                        const newBank = [...(f('bankDetails') || []), { bankName: '', accountName: '', accountNumber: '', ifscCode: '', branch: '', branchCode: '', address: '', isPrimary: false }];
                        set('bankDetails', newBank);
                      }}
                      style={{ background: '#10b981', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                      + Add Bank Account
                    </button>
                  </div>

                  {!(f('bankDetails') && f('bankDetails').length > 0) ? (
                    <div style={{ border: '1.5px dashed #e2e8f0', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '14px' }}>No bank records found.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {(f('bankDetails') || []).map((bank, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                          <button onClick={() => {
                            const newBank = [...f('bankDetails')];
                            newBank.splice(idx, 1);
                            set('bankDetails', newBank);
                          }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                            Remove
                          </button>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingRight: '40px', marginBottom: '16px' }}>
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
                                <option value="Bank of Baroda">Bank of Baroda</option>
                                <option value="Punjab National Bank">Punjab National Bank</option>
                                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                                <option value="IndusInd Bank">IndusInd Bank</option>
                                <option value="Yes Bank">Yes Bank</option>
                                <option value="Canara Bank">Canara Bank</option>
                              </select>
                            </div>
                            <div>
                              <label style={labelSm}>Name as per Bank</label>
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
                              }} style={inputStyle} placeholder="IFSC Code" />
                            </div>
                            <div>
                              <label style={labelSm}>Branch</label>
                              <input value={bank.branch || ''} onChange={e => {
                                const newBank = [...f('bankDetails')];
                                newBank[idx].branch = e.target.value;
                                set('bankDetails', newBank);
                              }} style={inputStyle} placeholder="Branch" />
                            </div>
                            <div>
                              <label style={labelSm}>Branch Code</label>
                              <input value={bank.branchCode || ''} onChange={e => {
                                const newBank = [...f('bankDetails')];
                                newBank[idx].branchCode = e.target.value;
                                set('bankDetails', newBank);
                              }} style={inputStyle} placeholder="Branch Code" />
                            </div>
                          </div>
                          <div>
                            <label style={labelSm}>Bank Address</label>
                            <textarea value={bank.address || ''} onChange={e => {
                              const newBank = [...f('bankDetails')];
                              newBank[idx].address = e.target.value;
                              set('bankDetails', newBank);
                            }} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Bank Address" />
                          </div>
                          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="checkbox" 
                              checked={bank.isPrimary || false} 
                              onChange={e => {
                                const newBank = [...f('bankDetails')].map((b, i) => ({
                                  ...b,
                                  isPrimary: i === idx ? e.target.checked : false
                                }));
                                set('bankDetails', newBank);
                              }}
                              id={`primary-bank-${idx}`}
                            />
                            <label htmlFor={`primary-bank-${idx}`} style={{ fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Make this the Primary Bank Account</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* NDA No - Admin only */}
                <div style={{ marginTop: '20px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#0369a1', fontWeight: 500 }}>
                  🔒 NDA No is managed by your HR/Admin and cannot be edited here.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <label style={labelSm}>NDA No</label>
                    <input value={f('ndaNo')} readOnly disabled style={disabledInputStyle} placeholder="Set by admin" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'job' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Job Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={labelSm}>Organization</label>
                  <input value={f('organisation') || 'Cecube Engineering India Pvt Ltd'} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Employment Status</label>
                  <input value={f('employmentStatus') || 'WORKING'} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Portal Login Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
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
                <div>
                  <label style={labelSm}>Joined Date</label>
                  <input type="date" value={f('joinedDate')} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Job Title / Designation</label>
                  <input value={f('designation')} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Position</label>
                  <input value={f('position') || '—'} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Work Week Mapping</label>
                  <input value={f('workWeekMapping') || 'Default Work Week'} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Branch</label>
                  <input value={f('branch')} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Department</label>
                  <input value={f('department')} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Grade</label>
                  <input value={f('grade')} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Employee Type</label>
                  <input value={f('employeeType')} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Role</label>
                  <input value={f('role') === 'SUPERVISOR' ? 'Supervisor' : 'Employee'} disabled style={disabledInputStyle} />
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <label style={labelSm}>Job Description</label>
                <textarea 
                  value={f('jobDescription') || 'No job description provided.'} 
                  disabled 
                  style={{ ...disabledInputStyle, minHeight: '100px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} 
                />
              </div>
              <div style={{ marginTop: '24px' }}>
                <label style={labelSm}>Supervisor</label>
                <input value={employee.supervisor?.name || 'No Supervisor Assigned'} disabled style={disabledInputStyle} />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Contact Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={labelSm}>Personal Phone</label>
                  <input value={f('phone')} onChange={e => set('phone', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Company Email</label>
                  <input type="email" value={f('email')} onChange={e => set('email', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Company Phone</label>
                  <input value={f('workTelephone')} onChange={e => set('workTelephone', e.target.value)} style={inputStyle} />
                </div>

                <div>
                  <label style={labelSm}>Personal Email</label>
                  <input type="email" value={f('otherEmail')} onChange={e => set('otherEmail', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Temp Address</label>
                  <textarea value={f('addressStreet1')} onChange={e => set('addressStreet1', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Enter temporary address" />
                </div>
                <div>
                  <label style={labelSm}>Permanent Address</label>
                  <textarea value={f('address')} onChange={e => set('address', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Enter permanent address" />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
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
            </div>
          )}

          {activeTab === 'dependent' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Dependent Details</h3>
                <button type="button" onClick={addDependent} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Dependent</button>
              </div>
              
              {(!form.dependents || form.dependents.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No dependents added yet. Click "Add Dependent" to add one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {form.dependents.map((dep, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                      <button 
                        onClick={() => removeDependent(idx)}
                        style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', paddingRight: '24px' }}>
                        <div>
                          <label style={labelSm}>Name</label>
                          <input value={dep.name} onChange={e => updateDependent(idx, 'name', e.target.value)} style={inputStyle} placeholder="Full Name" />
                        </div>
                        <div>
                          <label style={labelSm}>Relationship</label>
                          <select value={dep.relationship} onChange={e => updateDependent(idx, 'relationship', e.target.value)} style={inputStyle}>
                            <option value="">Select</option>
                            {relationships.map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelSm}>Date of Birth</label>
                          <input type="date" value={dep.dateOfBirth} onChange={e => updateDependent(idx, 'dateOfBirth', e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelSm}>Phone (Optional)</label>
                          <input value={dep.phone} onChange={e => updateDependent(idx, 'phone', e.target.value)} style={inputStyle} placeholder="Phone Number" />
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
                <button type="button" onClick={() => set('educations', [...(f('educations') || []), { institution: '', degree: '', year: '', grade: '' }])} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Education</button>
              </div>
              
              {!(f('educations') && f('educations').length > 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No education records found. Click "Add Education" to add one.
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={labelSm}>School / Institution</label>
                          <input value={edu.institution || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].institution = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. XYZ School" />
                        </div>
                        <div>
                          <label style={labelSm}>Degree / Qualification</label>
                          <input value={edu.degree || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].degree = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. B.Tech" />
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
                <button type="button" onClick={() => set('workExperiences', [...(f('workExperiences') || []), { companyName: '', jobTitle: '', fromDate: '', toDate: '' }])} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Experience</button>
              </div>
              
              {!(f('workExperiences') && f('workExperiences').length > 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No experience records found. Click "Add Experience" to add one.
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
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

          {activeTab === 'documents' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Employee Documents</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {documentTypes.filter(d => d.viewInPortal).map(docType => {
                  const existingDoc = (employee?.documents || []).find(d => d.documentName === docType.type);
                  const isSubmitted = !!existingDoc;
                  const docDate = existingDoc ? new Date(existingDoc.createdAt).toLocaleDateString() : null;

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
                          {isSubmitted ? 'Submitted' : 'Not Submitted'}
                        </span>
                        {isSubmitted && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                            Date: {docDate}
                          </div>
                        )}
                      </div>

                      {existingDoc?.effectiveDate && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', fontWeight: 600 }}>
                          Effective Date: {existingDoc.effectiveDate}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {docType.uploadInPortal && (
                          <>
                            <input 
                              type="file" 
                              id={`file-upload-${docType.id}`} 
                              style={{ display: 'none' }} 
                              onChange={(e) => handleDocUpload(docType, e)}
                            />
                            <label htmlFor={`file-upload-${docType.id}`} style={{ padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'inline-block' }}>
                              {isSubmitted ? 'Re-Upload' : 'Upload'}
                            </label>
                          </>
                        )}

                        {isSubmitted && (
                          <>
                            <button onClick={() => handleView(existingDoc)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                              View
                            </button>
                            <button onClick={() => handleDownload(existingDoc)} style={{ padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                              Download
                            </button>
                            {docType.uploadInPortal && (
                              <button onClick={() => handleDeleteDoc(existingDoc.id)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {documentTypes.filter(d => d.viewInPortal).length === 0 && (
                  <div style={{ color: '#64748b' }}>No documents available for viewing.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Shift Assignment</h3>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '30px' }}>
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
                    </tr>
                  </thead>
                  <tbody>
                    {(!employee?.shifts || employee.shifts.length === 0) ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No shift assignments found.</td>
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
              </div>
              {(!employee?.assignedGpsLocations || employee.assignedGpsLocations.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', marginBottom: '32px' }}>
                  No GPS locations assigned.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                  {employee.assignedGpsLocations.map((loc, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Location</div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>{loc.location}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Effective Date</div>
                          <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{loc.effectiveDate || '-'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Budget Head</div>
                          <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{loc.budgetHead || '-'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'offdays' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderBottom: 'none', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#475569' }}>Off Days</h3>
              </div>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0 0 4px 4px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#0369a1', fontWeight: 500 }}>
                🔒 Off days are managed by your HR/Admin. These selections reflect your assigned off day templates.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#1e40af', color: 'white', padding: '12px', fontWeight: 500, borderRight: '1px solid #1e3a8a' }}>Template</th>
                    <th style={{ background: '#1e40af', color: 'white', padding: '12px', width: '50px', textAlign: 'center' }}>✓</th>
                  </tr>
                </thead>
                <tbody>
                  {weekoffTypes.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No off day templates found.</td>
                    </tr>
                  ) : weekoffTypes.map((templateObj, idx) => {
                    const templateName = templateObj.name;
                    const isChecked = form.offDaysTemplates ? form.offDaysTemplates.includes(templateName) : false;
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{templateName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            disabled
                            style={{ cursor: 'not-allowed' }}
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Salary Info</h3>
              </div>

              {salaryRevisions.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>💰</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>No Salary Revision Found</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Your HR has not added any salary revisions yet.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {salaryRevisions.map((rev, index) => {
                    const ctc = calculateRevisionCtc(rev);
                    const earnings = rev.components.filter(c => c.salaryHead?.headType?.name === 'Earning').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    const deductions = rev.components.filter(c => c.salaryHead?.headType?.name === 'Deduction').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                    const net = earnings - deductions;

                    return (
                      <div key={rev.id} style={{ background: '#ffffff', borderRadius: '12px', border: index === 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
                        {index === 0 && (
                          <div style={{ position: 'absolute', top: 0, right: 0, background: '#3b82f6', color: 'white', padding: '4px 12px', fontSize: '11px', fontWeight: 700, borderBottomLeftRadius: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Current Revision
                          </div>
                        )}
                        <div style={{ padding: '20px 24px', background: index === 0 ? '#eff6ff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label style={labelSm}>Revision</label>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                Revision {salaryRevisions.length - index}
                              </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <label style={labelSm}>Effective From</label>
                              <div style={{ fontSize: '15px', color: '#475569', fontWeight: 500 }}>
                                {rev.effectiveFrom ? new Date(rev.effectiveFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date'}
                              </div>
                            </div>
                            <div style={{ flex: 2, minWidth: '200px' }}>
                              <label style={labelSm}>Remark</label>
                              <div style={{ fontSize: '15px', color: '#475569' }}>
                                {rev.remark || '—'}
                              </div>
                            </div>
                          </div>
                          
                          {ctc && (
                            <div style={{ marginTop: '20px', display: 'flex', gap: '24px', background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Monthly CTC</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>₹{Number(ctc.monthlyCtc).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Annual CTC</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>₹{Number(ctc.annualCtc).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ padding: '24px' }}>
                          {headTypes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading salary structure...</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                              {headTypes.map(ht => {
                                const comps = rev.components.filter(c => c.salaryHead?.headType?.name === ht.name);
                                if (comps.length === 0) return null;

                                return (
                                  <div key={ht.id}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                      {ht.name}s
                                    </h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                      <thead>
                                        <tr>
                                          <th style={{ padding: '8px 16px', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Salary Head</th>
                                          <th style={{ padding: '8px 16px', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Calculation Type</th>
                                          <th style={{ padding: '8px 16px', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Amount (₹)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {comps.map((comp, i) => (
                                          <tr key={comp.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{comp.salaryHead?.description}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#64748b' }}>
                                              {comp.rule && comp.rule !== '(None)' ? comp.rule : (comp.salaryHead?.calculationType || 'Fixed Amount')}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>
                                              {parseFloat(comp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr>
                                          <td colSpan="2" style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#475569', background: '#f8fafc' }}>
                                            Total {ht.name}s:
                                          </td>
                                          <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '15px', fontWeight: 700, color: '#0f172a', background: '#f8fafc' }}>
                                            {comps.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Net Salary Footer */}
                        <div style={{ background: '#1e293b', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '11px', borderBottomRightRadius: '11px' }}>
                          <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Total Net Salary (Earnings - Deductions)</div>
                          <div style={{ color: '#10b981', fontSize: '24px', fontWeight: 700, letterSpacing: '0.02em' }}>
                            Net Salary: ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {/* Save buttons removed for employee read-only view */}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelSm = { fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a' };
const disabledInputStyle = { ...inputStyle, background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' };
