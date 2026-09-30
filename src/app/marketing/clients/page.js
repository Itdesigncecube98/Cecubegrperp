'use client';
import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Phone, Mail } from 'lucide-react';

export default function CustomerMaster() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/marketing/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => 
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mkt-page-container">
      <div className="mkt-header">
        <h1 className="mkt-title">Customer Master</h1>
        <a href="/marketing/clients/create" className="mkt-btn mkt-btn-primary">
          + New Customer
        </a>
      </div>

      <div className="mkt-card">
        <div className="mkt-toolbar">
          <div className="mkt-search">
            <Search className="mkt-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mkt-search-input"
            />
          </div>
          <div className="mkt-text-muted">
            Total: {filteredClients.length} customers
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {loading ? (
            <div className="mkt-loading"><div className="mkt-spinner"></div></div>
          ) : (
            <div className="mkt-grid-3">
              {filteredClients.map(client => (
                <div key={client.id} className="mkt-card" style={{ padding: '20px' }}>
                  <div className="mkt-flex mkt-items-center mkt-mb-4 mkt-gap-2">
                    <div className="mkt-kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1', width: '40px', height: '40px' }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="mkt-font-semibold" style={{ fontSize: '1.125rem', margin: 0, color: '#1e293b' }}>{client.companyName}</h3>
                      <p className="mkt-text-muted mkt-text-xs mkt-mt-1" style={{ margin: 0 }}>{client.industry || 'Unknown Industry'}</p>
                    </div>
                  </div>
                  
                  <div className="mkt-text-muted mkt-text-xs mkt-mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="mkt-flex mkt-items-center mkt-gap-2">
                      <Phone size={14} />
                      <span>{client.mobile || 'N/A'} ({client.contactPerson || 'No contact'})</span>
                    </div>
                    <div className="mkt-flex mkt-items-center mkt-gap-2">
                      <Mail size={14} />
                      <span>{client.email || 'N/A'}</span>
                    </div>
                    <div className="mkt-flex mkt-gap-2">
                      <MapPin size={14} className="mkt-mt-1" style={{ flexShrink: 0 }} />
                      <span>{client.address || 'No address provided'}</span>
                    </div>
                    {(client.companyPan || client.nationality || client.state) && (
                      <div style={{ paddingLeft: 22, lineHeight: 1.6 }}>
                        {client.companyPan && <div>Company PAN: {client.companyPan}</div>}
                        {client.nationality && <div>Nationality: {client.nationality}</div>}
                        {client.state && <div>State: {client.state}</div>}
                      </div>
                    )}
                  </div>

                  <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>
                      <span className="mkt-font-semibold" style={{ color: '#334155' }}>{client.leads?.length || 0}</span> Leads
                    </div>
                    <div>
                      <span className="mkt-font-semibold" style={{ color: '#334155' }}>{client.opportunities?.length || 0}</span> Opps
                    </div>
                    <div>
                      <span className="mkt-font-semibold" style={{ color: '#059669' }}>{client.opportunities?.filter(o => o.status === 'Won').length || 0}</span> Won
                    </div>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  No customers found. Customers are automatically created from Leads.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
