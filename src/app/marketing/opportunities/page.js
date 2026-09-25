'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, PhoneCall, X, Pencil } from 'lucide-react';

export default function OpportunityPipeline() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewOpp, setViewOpp] = useState(null);
  const [followupOpp, setFollowupOpp] = useState(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  async function fetchOpportunities() {
    try {
      const res = await fetch('/api/marketing/opportunities');
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data);
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
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    void (async () => {
      await fetchOpportunities();
      await fetchEmployees();
    })();
  }, []);

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setFollowupLoading(true);
    const form = e.target;
    
    const newStage = form.salesStage.value;
    let newStatus = 'Open';
    if (newStage === 'Closed Won') newStatus = 'Won';
    if (newStage === 'Closed Lost') newStatus = 'Lost';

    try {
      const statusRes = await fetch(`/api/marketing/opportunities/${followupOpp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesStage: newStage, status: newStatus })
      });
      
      if (!statusRes.ok) throw new Error('Failed to update stage');

      const followupRes = await fetch('/api/marketing/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: followupOpp.id,
          activityType: form.activityType.value,
          discussion: form.discussion.value,
          commitment: form.commitment.value,
          nextFollowUpDate: form.nextFollowUpDate.value,
          nextAction: form.nextAction.value,
          createdById: form.createdById.value
        })
      });

      if (!followupRes.ok) throw new Error('Failed to create followup');

      alert('Follow-up logged successfully');
      setFollowupOpp(null);
      fetchOpportunities();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setFollowupLoading(false);
    }
  };

  const filteredOpps = opportunities.filter(o => 
    o.lead?.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const renderDocuments = (documents) => {
    if (!Array.isArray(documents) || documents.length === 0) {
      return <div className="mkt-text-muted">No client documents uploaded.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {documents.map((doc, index) => {
          const fileUrl = doc?.data || doc?.url || null;
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
    if (status === 'Won') return 'mkt-badge mkt-badge-emerald';
    if (status === 'Lost') return 'mkt-badge mkt-badge-red';
    return 'mkt-badge mkt-badge-blue';
  };

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <h1 className="mkt-title">Opportunity Pipeline</h1>
        <a href="/marketing/opportunities/create" className="mkt-btn mkt-btn-primary">
          + New Opportunity
        </a>
      </div>

      <div className="mkt-card">
        <div className="mkt-toolbar">
          <div className="mkt-search">
            <Search className="mkt-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search opportunities..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mkt-search-input"
            />
          </div>
          <div className="mkt-text-muted">
            Total: {filteredOpps.length} opps
          </div>
        </div>

        <div className="mkt-table-wrapper">
          {loading ? (
            <div className="mkt-loading"><div className="mkt-spinner"></div></div>
          ) : (
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Project / Client</th>
                  <th>Value & Probability</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Exp. Close Date</th>
                  <th className="mkt-text-right">Owner</th>
                  <th className="mkt-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpps.map(opp => {
                  const weightedValue = opp.estimatedValue * (opp.probabilityPercent / 100);
                  return (
                    <tr key={opp.id}>
                      <td>
                        <div className="mkt-font-semibold">{opp.lead?.projectName || 'Unknown Project'}</div>
                        <div className="mkt-text-muted mkt-text-xs mkt-mt-1">{opp.client?.companyName || 'Unknown Client'}</div>
                      </td>
                      <td>
                        <div className="mkt-flex mkt-flex-col mkt-mt-1" style={{ gap: '4px' }}>
                          <span className="mkt-font-semibold">{formatCurrency(opp.estimatedValue)}</span>
                          <div className="mkt-flex mkt-items-center mkt-text-muted mkt-text-xs" style={{ gap: '8px' }}>
                            <div style={{ width: '64px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', backgroundColor: '#4f46e5', width: `${opp.probabilityPercent}%` }}></div>
                            </div>
                            {opp.probabilityPercent}% (WV: {formatCurrency(weightedValue)})
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mkt-badge mkt-badge-slate">{opp.salesStage}</span>
                      </td>
                      <td>
                        <span className={getBadgeClass(opp.status)}>
                          {opp.status}
                        </span>
                      </td>
                      <td className="mkt-text-muted">
                        {new Date(opp.expectedClosingDate).toLocaleDateString()}
                      </td>
                      <td className="mkt-text-right mkt-text-muted">
                        {opp.owner?.name || 'Unassigned'}
                      </td>
                      <td className="mkt-text-right">
                        <button className="mkt-icon-btn" title="Log Follow-up" onClick={() => setFollowupOpp(opp)}>
                          <PhoneCall size={16} />
                        </button>
                        <Link href={`/marketing/opportunities/${opp.id}/edit`} className="mkt-icon-btn" title="Edit Opportunity" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px' }}>
                          <Pencil size={16} />
                        </Link>
                        <button className="mkt-btn mkt-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', marginLeft: '8px' }} onClick={() => setViewOpp(opp)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredOpps.length === 0 && (
                  <tr>
                    <td colSpan="7" className="mkt-text-center mkt-text-muted" style={{ padding: '32px' }}>
                      No opportunities found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Follow-up Modal */}
      {followupOpp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Log Follow-up for Opportunity</h2>
              <button onClick={() => setFollowupOpp(null)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleFollowupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="mkt-label">Update Stage</label>
                <select name="salesStage" defaultValue={followupOpp.salesStage} className="mkt-select" required>
                  <option value="Initial Contact">Initial Contact</option>
                  <option value="Needs Analysis">Needs Analysis</option>
                  <option value="Proposal/Quote">Proposal/Quote</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
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
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setFollowupOpp(null)} className="mkt-btn mkt-btn-outline">Cancel</button>
                <button type="submit" disabled={followupLoading} className="mkt-btn mkt-btn-primary">
                  {followupLoading ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewOpp && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Opportunity Details</h2>
              <button onClick={() => setViewOpp(null)}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Project</div>
                <div className="mkt-font-medium">{viewOpp.lead?.projectName || 'N/A'}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Client</div>
                <div className="mkt-font-medium">{viewOpp.client?.companyName || 'N/A'}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Estimated Value</div>
                <div>{formatCurrency(viewOpp.estimatedValue)}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Probability</div>
                <div>{viewOpp.probabilityPercent}%</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Sales Stage</div>
                <div>{viewOpp.salesStage}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Status</div>
                <span className={getBadgeClass(viewOpp.status)}>{viewOpp.status}</span>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Expected Close Date</div>
                <div>{new Date(viewOpp.expectedClosingDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Owner</div>
                <div>{viewOpp.owner?.name || 'Unassigned'}</div>
              </div>
              {viewOpp.competitor && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="mkt-text-muted mkt-text-xs">Competitor</div>
                  <div>{viewOpp.competitor}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Client Documents</h3>
              {renderDocuments(viewOpp.documents)}
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>Follow-ups History</h3>
              {viewOpp.followups && viewOpp.followups.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  {viewOpp.followups.map(f => (
                    <div key={f.id} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>{f.activityType}</strong>
                        <span className="mkt-text-muted">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: '4px 0' }}>{f.discussion}</p>
                      {f.nextAction && (
                        <div className="mkt-text-xs mkt-text-muted mt-1">
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
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setViewOpp(null)} className="mkt-btn mkt-btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
