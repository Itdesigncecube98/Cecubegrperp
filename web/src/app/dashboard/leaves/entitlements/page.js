'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, X } from 'lucide-react';

export default function EntitlementsPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filterOrg, setFilterOrg] = useState('All');
  const [filterLeaveType, setFilterLeaveType] = useState('All');

  // Modal form state - supports "+ Add More"
  const [modalRows, setModalRows] = useState([
    { employeeId: '', leavePeriod: 'All', leaveType: '', entitlement: '' }
  ]);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, ltRes, balRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/setup/leavetype'),
        fetch('/api/leaves/balance')
      ]);
      const emps = await empRes.json();
      const lts = await ltRes.json();
      const bals = await balRes.json();
      setEmployees(emps.filter(e => e.role === 'EMPLOYEE'));
      setLeaveTypes(lts);
      // Build entitlements table from balance data
      const ents = (Array.isArray(bals) ? bals : []).flatMap(bal => {
        const emp = emps.find(e => e.id === bal.employeeId);
        if (!emp) return [];
        return [
          { id: `${bal.id}-cas`, empName: emp.name, empId: emp.empId, org: emp.organisation || 'CECUBE ENGINEERING PVT LTD', leaveType: 'Casual', days: bal.casualLeaves, validTo: '2026-12-31', employeeId: emp.id },
          { id: `${bal.id}-lwp`, empName: emp.name, empId: emp.empId, org: emp.organisation || 'CECUBE ENGINEERING PVT LTD', leaveType: 'Leave Without Pay', days: bal.leaveWithoutPay, validTo: '2026-12-31', employeeId: emp.id },
          { id: `${bal.id}-earn`, empName: emp.name, empId: emp.empId, org: emp.organisation || 'CECUBE ENGINEERING PVT LTD', leaveType: 'Earned', days: bal.earnedLeaves, validTo: '2026-12-31', employeeId: emp.id },
        ];
      });
      setEntitlements(ents);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addRow = () => {
    setModalRows(prev => [...prev, { employeeId: '', leavePeriod: 'All', leaveType: '', entitlement: '' }]);
  };

  const updateRow = (idx, field, value) => {
    setModalRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx) => {
    if (modalRows.length === 1) return;
    setModalRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAdd = async () => {
    const valid = modalRows.filter(r => r.employeeId && r.leaveType && r.entitlement);
    if (valid.length === 0) { showToast('Please fill required fields.', 'error'); return; }

    try {
      // For each row, update the balance
      for (const row of valid) {
        const days = parseFloat(row.entitlement) || 0;
        const existingRes = await fetch(`/api/leaves/balance?employeeId=${row.employeeId}`);
        const existing = await existingRes.json();

        const payload = {
          employeeId: parseInt(row.employeeId) || row.employeeId,
          casualLeaves: existing.casualLeaves || 12,
          leaveWithoutPay: existing.leaveWithoutPay || 0,
          earnedLeaves: existing.earnedLeaves || 15,
        };

        if (row.leaveType === 'Casual') payload.casualLeaves = days;
        else if (row.leaveType === 'Leave Without Pay') payload.leaveWithoutPay = days;
        else if (row.leaveType === 'Earned') payload.earnedLeaves = days;

        await fetch('/api/leaves/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      showToast('Entitlement added successfully!');
      setShowModal(false);
      setModalRows([{ employeeId: '', leavePeriod: 'All', leaveType: '', entitlement: '' }]);
      fetchData();
    } catch (e) {
      showToast('Error saving entitlement.', 'error');
    }
  };

  const filteredEnts = entitlements.filter(e => {
    if (filterLeaveType !== 'All' && e.leaveType !== filterLeaveType) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh', padding: '24px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
          ← Back to Administration & Reports
        </button>
      </div>

      {/* Filter Row */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px 20px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={labelSm}>Organization</label>
            <input value={filterOrg} onChange={e => setFilterOrg(e.target.value)} style={inputStyle} placeholder="Cecube Engineering India Pvt..." />
          </div>
          <div>
            <label style={labelSm}>Leave Type</label>
            <select value={filterLeaveType} onChange={e => setFilterLeaveType(e.target.value)} style={inputStyle}>
              <option value="All">All</option>
              <option value="Casual">Casual</option>
              <option value="Leave Without Pay">Leave Without Pay</option>
              <option value="Earned">Earned</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.name}>{lt.name}</option>)}
            </select>
          </div>
          <div />
          <div />
          <button style={{ padding: '9px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, height: '38px' }}>
            View
          </button>
          <button onClick={() => setFilterLeaveType('All')} style={{ padding: '9px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, height: '38px' }}>
            Clear
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Entitlement</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>The below table shows the list of entitlements.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              Assign
            </button>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              Add Entitlement
            </button>
          </div>
        </div>

        {/* Sub-filter */}
        <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
            <select style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }} defaultValue="All">
              <option>All</option>
            </select>
            entries per page
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Action:</span>
            <select style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', minWidth: '120px' }}>
              <option value="">Select Action</option>
              <option>Delete Selected</option>
            </select>
            <button style={{ padding: '4px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>Go</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}><input type="checkbox" /></th>
                <th style={thStyle}>S.NO</th>
                <th style={thStyle}>ORGANIZATION</th>
                <th style={thStyle}>EMPLOYEE</th>
                <th style={thStyle}>LEAVE TYPE</th>
                <th style={thStyle}>VALID TO</th>
                <th style={thStyle}>DAYS</th>
                <th style={thStyle}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
              ) : filteredEnts.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No entitlements found. Add one using the button above.</td></tr>
              ) : filteredEnts.map((ent, idx) => (
                <tr key={ent.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}><input type="checkbox" /></td>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{ ...tdStyle, maxWidth: '160px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ent.org}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{ent.empName}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ent.empId}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{ent.leaveType}</span>
                  </td>
                  <td style={{ ...tdStyle, color: '#6b7280', fontSize: '13px' }}>Thu, Dec 31 2026</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{ent.days?.toFixed(2) || '0.00'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ padding: '5px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Edit">
                        <Edit2 size={13} color="#374151" />
                      </button>
                      <button style={{ padding: '5px', background: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Delete">
                        <Trash2 size={13} color="#dc2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Showing {filteredEnts.length > 0 ? '1' : '0'} to {filteredEnts.length} of {filteredEnts.length} entries
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['«', '‹', '1', '›', '»'].map(p => (
              <button key={p} style={{ width: '30px', height: '30px', border: '1px solid #e5e7eb', background: p === '1' ? '#007bff' : 'white', color: p === '1' ? 'white' : '#374151', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Entitlement Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Add Entitlement</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Close <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Organization */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelSm}>Organization</label>
                <select style={inputStyle} defaultValue="All">
                  <option value="All">All</option>
                  <option>Cecube Engineering India Pvt Ltd</option>
                </select>
              </div>

              {/* Rows */}
              {modalRows.map((row, idx) => (
                <div key={idx} style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '12px', border: '1px solid #f3f4f6', position: 'relative' }}>
                  {modalRows.length > 1 && (
                    <button onClick={() => removeRow(idx)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelSm}>Employee*</label>
                    <select value={row.employeeId} onChange={e => updateRow(idx, 'employeeId', e.target.value)} style={inputStyle}>
                      <option value="">Any</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empId || e.id.substring(0, 8)})</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelSm}>Leave Period</label>
                    <select value={row.leavePeriod} onChange={e => updateRow(idx, 'leavePeriod', e.target.value)} style={inputStyle}>
                      <option value="All">All</option>
                      <option value="2026">Year 2026</option>
                      <option value="2025">Year 2025</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelSm}>Leave Type</label>
                      <select value={row.leaveType} onChange={e => updateRow(idx, 'leaveType', e.target.value)} style={inputStyle}>
                        <option value="">All</option>
                        <option value="Casual">Casual</option>
                        <option value="Leave Without Pay">Leave Without Pay</option>
                        <option value="Earned">Earned</option>
                        {leaveTypes.map(lt => <option key={lt.id} value={lt.name}>{lt.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelSm}>Entitlement (Days)</label>
                      <input type="number" value={row.entitlement} onChange={e => updateRow(idx, 'entitlement', e.target.value)} style={inputStyle} placeholder="e.g. 12" min="0" step="0.5" />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addRow} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: '4px 0', marginBottom: '20px' }}>
                + Add More
              </button>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={handleAdd} style={{ padding: '10px 40px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelSm = { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'white' };
const thStyle = { padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '14px', verticalAlign: 'middle', fontSize: '13px', color: '#374151' };
