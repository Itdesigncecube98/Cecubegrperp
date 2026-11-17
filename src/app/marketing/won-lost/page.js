'use client';
import React, { useState, useEffect } from 'react';
import { Search, Trophy, XCircle, ArrowRight } from 'lucide-react';

export default function WonLostPage() {
  const [closedLeads, setClosedLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/marketing/leads');
        if (!response.ok) throw new Error('Failed to load lead history');
        const leads = await response.json();
        const closed = leads.filter(lead =>
          lead.leadStatus === 'Won converted to customer' ||
          lead.leadStatus === 'Lost rejected'
        ).map(lead => ({
          id: lead.id,
          status: lead.leadStatus === 'Won converted to customer' ? 'Won' : 'Lost',
          projectName: lead.projectName,
          companyName: lead.companyName,
          estimatedValue: lead.estimatedProjectValue,
          updatedAt: lead.updatedAt || lead.createdAt,
          lostReason: lead.remarks,
          originalData: lead,
        }));
        closed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setClosedLeads(closed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredLeads = closedLeads.filter(lead =>
    lead.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const handlePushToProject = async (lead) => {
    if (!confirm('Are you sure you want to push this to the Project module?')) return;
    try {
      const data = lead.originalData;
      const projectRes = await fetch('/api/engineering/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.projectName || lead.projectName || 'New Project',
          clientName: data.companyName || lead.companyName || '',
          location: data.projectLocation || data.location || '',
          contractValue: data.estimatedProjectValue || lead.estimatedValue || 0,
          projectType: data.projectType || 'EPC',
          status: 'Planning'
        })
      });
      if (projectRes.ok) {
        alert('Successfully pushed to Project module!');
      } else {
        alert('Failed to push to project');
      }
    } catch (err) {
      console.error(err);
      alert('Error pushing to project');
    }
  };

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <h1 className="mkt-title">Won / Lost & Handover</h1>
      </div>

      <div className="mkt-card">
        <div className="mkt-toolbar">
          <div className="mkt-search">
            <Search className="mkt-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mkt-search-input"
            />
          </div>
          <div className="mkt-text-muted">
            Total: {filteredLeads.length} records
          </div>
        </div>

        <div className="mkt-table-wrapper">
          {loading ? (
            <div className="mkt-loading"><div className="mkt-spinner"></div></div>
          ) : (
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Project / Client</th>
                  <th>Value</th>
                  <th>Details</th>
                  <th className="mkt-text-right">Handover Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      {lead.status === 'Won' ? (
                        <div className="mkt-badge mkt-badge-emerald" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>
                          <Trophy size={16} /> Won
                        </div>
                      ) : (
                        <div className="mkt-badge mkt-badge-red" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>
                          <XCircle size={16} /> Lost
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="mkt-font-semibold">{lead.projectName || 'Unknown Project'}</div>
                      <div className="mkt-text-muted mkt-text-xs mkt-mt-1">{lead.companyName || 'Unknown Client'}</div>
                    </td>
                    <td className="mkt-font-semibold text-slate-800">
                      {formatCurrency(lead.estimatedValue)}
                    </td>
                    <td className="mkt-text-muted">
                      {lead.status === 'Lost' ? (
                         <span className="mkt-text-xs">Reason: {lead.lostReason || 'Not specified'}</span>
                      ) : (
                         <span className="mkt-text-xs">Closed on: {new Date(lead.updatedAt).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="mkt-text-right">
                      {lead.status === 'Won' ? (
                        <button 
                          onClick={() => handlePushToProject(lead)}
                          className="mkt-btn mkt-btn-outline mkt-ml-auto" 
                          style={{ color: '#4f46e5', borderColor: '#c7d2fe', backgroundColor: '#eef2ff' }}
                        >
                           Push to Project Module <ArrowRight size={14} />
                        </button>
                      ) : (
                        <span className="mkt-text-muted mkt-text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="5" className="mkt-text-center mkt-text-muted" style={{ padding: '32px' }}>
                      No won or lost leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
