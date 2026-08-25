'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Plus, Trash2, Camera, Eye, EyeOff } from 'lucide-react';
import '../dashboard/employee.css';

const TABS = [
  { key: 'basic', label: 'Basic Details' },
  { key: 'job', label: 'Job Details' },
  { key: 'contact', label: 'Contact Details' },
  { key: 'supervisor', label: 'Your Supervisor' },
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

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) { router.push('/login/employee'); return; }
    fetchData(JSON.parse(empData).id);
  }, [router]);

  const fetchData = async (id) => {
    setLoading(true);
    try {
      const empRes = await fetch(`/api/employees/${id}`);
      const emp = await empRes.json();
      
      if (!empRes.ok || emp.error) {
        showToast(emp.error || 'Failed to fetch details', 'error');
        setEmployee(null);
        setLoading(false);
        return;
      }

      setEmployee(emp);
      setForm({
        ...emp,
        dependents: emp.dependents || [],
        bankDetails: emp.bankDetails || [],
        workExperiences: emp.workExperiences || [],
        educations: emp.educations || []
      });
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
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.id) {
        setEmployee(data);
        sessionStorage.setItem('employeeData', JSON.stringify(data));
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading your profile...</div>;
  if (!employee) return <div style={{ padding: '2rem' }}>Profile not found.</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Back Bar */}
      <div style={{ background: 'white', padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
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
                { label: 'Joined Date', value: employee.joinedDate || '—' },
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


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Gender</label>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="gender" checked={f('gender') === 'Male'} onChange={() => set('gender', 'Male')} /> Male
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="gender" checked={f('gender') === 'Female'} onChange={() => set('gender', 'Female')} /> Female
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="gender" checked={f('gender') === 'Transgender'} onChange={() => set('gender', 'Transgender')} /> Transgender
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="gender" checked={f('gender') === 'Other'} onChange={() => set('gender', 'Other')} /> Other
                      </label>
                    </div>
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
                    <label style={labelSm}>Nationality</label>
                    <select value={f('nationality') || 'INDIA'} onChange={e => set('nationality', e.target.value)} style={inputStyle}>
                      <option value="INDIA">INDIA</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="OTHER">OTHER</option>
                    </select>
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


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                  <div>
                    <label style={labelSm}>Employment Status</label>
                    <input value={f('employmentStatus') || 'WORKING'} disabled style={disabledInputStyle} />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Bank Name</label>
                    <input value={f('bankName')} onChange={e => set('bankName', e.target.value)} style={inputStyle} placeholder="Bank Name" />
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
                    <label style={labelSm}>ESIC NO</label>
                    <input value={f('esicNo')} onChange={e => set('esicNo', e.target.value)} style={inputStyle} placeholder="ESIC Number" />
                  </div>
                  <div>
                    <label style={labelSm}>NDA NO</label>
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
                  <label style={labelSm}>Organization</label>
                  <input value={f('organisation') || 'Cecube Engineering India Pvt Ltd'} disabled style={disabledInputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Employment Status</label>
                  <input value={f('employmentStatus') || 'WORKING'} disabled style={disabledInputStyle} />
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
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Contact Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                  <label style={labelSm}>Extension</label>
                  <input value={f('extension')} onChange={e => set('extension', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>CPN</label>
                  <input value={f('cpn')} onChange={e => set('cpn', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Personal Email</label>
                  <input type="email" value={f('otherEmail')} onChange={e => set('otherEmail', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Address Street 1</label>
                  <input value={f('addressStreet1')} onChange={e => set('addressStreet1', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Address Street 2</label>
                  <input value={f('addressStreet2')} onChange={e => set('addressStreet2', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>City</label>
                  <input value={f('city')} onChange={e => set('city', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>State/Province</label>
                  <input value={f('state')} onChange={e => set('state', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Zip/Postal Code</label>
                  <input value={f('zipCode')} onChange={e => set('zipCode', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Country</label>
                  <select value={f('country') || 'India'} onChange={e => set('country', e.target.value)} style={inputStyle}>
                    <option value="India">India</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'supervisor' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Your Supervisor</h3>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  <User size={32} />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{employee.supervisor?.name || 'No Supervisor Assigned'}</div>
                  <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Please contact HR if this is incorrect.</div>
                </div>
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
                <button onClick={addDependent} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Add Dependent
                </button>
              </div>
              
              {(!form.dependents || form.dependents.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No dependents added yet. Click "Add Dependent" to add one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {form.dependents.map((dep, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                      <button onClick={() => removeDependent(idx)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingRight: '24px' }}>
                        <div>
                          <label style={labelSm}>Name</label>
                          <input value={dep.name} onChange={e => updateDependent(idx, 'name', e.target.value)} style={inputStyle} placeholder="Full Name" />
                        </div>
                        <div>
                          <label style={labelSm}>Relationship</label>
                          <select value={dep.relationship} onChange={e => updateDependent(idx, 'relationship', e.target.value)} style={inputStyle}>
                            <option value="">Select</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Child">Child</option>
                            <option value="Parent">Parent</option>
                            <option value="Other">Other</option>
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
                  <div>
                    <label style={labelSm}>NDA No</label>
                    <input value={f('ndaNo')} onChange={e => set('ndaNo', e.target.value)} style={inputStyle} placeholder="NDA Number" />
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
                          <input value={bank.bankName || ''} onChange={e => {
                            const newBank = [...f('bankDetails')];
                            newBank[idx].bankName = e.target.value;
                            set('bankDetails', newBank);
                          }} style={inputStyle} placeholder="E.g. State Bank of India" />
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
                {[
                  { name: 'General Shift', time: '09:00 AM – 06:00 PM', type: 'Fixed' },
                  { name: 'Morning Shift', time: '08:01 AM – 07:00 PM', type: 'Rotational' },
                  { name: 'Night Shift', time: '11:00 PM – 08:00 AM', type: 'Rotational' }
                ].map((s, i) => (
                  <div key={i} style={{ border: i === 0 ? '2px solid #007bff' : '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: i === 0 ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{s.time}</div>
                    <div style={{ marginTop: '8px', display: 'inline-block', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{s.type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Assigned GPS Locations</h3>
              </div>
              <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', marginBottom: '32px' }}>
                No GPS locations assigned.
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
            </div>
          )}

          {activeTab === 'salary' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Salary Structure</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div><label style={labelSm}>Annual CTC</label><input type="number" value={f('annualCtc')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>Basic Salary</label><input type="number" value={f('basicSalary')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>HRA</label><input type="number" value={f('hra')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>Conveyance</label><input type="number" value={f('conveyance')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>Medical</label><input type="number" value={f('medical')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>Special Allowance</label><input type="number" value={f('specialAllowance')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>Bonus</label><input type="number" value={f('bonus')} disabled style={disabledInputStyle} /></div>
              </div>

              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Deductions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div><label style={labelSm}>PF Employee (%)</label><input type="number" value={f('pfEmployee')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>PF Employer (%)</label><input type="number" value={f('pfEmployer')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>Professional Tax</label><input type="number" value={f('professionalTax')} disabled style={disabledInputStyle} /></div>
                <div><label style={labelSm}>TDS / Income Tax</label><input type="number" value={f('tds')} disabled style={disabledInputStyle} /></div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => fetchData(employee.id)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelSm = { fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a' };
const disabledInputStyle = { ...inputStyle, background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' };
