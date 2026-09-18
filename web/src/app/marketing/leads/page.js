'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, PhoneCall, Building2, Trash2, X, Pencil } from 'lucide-react';

export default function LeadRegister() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewLead, setViewLead] = useState(null);
  const [followupLead, setFollowupLead] = useState(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/marketing/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/marketing/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(leads.filter(l => l.id !== id));
      } else {
        alert('Failed to delete lead');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting lead');
    }
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setFollowupLoading(true);
    const form = e.target;
    
    try {
      const statusRes = await fetch(`/api/marketing/leads/${followupLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStatus: form.leadStatus.value })
      });
      
      if (!statusRes.ok) throw new Error('Failed to update status');

      const followupRes = await fetch('/api/marketing/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: followupLead.id,
          activityType: form.activityType.value,
          discussion: form.discussion.value,
          commitment: form.commitment.value,
          nextFollowUpDate: form.nextFollowUpDate.value,
          nextAction: form.nextAction.value,
          createdById: form.createdById.value
        })
      });

      if (!followupRes.ok) throw new Error('Failed to create followup');

      if (form.leadStatus.value === 'Won converted to customer') {
        const projectRes = await fetch('/api/engineering/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: followupLead.projectName || `Project for ${followupLead.companyName}`,
            clientName: followupLead.companyName,
            location: followupLead.projectLocation,
            contractValue: followupLead.estimatedProjectValue,
            projectType: followupLead.projectType || 'EPC',
            status: 'Planning'
          })
        });
        if (!projectRes.ok) {
          console.warn('Failed to handover to project automatically', await projectRes.text());
        } else {
          alert('Lead marked as Won and handed over to Projects successfully!');
        }
      } else {
        alert('Follow-up logged successfully');
      }

      setFollowupLead(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setFollowupLoading(false);
    }
  };

  const openViewDetails = async (lead) => {
    try {
      const res = await fetch(`/api/marketing/leads/${lead.id}`);
      if (res.ok) {
        const fullLead = await res.json();
        setViewLead(fullLead);
      }
    } catch (error) {
      console.error('Failed to fetch details', error);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.leadId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDocuments = (documents) => {
    if (!Array.isArray(documents) || documents.length === 0) {
      return <div className="mkt-text-muted">No client documents uploaded.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {documents.map((doc, index) => {
          const fileUrl = doc?.data || doc?.url || null;
          const isImage = (doc?.type || '').startsWith('image/');
          const isPdf = (doc?.type || '').includes('pdf');

          return (
            <div key={doc.id || `${doc.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{doc.name || `Document ${index + 1}`}</span>
                <span className="mkt-text-muted mkt-text-xs">{doc.type || 'File'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {fileUrl && (
                  <button
                    type="button"
                    className="mkt-btn mkt-btn-outline"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => window.open(fileUrl, '_blank')}
                  >
                    View
                  </button>
                )}
                {fileUrl && (
                  <a
                    href={fileUrl}
                    download={doc.name || `document-${index + 1}`}
                    className="mkt-btn mkt-btn-primary"
                    style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }}
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getBadgeClass = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('new')) return 'mkt-badge mkt-badge-blue';
    if (s.includes('won') || s.includes('approved')) return 'mkt-badge mkt-badge-emerald';
    if (s.includes('lost') || s.includes('rejected')) return 'mkt-badge mkt-badge-red';
    if (s.includes('bidding') || s.includes('planned')) return 'mkt-badge mkt-badge-amber';
    return 'mkt-badge mkt-badge-slate';
  };

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <h1 className="mkt-title">Lead Register</h1>
        <Link href="/marketing/leads/create" className="mkt-btn mkt-btn-primary">
          <Plus size={18} /> New Lead
        </Link>
      </div>

      <div className="mkt-card">
        <div className="mkt-toolbar">
          <div className="mkt-search">
            <Search className="mkt-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mkt-search-input"
            />
          </div>
          <div className="mkt-text-muted">
            Total: {filteredLeads.length} leads
          </div>
        </div>

        <div className="mkt-table-wrapper">
          {loading ? (
            <div className="mkt-loading"><div className="mkt-spinner"></div></div>
          ) : (
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Lead ID / Date</th>
                  <th>Company / Client</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th className="mkt-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <div className="mkt-font-semibold">{lead.leadId}</div>
                      <div className="mkt-text-muted mkt-text-xs mkt-mt-1">{new Date(lead.leadDate).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div className="mkt-flex mkt-items-center mkt-gap-2">
                        <Building2 size={14} className="mkt-text-muted" />
                        <span className="mkt-font-medium">{lead.companyName}</span>
                      </div>
                      <div className="mkt-text-muted mkt-text-xs mkt-mt-1" style={{ marginLeft: '22px' }}>{lead.contactPerson}</div>
                    </td>
                    <td>
                      <div>{lead.projectName}</div>
                      <div className="mkt-text-muted mkt-text-xs mkt-mt-1">{lead.projectLocation}</div>
                    </td>
                    <td>
                      <span className={getBadgeClass(lead.leadStatus)}>
                        {lead.leadStatus}
                      </span>
                    </td>
                    <td className="mkt-text-muted">
                      {lead.leadOwner?.name || 'Unassigned'}
                    </td>
                    <td className="mkt-text-right">
                      <button className="mkt-icon-btn" title="Log Follow-up" onClick={() => setFollowupLead(lead)}>
                        <PhoneCall size={16} />
                      </button>
                      <button className="mkt-icon-btn" title="View Details" onClick={() => openViewDetails(lead)}>
                        <FileText size={16} />
                      </button>
                      <Link href={`/marketing/leads/${lead.id}/edit`} className="mkt-icon-btn" title="Edit Lead" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={16} />
                      </Link>
                      <button className="mkt-icon-btn mkt-text-danger" title="Delete" onClick={() => handleDelete(lead.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="6" className="mkt-text-center mkt-text-muted" style={{ padding: '32px' }}>
                      No leads found. Create a new lead to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Follow-up Modal */}
      {followupLead && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Log Follow-up for {followupLead.leadId}</h2>
              <button onClick={() => setFollowupLead(null)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleFollowupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="mkt-label">Update Status</label>
                <select name="leadStatus" defaultValue={followupLead.leadStatus} className="mkt-select" required>
                  <option value="New">New</option>
                  <option value="Planned">Planned</option>
                  <option value="Bidding Started">Bidding Started</option>
                  <option value="Bidded">Bidded</option>
                  <option value="Approved">Approved</option>
                  <option value="Won converted to customer">Won converted to customer</option>
                  <option value="Lost rejected">Lost rejected</option>
                  <option value="Saved for future reference as clients">Saved for future reference as clients</option>
                </select>
              </div>

              <div>
                <label className="mkt-label">Activity Type</label>
                <select name="activityType" className="mkt-select" required>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Client Meeting">Client Meeting</option>
                  <option value="Online Meeting">Online Meeting</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mkt-label">Discussion Notes</label>
                <textarea name="discussion" className="mkt-textarea" rows="3" required></textarea>
              </div>

              <div>
                <label className="mkt-label">Commitment (Optional)</label>
                <input type="text" name="commitment" className="mkt-input" />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mkt-label">Next Follow-up Date</label>
                  <input type="date" name="nextFollowUpDate" className="mkt-input" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="mkt-label">Next Action</label>
                  <input type="text" name="nextAction" className="mkt-input" />
                </div>
              </div>

              <div>
                <label className="mkt-label">Logged By</label>
                <select name="createdById" className="mkt-select" required>
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setFollowupLead(null)} className="mkt-btn mkt-btn-outline">Cancel</button>
                <button type="submit" disabled={followupLoading} className="mkt-btn mkt-btn-primary">
                  {followupLoading ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewLead && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Lead Details - {viewLead.leadId}</h2>
              <button onClick={() => setViewLead(null)}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div className="mkt-text-muted mkt-text-xs">Company</div>
                  <div className="mkt-font-medium">{viewLead.companyName}</div>
                </div>
                <div>
                  <div className="mkt-text-muted mkt-text-xs">Status</div>
                  <span className={getBadgeClass(viewLead.leadStatus)}>{viewLead.leadStatus}</span>
                </div>
                <div>
                  <div className="mkt-text-muted mkt-text-xs">Project Name</div>
                  <div>{viewLead.projectName}</div>
                </div>
                <div>
                  <div className="mkt-text-muted mkt-text-xs">Location</div>
                  <div>{viewLead.projectLocation}</div>
                </div>
                <div>
                  <div className="mkt-text-muted mkt-text-xs">Contact Person</div>
                  <div>{viewLead.contactPerson} ({viewLead.mobile})</div>
                </div>
                <div>
                  <div className="mkt-text-muted mkt-text-xs">Est. Value</div>
                  <div>₹{viewLead.estimatedProjectValue || 'N/A'}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Client Documents</h3>
                {renderDocuments(viewLead.documents)}
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Follow-ups History</h3>
                {viewLead.followups && viewLead.followups.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {viewLead.followups.map(f => (
                      <div key={f.id} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong>{f.activityType}</strong>
                          <span className="mkt-text-muted">{new Date(f.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ margin: '4px 0' }}>{f.discussion}</p>
                        {f.nextAction && (
                          <div className="mkt-text-xs mkt-text-muted" style={{ marginTop: '4px' }}>
                            Next: {f.nextAction} {f.nextFollowUpDate && `on ${new Date(f.nextFollowUpDate).toLocaleDateString()}`}
                          </div>
                        )}
                        <div className="mkt-text-xs" style={{ marginTop: '4px', color: '#64748b' }}>By: {f.createdBy?.name || 'Unknown'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mkt-text-muted">No follow-ups recorded yet.</div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setViewLead(null)} className="mkt-btn mkt-btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
