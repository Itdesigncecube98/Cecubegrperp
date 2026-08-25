'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Eye, EyeOff, CalendarCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

const TABS = [
  { key: 'basic', label: 'Basic and Login Details' },
  { key: 'job', label: 'Job Details' },
  { key: 'contact', label: 'Contact Details' },
  { key: 'supervisor', label: 'Supervisor Mapping' },
  { key: 'emergency', label: 'Emergency Contacts' },
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

export default function EmployeeProfilePage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [siteOffices, setSiteOffices] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [grades, setGrades] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [showAddSalaryModal, setShowAddSalaryModal] = useState(false);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [salaryHeads, setSalaryHeads] = useState([]);
  const [headTypes, setHeadTypes] = useState([
    { name: 'CTC', isActive: true },
    { name: 'Earning', isActive: true },
    { name: 'Deduction', isActive: true },
    { name: 'Other', isActive: true }
  ]);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();

    const savedHeads = localStorage.getItem('salaryHeads');
    if (savedHeads) {
      setSalaryHeads(JSON.parse(savedHeads));
    } else {
      setSalaryHeads([
        { id: 1, category: 'CTC', description: 'Gross Salary', calculationType: 'Calculate By Formula', isActive: true },
        { id: 2, category: 'CTC', description: 'Employer PF', calculationType: 'Fixed Amount', isActive: true },
        { id: 3, category: 'Earning', description: 'Basic', calculationType: 'Calculate By Formula', isActive: true },
        { id: 4, category: 'Earning', description: 'HRA', calculationType: 'Calculate By Formula', isActive: true },
        { id: 5, category: 'Deduction', description: 'Advance', calculationType: 'Fixed Amount', isActive: true },
        { id: 6, category: 'Other', description: 'Special Allowance', calculationType: 'Fixed Amount', remark: '', isActive: true },
      ]);
    }

    const savedTypes = localStorage.getItem('headTypes');
    if (savedTypes) {
      setHeadTypes(JSON.parse(savedTypes));
    }

    const savedShifts = localStorage.getItem('employeeShifts');
    if (savedShifts) {
      setAvailableShifts(JSON.parse(savedShifts));
    } else {
      setAvailableShifts([
        { shiftName: 'General Shift', startTime: '09:00 AM', endTime: '06:00 PM', type: 'Fixed' },
        { shiftName: 'Morning Shift', startTime: '08:01 AM', endTime: '07:00 PM', type: 'Rotational' },
        { shiftName: 'Night Shift', startTime: '07:01 PM', endTime: '08:00 AM', type: 'Rotational' }
      ]);
    }
  }, [router, id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, deptRes, branchRes, siteRes, orgRes, gradeRes, desigRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/synchronization?type=departments'),
        fetch('/api/synchronization?type=branches'),
        fetch('/api/synchronization?type=siteoffices'),
        fetch('/api/synchronization?type=organizations'),
        fetch('/api/synchronization?type=grades'),
        fetch('/api/synchronization?type=designations')
      ]);
      
      const sups = await supRes.json();
      setSupervisors(Array.isArray(sups) ? sups.filter(s => s.id !== id) : []);
      
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

      if (id === 'new') {
        const newEmp = { employmentStatus: 'Working', role: 'EMPLOYEE' };
        setEmployee(newEmp);
        setForm(newEmp);
      } else {
        const empRes = await fetch(`/api/employees/${id}`);
        const emp = await empRes.json();
        
        // Automatically clean up the URL to show empId instead of CUID
        const decodedId = decodeURIComponent(id);
        if (emp.empId && decodedId !== emp.empId) {
          window.history.replaceState(null, '', `/dashboard/employees/${encodeURIComponent(emp.empId)}`);
        }
        
        setEmployee(emp);
        setForm({
          ...emp,
          dependents: emp.dependents || [],
          bankDetails: emp.bankDetails || [],
          workExperiences: emp.workExperiences || [],
          educations: emp.educations || []
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = id === 'new' ? '/api/employees' : `/api/employees/${id}`;
      const method = id === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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

  const f = (field) => form[field] || '';
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Style constants
  const labelSm = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' };
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const disabledInputStyle = { ...inputStyle, background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' };

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
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Your Portal Login Instructions',
          message: `Hello ${employee.name},\n\nYour login instructions for the Cecube HR portal are as follows:\n\nPortal URL: https://cecube-attendance-system.vercel.app\nEmployee Code: ${employee.empId}\nEmail: ${employee.email}\nPassword: ${employee.password || 'Contact HR if you need a password reset.'}\n\nPlease keep this information secure.\n\nBest regards,\nHR Department`,
          recipientIds: [employee.id],
          emailType: 'general'
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
      ['Emergency Contact', `${employee.emergencyContact || ''} (${employee.emergencyPhone || ''})`],
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
        <button onClick={() => router.push('/dashboard/employees')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} /> Back to EmployeeList
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.open(`/employee-card/${employee.id}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'none', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            🪪 View Card
          </button>
          <button onClick={handleExportProfileExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', background: 'none', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
            🖨️ Export Profile Excel
          </button>
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
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{id === 'new' ? 'New Employee' : employee.name}</h2>
              {id !== 'new' && (
                <>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{employee.empId || 'N/A'}</span>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>WORKING</span>
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
        <div style={{ width: '240px', flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {TABS.map((tab, i) => (
              <div key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: activeTab === tab.key ? '#f0f9ff' : 'white', borderLeft: activeTab === tab.key ? '4px solid #007bff' : '4px solid transparent', borderBottom: i < TABS.length - 1 ? '1px solid #f3f4f6' : 'none', fontWeight: activeTab === tab.key ? 600 : 400, fontSize: '13px', color: activeTab === tab.key ? '#007bff' : '#374151', transition: '0.2s' }}>
                {tab.label} <span style={{ color: '#9ca3af' }}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '28px' }}>
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
                    <label style={labelSm}>Employee Code</label>
                    <input value={f('empId') || ''} onChange={e => set('empId', e.target.value)} style={inputStyle} />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Date of Birth</label>
                    <input type="date" value={f('dateOfBirth')} onChange={e => set('dateOfBirth', e.target.value)} style={inputStyle} />
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
                    <select value={f('gender')} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Transgender">Transgender</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Marital Status</label>
                    <select value={f('maritalStatus')} onChange={e => set('maritalStatus', e.target.value)} style={inputStyle}>
                      <option value="">Select</option>
                      <option>Single</option>
                      <option>Married</option>
                      <option>Divorced</option>
                    </select>
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


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Bank Name</label>
                    <select value={f('bankName') || ''} onChange={e => set('bankName', e.target.value)} style={inputStyle}>
                      <option value="">Select Bank Name</option>
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSm}>Bank Account No</label>
                    <input value={f('bankAccountNo')} onChange={e => set('bankAccountNo', e.target.value)} style={inputStyle} placeholder="Account Number" />
                  </div>
                  <div>
                    <label style={labelSm}>IFSC Code</label>
                    <input value={f('ifscCode')} onChange={e => set('ifscCode', e.target.value)} style={inputStyle} placeholder="IFSC Code" />
                  </div>
                  <div>
                    <label style={labelSm}>PAN / PAYE</label>
                    <input value={f('pan')} onChange={e => set('pan', e.target.value)} style={inputStyle} placeholder="PAN Number" />
                  </div>
                  <div>
                    <label style={labelSm}>Aadhar No</label>
                    <input value={f('aadharNo')} onChange={e => set('aadharNo', e.target.value)} style={inputStyle} placeholder="Aadhar Number" />
                  </div>
                  <div>
                    <label style={labelSm}>UAN</label>
                    <input value={f('uan')} onChange={e => set('uan', e.target.value)} style={inputStyle} placeholder="UAN Number" />
                  </div>
                  <div>
                    <label style={labelSm}>ESIC No</label>
                    <input value={f('esicNo')} onChange={e => set('esicNo', e.target.value)} style={inputStyle} placeholder="ESIC Number" />
                  </div>
                  <div>
                    <label style={labelSm}>NDA No</label>
                    <input value={f('ndaNo')} onChange={e => set('ndaNo', e.target.value)} style={inputStyle} placeholder="NDA Number" />
                  </div>
                </div>

                <div style={{ color: '#374151', fontSize: '14px', fontWeight: 500, paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  Account Linking
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    onChange={e => set('organisation', e.target.value)} 
                    style={inputStyle}
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.name}>{org.name}</option>
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelSm}>Assigned Modules</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    {['Engineering', 'Purchase', 'Contracting', 'Site', 'Marketing', 'Sales', 'Accounts', 'Workflow', 'Tender', 'Plant and Machinery', 'HR'].map(mod => (
                      <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={(f('assignedModules') || []).includes(mod)}
                          onChange={(e) => {
                            let curr = f('assignedModules') || [];
                            if (e.target.checked) curr = [...curr, mod];
                            else curr = curr.filter(m => m !== mod);
                            set('assignedModules', curr);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        {mod}
                      </label>
                    ))}
                  </div>
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
                            <td style={{ padding: '12px 16px', color: '#111827' }}>{h.fromDate}</td>
                            <td style={{ padding: '12px 16px', color: '#111827' }}>{h.toDate || <span style={{color:'#10b981', fontWeight:500}}>Current</span>}</td>
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
                  <label style={labelSm}>TEMPORARY ADDRESS</label>
                  <textarea value={f('addressStreet1')} onChange={e => set('addressStreet1', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Temporary address..." />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'supervisor' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Supervisor Mapping</h3>
              <div>
                <label style={labelSm}>Assign Supervisor</label>
                <select value={f('supervisorId') || ''} onChange={e => set('supervisorId', e.target.value || null)} style={{ ...inputStyle, maxWidth: '400px' }}>
                  <option value="">-- No Supervisor --</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.empId || s.id})</option>
                  ))}
                </select>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                  Current supervisor: <strong>{employee.supervisor?.name || 'None assigned'}</strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Emergency Contacts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelSm}>Emergency Contact Name</label>
                  <input value={f('emergencyContact')} onChange={e => set('emergencyContact', e.target.value)} style={inputStyle} placeholder="Name of contact person" />
                </div>
                <div>
                  <label style={labelSm}>Emergency Phone</label>
                  <input value={f('emergencyPhone')} onChange={e => set('emergencyPhone', e.target.value)} style={inputStyle} placeholder="Phone number" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dependent' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Dependent Details</h3>
                <button onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    dependents: [...(prev.dependents || []), { name: '', relationship: '', dateOfBirth: '', phone: '' }]
                  }));
                }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  + Add Dependent
                </button>
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
                            <option value="Spouse">Spouse</option>
                            <option value="Child">Child</option>
                            <option value="Parent">Parent</option>
                            <option value="Other">Other</option>
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
                <button 
                  onClick={() => {
                    const newEd = [...(f('educations') || []), { institution: '', degree: '', year: '', grade: '' }];
                    set('educations', newEd);
                  }}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Education
                </button>
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
                          <label style={labelSm}>Institution / University</label>
                          <input value={edu.institution || ''} onChange={e => {
                            const newEd = [...f('educations')];
                            newEd[idx].institution = e.target.value;
                            set('educations', newEd);
                          }} style={inputStyle} placeholder="E.g. XYZ University" />
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
                <button 
                  onClick={() => {
                    const newExp = [...(f('workExperiences') || []), { companyName: '', jobTitle: '', fromDate: '', toDate: '', jobDescription: '' }];
                    set('workExperiences', newExp);
                  }}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Experience
                </button>
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
                    <input value={f('aadhaar')} onChange={e => set('aadhaar', e.target.value)} style={inputStyle} placeholder="12-digit Aadhaar" />
                  </div>
                  <div>
                    <label style={labelSm}>UAN Number</label>
                    <input value={f('uan')} onChange={e => set('uan', e.target.value)} style={inputStyle} placeholder="12-digit UAN" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Bank Accounts</h3>
                <button 
                  onClick={() => {
                    const newBank = [...(f('bankDetails') || []), { bankName: '', accountName: '', accountNumber: '', ifscCode: '', branch: '' }];
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
                {['Aadhar Card', 'PAN Card', 'Passport', 'Offer Letter', 'Resume / CV', 'Education Cert.', 'Experience Cert.', 'Bank Passbook', 'Photo'].map(doc => (
                  <div key={doc} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '12px' }}>{doc}</div>
                    <button style={{ padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                      Upload
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Shift Assignment</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                {availableShifts.map((s, i) => (
                  <div key={i} style={{ border: i === 0 ? '2px solid #007bff' : '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: i === 0 ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{s.shiftName}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{s.startTime} – {s.endTime}</div>
                    <div style={{ marginTop: '8px', display: 'inline-block', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{s.type || 'Fixed'}</div>
                  </div>
                ))}
              </div>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Custom Shift Override</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div><label style={labelSm}>Check-in Time</label><input type="time" defaultValue="09:00" style={inputStyle} /></div>
                <div><label style={labelSm}>Check-out Time</label><input type="time" defaultValue="18:00" style={inputStyle} /></div>
                <div><label style={labelSm}>Grace Period (Min)</label><input type="number" placeholder="15" style={inputStyle} /></div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Assigned GPS Locations</h3>
                <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  + Add Location
                </button>
              </div>
              <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', marginBottom: '32px' }}>
                No GPS locations assigned.
              </div>

              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Work From Home Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelSm}>WFH Allowed</label>
                  <select style={inputStyle}><option>Yes</option><option>No</option></select>
                </div>
                <div><label style={labelSm}>Max WFH Days / Month</label><input type="number" placeholder="0" style={inputStyle} /></div>
              </div>
            </div>
          )}

          {activeTab === 'offdays' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Weekly Off Days</h3>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} style={{ flex: 1, padding: '12px 0', textAlign: 'center', border: (day === 'Sat' || day === 'Sun') ? '2px solid #007bff' : '1px solid #e2e8f0', borderRadius: '8px', background: (day === 'Sat' || day === 'Sun') ? '#eff6ff' : '#f8fafc', fontWeight: 600, color: (day === 'Sat' || day === 'Sun') ? '#007bff' : '#64748b', cursor: 'pointer' }}>
                    {day}
                  </div>
                ))}
              </div>

              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Off Day Policy</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div><label style={labelSm}>Week Off Type</label><select value={f('weekOffType') || ''} onChange={e => set('weekOffType', e.target.value)} style={inputStyle}><option value="">Select Week Off Type</option><option value="Sunday Off">Sunday Off</option><option value="Weekend Off">Weekend Off</option><option value="Monday Off">Monday Off</option></select></div>
                <div><label style={labelSm}>Number of Week Offs</label><input type="number" defaultValue="2" style={inputStyle} /></div>
                <div><label style={labelSm}>Sandwich Policy</label><select style={inputStyle}><option>Yes</option><option>No</option></select></div>
              </div>
            </div>
          )}

          {activeTab === 'salary' && (
            <div style={{ background: '#fff', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#6b7280' }}>
                <CalendarCheck size={20} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#374151' }}>Salary Info</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                  <label style={{...labelSm, color: '#dc2626'}}>Salary Details *</label>
                  <select style={inputStyle}>
                    <option>Effective From 01/04/2026-00268</option>
                  </select>
                </div>
                <div>
                  <label style={{...labelSm, color: '#dc2626'}}>With Effect From *</label>
                  <input type="date" defaultValue="2026-04-01" style={inputStyle} />
                </div>
                <div>
                  <label style={{...labelSm, color: '#3b82f6'}}>Remark</label>
                  <input type="text" placeholder="Remark" style={inputStyle} />
                </div>
                <div>
                  <button style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ↺ Reset
                  </button>
                </div>
              </div>

              {headTypes.filter(ht => ht.isActive).map(ht => (
                <div key={ht.name} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: 600 }}>
                      <span>^</span> {ht.name} Details
                    </div>
                    <div style={{ color: '#6366f1', fontWeight: 600 }}>
                      Amount:{ht.name === 'CTC' ? '301788.00' : (ht.name === 'Earning' ? '23349.00' : (ht.name === 'Deduction' ? '1800.00' : '0.00'))}
                    </div>
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
                          let defaultAmt = 0;
                          if (head === 'Gross Salary') defaultAmt = 23349;
                          if (head === 'Employer PF') defaultAmt = 21600;
                          if (head === 'Basic') defaultAmt = 15221;
                          if (head === 'HRA') defaultAmt = 7611;
                          if (head === 'Other Allowance') defaultAmt = 517;
                          if (head === 'Provident Fund') defaultAmt = 1800;

                          return (
                          <tr key={head} style={{ borderBottom: '1px solid #f3f4f6', background: i%2===1 ? '#f8fafc' : 'white' }}>
                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#4b5563' }}>{head}</td>
                            <td style={{ padding: '4px 16px' }}><input type="text" defaultValue={headObj.calculationType === 'Fixed Amount' ? '(None)' : '(Not Applicable)'} style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }} /></td>
                            <td style={{ padding: '4px 16px' }}><input type="number" defaultValue={defaultAmt} style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }} /></td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}

              <div className="hide-on-print" style={{ marginTop: '32px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ background: '#9333ea', color: 'white', padding: '12px 24px', fontWeight: 600, borderBottomLeftRadius: '8px', borderBottomRightRadius: '0px' }}>
                  Net Salary: 21549.00
                </div>
                <div style={{ display: 'flex', gap: '8px', paddingRight: '16px' }}>
                  <button onClick={() => alert('Calculating net salary and taxes...')} style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🧮 Calculate
                  </button>
                  <button onClick={() => setShowAddSalaryModal(true)} style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    + Add
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🖨️ Print
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {showAddSalaryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', width: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Add New Salary Revision</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div>
                <label style={labelSm}>Effective From Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" defaultValue="2026-08-30" style={inputStyle} />
              </div>
              <div>
                <label style={labelSm}>Remark</label>
                <input type="text" placeholder="e.g. Annual Increment" style={inputStyle} />
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
              {headTypes.filter(ht => ht.isActive).map(ht => (
                <div key={ht.name} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontWeight: 600 }}>
                      <span>^</span> {ht.name} Details
                    </div>
                    <div style={{ color: '#6366f1', fontWeight: 600 }}>Amount: 0.00</div>
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
                          <tr key={head} style={{ borderBottom: '1px solid #f3f4f6', background: i%2===1 ? '#f8fafc' : 'white' }}>
                            <td style={{ padding: '8px 16px', fontSize: '13px', color: '#4b5563' }}>{head}</td>
                            <td style={{ padding: '4px 16px' }}><input type="text" defaultValue="" style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }} /></td>
                            <td style={{ padding: '4px 16px' }}><input type="number" defaultValue={0.00} style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }} /></td>
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
              <button onClick={() => {
                alert('New salary revision created!');
                setShowAddSalaryModal(false);
              }} style={{ padding: '8px 24px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
                Save
              </button>
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
