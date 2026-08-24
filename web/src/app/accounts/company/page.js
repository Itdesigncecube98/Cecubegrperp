'use client';
import React, { useState } from 'react';
import { 
  Search, Plus, Edit, Trash2, Files, ChevronDown, ChevronUp, 
  X, ArrowLeft, Save, User, Home, Building2, Upload
} from 'lucide-react';
import Dialog from '../../../components/Dialog';
import './company.css';

// Reusable Accordion Section Component
const AccordionSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="accordion-section">
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <ChevronUp size={18} color="#0284c7" /> : <ChevronDown size={18} color="#64748b" />}
        <span>{title}</span>
      </div>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};

export default function CompanyMaster() {
  const [view, setView] = useState('list');
  const [showAccountingYear, setShowAccountingYear] = useState(false);
  const [showOwnerDetails, setShowOwnerDetails] = useState(false);
  const [showAddOwner, setShowAddOwner] = useState(false);
  
  // Delete Dialog State
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, targetName: '' });

  // Mock Data
  const companies = [
    { id: 1, name: 'CeCube Engineering India Private Limited' },
    { id: 2, name: 'CeCube Green Energy Private Limited' }
  ];

  const accountingYears = [
    { id: 1, year: '2023-2024', start: '01/04/2023', end: '31/03/2024', lockTill: '30/09/2024' },
    { id: 2, year: '2024-2025', start: '01/04/2024', end: '31/03/2025', lockTill: '30/10/2025' },
    { id: 3, year: '2025-2026', start: '01/04/2025', end: '31/03/2026', lockTill: '30/09/2026' },
    { id: 4, year: '2026-2027', start: '01/04/2026', end: '31/03/2027', lockTill: '31/03/2027' },
  ];
  
  const owners = [
    { id: 1, name: 'John Doe', category: 'Director', email: 'john@example.com', contact: '9876543210' }
  ];

  const handleDeleteClick = (name) => {
    setDeleteDialog({ isOpen: true, targetName: name });
  };

  const confirmDelete = () => {
    // Perform delete logic here
    setDeleteDialog({ isOpen: false, targetName: '' });
  };

  return (
    <div className="company-container">
      {/* Header Area */}
      <div className="page-header">
        <h2 className="page-title">
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', display: 'flex', color: '#0284c7' }}>
            <Building2 size={24} />
          </div>
          {view === 'list' ? 'Company Master' : 'Add New Company'}
        </h2>
        {view === 'list' ? (
          <div className="breadcrumb">
            <Home size={14} /> Home <ChevronRight size={14} /> Company Master
          </div>
        ) : (
          <button className="btn-outline" onClick={() => setView('list')}>
            <ArrowLeft size={16} /> Back to Define Company
          </button>
        )}
      </div>

      {view === 'list' && (
        <div className="modern-card">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search by Company" 
                className="modern-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <button className="btn-primary" onClick={() => setView('add')}>
              <Plus size={16} /> Add Company
            </button>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th style={{ textAlign: 'center' }}>Accounting Year</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td style={{ fontWeight: 500 }}>{company.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-outline" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={() => setShowAccountingYear(true)}
                      >
                        Accounting Year
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button className="action-btn" onClick={() => setView('add')} title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDeleteClick('the organisation')} title="Delete">
                          <Trash2 size={16} />
                        </button>
                        <button className="action-btn" onClick={() => alert('Copy Company')} title="Copy">
                          <Files size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'add' && (
        <div style={{ paddingBottom: '80px' }}>
          <AccordionSection title="Basic Company Details">
            <div className="form-grid">
              <div><label className="modern-label">Company Name</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Legal Name</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Short Name</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Address</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Premises/Building</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Flat No</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Road/Street/Lane</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Area/Location</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">City</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">State</label><select className="modern-input modern-select"><option>Select state</option></select></div>
              <div><label className="modern-label">Pin Code</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Email ID</label><input className="modern-input" type="email" /></div>
              <div><label className="modern-label">STD Code</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Phone Number</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Corporate Identification No</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">Other Registration No</label><input className="modern-input" type="text" /></div>
            </div>
          </AccordionSection>

          <AccordionSection title="TDS Details (Primary)" defaultOpen={false}>
            <div className="form-grid">
              <div><label className="modern-label">Deductor Type</label><select className="modern-input modern-select"><option>Select type</option></select></div>
              <div><label className="modern-label">TDS Circle</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">TAN No.</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">PAN No.</label><input className="modern-input" type="text" /></div>
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#0f172a' }}>Responsible Person Details</h4>
                <div className="form-grid">
                  <div><label className="modern-label">Name</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Designation</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Email ID</label><input className="modern-input" type="text" /></div>
                  <div><label className="modern-label">Mobile No</label><input className="modern-input" type="text" /></div>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection title="TDS Details (Secondary)" defaultOpen={false}>
            <div className="form-grid">
              <div><label className="modern-label">State</label><select className="modern-input modern-select"><option>Select state</option></select></div>
              <div><label className="modern-label">Ministry Name</label><select className="modern-input modern-select"><option>Select ministry</option></select></div>
              <div><label className="modern-label">PAO Code</label><input className="modern-input" type="text" /></div>
              <div><label className="modern-label">DDO Code</label><input className="modern-input" type="text" /></div>
            </div>
          </AccordionSection>

          <AccordionSection title="System Configuration" defaultOpen={false}>
            <div className="form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}><input type="checkbox" /> Budget Validation</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}><input type="checkbox" /> WBS Budget Enable</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}><input type="checkbox" /> Allow Negative Bank Balance</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}><input type="checkbox" /> Cost Center Voucher Posting</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}><input type="checkbox" defaultChecked /> Edit GST Configured Voucher</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}><input type="checkbox" defaultChecked /> Delete Linked Vouchers</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label className="modern-label">Currency</label><select className="modern-input modern-select"><option>INR (₹)</option></select></div>
                <div><label className="modern-label">Country</label><select className="modern-input modern-select"><option>India</option></select></div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection title="Documents Upload" defaultOpen={false}>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
              <Upload size={32} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
              <label className="modern-label" style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '0.5rem', textTransform: 'none' }}>
                Upload Company Documents
              </label>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Drag and drop your files here, or click to select files (PDF, DOCX, JPG, PNG).
              </p>
              <input 
                type="file" 
                multiple 
                id="file-upload"
                style={{ display: 'none' }}
              />
              <button 
                className="btn-outline" 
                onClick={() => document.getElementById('file-upload').click()}
              >
                Browse Files
              </button>
            </div>
          </AccordionSection>
          
          <div className="floating-footer">
            <button className="btn-outline" onClick={() => setShowOwnerDetails(true)}>
              <User size={16} /> Owner Details
            </button>
            <button className="btn-primary">
              <Save size={16} /> Save Company
            </button>
          </div>
        </div>
      )}

      {/* Accounting Year Modal */}
      {showAccountingYear && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ width: '900px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Manage Accounting Years</h3>
              <button className="action-btn" onClick={() => setShowAccountingYear(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th style={{ textAlign: 'center' }}>Locked</th>
                      <th>Lock Till</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountingYears.map((yr) => (
                      <tr key={yr.id}>
                        <td style={{ fontWeight: 500 }}>{yr.year}</td>
                        <td>{yr.start}</td>
                        <td>{yr.end}</td>
                        <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                        <td>{yr.lockTill}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className="action-btn" onClick={() => alert('Edit')} title="Edit">
                              <Edit size={16} />
                            </button>
                            <button className="action-btn delete" onClick={() => handleDeleteClick('this accounting year')} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                 <button className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                  <Plus size={14} /> Add Accounting Year
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary"><Save size={16} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Details Modal */}
      {showOwnerDetails && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ width: '90%', height: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title"><User size={20} color="#0284c7" /> Owner Details</h3>
              <button className="action-btn" onClick={() => setShowOwnerDetails(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              {showAddOwner ? (
                <div className="modern-card" style={{ marginBottom: '1.5rem', border: '1px solid #bae6fd', background: '#f0f9ff' }}>
                  <h4 style={{ color: '#0369a1', marginTop: 0, marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600 }}>Add New Owner</h4>
                  <div className="form-grid">
                    <div><label className="modern-label">Name</label><input className="modern-input" type="text" /></div>
                    <div><label className="modern-label">Category</label><select className="modern-input modern-select"><option>Director</option></select></div>
                    <div><label className="modern-label">Email</label><input className="modern-input" type="email" /></div>
                    <div><label className="modern-label">Contact</label><input className="modern-input" type="text" /></div>
                    <div style={{ gridColumn: 'span 2' }}><label className="modern-label">Address</label><input className="modern-input" type="text" /></div>
                    <div style={{ gridColumn: 'span 2' }}><label className="modern-label">Remark</label><input className="modern-input" type="text" /></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem' }}>
                    <button className="btn-outline" onClick={() => setShowAddOwner(false)}>Cancel</button>
                    <button className="btn-primary"><Save size={16} /> Save Owner</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button className="btn-primary" onClick={() => setShowAddOwner(true)}>
                    <Plus size={16} /> Add Owner
                  </button>
                </div>
              )}

              {!showAddOwner && (
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Contact No</th>
                        <th>Email</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {owners.map((owner) => (
                        <tr key={owner.id}>
                          <td style={{ fontWeight: 500 }}>{owner.name}</td>
                          <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{owner.category}</span></td>
                          <td>{owner.contact}</td>
                          <td>{owner.email}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              <button className="action-btn" onClick={() => setShowAddOwner(true)} title="Edit">
                                <Edit size={16} />
                              </button>
                              <button className="action-btn delete" onClick={() => handleDeleteClick('this owner')} title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reusable Delete Dialog */}
      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${deleteDialog.targetName}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, targetName: '' })}
      />
    </div>
  );
}

const ChevronRight = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
