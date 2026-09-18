'use client';
import React, { useState, useEffect } from 'react';
import MultiSelect from './MultiSelect';

/**
 * ReportFilters - Reusable filter bar for all report pages.
 * Shows Branch (Organization), Department, Employee multiselects.
 */
export function useReportFilters() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [empRes, branchRes, deptRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/synchronization?type=siteoffices'),
          fetch('/api/synchronization?type=departments'),
        ]);

        if (empRes.ok) {
          const data = await empRes.json();
          if (Array.isArray(data)) {
            setEmployees(data);
            setSelectedEmployees(data.map(e => `${e.name} (${e.empId})`));
          }
        }
        if (branchRes.ok) {
          const data = await branchRes.json();
          const names = data.map(d => d.name || d.siteOfficeName || d).filter(Boolean);
          setBranches(names);
          setSelectedBranches(names);
        }
        if (deptRes.ok) {
          const data = await deptRes.json();
          const names = data.map(d => d.name || d.departmentName || d).filter(Boolean);
          setDepartments(names);
          setSelectedDepartments(names);
        }
      } catch (e) {
        console.error('ReportFilters load error:', e);
      }
    }
    load();
  }, []);

  /**
   * Filter any data array. getEmp extracts the employee object from each row.
   * Defaults to row.employee || row (works for both punch records and employee arrays).
   */
  function applyFilters(data, getEmp = (row) => row.employee || row) {
    const isAllBranches = selectedBranches.length === branches.length || branches.length === 0;
    const isAllDepts = selectedDepartments.length === departments.length || departments.length === 0;
    const isAllEmps = selectedEmployees.length === employees.length || employees.length === 0;

    return data.filter(row => {
      const emp = getEmp(row);
      const branchMatch = isAllBranches || (emp?.siteOffice && selectedBranches.includes(emp.siteOffice));
      const deptMatch = isAllDepts || (emp?.department && selectedDepartments.includes(emp.department));
      const empLabel = `${emp?.name} (${emp?.empId})`;
      const empMatch = isAllEmps || selectedEmployees.includes(empLabel);
      return branchMatch && deptMatch && empMatch;
    });
  }

  return {
    employees, branches, departments,
    selectedBranches, setSelectedBranches,
    selectedDepartments, setSelectedDepartments,
    selectedEmployees, setSelectedEmployees,
    applyFilters,
  };
}

export default function ReportFilters({
  employees, branches, departments,
  selectedBranches, setSelectedBranches,
  selectedDepartments, setSelectedDepartments,
  selectedEmployees, setSelectedEmployees,
  showEmployee = true,
  showDepartment = true,
  style = {},
}) {
  const cols = 1 + (showDepartment ? 1 : 0) + (showEmployee ? 1 : 0);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '1rem',
      marginBottom: '1rem',
      ...style
    }}>
      <div className="filterGroup">
        <label className="filterLabel">Organization / Branch</label>
        <MultiSelect
          options={branches}
          selected={selectedBranches}
          onChange={setSelectedBranches}
          placeholder="Select Branch"
        />
      </div>
      {showDepartment && (
        <div className="filterGroup">
          <label className="filterLabel">Department</label>
          <MultiSelect
            options={departments}
            selected={selectedDepartments}
            onChange={setSelectedDepartments}
            placeholder="Select Department"
          />
        </div>
      )}
      {showEmployee && (
        <div className="filterGroup">
          <label className="filterLabel">Employee</label>
          <MultiSelect
            options={employees.map(e => `${e.name} (${e.empId})`)}
            selected={selectedEmployees}
            onChange={setSelectedEmployees}
            placeholder="Select Employee"
          />
        </div>
      )}
    </div>
  );
}
