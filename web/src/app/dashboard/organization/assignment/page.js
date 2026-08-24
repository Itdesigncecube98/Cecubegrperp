'use client';
import React, { useState } from 'react';
import { Users, RotateCcw, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './assignment.css';

const mockData = [
  { empNo: 'CGEPL015', name: 'Anjani Kumar Tripathi', position: 'Supervisor', earned: 10.5, casual: 3, comp: 0, lwp: 0 },
  { empNo: 'CGEPL003', name: 'Bharat Gosal', position: 'Technician', earned: 19.5, casual: 11, comp: 0, lwp: 0 },
  { empNo: 'CGEPL016', name: 'Brij Mohan Singh', position: 'Supervisor', earned: 10.5, casual: 7, comp: 0, lwp: 0 },
  { empNo: 'CGEPL007', name: 'Chandan Kumar', position: 'Supervisor', earned: 19.5, casual: 13, comp: 0, lwp: 0, selected: true },
  { empNo: 'CGEPL010', name: 'Ganesh Kumar Yadav', position: 'Project Engineer', earned: 19.5, casual: 4, comp: -9, lwp: 0 },
  { empNo: 'CGEPL012', name: 'Jatin Saxena', position: 'Trainee', earned: 1, casual: -4, comp: 0, lwp: 0 },
  { empNo: 'CGEPL006', name: 'Karteek S Mourya', position: 'Engineer', earned: 19.5, casual: 12, comp: 0, lwp: 0 }
];

export default function EmployeeAssignmentPage() {
  const [activeTab, setActiveTab] = useState('leave');

  return (
    <div className="assignment-page">
      {/* Header */}
      <div className="header-row">
        <h1 className="page-title">
          <Users size={22} className="title-icon" /> Employee Assignment
        </h1>
        <div className="breadcrumb">
          <span className="home-icon">🏠</span> Home &gt; Employee Assignment
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-group">
            <label>Department</label>
            <select><option>Select Here</option></select>
          </div>
          <div className="filter-group">
            <label>Branch</label>
            <select><option>Select Here</option></select>
          </div>
          <div className="filter-group">
            <label>Location</label>
            <select><option>Select Here</option></select>
          </div>
          <div className="filter-group">
            <label>Employee Name</label>
            <select><option>Select Here</option></select>
          </div>
          
          <div className="filter-group">
            <label>Grade</label>
            <select><option>Select Here</option></select>
          </div>
          <div className="filter-group">
            <label>SubGrade</label>
            <select><option>Select Here</option></select>
          </div>
          <div className="filter-group">
            <label>Employee Type</label>
            <select><option>Select Here</option></select>
          </div>
          <div className="filter-actions">
            <button className="btn-reset">
              <RotateCcw size={16} /> Reset
            </button>
            <button className="btn-search">
              <Search size={16} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-card">
        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'leave' ? 'active' : ''}`} onClick={() => setActiveTab('leave')}>
            Assign Leave
          </button>
          <button className={`tab ${activeTab === 'offdays' ? 'active' : ''}`} onClick={() => setActiveTab('offdays')}>
            Assign Off Days
          </button>
          <button className={`tab ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>
            Assign Shifts
          </button>
          <button className={`tab ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>
            Assign Location
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          <div className="table-controls">
            <button className="btn-add">Add Leave</button>
            
            <div className="pagination-controls">
              <div className="rows-per-page">
                <span>Show Rows:</span>
                <select defaultValue="40"><option>40</option></select>
              </div>
              <div className="page-jump">
                <span>Page:</span>
                <input type="number" defaultValue="1" />
                <span>of 1</span>
                <button className="btn-go">Go</button>
              </div>
              <div className="page-arrows">
                <button><ChevronsLeft size={14} /></button>
                <button><ChevronLeft size={14} /></button>
                <button className="active-page">1</button>
                <button><ChevronRight size={14} /></button>
                <button><ChevronsRight size={14} /></button>
              </div>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" /></th>
                <th>Emp No</th>
                <th>Name</th>
                <th>Position</th>
                <th className="text-right">Earned Leave</th>
                <th className="text-right">Casual Leave</th>
                <th className="text-right">Compensatory Off</th>
                <th className="text-right">Leave Without Pay</th>
              </tr>
            </thead>
            <tbody>
              {mockData.map((row, i) => (
                <tr key={i} className={row.selected ? 'selected-row' : ''}>
                  <td><input type="checkbox" /></td>
                  <td>{row.empNo}</td>
                  <td className="text-blue font-medium">{row.name}</td>
                  <td>{row.position}</td>
                  <td className="text-right text-blue">{row.earned}</td>
                  <td className="text-right text-blue">{row.casual}</td>
                  <td className="text-right text-blue">{row.comp}</td>
                  <td className="text-right text-blue">{row.lwp}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bottom-controls">
            <div className="radio-group">
              <label>
                <input type="radio" name="viewType" defaultChecked /> Summary
              </label>
              <label>
                <input type="radio" name="viewType" /> BreakUp
              </label>
            </div>
            <button className="btn-print">
              Print <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
