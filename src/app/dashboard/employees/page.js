'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getEmployees, deleteEmployee, getEmployeeStats } from '../../../lib/data';
import { Plus, Edit2, Trash2, X, BarChart2, User, PhoneCall, Briefcase, Users, PlusCircle, Camera, Mail, Clock, Leaf, HardHat, Building2 } from 'lucide-react';
import Dialog from '../../../components/Dialog';
import * as XLSX from 'xlsx';
import './employees.css';

const getSafeDisplayName = (name, fallback = 'Employee') => {
  const cleaned = typeof name === 'string' ? name.trim() : '';
  return cleaned || fallback;
};

const getDisplayInitial = (name, fallback = '?') => {
  const cleaned = typeof name === 'string' ? name.trim() : '';
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase();
};

// Custom Civil Engineering Cap Icon
const CivilEnggCap = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    {/* Front-facing helmet dome */}
    <path d="M12 3a8 8 0 0 0-8 8v3h16v-3a8 8 0 0 0-8-8z"/>
    {/* Brim */}
    <path d="M2 14h20a1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5H2A1.5 1.5 0 0 1 .5 15.5 1.5 1.5 0 0 1 2 14z"/>
    {/* Headlamp / Badge */}
    <rect x="10" y="6" width="4" height="4" rx="1"/>
  </svg>
);

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

const getEmploymentStatusMeta = (status) => {
  const rawStatus = typeof status === 'string' ? status.trim() : '';
  const normalized = rawStatus.toLowerCase();

  if (!rawStatus || normalized === 'working' || normalized === 'active') {
    return { label: 'Working', background: '#dcfce7', color: '#15803d' };
  }

  if (['resigned', 'retired', 'terminated', 'inactive'].includes(normalized)) {
    return {
      label: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase(),
      background: '#fee2e2',
      color: '#b91c1c'
    };
  }

  if (normalized === 'transfer') {
    return { label: 'Transfer', background: '#fff7ed', color: '#c2410c' };
  }

  if (normalized === 'apprenticeship') {
    return { label: 'Apprenticeship', background: '#e0f2fe', color: '#0369a1' };
  }

  return {
    label: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
    background: '#e2e8f0',
    color: '#475569'
  };
};

export default function Employees() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [supervisors, setSupervisors] = useState([]);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [activeCompany, setActiveCompany] = useState('all');
  const [organizations, setOrganizations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const calculateTotalTime = (slots) => {
    if (!slots || slots.length === 0) return '-';
    let totalMinutes = 0;
    slots.forEach(slot => {
      if (slot.in && slot.out) {
        const [inH, inM] = slot.in.split(':').map(Number);
        const [outH, outM] = slot.out.split(':').map(Number);
        const inTotal = (inH || 0) * 60 + (inM || 0);
        let outTotal = (outH || 0) * 60 + (outM || 0);
        
        // Handle AM/PM mistake or overnight shifts
        if (outTotal < inTotal) {
          const adjustedOut = outTotal + 12 * 60;
          if (adjustedOut >= inTotal) {
            outTotal = adjustedOut; // They probably meant PM
          } else {
            outTotal += 24 * 60; // Overnight shift
          }
        }
        
        totalMinutes += (outTotal - inTotal);
      }
    });
    if (totalMinutes === 0) return '-';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const loadData = async () => {
    try {
      const [empData, orgData] = await Promise.all([
        getEmployees(),
        fetch('/api/synchronization?type=organizations').then(res => res.json())
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setOrganizations(Array.isArray(orgData) ? orgData : []);
      // All employees can be supervisors — load all for the dropdown
      setSupervisors(Array.isArray(empData) ? empData : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  const openStatsModal = async (emp) => {
    setSelectedEmpName(emp.name);
    setExpandedMonth(null);
    const data = await getEmployeeStats(emp.id);
    setStatsData(data);
    setIsStatsModalOpen(true);
  };

  const handleDelete = async (id) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const result = await deleteEmployee(id);
          if (result?.error) {
            setDialogConfig({
              isOpen: true,
              type: 'alert',
              title: 'Delete Failed',
              message: result.error
            });
            return;
          }

          await loadData();
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Delete Failed',
            message: error?.message || 'Unable to delete employee.'
          });
        }
      }
    });
  };

  const [sendingBulk, setSendingBulk] = useState(false);

  const handleBulkLoginInstruction = async () => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Send Bulk Emails',
      message: `Are you sure you want to send individual login instruction emails to all ${filteredByCompany.length} filtered employees?`,
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        setSendingBulk(true);
        let successCount = 0;
        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cecubeerp.duckdns.org';
        
        for (const emp of filteredByCompany) {
          if (!emp.email) continue;
          try {
            await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: 'Your Portal Login Instructions',
                message: `Hello ${emp.name},\n\nYour login instructions for the Cecube HR portal are as follows:\n\nPortal Login URL: ${dashboardUrl}/login\nEmployee App Login URL: ${dashboardUrl}/employeedashboard/login\nEmployee Code: ${emp.empId}\nEmail: ${emp.email}\nPassword: ${emp.password || 'Please contact HR to set a password.'}\n\nPlease keep this information secure.\n\nBest regards,\nHR Department`,
                recipientIds: [emp.id],
                emailType: 'login-instruction'
              })
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to send to ${emp.name}`, err);
          }
        }
        setSendingBulk(false);
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Emails Sent',
          message: `Successfully sent login instructions to ${successCount} employees.`,
          onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };


  const handleExportExcel = () => {
    if (employees.length === 0) {
      alert("No employees to export.");
      return;
    }
    const headers = [
      'Employee Code', 'Name', 'Father Name', 'Official Email', 'Personal Email', 'Company Phone', 'Personal Phone',
      'Department', 'Designation', 'Grade', 'Employee Type', 'Branch', 'Organization', 'Role', 'Status', 'Termination Date', 'Joined Date', 'DOB', 'Gender',
      'Marital Status', 'Blood Group', 'Languages Known', 'Passport No', 'Identification Mark', 'Charge Type', 'Supervisor', 'Bank Name', 'Bank Account No', 'IFSC Code', 'PAN / PAYE', 'Aadhar No', 'UAN',
      'Annual CTC', 'Basic Salary', 'HRA', 'Conveyance', 'Medical', 'Special Allowance', 'Bonus',
      'Deductions', 'PF Employee (%)', 'PF Employer (%)', 'Professional Tax', 'TDS / Income Tax', 'ESIC No',
      'Work Experience', 'Family / Dependents'
    ];
    
    const rows = employees.map(emp => {
      const expStr = emp.workExperiences?.map(w => `${w.jobTitle} at ${w.companyName} (${w.fromDate} to ${w.toDate})`).join(' | ') || '';
      const famStr = emp.dependents?.map(d => `${d.name} (${d.relationship}) - Ph: ${d.phone || 'N/A'}`).join(' | ') || '';

      return [
        emp.empId || '',
        emp.name || '',
        emp.fatherName || '',
        emp.email || '',
        emp.otherEmail || '',
        emp.workTelephone || '',
        emp.phone || '',
        emp.department || '',
        emp.designation || '',
        emp.grade || '',
        emp.employeeType || '',
        emp.branch || '',
        (emp.organisation || '').split(',').map(o => o.trim()).filter(Boolean).join(' | ') || 'Unassigned',
        emp.role || '',
        emp.employmentStatus || 'Working',
        emp.employmentToDate || '',
        emp.joinedDate || '',
        emp.dateOfBirth || '',
        emp.gender || '',
        emp.maritalStatus || '',
        emp.bloodGroup || '',
        `Read: ${emp.langRead || '-'}, Write: ${emp.langWrite || '-'}, Speak: ${emp.langSpeak || '-'}`,
        emp.passportNo || '',
        emp.identificationMark || '',
        emp.chargeType || '',
        emp.supervisor?.name || '',
        emp.bankName || '',
        emp.bankAccountNo || '',
        emp.ifscCode || '',
        emp.pan || '',
        emp.aadharNo || '',
        emp.uan || '',
        emp.annualCtc || '',
        emp.basicSalary || '',
        emp.hra || '',
        emp.conveyance || '',
        emp.medical || '',
        emp.specialAllowance || '',
        emp.bonus || '',
        emp.deductions || '',
        emp.pfEmployee || '',
        emp.pfEmployer || '',
        emp.professionalTax || '',
        emp.tds || '',
        emp.esicNo || '',
        expStr,
        famStr
      ];
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees_master.xlsx");
  };

  const handleSendIndividualLoginInstruction = async (emp) => {
    if (!emp.email) {
      alert("This employee does not have an email address.");
      return;
    }
    try {
      const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cecubeerp.duckdns.org';
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Your Portal Login Instructions',
          message: `Hello ${emp.name},\n\nYour login instructions for the Cecube HR portal are as follows:\n\nPortal Login URL: ${dashboardUrl}/login\nEmployee App Login URL: ${dashboardUrl}/employeedashboard/login\nEmployee Code: ${emp.empId}\nEmail: ${emp.email}\nPassword: ${emp.password || 'Please contact HR to set a password.'}\n\nPlease keep this information secure.\n\nBest regards,\nHR Department`,
          recipientIds: [emp.id],
          emailType: 'login-instruction'
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('Login instructions sent via email!');
      } else {
        alert(result.error || 'Failed to send email');
      }
    } catch (err) {
      alert('Error sending login instructions');
    }
  };

  // Organisation filter - dynamically generated from synchronization data
  const COMPANIES = useMemo(() => {
    const baseFilters = [
      { key: 'all', label: 'All Employees', icon: Users, color: '#0ea5e9', textColor: '#fff' }
    ];
    
    const orgFilters = organizations.map((org, index) => ({
      key: org.name,
      label: org.name,
      icon: null,
      color: org.bgColor || ['#059669', '#1e40af', '#7c3aed', '#dc2626', '#ea580c'][index % 5],
      textColor: org.textColor || '#fff'
    }));
    
    return [...baseFilters, ...orgFilters];
  }, [organizations]);

  const filteredByCompany = (() => {
    const companyFiltered = activeCompany !== 'all'
      ? employees.filter(emp => {
        const empOrgs = (emp.organisation || '').split(',').map(o => o.trim()).filter(Boolean);
        return empOrgs.includes(activeCompany);
      })
      : employees;

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      return companyFiltered.filter(emp => 
        (emp.name || '').toLowerCase().includes(lower) ||
        (emp.empId || '').toLowerCase().includes(lower) ||
        (emp.email || '').toLowerCase().includes(lower) ||
        (emp.department || '').toLowerCase().includes(lower)
      );
    }
    
    return companyFiltered;
  })();


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Master</h1>
          <p className="page-subtitle">Manage your company employees and their credentials.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleBulkLoginInstruction} disabled={sendingBulk} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', color: '#334155', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, cursor: sendingBulk ? 'wait' : 'pointer' }}>
            <Mail size={18} /> {sendingBulk ? 'Sending...' : 'Send All Logins'}
          </button>
          <button className="btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', color: '#1d4ed8', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
            🖨️ Export Excel
          </button>
          <button
            className="btn-primary"
            onClick={() => router.push('/dashboard/employees/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={20} /> Add Employee
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '1rem' }}>
        {/* Organisation Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COMPANIES.map(({ key, label, icon: Icon, color, textColor }) => (
            <button
              key={key}
              onClick={() => setActiveCompany(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 10, fontWeight: 600, fontSize: 13,
                border: activeCompany === key ? `2px solid ${color}` : '2px solid #e2e8f0',
                background: activeCompany === key ? color : '#fff',
                color: activeCompany === key ? textColor : '#6b7280',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: activeCompany === key ? `0 2px 8px ${color}44` : 'none',
              }}
            >
              {Icon && <Icon size={15} />}
              {label}
              <span style={{
                background: activeCompany === key ? textColor : '#e2e8f0',
                color: activeCompany === key ? color : '#6b7280',
                borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
              }}>
                {key === 'all' ? employees.length : employees.filter(e => {
                  const empOrgs = (e.organisation || '').split(',').map(o => o.trim()).filter(Boolean);
                  return empOrgs.includes(key);
                }).length}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 14px 10px 38px', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              outline: 'none',
              fontSize: '14px'
            }}
          />
          <svg style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      <div className="glass-panel table-container">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Organisation</th>
              <th>Contact Info</th>
              <th>Department</th>
              <th>Date of Joining</th>
              <th>Gross Salary</th>
              <th>Status</th>
              <th>Supervisor</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredByCompany.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">No employees found.</td>
              </tr>
            ) : (
              filteredByCompany.map((emp) => (
                <tr key={emp.id}>
                  {(() => {
                    const statusMeta = getEmploymentStatusMeta(emp.employmentStatus);
                    return (
                      <>
                  <td>
                    <div className="emp-name" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {emp.photoUrl ? (
                        <>
                          <img src={emp.photoUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0ea5e9', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>{getDisplayInitial(emp.name, '?')}</div>
                        </>
                      ) : (
                         <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>{getDisplayInitial(emp.name, '?')}</div>
                      )}
                      <div>
                        <a href={`/dashboard/employees/${encodeURIComponent(emp.empId || emp.id)}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}>{[emp.title, getSafeDisplayName(emp.name, 'Employee')].filter(Boolean).join(' ')}</a>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.empId || '-'}</div>
                      </div>
                      {emp.role === 'SUPERVISOR' && <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', marginLeft: 'auto' }}>Supervisor</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(() => {
                      const orgs = (emp.organisation || '').split(',').map(o => o.trim()).filter(Boolean);
                      if (orgs.length === 0) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>Unassigned</span>;
                      return orgs.map((org, i) => {
                        const orgItem = organizations.find(o => o.name === org);
                        const bg = orgItem?.bgColor || '#f3f4f6';
                        const text = orgItem?.textColor || '#374151';
                        
                        return (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: bg, color: text, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {org}
                          </span>
                        );
                      });
                    })()}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>{emp.email}</div>
                    {emp.workTelephone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.workTelephone}</div>}
                  </td>
                  <td><span className="badge badge-success">{emp.department}</span></td>
                  <td><span style={{ color: '#64748b', fontSize: '0.9rem' }}>{emp.joinedDate ? emp.joinedDate.split('-').reverse().join('-') : '-'}</span></td>
                  <td><span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>{calculateGrossSalary(emp) > 0 ? `₹${calculateGrossSalary(emp)}` : '-'}</span></td>
                  <td>
                    <span className="badge" style={{ 
                      background: statusMeta.background,
                      color: statusMeta.color
                    }}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td>
                    {emp.supervisorId ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {employees.find(e => e.id === emp.supervisorId)?.name || 'Unknown'}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                      <button className="icon-btn" title="Send Login Instruction" onClick={() => handleSendIndividualLoginInstruction(emp)} style={{ color: '#007bff' }}>
                        <Mail size={16} />
                      </button>
                      <button className="icon-btn" title="View Stats" onClick={() => openStatsModal(emp)} style={{ color: 'var(--accent-color)' }}>
                        <BarChart2 size={16} />
                      </button>
                      <button className="icon-btn edit-btn" onClick={() => router.push(`/dashboard/employees/${encodeURIComponent(emp.empId || emp.id)}`)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn delete-btn" onClick={() => handleDelete(emp.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats Modal */}



      {/* Stats Modal */}
      {isStatsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{selectedEmpName}&apos;s Attendance Stats</h2>
              <button className="icon-btn" onClick={() => setIsStatsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="table-container">
              <table style={{ marginBottom: '0' }}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Night Shift</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state" style={{ padding: '2rem' }}>No attendance records found.</td>
                    </tr>
                  ) : (
                    statsData.map(stat => (
                      <React.Fragment key={stat.month}>
                        <tr>
                          <td style={{ fontWeight: '600' }}>{stat.month}</td>
                          <td><span className="badge badge-success">{stat.Present}</span></td>
                          <td><span className="badge badge-warning">{stat.Late || 0}</span></td>
                          <td><span className="badge badge-danger">{stat.Absent}</span></td>
                          <td><span className="badge" style={{ background: '#3b82f6', color: 'white' }}>{stat['Night Shift'] || 0}</span></td>
                          <td className="text-right">
                            <button 
                              className="btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setExpandedMonth(expandedMonth === stat.month ? null : stat.month)}
                            >
                              {expandedMonth === stat.month ? 'Hide Details' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedMonth === stat.month && (
                          <tr>
                            <td colSpan="6" style={{ padding: '0', backgroundColor: '#f9fafb' }}>
                              <table style={{ margin: '0.5rem 1rem', width: 'calc(100% - 2rem)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                <thead>
                                  <tr>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Date</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Status</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Shift</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Time Slots (In - Out)</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Total Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stat.details.map(d => {
                                    const dayName = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
                                    const isSunday = new Date(d.date + 'T00:00:00').getDay() === 0;
                                    
                                    const isNightSlot = (slot) => {
                                      if (!slot.in) return false;
                                      const hour = parseInt(slot.in.split(':')[0], 10);
                                      return hour >= 19 || hour < 6;
                                    };
                                    
                                    let hasDay = false;
                                    let hasNight = false;
                                    
                                    if (d.timeSlots && d.timeSlots.length > 0) {
                                      d.timeSlots.forEach(s => {
                                        if (isNightSlot(s)) hasNight = true;
                                        else hasDay = true;
                                      });
                                    } else {
                                      if (d.shiftType === 'Night' || d.status === 'Night Shift') hasNight = true;
                                      else hasDay = true;
                                    }

                                    return (
                                    <tr key={d.date} style={{ backgroundColor: isSunday ? '#fff1f2' : '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ fontWeight: 700, color: isSunday ? '#be123c' : '#1e293b' }}>{dayName}</div>
                                        <div style={{ fontSize: '12px', color: isSunday ? '#e11d48' : '#64748b', marginTop: '2px' }}>{d.date}</div>
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        {d.status === 'Present' ? (
                                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        ) : d.status === 'Absent' ? (
                                          <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        ) : d.status === 'Late' ? (
                                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        ) : (
                                          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                          {hasDay && <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>Day</span>}
                                          {hasNight && <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>Night</span>}
                                        </div>
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        {d.timeSlots && d.timeSlots.length > 0 ? (
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {d.timeSlots.map((slot, i) => {
                                              const isNight = isNightSlot(slot);
                                              return (
                                              <span key={i} style={{ 
                                                backgroundColor: isNight ? '#f3e8ff' : '#dbeafe', 
                                                color: isNight ? '#7e22ce' : '#0369a1', 
                                                padding: '4px 12px', 
                                                borderRadius: '16px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                              }}>
                                                {slot.in || '?'} - {slot.out || '?'}
                                              </span>
                                            )})}
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem', fontWeight: '500', color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {d.timeSlots && d.timeSlots.length > 0 && <Clock size={14} color="#64748b" />} {calculateTotalTime(d.timeSlots)}
                                        </div>
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      <Dialog 
        isOpen={dialogConfig.isOpen} 
        type={dialogConfig.type} 
        title={dialogConfig.title} 
        message={dialogConfig.message} 
        onConfirm={dialogConfig.onConfirm} 
        onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
