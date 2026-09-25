'use client';
import React, { useState, useEffect } from 'react';
import { Search, Trophy, XCircle, ArrowRight } from 'lucide-react';

export default function WonLostPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [oppRes, leadRes] = await Promise.all([
          fetch('/api/marketing/opportunities'),
          fetch('/api/marketing/leads')
        ]);
        
        let combined = [];

        if (oppRes.ok) {
          const data = await oppRes.json();
          combined = [...combined, ...data.filter(o => o.status === 'Won' || o.status === 'Lost')];
        }

        if (leadRes.ok) {
          const leads = await leadRes.json();
          const closedLeads = leads.filter(l => 
            l.leadStatus === 'Won converted to customer' || 
            l.leadStatus === 'Lost rejected'
          ).map(l => ({
            id: l.id,
            status: l.leadStatus === 'Won converted to customer' ? 'Won' : 'Lost',
            lead: { projectName: l.projectName },
            client: { companyName: l.companyName },
            estimatedValue: l.estimatedProjectValue,
            updatedAt: l.updatedAt || l.createdAt,
            lostReason: l.remarks,
            isLead: true,
            originalData: l
          }));
          combined = [...combined, ...closedLeads];
        }

        combined.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setOpportunities(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

  const handlePushToProject = async (opp) => {
    if (!confirm('Are you sure you want to push this to the Project module?')) return;
    try {
      const data = opp.isLead ? opp.originalData : (opp.lead || {});
      const projectRes = await fetch('/api/engineering/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.projectName || opp.lead?.projectName || 'New Project',
          clientName: data.companyName || opp.client?.companyName || '',
          location: data.projectLocation || data.location || '',
          contractValue: data.estimatedProjectValue || opp.estimatedValue || 0,
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
            Total: {filteredOpps.length} records
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
                {filteredOpps.map(opp => (
                  <tr key={opp.id}>
                    <td>
                      {opp.status === 'Won' ? (
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
                      <div className="mkt-font-semibold">{opp.lead?.projectName || 'Unknown Project'}</div>
                      <div className="mkt-text-muted mkt-text-xs mkt-mt-1">{opp.client?.companyName || 'Unknown Client'}</div>
                    </td>
                    <td className="mkt-font-semibold text-slate-800">
                      {formatCurrency(opp.estimatedValue)}
                    </td>
                    <td className="mkt-text-muted">
                      {opp.status === 'Lost' ? (
                         <span className="mkt-text-xs">Reason: {opp.lostReason || 'Not specified'}</span>
                      ) : (
                         <span className="mkt-text-xs">Closed on: {new Date(opp.updatedAt).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="mkt-text-right">
                      {opp.status === 'Won' ? (
                        <button 
                          onClick={() => handlePushToProject(opp)}
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
                {filteredOpps.length === 0 && (
                  <tr>
                    <td colSpan="5" className="mkt-text-center mkt-text-muted" style={{ padding: '32px' }}>
                      No won or lost opportunities found.
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
