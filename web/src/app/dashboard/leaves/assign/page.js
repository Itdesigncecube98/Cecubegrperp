'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function AssignLeavePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    employeeId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, ltRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/setup/leavetype')
      ]);
      const emps = await empRes.json();
      const lts = await ltRes.json();
      setEmployees(emps);
      setLeaveTypes(lts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const s = new Date(form.startDate);
    const e = new Date(form.endDate);
    return Math.max(0, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = async () => {
    if (!form.employeeId || !form.leaveType || !form.startDate || !form.endDate) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(form.employeeId),
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason || 'Assigned by Admin'
        })
      });
      const data = await res.json();
      if (data.id) {
        // Auto-approve when admin assigns
        await fetch('/api/leaves', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.id, status: 'APPROVED' })
        });
        showToast('Leave assigned & approved successfully!');
        setForm({ employeeId: '', leaveType: '', startDate: '', endDate: '', reason: '' });
      }
    } catch (e) {
      showToast('Error assigning leave.', 'error');
    }
    setSubmitting(false);
  };

  const days = getDays();

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '700px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Assign Leave</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Manually assign leave to an employee. It will be auto-approved.</p>
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: 'white', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Employee *</label>
              <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} style={inputStyle}>
                <option value="">-- Select Employee --</option>
                {employees.filter(e => e.role === 'EMPLOYEE').map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Leave Type *</label>
              <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })} style={inputStyle}>
                <option value="">-- Select Type --</option>
                {leaveTypes.length > 0 ? leaveTypes.map(lt => (
                  <option key={lt.id} value={lt.name}>{lt.name}</option>
                )) : (
                  <>
                    <option value="Casual">Casual</option>
                    <option value="Sick">Sick</option>
                    <option value="Earned">Earned</option>
                  </>
                )}
              </select>
            </div>

            <div></div>

            <div>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} min={form.startDate} />
            </div>

            {days > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', color: '#1d4ed8', fontSize: '14px', fontWeight: 500 }}>
                  📅 Total: <strong>{days} day{days > 1 ? 's' : ''}</strong> of leave will be assigned and approved.
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Reason / Notes</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Optional reason..." style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setForm({ employeeId: '', leaveType: '', startDate: '', endDate: '', reason: '' })} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
              Clear
            </button>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Assigning...' : 'Assign & Approve Leave'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px', color: '#374151' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
