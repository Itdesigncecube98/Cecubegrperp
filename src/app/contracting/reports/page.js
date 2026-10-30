'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2, RefreshCw, Search } from 'lucide-react';
import '../contracting.css';

const formatCurrency = value => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const formatDate = value => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—';

const dateValue = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const paymentStatus = status => String(status || '').toLowerCase() === 'paid' ? 'Paid' : 'Unpaid';

async function fetchRABills() {
  const response = await fetch('/api/contracting/ra-bills', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load RA bill reports.');
  return Array.isArray(data) ? data : [];
}

export default function ContractingReportsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('payments');
  const [filters, setFilters] = useState({ projectId: '', supplier: '', status: '', fromDate: '', toDate: '' });

  useEffect(() => {
    let cancelled = false;
    fetchRABills()
      .then(data => { if (!cancelled) setBills(data); })
      .catch(loadError => { if (!cancelled) setError(loadError.message || 'Could not load RA bill reports.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadBills = async () => {
    setLoading(true);
    setError('');
    try {
      setBills(await fetchRABills());
    } catch (loadError) {
      setError(loadError.message || 'Could not load RA bill reports.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const projects = useMemo(() => {
    const byId = new Map();
    bills.forEach(bill => {
      if (bill.project?.id) byId.set(bill.project.id, bill.project.name || bill.project.projectId || 'Project');
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [bills]);

  const suppliers = useMemo(() => Array.from(new Set(
    bills.map(bill => bill.workOrder?.contractorName).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b)), [bills]);

  const filteredBills = useMemo(() => bills.filter(bill => {
    if (filters.projectId && bill.projectId !== filters.projectId) return false;
    if (filters.supplier && bill.workOrder?.contractorName !== filters.supplier) return false;
    if (filters.status && (reportType === 'payments' ? paymentStatus(bill.status) : String(bill.status || '')) !== filters.status) return false;

    const billDate = dateValue(bill.date || bill.createdAt);
    const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
    const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59.999`) : null;
    if ((from || to) && !billDate) return false;
    if (from && billDate < from) return false;
    if (to && billDate > to) return false;
    return true;
  }), [bills, filters, reportType]);

  const supplierSummary = useMemo(() => {
    const grouped = new Map();
    filteredBills.forEach(bill => {
      const supplier = bill.workOrder?.contractorName || 'Unassigned supplier';
      const row = grouped.get(supplier) || {
        supplier,
        billCount: 0,
        billValue: 0,
        netPayable: 0,
        paidAmount: 0,
        outstandingAmount: 0,
      };
      const netPayable = Number(bill.netPayable) || 0;
      row.billCount += 1;
      row.billValue += Number(bill.currentBill) || 0;
      row.netPayable += netPayable;
      if (paymentStatus(bill.status) === 'Paid') row.paidAmount += netPayable;
      else row.outstandingAmount += netPayable;
      grouped.set(supplier, row);
    });
    return Array.from(grouped.values()).sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [filteredBills]);

  const reportRows = reportType === 'payments'
    ? filteredBills.map((bill, index) => ({
      No: index + 1,
      'RA Bill No.': bill.billNo || '',
      'Bill Date': formatDate(bill.date || bill.createdAt),
      Project: bill.project?.name || '',
      Supplier: bill.workOrder?.contractorName || '',
      'Work Order': bill.workOrder?.woNo || '',
      'Bill Value': Number(bill.currentBill) || 0,
      'Net Payable': Number(bill.netPayable) || 0,
      'Payment Status': paymentStatus(bill.status),
    }))
    : supplierSummary.map((row, index) => ({
      No: index + 1,
      Supplier: row.supplier,
      'Number of Bills': row.billCount,
      'Bill Value': row.billValue,
      'Net Payable': row.netPayable,
      'Paid Amount': row.paidAmount,
      Outstanding: row.outstandingAmount,
    }));

  const filename = `${reportType === 'payments' ? 'ra-bill-payment' : 'supplier-wise'}-report`;

  const exportExcel = async () => {
    if (!reportRows.length) {
      alert('No report records to export.');
      return;
    }
    try {
      const { utils, writeFile } = await import('xlsx');
      const sheet = utils.json_to_sheet(reportRows);
      sheet['!cols'] = Object.keys(reportRows[0]).map(key => ({ wch: Math.max(14, key.length + 3) }));
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, sheet, reportType === 'payments' ? 'RA Bill Payments' : 'Supplier Summary');
      writeFile(workbook, `${filename}.xlsx`);
    } catch (exportError) {
      console.error('Failed to export contracting report to Excel:', exportError);
      alert('Could not export the report to Excel.');
    }
  };

  const exportPdf = async () => {
    if (!reportRows.length) {
      alert('No report records to export.');
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: reportType === 'payments' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
      const columns = Object.keys(reportRows[0]).map(key => ({ key, label: key }));
      const margin = 10;
      const weights = reportType === 'payments'
        ? [0.35, 1.05, 0.8, 1.45, 1.2, 0.9, 0.9, 0.9, 0.85]
        : [0.35, 1.8, 1, 1, 1, 1, 1.2];
      const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
      const tableWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const columnWidths = columns.map((_, index) => tableWidth * (weights[index] || 1) / weightTotal);
      const bottom = doc.internal.pageSize.getHeight() - margin - 8;
      const title = reportType === 'payments' ? 'RA Bill Payment Report' : 'Supplier Wise Report';
      const projectName = projects.find(project => project.id === filters.projectId)?.name || 'All Projects';

      const drawHeader = () => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(20, 20, 20);
        doc.setLineWidth(0.35);
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.text('CeCube Green Energy Private Limited', pageWidth / 2, 13, { align: 'center' });
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text('Contracting Department', pageWidth / 2, 17, { align: 'center' });
        doc.setLineWidth(0.25);
        doc.line(margin, 20, pageWidth - margin, 20);
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text(title, pageWidth / 2, 27, { align: 'center' });
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text(`Project: ${projectName}`, margin + 1, 34);
        doc.text(`Supplier: ${filters.supplier || 'All Suppliers'}`, margin + 1, 38);
        doc.text(`Printed: ${formatDate(new Date())}`, pageWidth - margin - 1, 34, { align: 'right' });

        let x = margin;
        const headerY = 43;
        doc.setFont('times', 'bold');
        doc.setFontSize(8);
        doc.setFillColor(232, 232, 232);
        doc.setDrawColor(20, 20, 20);
        columns.forEach((column, index) => {
          const width = columnWidths[index];
          doc.rect(x, headerY, width, 8, 'FD');
          doc.text(column.label, x + 1, headerY + 5.2, { maxWidth: width - 2 });
          x += width;
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'normal');
        return headerY + 8;
      };

      const drawFooter = pageNumber => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(20, 20, 20);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text(`Total Records: ${reportRows.length}`, margin + 1, pageHeight - 9);
        doc.text(`Page ${pageNumber}`, pageWidth - margin - 1, pageHeight - 9, { align: 'right' });
      };

      let y = drawHeader();
      let pageNumber = 1;
      reportRows.forEach(row => {
        const cells = columns.map((column, index) => doc.splitTextToSize(
          typeof row[column.key] === 'number' && /Amount|Value|Payable|Outstanding/.test(column.key)
            ? formatCurrency(row[column.key])
            : String(row[column.key] ?? ''),
          columnWidths[index] - 2
        ));
        const rowHeight = Math.max(7, ...cells.map(lines => lines.length * 3.3 + 2));
        if (y + rowHeight > bottom) {
          drawFooter(pageNumber);
          doc.addPage();
          pageNumber += 1;
          y = drawHeader();
        }
        let x = margin;
        columns.forEach((column, index) => {
          const width = columnWidths[index];
          doc.rect(x, y, width, rowHeight);
          doc.text(cells[index], x + 1, y + 4, { maxWidth: width - 2 });
          x += width;
        });
        y += rowHeight;
      });
      drawFooter(pageNumber);
      doc.save(`${filename}.pdf`);
    } catch (exportError) {
      console.error('Failed to export contracting report to PDF:', exportError);
      alert('Could not export the report to PDF.');
    }
  };

  const resetFilters = () => setFilters({ projectId: '', supplier: '', status: '', fromDate: '', toDate: '' });

  return (
    <div className="contracting-container">
      <header className="contracting-header">
        <div>
          <div className="contracting-header-title">Contracting Reports</div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>RA bill payment and supplier-wise summaries</div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-cyan" aria-pressed={reportType === 'payments'} onClick={() => { setReportType('payments'); setFilters(previous => ({ ...previous, status: '' })); }}>RA Bill Payment Report</button>
        <button type="button" className="btn-cyan" aria-pressed={reportType === 'suppliers'} onClick={() => { setReportType('suppliers'); setFilters(previous => ({ ...previous, status: '' })); }}>Supplier Wise Report</button>
      </div>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
            Project
            <select className="contracting-input" style={{ width: '100%', marginTop: 6 }} value={filters.projectId} onChange={event => setFilters(previous => ({ ...previous, projectId: event.target.value }))}>
              <option value="">All Projects</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
            Supplier
            <select className="contracting-input" style={{ width: '100%', marginTop: 6 }} value={filters.supplier} onChange={event => setFilters(previous => ({ ...previous, supplier: event.target.value }))}>
              <option value="">All Suppliers</option>
              {suppliers.map(supplier => <option key={supplier} value={supplier}>{supplier}</option>)}
            </select>
          </label>
          <label style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
            {reportType === 'payments' ? 'Payment Status' : 'Bill Status'}
            <select className="contracting-input" style={{ width: '100%', marginTop: 6 }} value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value }))}>
              <option value="">All</option>
              {reportType === 'payments' ? (
                <>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </>
              ) : (
                ['Submitted', 'Approved', 'Paid', 'Rejected'].map(status => <option key={status} value={status}>{status}</option>)
              )}
            </select>
          </label>
          <label style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
            From Date
            <input type="date" className="contracting-input" style={{ width: '100%', marginTop: 6 }} value={filters.fromDate} onChange={event => setFilters(previous => ({ ...previous, fromDate: event.target.value }))} />
          </label>
          <label style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
            To Date
            <input type="date" className="contracting-input" style={{ width: '100%', marginTop: 6 }} value={filters.toDate} onChange={event => setFilters(previous => ({ ...previous, toDate: event.target.value }))} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn-cyan" onClick={resetFilters}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="btn-cyan" onClick={loadBills} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Refresh
          </button>
          <button type="button" className="btn-cyan" onClick={exportExcel} disabled={loading || reportRows.length === 0}><FileSpreadsheet size={14} /> Export Excel</button>
          <button type="button" className="btn-cyan" onClick={exportPdf} disabled={loading || reportRows.length === 0}><FileDown size={14} /> Export PDF</button>
        </div>
      </section>

      {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
      <section style={{ overflow: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <table className="contracting-table">
          <thead>
            <tr>
              {(reportType === 'payments'
                ? ['#', 'RA Bill No.', 'Bill Date', 'Project', 'Supplier', 'Work Order', 'Bill Value', 'Net Payable', 'Payment Status']
                : ['#', 'Supplier', 'Number of Bills', 'Bill Value', 'Net Payable', 'Paid Amount', 'Outstanding']
              ).map(header => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24 }}>Loading reports…</td></tr>
            ) : reportRows.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>{error || 'No RA bills match the selected filters.'}</td></tr>
            ) : reportType === 'payments' ? filteredBills.map((bill, index) => (
              <tr key={bill.id}>
                <td>{index + 1}</td>
                <td>{bill.billNo}</td>
                <td>{formatDate(bill.date || bill.createdAt)}</td>
                <td>{bill.project?.name || '—'}</td>
                <td>{bill.workOrder?.contractorName || '—'}</td>
                <td>{bill.workOrder?.woNo || '—'}</td>
                <td>{formatCurrency(bill.currentBill)}</td>
                <td>{formatCurrency(bill.netPayable)}</td>
                <td>{paymentStatus(bill.status)}</td>
              </tr>
            )) : supplierSummary.map((row, index) => (
              <tr key={row.supplier}>
                <td>{index + 1}</td>
                <td>{row.supplier}</td>
                <td>{row.billCount}</td>
                <td>{formatCurrency(row.billValue)}</td>
                <td>{formatCurrency(row.netPayable)}</td>
                <td>{formatCurrency(row.paidAmount)}</td>
                <td>{formatCurrency(row.outstandingAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div style={{ color: '#64748b', fontSize: 13 }}>
        {reportType === 'payments'
          ? 'Payment status is based on the RA bill status. The system currently stores payment as Paid/Unpaid, not a separate payment date or partial-payment amount.'
          : `${supplierSummary.length} suppliers · ${filteredBills.length} RA bills`}
      </div>
    </div>
  );
}
