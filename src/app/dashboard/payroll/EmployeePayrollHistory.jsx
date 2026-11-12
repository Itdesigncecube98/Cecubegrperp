'use client';

import { useState } from 'react';
import { History, X } from 'lucide-react';

const money = value => `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const title = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const cycleLabel = cycle => cycle
  ? `${cycle.name}${cycle.startDate || cycle.endDate ? ` · ${cycle.startDate || '—'} to ${cycle.endDate || '—'}` : ''}`
  : 'Pay cycle unavailable';

export default function EmployeePayrollHistory({ employeeId, employeeName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState({ items: [], encashments: [] });

  const showHistory = async () => {
    setOpen(true);
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/payroll/employees/${encodeURIComponent(employeeId)}/history`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load payroll history.');
      setHistory(result);
    } catch (err) {
      setError(err.message || 'Could not load payroll history.');
    } finally {
      setLoading(false);
    }
  };

  const rows = [
    ...(history.items || []).map(item => ({
      id: item.id,
      cycle: cycleLabel(item.payCycle),
      type: title(item.type),
      amount: item.amount,
      status: item.status === 'ADDED_TO_SALARY' ? 'Included in payslip' : title(item.status),
      date: item.updatedAt || item.createdAt,
      message: item.message,
    })),
    ...(history.encashments || []).map(item => ({
      id: `encash-${item.id}`,
      cycle: item.payCycle ? cycleLabel(item.payCycle) : (item.payCycleId ? 'Linked pay cycle' : `Not in a pay cycle · ${item.asOnDate || ''}`),
      type: `${item.leaveType || 'Leave'} encashment (${item.encashedDays || 0} days)`,
      amount: item.totalAmount,
      status: item.cancelledAt ? 'Cancelled' : item.isProcessed ? 'Included in posted salary' : item.payCycleId ? 'Added to salary calculation' : 'Pending payroll',
      date: item.updatedAt || item.createdAt,
      message: item.message,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return <>
    <button type="button" onClick={showHistory} title={`View ${employeeName || 'employee'} payroll history`} style={{ padding: '5px 8px', border: '1px solid #bae6fd', borderRadius: 5, color: '#0369a1', background: '#f0f9ff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <History size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />History
    </button>
    {open && <div role="dialog" aria-modal="true" aria-label="Employee payroll history" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <section onClick={event => event.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: 'min(980px, 96vw)', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15,23,42,.3)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: 'white' }}>
          <div><strong style={{ color: '#0f172a' }}>Payroll History · {employeeName}</strong><div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Bonus, incentive, gratuity and leave encashment by pay cycle</div></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close history" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </header>
        {loading ? <p style={{ padding: 24, color: '#64748b' }}>Loading payroll history…</p> : error ? <p style={{ padding: 24, color: '#b91c1c' }}>{error}</p> : <div style={{ padding: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', background: '#e0f2fe', color: '#075985' }}>{['Pay cycle', 'Item', 'Amount', 'Payslip status', 'Recorded', 'Remark'].map(label => <th key={label} style={{ padding: 10, borderBottom: '1px solid #bae6fd' }}>{label}</th>)}</tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: 10, whiteSpace: 'nowrap' }}>{row.cycle}</td><td style={{ padding: 10 }}>{row.type}</td><td style={{ padding: 10, whiteSpace: 'nowrap', fontWeight: 600 }}>{money(row.amount)}</td><td style={{ padding: 10 }}>{row.status}</td><td style={{ padding: 10, whiteSpace: 'nowrap' }}>{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '—'}</td><td style={{ padding: 10 }}>{row.message || '—'}</td>
            </tr>)}
            {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No bonus, incentive, gratuity or encashment history found.</td></tr>}</tbody>
          </table>
        </div>}
      </section>
    </div>}
  </>;
}
