'use client';
import React, { useState, useEffect } from 'react';
import './hr-reports.css';
import { Loader2, FileText, Download, Printer, Search } from 'lucide-react';
import MultiSelect from '../../../components/MultiSelect';

const reportTypes = [
  'Salary Statement',
  'Salary Disbursement Letter To Bank',
  'Cash Payment List',
  'Cheque Payment List',
  'Payslip Register',
  'Hold Salary Letter to Bank',
  'PF/NSSF Statement',
  'Profession Tax Statement',
  'ESI/NHIF Statement',
  'LWF Statement',
  'Bonus Statement',
  'Allowances Deductions Statement',
  'Monthly Attendance Summary',
  'Leave Statement',
  'Advance Balance Statement',
  'Muster Statuswise Report',
  'Monthly Advance Recovery',
  'Employee List',
  'Birthday List',
  'Holiday List',
  'Address List of Employees',
  'Anniversary List'
];

const calculateGrossSalary = (emp) => {
  if (emp.salaryRevisions && emp.salaryRevisions.length > 0) {
    const rev = emp.salaryRevisions[0];
    const grossComp = rev.components?.find(c => c.salaryHead?.description?.toLowerCase() === 'gross salary');
    if (grossComp && grossComp.amount) {
      return Number(grossComp.amount);
    }
  }
  const basic = Number(emp.basicSalary || 0);
  const hra = Number(emp.hra || 0);
  const conveyance = Number(emp.conveyance || 0);
  const medical = Number(emp.medical || 0);
  const sa = Number(emp.specialAllowance || 0);
  const total = basic + hra + conveyance + medical + sa;
  return total > 0 ? total : 0;
};

export default function HRReportsPage() {
  const [activeReport, setActiveReport] = useState('Employee List');
  const [employees, setEmployees] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployeesFilter, setSelectedEmployeesFilter] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    if (val) {
      const [year, month] = val.split('-');
      const start = `${year}-${month}-01`;
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const branchRes = await fetch('/api/synchronization?type=siteoffices');
      const deptRes = await fetch('/api/synchronization?type=departments');
      if (branchRes.ok) {
        const data = await branchRes.json();
        const branchNames = data.map(d => d.name || d.siteOfficeName || d);
        setBranches(branchNames);
        setSelectedBranches(branchNames); // Default to all selected
      }
      if (deptRes.ok) {
        const data = await deptRes.json();
        const deptNames = data.map(d => d.name || d.departmentName || d);
        setDepartments(deptNames);
        setSelectedDepartments(deptNames); // Default to all selected
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, payrollRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/reports/payroll')
      ]);
      
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data);
        const empLabels = data.map(e => `${e.name} (${e.empId})`);
        setSelectedEmployeesFilter(empLabels);
      }
      if (payrollRes.ok) {
        const pData = await payrollRes.json();
        setPayrollData(pData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    let filteredEmployees = employees;

    // Only filter if not ALL options are selected
    const isAllBranchesSelected = selectedBranches.length === branches.length;
    const isAllDeptsSelected = selectedDepartments.length === departments.length;
    const isAllEmployeesSelected = selectedEmployeesFilter.length === employees.length;

    if (!isAllBranchesSelected && selectedBranches.length > 0) {
      filteredEmployees = filteredEmployees.filter(e => e.siteOffice && selectedBranches.includes(e.siteOffice));
    }

    if (!isAllDeptsSelected && selectedDepartments.length > 0) {
      filteredEmployees = filteredEmployees.filter(e => e.department && selectedDepartments.includes(e.department));
    }

    if (!isAllEmployeesSelected && selectedEmployeesFilter.length > 0) {
      filteredEmployees = filteredEmployees.filter(e => {
        const label = `${e.name} (${e.empId})`;
        return selectedEmployeesFilter.includes(label);
      });
    }

    switch (activeReport) {
      case 'Employee List':
        return filteredEmployees;

      case 'Birthday List':
        let birthdayResults = [];
        if (fromDate && toDate) {
          const from = new Date(fromDate);
          const to = new Date(toDate);
          
          const withDob = filteredEmployees.filter(e => e.dateOfBirth).map(e => {
            const dob = new Date(e.dateOfBirth);
            const month = dob.getMonth();
            const day = dob.getDate();
            
            let testDate = new Date(from.getFullYear(), month, day);
            
            // Handle year wrap-around if toDate is in the next year
            if (from > to && month <= to.getMonth()) {
              testDate.setFullYear(to.getFullYear());
            } else if (from > to && month >= from.getMonth()) {
              testDate.setFullYear(from.getFullYear());
            }
            
            return { ...e, month: month + 1, day: day, testDate };
          }).filter(e => {
            // If fromDate is strictly less than or equal to toDate
            if (from <= to) {
              return e.testDate >= from && e.testDate <= to;
            }
            // If crossing year boundary (e.g., Dec to Jan)
            return (e.testDate >= from) || (e.testDate <= to);
          }).sort((a, b) => a.testDate - b.testDate);

          birthdayResults = [...withDob];
        } else {
          // If no date filter, just sort by month/day and put nulls at the end
          const withDob = filteredEmployees.filter(e => e.dateOfBirth).map(e => {
            const dob = new Date(e.dateOfBirth);
            return { ...e, month: dob.getMonth() + 1, day: dob.getDate() };
          }).sort((a, b) => a.month - b.month || a.day - b.day);
          const withoutDob = filteredEmployees.filter(e => !e.dateOfBirth);
          birthdayResults = [...withDob, ...withoutDob];
        }
        return birthdayResults;

      case 'Anniversary List':
        let annivResults = [];
        const marriedEmployees = filteredEmployees.filter(e => e.maritalStatus === 'Married' || e.marriageAnniversary);
        
        if (fromDate && toDate) {
          const from = new Date(fromDate);
          const to = new Date(toDate);
          
          const withAnniv = marriedEmployees.filter(e => e.marriageAnniversary).map(e => {
            const anniv = new Date(e.marriageAnniversary);
            const month = anniv.getMonth();
            const day = anniv.getDate();
            
            let testDate = new Date(from.getFullYear(), month, day);
            
            if (from > to && month <= to.getMonth()) {
              testDate.setFullYear(to.getFullYear());
            } else if (from > to && month >= from.getMonth()) {
              testDate.setFullYear(from.getFullYear());
            }
            
            return { ...e, month: month + 1, day: day, testDate };
          }).filter(e => {
            if (from <= to) {
              return e.testDate >= from && e.testDate <= to;
            }
            return (e.testDate >= from) || (e.testDate <= to);
          }).sort((a, b) => a.testDate - b.testDate);

          annivResults = [...withAnniv];
        } else {
          const withAnniv = marriedEmployees.filter(e => e.marriageAnniversary).map(e => {
            const anniv = new Date(e.marriageAnniversary);
            return { ...e, month: anniv.getMonth() + 1, day: anniv.getDate() };
          }).sort((a, b) => a.month - b.month || a.day - b.day);
          
          const withoutAnniv = marriedEmployees.filter(e => !e.marriageAnniversary);
          annivResults = [...withAnniv, ...withoutAnniv];
        }
        return annivResults;

      case 'LWF Statement':
      case 'Bonus Statement':
      case 'Allowances Deductions Statement':
        // These reports use payrollData instead of employees
        let filteredPayroll = payrollData;
        
        // Filter by branch/dept based on the associated employee
        if (!isAllBranchesSelected && selectedBranches.length > 0) {
          filteredPayroll = filteredPayroll.filter(p => p.employee?.siteOffice && selectedBranches.includes(p.employee.siteOffice));
        }
        if (!isAllDeptsSelected && selectedDepartments.length > 0) {
          filteredPayroll = filteredPayroll.filter(p => p.employee?.department && selectedDepartments.includes(p.employee.department));
        }
        if (!isAllEmployeesSelected && selectedEmployeesFilter.length > 0) {
          filteredPayroll = filteredPayroll.filter(p => {
            const label = `${p.employee?.name} (${p.employee?.empId})`;
            return selectedEmployeesFilter.includes(label);
          });
        }
        
        // Filter by date range (PayCycle startDate/endDate)
        if (fromDate && toDate) {
          const from = new Date(fromDate);
          const to = new Date(toDate);
          filteredPayroll = filteredPayroll.filter(p => {
            if (!p.payCycle?.startDate) return false;
            const cycleDate = new Date(p.payCycle.startDate);
            return cycleDate >= from && cycleDate <= to;
          });
        }
        
        return filteredPayroll;

      default:
        return [];
    }
  };

  const renderTableHead = () => {
    switch (activeReport) {
      case 'Employee List':
        return (
          <tr>
            <th>Emp ID</th>
            <th>Name</th>
            <th>Father's Name</th>
            <th>Joining Date</th>
            <th>Designation</th>
            <th>Department</th>
            <th style={{textAlign: 'right'}}>Gross Salary</th>
            <th>Status</th>
          </tr>
        );
      case 'Birthday List':
        return (
          <tr>
            <th>Employee Name</th>
            <th>Department</th>
            <th>Position</th>
            <th>Birth Date</th>
            <th>Office No</th>
            <th>Mobile No</th>
            <th>Email Id</th>
          </tr>
        );
      case 'Anniversary List':
        return (
          <tr>
            <th>Emp ID</th>
            <th>Name</th>
            <th>Marriage Anniversary</th>
            <th>Designation</th>
          </tr>
        );
      case 'Address List of Employees':
        return (
          <tr>
            <th>Emp ID</th>
            <th>Name</th>
            <th>Address</th>
            <th>City / State</th>
          </tr>
        );
      case 'LWF Statement':
        return (
          <tr>
            <th>Emp Number</th>
            <th>Emp Name</th>
            <th>Period</th>
            <th style={{textAlign: 'right'}}>Employee Contribution</th>
            <th style={{textAlign: 'right'}}>Employer Contribution</th>
          </tr>
        );
      case 'Bonus Statement':
        return (
          <tr>
            <th>Emp Number</th>
            <th>Emp Name</th>
            <th>Period</th>
            <th style={{textAlign: 'right'}}>Bonus Amount</th>
          </tr>
        );
      case 'Allowances Deductions Statement':
        return (
          <tr>
            <th>Employee Name</th>
            <th style={{textAlign: 'right'}}>Basic</th>
            <th style={{textAlign: 'right'}}>Conveyance</th>
            <th style={{textAlign: 'right'}}>Special Conveyance</th>
            <th style={{textAlign: 'right'}}>HRA</th>
            <th style={{textAlign: 'right'}}>Other Allowance</th>
            <th style={{textAlign: 'right'}}>Medical</th>
            <th style={{textAlign: 'right'}}>Advance</th>
            <th style={{textAlign: 'right'}}>LWF</th>
            <th style={{textAlign: 'right'}}>Transport Allowance</th>
            <th style={{textAlign: 'right'}}>SPL.ALLOWANCE</th>
          </tr>
        );
      default:
        return (
          <tr>
            <th>Information</th>
          </tr>
        );
    }
  };

  const renderTableRow = (emp) => {
    switch (activeReport) {
      case 'Employee List':
        return (
          <tr key={emp.id}>
            <td>{emp.empId}</td>
            <td>{emp.name}</td>
            <td>{emp.fatherName || '-'}</td>
            <td>{emp.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-GB') : '-'}</td>
            <td>{emp.designation || '-'}</td>
            <td>{emp.department || '-'}</td>
            <td style={{textAlign: 'right'}}>{calculateGrossSalary(emp) > 0 ? calculateGrossSalary(emp).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
            <td>{emp.employmentStatus || 'Active'}</td>
          </tr>
        );
      case 'Birthday List':
        return (
          <tr key={emp.id}>
            <td>{emp.empId} - {emp.name}</td>
            <td>{emp.department || '-'}</td>
            <td>{emp.designation || '-'}</td>
            <td>{emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-'}</td>
            <td>{emp.officePhone || '-'}</td>
            <td>{emp.phone || '-'}</td>
            <td>{emp.email || '-'}</td>
          </tr>
        );
      case 'Anniversary List':
        return (
          <tr key={emp.id}>
            <td>{emp.empId}</td>
            <td>{emp.name}</td>
            <td>{emp.marriageAnniversary ? new Date(emp.marriageAnniversary).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-'}</td>
            <td>{emp.designation || '-'}</td>
          </tr>
        );
      case 'Address List of Employees':
        return (
          <tr key={emp.id}>
            <td>{emp.empId}</td>
            <td>{emp.name}</td>
            <td>{[emp.addressStreet1, emp.addressStreet2, emp.address].filter(Boolean).join(', ') || '-'}</td>
            <td>{[emp.city, emp.state].filter(Boolean).join(' / ') || '-'}</td>
          </tr>
        );
      case 'LWF Statement':
        return (
          <tr key={emp.id}>
            <td>{emp.employee?.empId || '-'}</td>
            <td>{emp.employee?.name || '-'}</td>
            <td>{emp.payCycle?.name || '-'}</td>
            {/* Using a placeholder for LWF as it's not strictly defined in PayrollRecord schema. Adjust as needed. */}
            <td style={{textAlign: 'right'}}>{(0.0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(0.0).toFixed(2)}</td>
          </tr>
        );
      case 'Bonus Statement':
        return (
          <tr key={emp.id}>
            <td>{emp.employee?.empId || '-'}</td>
            <td>{emp.employee?.name || '-'}</td>
            <td>{emp.payCycle?.name || '-'}</td>
            <td style={{textAlign: 'right'}}>{(emp.bonus || 0).toFixed(2)}</td>
          </tr>
        );
      case 'Allowances Deductions Statement':
        return (
          <tr key={emp.id}>
            <td>{emp.employee?.empId ? `${emp.employee.empId} - ${emp.employee.name}` : (emp.employee?.name || '-')}</td>
            <td style={{textAlign: 'right'}}>{(emp.basicPay || 0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(emp.conveyance || 0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(emp.hra || 0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(emp.medical || 0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(0).toFixed(2)}</td>
            <td style={{textAlign: 'right'}}>{(emp.specialAllow || 0).toFixed(2)}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  const exportToExcel = () => {
    const currentData = getFilteredData();
    if (currentData.length === 0) return;

    let headers = [];
    let rows = [];

    switch (activeReport) {
      case 'Employee List':
        headers = ['Emp ID', 'Name', 'Father\'s Name', 'Joining Date', 'Designation', 'Department', 'Gross Salary', 'Status'];
        rows = currentData.map(emp => [
          emp.empId, 
          emp.name, 
          emp.fatherName || '-', 
          emp.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-GB') : '-', 
          emp.designation || '-', 
          emp.department || '-', 
          calculateGrossSalary(emp) || '-',
          emp.employmentStatus || 'Active'
        ]);
        break;
      case 'Birthday List':
        headers = ['Employee Name', 'Department', 'Position', 'Birth Date', 'Office No', 'Mobile No', 'Email Id'];
        rows = currentData.map(emp => [
          `${emp.empId} - ${emp.name}`, 
          emp.department || '-',
          emp.designation || '-',
          emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-',
          emp.officePhone || '-',
          emp.phone || '-',
          emp.email || '-'
        ]);
        break;
      case 'Anniversary List':
        headers = ['Emp ID', 'Name', 'Marriage Anniversary', 'Designation'];
        rows = currentData.map(emp => [
          emp.empId, 
          emp.name, 
          emp.marriageAnniversary ? new Date(emp.marriageAnniversary).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-', 
          emp.designation || '-'
        ]);
        break;
      case 'Address List of Employees':
        headers = ['Emp ID', 'Name', 'Address', 'City / State'];
        rows = currentData.map(emp => [
          emp.empId, 
          emp.name, 
          [emp.addressStreet1, emp.addressStreet2, emp.address].filter(Boolean).join(', ') || '-', 
          [emp.city, emp.state].filter(Boolean).join(' / ') || '-'
        ]);
        break;
      case 'LWF Statement':
        headers = ['Emp Number', 'Emp Name', 'Period', 'Employee Contribution', 'Employer Contribution'];
        rows = currentData.map(record => [
          record.employee?.empId || '-',
          record.employee?.name || '-',
          record.payCycle?.name || '-',
          '0.00',
          '0.00'
        ]);
        break;
      case 'Bonus Statement':
        headers = ['Emp Number', 'Emp Name', 'Period', 'Bonus Amount'];
        rows = currentData.map(record => [
          record.employee?.empId || '-',
          record.employee?.name || '-',
          record.payCycle?.name || '-',
          (record.bonus || 0).toFixed(2)
        ]);
        break;
      case 'Allowances Deductions Statement':
        headers = ['Employee Name', 'Basic', 'Conveyance', 'Special Conveyance', 'HRA', 'Other Allowance', 'Medical', 'Advance', 'LWF', 'Transport Allowance', 'SPL.ALLOWANCE'];
        rows = currentData.map(record => [
          record.employee?.empId ? `${record.employee.empId} - ${record.employee.name}` : (record.employee?.name || '-'),
          (record.basicPay || 0).toFixed(2),
          (record.conveyance || 0).toFixed(2),
          (0).toFixed(2),
          (record.hra || 0).toFixed(2),
          (0).toFixed(2),
          (record.medical || 0).toFixed(2),
          (0).toFixed(2),
          (0).toFixed(2),
          (0).toFixed(2),
          (record.specialAllow || 0).toFixed(2)
        ]);
        break;
      default:
        return;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeReport.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const groupEmployeesForPrint = (data) => {
    // Group by Branch -> Department
    const grouped = {};
    data.forEach(emp => {
      const branch = emp.siteOffice || 'Unassigned Branch';
      const dept = emp.department || 'Unassigned Department';
      if (!grouped[branch]) grouped[branch] = {};
      if (!grouped[branch][dept]) grouped[branch][dept] = [];
      grouped[branch][dept].push(emp);
    });
    return grouped;
  };

  const groupEmployeesByBranchForPrint = (data) => {
    // Group by Branch only
    const grouped = {};
    data.forEach(emp => {
      const branch = emp.siteOffice || 'Unassigned Branch';
      if (!grouped[branch]) grouped[branch] = [];
      grouped[branch].push(emp);
    });
    return grouped;
  };

  const currentData = getFilteredData();
  const isImplemented = ['Employee List', 'Birthday List', 'Anniversary List', 'Address List of Employees', 'LWF Statement', 'Bonus Statement', 'Allowances Deductions Statement'].includes(activeReport);
  
  const groupedPrintData = activeReport === 'Employee List' ? groupEmployeesForPrint(currentData) : 
                           activeReport === 'Birthday List' ? groupEmployeesByBranchForPrint(currentData) : {};
  let globalSrNo = 1;

  return (
    <div className="hr-reports-container">
      {/* Left Sidebar Filters */}
      <div className="hr-reports-sidebar">
        <div className="hr-reports-sidebar-header">
          <h2><FileText size={18} /> HR Report</h2>
        </div>
        <div className="hr-reports-sidebar-title">
          Filter Criteria
        </div>
        <div className="hr-reports-type-label">
          Type
        </div>
        <div className="hr-reports-list">
          {reportTypes.map((type, idx) => (
            <label key={idx} className="hr-report-option">
              <input
                type="radio"
                name="reportType"
                value={type}
                checked={activeReport === type}
                onChange={() => setActiveReport(type)}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="hr-reports-content">

        {/* Filter Bar */}
        <div className="hr-reports-filter-bar">
          <div className="filter-grid">
            <div className="filter-group">
              <label>Select Branch</label>
              <MultiSelect
                options={branches}
                selected={selectedBranches}
                onChange={setSelectedBranches}
                placeholder="Select Branch"
              />
            </div>
            <div className="filter-group">
              <label>Select Department</label>
              <MultiSelect
                options={departments}
                selected={selectedDepartments}
                onChange={setSelectedDepartments}
                placeholder="Select Department"
              />
            </div>
            <div className="filter-group">
              <label>Select Employee</label>
              <MultiSelect
                options={employees.map(e => `${e.name} (${e.empId})`)}
                selected={selectedEmployeesFilter}
                onChange={setSelectedEmployeesFilter}
                placeholder="Select Employee"
              />
            </div>
            <div className="filter-group">
              <label>Select Month</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                />
                <button className="search-btn" onClick={() => {/* Filtering is live, but this gives a satisfying UX action */}} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', height: '38px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0284c7'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}>
                  <Search size={16} />
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hr-reports-content-header">
          <div>
            <h1>{activeReport}</h1>
            {isImplemented && (
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                Total Records: {currentData.length}
              </div>
            )}
          </div>
          {isImplemented && currentData.length > 0 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="export-excel-btn" style={{ background: '#0ea5e9' }} onClick={handlePrint}>
                <Printer size={16} />
                Print
              </button>
              <button className="export-excel-btn" onClick={exportToExcel}>
                <Download size={16} />
                Export to Excel
              </button>
            </div>
          )}
        </div>

        <div className="hr-reports-table-container">
          {loading ? (
            <div className="hr-reports-empty">
              <Loader2 size={32} className="lucide-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <h3 style={{ marginTop: '16px' }}>Loading Data...</h3>
            </div>
          ) : !isImplemented ? (
            <div className="hr-reports-empty">
              <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <h3>Report Under Construction</h3>
              <p>The layout for <strong>{activeReport}</strong> is currently being built.</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="hr-reports-empty">
              <h3>No records found</h3>
              <p>Try adjusting your filter criteria.</p>
            </div>
          ) : (
            <table className="hr-reports-table">
              <thead>
                {renderTableHead()}
              </thead>
              <tbody>
                {currentData.map(emp => renderTableRow(emp))}
              </tbody>
            </table>
          )}
        </div>

        {/* Print Only Layout (Hidden on Screen) */}
        <div className="print-only-container">
          <div className="print-header">
            <div className="print-header-left" style={{ textAlign: 'left' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '26px', fontWeight: 'bold' }}>CeCube Group</h2>
              <h1 style={{ margin: 0, fontSize: '20px' }}>{activeReport}</h1>
              {activeReport === 'Birthday List' && (
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
                  From {new Date(fromDate).toLocaleDateString('en-GB')} To Date {new Date(toDate).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>
            <div className="print-header-right" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <img src="/logo.png" alt="CeCube Logo" style={{ height: '56px', marginBottom: '8px' }} />
              <div className="print-date" style={{ fontSize: '12px', color: '#333' }}>Print Date : {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {activeReport === 'Employee List' && (
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Sr. No.</th>
                  <th>Emp No.</th>
                  <th>Employee Name</th>
                  <th>Father's Name</th>
                  <th>Joining Date</th>
                  <th>Position Name</th>
                  <th style={{ textAlign: 'right' }}>Gross Salary</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedPrintData).map(branch => (
                  <React.Fragment key={branch}>
                    <tr className="print-branch-row">
                      <td colSpan="7">{branch}</td>
                    </tr>
                    {Object.keys(groupedPrintData[branch]).map(dept => (
                      <React.Fragment key={`${branch}-${dept}`}>
                        <tr className="print-dept-row">
                          <td colSpan="7">{dept}</td>
                        </tr>
                        {groupedPrintData[branch][dept].map(emp => (
                          <tr key={emp.id} className="print-emp-row">
                            <td>{globalSrNo++}</td>
                            <td>{emp.empId}</td>
                            <td>{emp.name}</td>
                            <td>{emp.fatherName || '-'}</td>
                            <td>{emp.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-GB') : '-'}</td>
                            <td>{emp.designation || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {calculateGrossSalary(emp) > 0 ? calculateGrossSalary(emp).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'Birthday List' && (
            <table className="print-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Birth Date</th>
                  <th>Office No</th>
                  <th>Mobile No</th>
                  <th>Email Id</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedPrintData).map(branch => (
                  <React.Fragment key={branch}>
                    <tr className="print-branch-row">
                      <td colSpan="7">Branch - {branch}</td>
                    </tr>
                    {groupedPrintData[branch].map(emp => (
                      <tr key={emp.id} className="print-emp-row">
                        <td>{emp.empId} {emp.name}</td>
                        <td>{emp.department || '-'}</td>
                        <td>{emp.designation || '-'}</td>
                        <td>{emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-'}</td>
                        <td>{emp.officePhone || '-'}</td>
                        <td>{emp.phone || '-'}</td>
                        <td>{emp.email || '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
          
          {['LWF Statement', 'Bonus Statement'].includes(activeReport) && (
            <table className="print-table">
              <thead>
                {activeReport === 'LWF Statement' ? (
                  <tr>
                    <th>Emp Number</th>
                    <th>Emp Name</th>
                    <th>Period</th>
                    <th style={{textAlign: 'right'}}>Employee Contribution</th>
                    <th style={{textAlign: 'right'}}>Employer Contribution</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Emp Number</th>
                    <th>Emp Name</th>
                    <th>Period</th>
                    <th style={{textAlign: 'right'}}>Bonus Amount</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {currentData.map(record => (
                  <tr key={record.id} className="print-emp-row">
                    <td>{record.employee?.empId || '-'}</td>
                    <td>{record.employee?.name || '-'}</td>
                    <td>{record.payCycle?.name || '-'}</td>
                    {activeReport === 'LWF Statement' ? (
                      <>
                        <td style={{textAlign: 'right'}}>0.00</td>
                        <td style={{textAlign: 'right'}}>0.00</td>
                      </>
                    ) : (
                      <td style={{textAlign: 'right'}}>{(record.bonus || 0).toFixed(2)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* Fallback for other reports for now */}
          {!['Employee List', 'Birthday List', 'LWF Statement', 'Bonus Statement'].includes(activeReport) && (
            <p style={{textAlign: 'center', marginTop: '20px'}}>Print format for {activeReport} is under construction.</p>
          )}
        </div>
      </div>
    </div>
  );
}
