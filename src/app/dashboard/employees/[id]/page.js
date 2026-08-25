'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User } from 'lucide-react';

const TABS = [
  { key: 'basic', label: 'Basic and Login Details' },
  { key: 'job', label: 'Job Details' },
  { key: 'contact', label: 'Contact Details' },
  { key: 'supervisor', label: 'Supervisor Mapping' },
  { key: 'emergency', label: 'Emergency Contacts' },
];

export default function EmployeeProfilePage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState('basic');
  const [employee, setEmployee] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [router, id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, supRes] = await Promise.all([
        fetch(`/api/employees/${id}`),
        fetch('/api/employees?role=SUPERVISOR')
      ]);
      const emp = await empRes.json();
      const sups = await supRes.json();
      setEmployee(emp);
      setForm(emp);
      setSupervisors(Array.isArray(sups) ? sups : []);
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
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.id) {
        setEmployee(data);
        showToast('Profile updated successfully!');
      }
    } catch (e) {
      showToast('Error saving profile.', 'error');
    }
    setSaving(false);
  };

  const f = (field) => form[field] || '';
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return <div style={{ padding: '2rem' }}>Loading employee profile...</div>;
  if (!employee) return <div style={{ padding: '2rem' }}>Employee not found.</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Back Bar */}
      <div style={{ background: 'white', padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => router.push('/dashboard/employees')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} /> Back to EmployeeList
        </button>
      </div>

      {/* Header Card */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: 'white' }}>
              {employee.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ position: 'absolute', bottom: 0, right: 0, background: '#007bff', color: 'white', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', cursor: 'pointer' }}>manage</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{employee.name}</h2>
              <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{employee.empId || 'N/A'}</span>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>WORKING</span>
            </div>
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              {[
                { label: 'Supervisor', value: employee.supervisor?.name || '—' },
                { label: '📱 Mobile', value: employee.phone || '—' },
                { label: '✉ E-Mail', value: employee.email },
                { label: 'Joined Date', value: employee.joinedDate || '—' },
                { label: 'Designation', value: employee.designation || '—' },
                { label: 'Branch', value: employee.branch || '—' },
                { label: 'Department', value: employee.department },
                { label: 'Organisation', value: employee.organisation || 'Cecube Engineering India Pvt Ltd' },
              ].map(({ label, value }) => (
                <div key={label} style={{ fontSize: '12px' }}>
                  <div style={{ color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => showToast('Login instructions sent!')} style={{ padding: '10px 18px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
            Send Login Instruction
          </button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px' }}>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: 500, paddingTop: '10px' }}>Name</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelSm}>Name</label>
                  <input value={f('name')} onChange={e => set('name', e.target.value)} style={inputStyle} />
                </div>

                <div style={{ color: '#374151', fontSize: '14px', fontWeight: 500, paddingTop: '10px' }}>Organization Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Employee Code</label>
                    <input value={f('empId')} onChange={e => set('empId', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSm}>Organization</label>
                    <input value={f('organisation') || 'Cecube Engineering India Pvt Ltd'} onChange={e => set('organisation', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ color: '#374151', fontSize: '14px', fontWeight: 500, paddingTop: '10px' }}>Other Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSm}>Gender</label>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="gender" checked={f('gender') === 'Male'} onChange={() => set('gender', 'Male')} /> Male
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="gender" checked={f('gender') === 'Female'} onChange={() => set('gender', 'Female')} /> Female
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
                  <input value={f('designation')} onChange={e => set('designation', e.target.value)} style={inputStyle} placeholder="e.g. Software Engineer" />
                </div>
                <div>
                  <label style={labelSm}>Branch</label>
                  <input value={f('branch')} onChange={e => set('branch', e.target.value)} style={inputStyle} placeholder="e.g. DEFAULT" />
                </div>
                <div>
                  <label style={labelSm}>Department</label>
                  <input value={f('department')} onChange={e => set('department', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Date of Joining</label>
                  <input type="date" value={f('joinedDate')} onChange={e => set('joinedDate', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Role</label>
                  <select value={f('role')} onChange={e => set('role', e.target.value)} style={inputStyle}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="SUPERVISOR">Supervisor</option>
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Probation Period</label>
                  <select value={f('probationPeriod')} onChange={e => {
                      set('probationPeriod', e.target.value);
                      if (e.target.value === '6 Months' && f('joinedDate')) {
                         const jd = new Date(f('joinedDate'));
                         jd.setMonth(jd.getMonth() + 6);
                         set('confirmationDate', jd.toISOString().split('T')[0]);
                      } else {
                         set('confirmationDate', '');
                      }
                  }} style={inputStyle}>
                    <option value="">Select</option>
                    <option value="6 Months">6 Months</option>
                    <option value="No Probation">No Probation</option>
                  </select>
                </div>
                <div>
                  <label style={labelSm}>Confirmation Date</label>
                  <input type="date" value={f('confirmationDate')} onChange={e => set('confirmationDate', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600 }}>Contact Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelSm}>Email Address</label>
                  <input type="email" value={f('email')} onChange={e => set('email', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelSm}>Mobile Number</label>
                  <input value={f('phone')} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="07042938885" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelSm}>Address</label>
                  <textarea value={f('address')} onChange={e => set('address', e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} placeholder="Full address..." />
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

          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => setForm(employee)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>
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
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: '#fafafa' };
