'use client';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_LEVELS = [
  { threshold: '500000', approverEmployeeIds: [] },
  { threshold: '1000000', approverEmployeeIds: [] },
];

export default function ProcurementApprovalsPage() {
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/admin/procurement-approval-workflow', { cache: 'no-store' }),
      fetch('/api/employees/approvers', { cache: 'no-store' }),
    ])
      .then(async ([configResponse, employeeResponse]) => {
        const [configResult, employeeResult] = await Promise.all([
          configResponse.json(),
          employeeResponse.json(),
        ]);
        if (!configResponse.ok) throw new Error(configResult.error || 'Unable to load approval settings.');
        if (!employeeResponse.ok) throw new Error(employeeResult.error || 'Unable to load employees.');
        if (!active) return;
        if (Array.isArray(configResult.config?.levels) && configResult.config.levels.length) {
          setLevels(configResult.config.levels.map(level => ({
            threshold: String(level.threshold),
            approverEmployeeIds: Array.isArray(level.approverEmployeeIds) ? level.approverEmployeeIds : [],
          })));
        } else {
          setLevels(DEFAULT_LEVELS);
        }
        setEmployees(Array.isArray(employeeResult) ? employeeResult : []);
      })
      .catch(loadError => {
        if (active) setError(loadError.message || 'Unable to load approval settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateLevel = (index, update) => {
    setLevels(current => current.map((level, levelIndex) => levelIndex === index ? { ...level, ...update } : level));
    setSaved(false);
  };

  const toggleEmployee = (levelIndex, employeeId) => {
    const level = levels[levelIndex];
    const nextEmployeeIds = level.approverEmployeeIds.includes(employeeId)
      ? level.approverEmployeeIds.filter(id => id !== employeeId)
      : [...level.approverEmployeeIds, employeeId];
    updateLevel(levelIndex, { approverEmployeeIds: nextEmployeeIds });
  };

  const save = async () => {
    setError('');
    setSaved(false);
    const normalizedLevels = levels
      .filter(level => String(level.threshold).trim() !== '')
      .map(level => ({ threshold: Number(level.threshold), approverEmployeeIds: level.approverEmployeeIds }));
    if (normalizedLevels.length !== levels.length) {
      setError('Every approval level needs an amount threshold, or remove that level.');
      return;
    }
    if (!normalizedLevels.length) {
      setError('Add at least one approval level. Remove the configured approvers only if you intend to disable threshold approvals.');
      return;
    }
    if (normalizedLevels.some(level => !Number.isFinite(level.threshold) || level.threshold <= 0 || !level.approverEmployeeIds.length)) {
      setError('Enter a positive threshold and select at least one employee for every level.');
      return;
    }
    if (normalizedLevels.some((level, index) => index > 0 && level.threshold <= normalizedLevels[index - 1].threshold)) {
      setError('Thresholds must increase at every level.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/procurement-approval-workflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels: normalizedLevels }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save approval settings.');
      setLevels(result.config.levels.map(level => ({
        threshold: String(level.threshold),
        approverEmployeeIds: level.approverEmployeeIds,
      })));
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save approval settings.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 11px',
    border: '1px solid #cbd5e1',
    borderRadius: 7,
    fontSize: 13,
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading approval workflow…</div>;

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Link href="/admin-dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap' }}>
            <ArrowLeft size={15} /> Back
          </Link>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 9, color: '#0f172a', fontSize: 22 }}>
              <ShieldCheck size={22} color="#4f46e5" /> Purchase & Work Order Approvals
            </h1>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
              One global amount-based approval chain applies to every PO and WO.
            </p>
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', border: 0, borderRadius: 8, background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
          <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved' : 'Save Workflow'}
        </button>
      </header>

      <div style={{ marginBottom: 16, padding: '12px 14px', border: '1px solid #c7d2fe', borderRadius: 8, background: '#eef2ff', color: '#3730a3', fontSize: 13, lineHeight: 1.5 }}>
        Every PO first needs approval from someone with Purchase Orders Approve permission, and every WO first needs approval from someone with Approve Work Order permission. If an order exceeds a configured threshold, it then goes to the selected employees in order; everyone at each level must approve before the next level. Thresholds use total PO/WO amount and trigger only when the amount is greater than the threshold.
        {' '}Assign Work Order approvers across all projects in <Link href="/admin-dashboard/employee-tools" style={{ color: '#3730a3', fontWeight: 700 }}>Employee Tool Permissions → Contract Manager Approval</Link>.
      </div>

      {error && <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 14 }}>
        {levels.map((level, levelIndex) => (
          <section key={levelIndex} style={{ padding: 18, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 15 }}>Approval Level {levelIndex + 1}</h2>
              <button type="button" aria-label={`Remove approval level ${levelIndex + 1}`} onClick={() => { setLevels(current => current.filter((_, index) => index !== levelIndex)); setSaved(false); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 9px', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', background: '#fff', cursor: 'pointer' }}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <label style={{ display: 'block', maxWidth: 360, color: '#334155', fontSize: 12, fontWeight: 650 }}>
              Send orders above (₹)
              <input type="number" min="0.01" step="0.01" value={level.threshold} onChange={event => updateLevel(levelIndex, { threshold: event.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 6 }} />
            </label>
            <div style={{ marginTop: 14, color: '#334155', fontSize: 12, fontWeight: 650 }}>Employees who must approve at this level</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 7, marginTop: 8, maxHeight: 190, overflowY: 'auto', padding: 10, border: '1px solid #e2e8f0', borderRadius: 7 }}>
              {employees.map(employee => (
                <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={level.approverEmployeeIds.includes(employee.id)} onChange={() => toggleEmployee(levelIndex, employee.id)} />
                  <span>{employee.empId ? `${employee.empId} - ` : ''}{employee.name}</span>
                </label>
              ))}
              {!employees.length && <span style={{ color: '#64748b', fontSize: 12 }}>No employees found.</span>}
            </div>
            <div style={{ marginTop: 7, color: '#64748b', fontSize: 11 }}>Selected: {level.approverEmployeeIds.length} — all must approve before the next level.</div>
          </section>
        ))}
      </div>

      {levels.length < 3 && <button type="button" onClick={() => { setLevels(current => [...current, { threshold: '', approverEmployeeIds: [] }]); setSaved(false); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '9px 12px', border: '1px dashed #94a3b8', borderRadius: 7, color: '#334155', background: '#fff', cursor: 'pointer' }}>
        <Plus size={15} /> Add approval level
      </button>}
    </div>
  );
}
