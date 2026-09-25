'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck, Plus, Search } from 'lucide-react';

export default function SiteGTNListPage() {
  const router = useRouter();
  const [gtns, setGtns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    projectId: '',
    search: ''
  });
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
    fetchGTNs();
  }, [filters.status, filters.projectId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchGTNs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.projectId) params.append('projectId', filters.projectId);
      
      const res = await fetch(`/api/engineering/site/gtn?${params}`);
      const data = await res.json();
      setGtns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching GTNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadge = (status) => {
    const map = {
      Draft:      { background: '#f3f4f6', color: '#374151' },
      Dispatched: { background: '#dbeafe', color: '#1e40af' },
      Submitted:  { background: '#dbeafe', color: '#1e40af' },
      Testing:    { background: '#fef3c7', color: '#92400e' },
      Completed:  { background: '#d1fae5', color: '#065f46' },
      Rejected:   { background: '#fee2e2', color: '#991b1b' },
    };
    return map[status] || { background: '#f3f4f6', color: '#374151' };
  };

  const filteredGTNs = gtns.filter(gtn => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      gtn.gtnNo?.toLowerCase().includes(search) ||
      gtn.gtnSrNo?.toLowerCase().includes(search) ||
      gtn.project?.name?.toLowerCase().includes(search) ||
      gtn.supplierName?.toLowerCase().includes(search)
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageCheck size={22} style={{ color: '#0284c7' }} />
            Goods Testing Note (GTN)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Material quality testing and certification
          </p>
        </div>
        <button
          onClick={() => router.push('/site/gtn/new')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: '#0284c7', 
            color: '#fff', 
            padding: '10px 18px', 
            borderRadius: '6px', 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          <Plus size={16} /> Create GTN
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="GTN No, Project, Supplier..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '9px 12px 9px 38px', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Submitted">Submitted</option>
              <option value="Testing">Testing</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={fetchGTNs}
              style={{ width: '100%', padding: '9px 12px', background: '#0284c7', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* GTN Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#64748b', marginTop: '16px', fontSize: '0.875rem' }}>Loading GTNs...</p>
        </div>
      ) : filteredGTNs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
          <PackageCheck size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>No GTNs found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '20px' }}>Create your first Goods Testing Note</p>
          <button
            onClick={() => router.push('/site/gtn/new')}
            style={{ padding: '10px 20px', background: '#0284c7', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Create GTN
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredGTNs.map((gtn) => {
            const badge = getBadge(gtn.status);
            return (
              <div
                key={gtn.id}
                style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#0284c7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        GTN No: <span style={{ color: '#0284c7' }}>{gtn.gtnSrNo || gtn.gtnNo}</span>
                      </h3>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, ...badge }}>
                        {gtn.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.8rem' }}>
                      <div><span style={{ color: '#64748b' }}>Project: </span><span style={{ fontWeight: 600, color: '#334155' }}>{gtn.project?.name || 'N/A'}</span></div>
                      <div><span style={{ color: '#64748b' }}>Supplier: </span><span style={{ fontWeight: 600, color: '#334155' }}>{gtn.supplierName || 'N/A'}</span></div>
                      <div>
                        <span style={{ color: '#64748b' }}>GTN Date: </span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{new Date(gtn.gtnDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/site/gtn/${gtn.id}`)}
                    style={{ padding: '8px 16px', color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                  >
                    View Details →
                  </button>
                </div>

                <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>
                    Test Items ({gtn.items?.length || 0})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#1e40af', marginBottom: '4px' }}>Total Tests</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>{gtn.items?.length || 0}</div>
                    </div>
                    <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#065f46', marginBottom: '4px' }}>Passed</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065f46' }}>{gtn.items?.filter(i => i.testStatus === 'Pass').length || 0}</div>
                    </div>
                    <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#991b1b', marginBottom: '4px' }}>Failed</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>{gtn.items?.filter(i => i.testStatus === 'Fail').length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
