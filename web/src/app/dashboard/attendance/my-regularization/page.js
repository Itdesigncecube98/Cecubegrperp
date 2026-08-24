'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import { getPunchRequests } from '../../../../lib/data';
import '../attendance.css';

export default function MyRegularizationRequests() {
  const [employee, setEmployee] = useState(null);
  
  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
  }, []);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'All',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (employee && employee.id) {
      fetchRequests();
    }
  }, [employee]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getPunchRequests(null, employee.id);
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filters.status !== 'All' && req.status.toUpperCase() !== filters.status.toUpperCase()) return false;
    if (filters.startDate && req.date < filters.startDate) return false;
    if (filters.endDate && req.date > filters.endDate) return false;
    return true;
  });

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>My Regularization Requests</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Regularization Request Status</label>
            <select className="filterInput" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="All">All</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
        </div>
        <div className="filterActions">
          <button className="btn btnPrimary">View</button>
          <button className="btn btnPrimary" onClick={() => setFilters({status: 'All', startDate: '', endDate: ''})}>Clear</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">My Regularization Requests</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your attendance regularization requests.</p>
          </div>
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            <select className="entriesSelect"><option>All</option></select>
            entries per page
          </div>
          <div className="searchControl">
            Search: <input type="text" className="searchInput" />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>DATE</th>
                <th>REQUESTED TIME</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>CREATED AT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading requests...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id}>
                    <td>{req.employee.name}</td>
                    <td>{new Date(req.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}, {req.date}</td>
                    <td>{req.time}</td>
                    <td><span style={{ fontWeight: 600, color: req.type === 'IN' ? '#16a34a' : '#dc2626' }}>{req.type}</span></td>
                    <td>
                      <span className={`badge ${
                        req.status === 'APPROVED' ? 'badge-success' : 
                        req.status === 'PENDING' ? 'badge-warning' : 
                        req.status === 'REJECTED' ? 'badge-danger' : ''
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td>{new Date(req.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing {filteredRequests.length > 0 ? 1 : 0} to {filteredRequests.length} of {filteredRequests.length} entries</div>
          <div className="paginationButtons">
            <button className="pageBtn" disabled>&lsaquo;</button>
            <button className="pageBtn active">1</button>
            <button className="pageBtn" disabled>&rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
