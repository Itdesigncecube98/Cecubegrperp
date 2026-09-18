'use client';
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock } from 'lucide-react';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewProposal, setViewProposal] = useState(null);

  useEffect(() => {
    async function fetchProposals() {
      try {
        const res = await fetch('/api/marketing/proposals');
        if (res.ok) {
          const data = await res.json();
          setProposals(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProposals();
  }, []);

  const filteredProposals = proposals.filter(p => 
    p.opportunity?.lead?.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.opportunity?.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getBadgeClass = (status) => {
    if (status === 'Approved' || status === 'Sent to Client') return 'mkt-badge mkt-badge-emerald';
    if (status === 'Draft') return 'mkt-badge mkt-badge-slate';
    return 'mkt-badge mkt-badge-amber';
  };

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <h1 className="mkt-title">Proposals & Approvals</h1>
        <a href="/marketing/proposals/create" className="mkt-btn mkt-btn-primary">
          + New Proposal
        </a>
      </div>

      <div className="mkt-card">
        <div className="mkt-toolbar">
          <div className="mkt-search">
            <Search className="mkt-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search proposals..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mkt-search-input"
            />
          </div>
          <div className="mkt-text-muted">
            Total: {filteredProposals.length} proposals
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
                  <th>Estimated Cost</th>
                  <th>Quoted Amount</th>
                  <th>Final Amount</th>
                  <th>Status</th>
                  <th className="mkt-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map(proposal => (
                  <tr key={proposal.id}>
                    <td>
                      <div className="mkt-font-semibold">{proposal.opportunity?.lead?.projectName || 'Unknown Project'}</div>
                      <div className="mkt-text-muted mkt-text-xs mkt-mt-1">{proposal.opportunity?.client?.companyName || 'Unknown Client'}</div>
                    </td>
                    <td className="mkt-text-muted">{formatCurrency(proposal.estimatedCost)}</td>
                    <td className="mkt-font-medium text-slate-800">{formatCurrency(proposal.quotedAmount)}</td>
                    <td className="mkt-font-semibold" style={{ color: '#4f46e5' }}>{formatCurrency(proposal.finalAmount)}</td>
                    <td>
                      <span className={getBadgeClass(proposal.status)}>
                        {proposal.status === 'Approved' || proposal.status === 'Sent to Client' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {proposal.status}
                      </span>
                    </td>
                    <td className="mkt-text-right">
                      <button className="mkt-btn mkt-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setViewProposal(proposal)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProposals.length === 0 && (
                  <tr>
                    <td colSpan="6" className="mkt-text-center mkt-text-muted" style={{ padding: '32px' }}>
                      No proposals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewProposal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Proposal Details</h2>
              <button onClick={() => setViewProposal(null)}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Project</div>
                <div className="mkt-font-medium">{viewProposal.opportunity?.lead?.projectName || 'N/A'}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Client</div>
                <div className="mkt-font-medium">{viewProposal.opportunity?.client?.companyName || 'N/A'}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Estimated Cost</div>
                <div>{formatCurrency(viewProposal.estimatedCost)}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Quoted Amount</div>
                <div>{formatCurrency(viewProposal.quotedAmount)}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Discount Given</div>
                <div>{formatCurrency(viewProposal.discount)}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Final Amount</div>
                <div className="mkt-font-bold" style={{ color: '#4f46e5' }}>{formatCurrency(viewProposal.finalAmount)}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Expected Margin</div>
                <div>{formatCurrency(viewProposal.margin)}</div>
              </div>
              <div>
                <div className="mkt-text-muted mkt-text-xs">Status</div>
                <span className={getBadgeClass(viewProposal.status)}>{viewProposal.status}</span>
              </div>
              {viewProposal.paymentTerms && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="mkt-text-muted mkt-text-xs">Payment Terms</div>
                  <div style={{ whiteSpace: 'pre-line' }}>{viewProposal.paymentTerms}</div>
                </div>
              )}
              {viewProposal.deliveryTerms && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="mkt-text-muted mkt-text-xs">Delivery Terms</div>
                  <div style={{ whiteSpace: 'pre-line' }}>{viewProposal.deliveryTerms}</div>
                </div>
              )}
              {viewProposal.validity && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="mkt-text-muted mkt-text-xs">Validity Date</div>
                  <div>{new Date(viewProposal.validity).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setViewProposal(null)} className="mkt-btn mkt-btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
