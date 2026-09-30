'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, UserCircle, Building2, Briefcase } from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';

export default function CreateLead({ isEnquiryPage = false }) {
  const router = useRouter();
  const { activeEmployee, hasRight } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectSuggestionsOpen, setProjectSuggestionsOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    leadSource: 'Website',
    leadType: 'Cold',
    leadOwnerId: '',
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    location: '',
    industry: 'Construction',
    gstNo: '',
    projectName: '',
    projectId: '',
    projectLocation: '',
    projectType: 'Commercial',
    requirement: '',
    estimatedProjectValue: '',
    expectedClosingDate: '',
    competitor: '',
    remarks: '',
    documents: []
  });

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const uploaded = await Promise.all(files.map(async (file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      data: await toBase64(file),
      uploadedAt: new Date().toISOString()
    })));

    setFormData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), ...uploaded]
    }));

    e.target.value = '';
  };

  const removeDocument = (id) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(doc => doc.id !== id)
    }));
  };

  useEffect(() => {
    async function fetchFormOptions() {
      const [employeesResult, projectsResult] = await Promise.allSettled([
        fetch('/api/employees'),
        fetch(`/api/marketing/projects${isEnquiryPage ? '?forEnquiry=true' : ''}`),
      ]);
      if (employeesResult.status === 'fulfilled' && employeesResult.value.ok) {
        setEmployees(await employeesResult.value.json().catch(() => []));
      }
      if (projectsResult.status === 'fulfilled' && projectsResult.value.ok) {
        setProjects(await projectsResult.value.json().catch(() => []));
      }
    }
    fetchFormOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name !== 'projectName') return { ...prev, [name]: value };
      const selectedProject = projects.find(project => project.name === value);
      return {
        ...prev,
        projectName: value,
        projectId: selectedProject?.permissionProjectId || '',
        ...(selectedProject ? { projectLocation: selectedProject.location || prev.projectLocation } : {}),
      };
    });
  };

  const selectProject = (project) => {
    setFormData(prev => ({
      ...prev,
      projectName: project.name,
      projectId: project.permissionProjectId || '',
      projectLocation: project.location || prev.projectLocation,
    }));
    setProjectSuggestionsOpen(false);
  };

  const matchingProjects = projects.filter(project => {
    if (isEnquiryPage && activeEmployee && (!project.permissionProjectId || !hasRight(employeeToolCode('Marketing', 'Project Enquiry Create'), project.permissionProjectId))) return false;
    const query = formData.projectName.trim().toLowerCase();
    if (!query) return true;
    return [project.name, project.company, project.location]
      .some(value => value?.toLowerCase().includes(query));
  }).slice(0, 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEnquiryPage && !formData.projectId) { alert('Select a project you have permission to create enquiries for.'); return; }
    setLoading(true);
    try {
      const res = await fetch(isEnquiryPage ? '/api/marketing/enquiries' : '/api/marketing/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push(isEnquiryPage ? '/marketing/enquiries' : '/marketing/leads');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">{isEnquiryPage ? 'New Project Enquiry' : 'New Lead Registration'}</h1>
          <p className="mkt-subtitle">Capture basic enquiry information into the system.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mkt-card">
        
        <div className="mkt-form-section">
          <h2 className="mkt-section-title">
            <UserCircle color="#4f46e5" size={20} /> Basic Information
          </h2>
          <div className="mkt-grid-2">
            <div className="mkt-form-group">
              <label className="mkt-label">Lead Source <span className="mkt-text-danger">*</span></label>
              <select name="leadSource" value={formData.leadSource} onChange={handleChange} className="mkt-select" required>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Tender Portal">Tender Portal</option>
                <option value="Existing Client">Existing Client</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Lead Owner <span className="mkt-text-danger">*</span></label>
              <select name="leadOwnerId" value={formData.leadOwnerId} onChange={handleChange} className="mkt-select" required>
                <option value="">Select Owner</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.empId || emp.email || 'Employee'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mkt-form-section" style={{ backgroundColor: '#f8fafc' }}>
          <h2 className="mkt-section-title">
            <Building2 color="#059669" size={20} /> Client Information
          </h2>
          <div className="mkt-grid-3">
            <div className="mkt-form-group">
              <label className="mkt-label">Company Name <span className="mkt-text-danger">*</span></label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="mkt-input" required />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Contact Person</label>
              <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Mobile</label>
              <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Location / Address</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Industry</label>
              <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="mkt-input" />
            </div>
          </div>
        </div>

        <div className="mkt-form-section">
          <h2 className="mkt-section-title">
            <Briefcase color="#0284c7" size={20} /> Project Information
          </h2>
          <div className="mkt-grid-2">
            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Project Name <span className="mkt-text-danger">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={e => { handleChange(e); setProjectSuggestionsOpen(true); }}
                  onFocus={() => setProjectSuggestionsOpen(true)}
                  onBlur={() => setTimeout(() => setProjectSuggestionsOpen(false), 120)}
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={projectSuggestionsOpen}
                  className="mkt-input"
                  placeholder="Select a project or enter a new enquiry"
                  required
                />
                {projectSuggestionsOpen && (
                  <div role="listbox" style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: 260, overflowY: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)' }}>
                    {matchingProjects.map(project => (
                      <button
                        key={project.id}
                        type="button"
                        role="option"
                        aria-selected={formData.projectName === project.name}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectProject(project)}
                        style={{ display: 'block', width: '100%', padding: '10px 12px', border: 0, borderBottom: '1px solid #f1f5f9', background: '#fff', color: '#0f172a', textAlign: 'left', cursor: 'pointer' }}
                      >
                        <span style={{ display: 'block', fontWeight: 600 }}>{project.name}</span>
                        {(project.company || project.location) && <span style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 12 }}>{[project.company, project.location].filter(Boolean).join(' · ')}</span>}
                      </button>
                    ))}
                    {matchingProjects.length === 0 && <div style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>No matching project. Your enquiry name will be saved as entered.</div>}
                  </div>
                )}
              </div>
              <small className="mkt-text-muted">Choose any existing project, or type a new project enquiry.</small>
            </div>
            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Requirement Overview</label>
              <textarea name="requirement" value={formData.requirement} onChange={handleChange} rows="3" className="mkt-textarea"></textarea>
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Project Location</label>
              <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Project Type</label>
              <input type="text" name="projectType" value={formData.projectType} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Est. Value (₹)</label>
              <input type="number" name="estimatedProjectValue" value={formData.estimatedProjectValue} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group">
              <label className="mkt-label">Exp. Closing Date</label>
              <input type="date" name="expectedClosingDate" value={formData.expectedClosingDate} onChange={handleChange} className="mkt-input" />
            </div>
            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Remarks</label>
              <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} className="mkt-input" />
            </div>

            <div className="mkt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="mkt-label">Client Documents</label>
              <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleDocumentUpload} className="mkt-input" />
              {formData.documents?.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.documents.map(doc => (
                    <span key={doc.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', color: '#0f172a', borderRadius: '999px', padding: '4px 10px', fontSize: '12px' }}>
                      {doc.name}
                      <button type="button" onClick={() => removeDocument(doc.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mkt-toolbar" style={{ justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={() => router.back()} className="mkt-btn mkt-btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="mkt-btn mkt-btn-primary">
            {loading ? 'Saving...' : <><Save size={16} /> {isEnquiryPage ? 'Save Enquiry' : 'Save Lead'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
