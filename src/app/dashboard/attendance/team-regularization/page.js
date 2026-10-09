'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Check, X, RefreshCw, MapPin } from 'lucide-react';
import { getPunchRequests, updatePunchRequestStatus, getEmployees } from '../../../../lib/data';
import { useAutoRefresh, formatRefreshTime } from '../../../../lib/useAutoRefresh';
import Dialog from '../../../../components/Dialog';
import '../attendance.css';

export default function TeamRegularizationRequests() {
  const [requests, setRequests] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [showCoffDialog, setShowCoffDialog] = useState(false);
  const [coffRequestId, setCoffRequestId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'All',
    employeeId: 'Any',
    startDate: '',
    endDate: ''
  });

  const formatTime = (time) => {
    if (!time) return '-';
    const normalized = time.trim();
    const match = /^([0-2]?\d):(\d{2})$/.exec(normalized);
    if (!match) return normalized;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${String(hour).padStart(2, '0')}:${minute} ${period}`;
  };

  const formatCreatedAt = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return String(value);
    }
  };

  const loadRequests = useCallback(async () => {
    const data = await getPunchRequests();
    setRequests(Array.isArray(data) ? data : []);
  }, []);

  const { refresh, refreshing, lastRefreshed, autoRefresh, setAutoRefresh } = useAutoRefresh(loadRequests, {
    intervalMs: 10000,
    enabled: true
  });

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try {
        await loadRequests();
        const emps = await getEmployees();
        setEmployees(Array.isArray(emps) ? emps : []);
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [loadRequests]);

  const handleAction = async (id, newStatus, grantCoff = false) => {
    try {
      // Optimistic UI
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)));
      await updatePunchRequestStatus(id, newStatus, grantCoff);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
      refresh();
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filters.status !== 'All' && req.status.toUpperCase() !== filters.status.toUpperCase()) return false;
    if (filters.employeeId !== 'Any' && req.employeeId !== filters.employeeId) return false;
    if (filters.startDate && req.date < filters.startDate) return false;
    if (filters.endDate && req.date > filters.endDate) return false;
    return true;
  });

  const refreshBar = (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
          background: '#fff', color: '#334155', fontWeight: 600, fontSize: '13px',
          cursor: refreshing ? 'wait' : 'pointer'
        }}
      >
        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
        {refreshing ? 'Updating…' : 'Refresh'}
      </button>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={e => setAutoRefresh(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        Auto-refresh
      </label>
      {(lastRefreshed || refreshing) && (
        <span style={{ fontSize: '12px', color: refreshing ? '#0f766e' : '#6b7280' }}>
          {refreshing ? 'Updating in background…' : `Updated ${formatRefreshTime(lastRefreshed)}`}
        </span>
      )}
    </div>
  );

  return (
    <div className="pageContainer">
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>

      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Team Regularization Request</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Employee</label>
            <select
              className="filterInput"
              value={filters.employeeId}
              onChange={e => setFilters({ ...filters, employeeId: e.target.value })}
            >
              <option value="Any">Any</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
        </div>
        <div className="filtersRow" style={{ marginTop: '1rem' }}>
          <div className="filterGroup">
            <label className="filterLabel">Regularization Request Status</label>
            <select className="filterInput" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="All">All</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          <div style={{ flex: 3 }}></div>
        </div>
        <div className="filterActions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btnPrimary" onClick={refresh}>View</button>
            <button className="btn btnPrimary" onClick={() => setFilters({ status: 'All', employeeId: 'Any', startDate: '', endDate: '' })}>Clear</button>
            {refreshBar}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Team Regularization requests</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your team&apos;s attendance regularization requests.</p>
          </div>
          {refreshBar}
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            <select className="entriesSelect"><option>All</option></select>
            entries per page
          </div>
        </div>

        <div style={{ overflowX: 'auto', opacity: refreshing && requests.length > 0 ? 0.92 : 1, transition: 'opacity 0.2s' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>EMPLOYEE NAME</th>
                <th>DATE</th>
                <th>REQUESTED TIME</th>
                <th>TYPE</th>
                <th>REASON</th>
                <th>LOCATION</th>
                <th>STATUS</th>
                <th>CREATED AT</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading && requests.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>Loading requests...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>No data available in table</td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id}>
                    <td><input type="checkbox" /></td>
                    <td>{req.employee?.name}</td>
                    <td>{new Date(req.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}, {req.date}</td>
                    <td>
                      {(() => {
                        if (!req.time) return '-';
                        if (req.type === 'COFF_CONVERSION') {
                          return <span style={{ fontWeight: 600 }}>{req.time} COff(s)</span>;
                        }
                        if (req.type === 'REGULARIZE') {
                          try {
                            const parsed = JSON.parse(req.time);
                            return (
                              <div style={{ fontSize: '13px' }}>
                                {parsed.in ? <div><span style={{ color: '#16a34a', fontWeight: 600 }}>In:</span> {formatTime(parsed.in)}</div> : null}
                                {parsed.out ? <div><span style={{ color: '#dc2626', fontWeight: 600 }}>Out:</span> {formatTime(parsed.out)}</div> : null}
                              </div>
                            );
                          } catch (e) {
                            return formatTime(req.time);
                          }
                        }
                        return formatTime(req.time);
                      })()}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: req.type === 'IN' ? '#16a34a' : req.type === 'OUT' ? '#dc2626' : req.type === 'COFF_CONVERSION' ? '#8b5cf6' : '#f59e0b' }}>
                        {req.type === 'COFF_CONVERSION' ? 'COFF Conv.' : req.type}
                      </span>
                      {req.shiftType === 'Night' && (
                        <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, marginTop: '2px' }}>Night Shift</div>
                      )}
                    </td>
                    <td><span style={{ fontSize: '12px', color: '#6b7280' }}>{req.reason || '-'}</span></td>
                    <td>
                      {(req.locationName || req.employee?.siteOffice) && <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '2px' }}>{req.locationName || `Site office: ${req.employee.siteOffice}`}</div>}
                      {req.latitude != null && req.longitude != null || req.employee?.siteOffice ? (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(req.latitude != null && req.longitude != null ? `${req.latitude},${req.longitude}` : req.employee.siteOffice)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={req.latitude != null && req.longitude != null ? `${Number(req.latitude).toFixed(5)}, ${Number(req.longitude).toFixed(5)}` : `Site office: ${req.employee.siteOffice}`}
                          style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MapPin size={12} /> {req.latitude != null && req.longitude != null ? 'Map View' : 'Site office map'}
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        req.status === 'APPROVED' ? 'badge-success' :
                        req.status === 'PENDING' ? 'badge-warning' :
                        req.status === 'REJECTED' ? 'badge-danger' : ''
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td>{formatCreatedAt(req.createdAt)}</td>
                    <td>
                      {req.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btnPrimary"
                            style={{ padding: '0.3rem 0.5rem', background: '#16a34a' }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAction(req.id, 'APPROVED');
                            }}
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          {req.shiftType === 'Night' && (
                            <button
                              type="button"
                              className="btn btnPrimary"
                              style={{ padding: '0.3rem 0.5rem', background: '#6366f1', fontSize: '11px', fontWeight: 600 }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCoffRequestId(req.id);
                                setShowCoffDialog(true);
                              }}
                              title="Approve & Grant COFF"
                            >
                              Approve + COFF
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btnPrimary"
                            style={{ padding: '0.3rem 0.5rem', background: '#dc2626' }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAction(req.id, 'REJECTED');
                            }}
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="paginationArea">
          <div>Showing {filteredRequests.length > 0 ? 1 : 0} to {filteredRequests.length} of {filteredRequests.length} entries</div>
          <div className="paginationButtons">
            <button className="pageBtn" disabled>&laquo;</button>
            <button className="pageBtn" disabled>&lsaquo;</button>
            <button className="pageBtn active">1</button>
            <button className="pageBtn" disabled>&rsaquo;</button>
            <button className="pageBtn" disabled>&raquo;</button>
          </div>
        </div>
      </div>

      <Dialog 
        isOpen={showCoffDialog}
        title="Grant COFF"
        message="Approve and grant 1 COFF for this Night Shift?"
        onConfirm={() => {
          if (coffRequestId) handleAction(coffRequestId, 'APPROVED', true);
          setShowCoffDialog(false);
          setCoffRequestId(null);
        }}
        onCancel={() => {
          setShowCoffDialog(false);
          setCoffRequestId(null);
        }}
      />
    </div>
  );
}
