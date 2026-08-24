'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, RefreshCw, Plus, ChevronDown, ChevronRight, Home, LayoutList, MapPin, Edit, Trash2
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function ProjectList() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterLibrary, setFilterLibrary] = useState('');
  const [filterCategory1, setFilterCategory1] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Dummy data for dropdowns
  const companies = ['CeCube Engineering India Private Limited', 'CeCube Green Energy Private Limited', 'Godrej Properties Ltd', 'Unitech Group'];
  const libraries = ['Unitech Library', 'Consultancy', 'CeCube Green Energy', 'Default Library'];
  const categories1 = ['Residential', 'Commercial', 'Industrial', 'Infrastructure'];
  const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed'];

  React.useEffect(() => {
    const saved = localStorage.getItem('engineering_projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      const defaultProjects = [
        {
          id: 1,
          name: 'Unitech GBP Servicing of Busduct for DG Sets HVAC',
          state: 'Haryana',
          company: 'CeCube Engineering India Private Limited',
          library: 'Unitech Library',
          builtUpArea: '826800.0000',
          saleableArea: '0.0000',
          startDate: '31/12/2025 00:00:00',
          endDate: '31/12/2025 00:00:00',
          cost: '0.0000\n01/01/1900'
        },
        {
          id: 2,
          name: '"Godrej Panipat Consultancy Charge for EP Approval',
          state: 'Haryana',
          company: 'CeCube Engineering India Private Limited',
          library: 'Consultancy',
          builtUpArea: '3680000.0000',
          saleableArea: '0.0000',
          startDate: '20/12/2025 00:00:00',
          endDate: '20/12/2025 00:00:00',
          cost: '0.0000\n01/01/1900'
        },
        {
          id: 3,
          name: '10KWP Solar Power Plant at House No 608 Jhajjar',
          state: 'Haryana',
          company: 'CeCube Green Energy Private Limited',
          library: 'CeCube Green Energy',
          builtUpArea: '430000.0000',
          saleableArea: '0.0000',
          startDate: '07/08/2025 00:00:00',
          endDate: '30/08/2025 00:00:00',
          cost: '0.0000\n01/01/1900'
        }
      ];
      setProjects(defaultProjects);
      localStorage.setItem('engineering_projects', JSON.stringify(defaultProjects));
    }
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation(); // prevent row click routing
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      localStorage.setItem('engineering_projects', JSON.stringify(newProjects));
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // prevent double routing
    router.push('/engineering/projects/add-project');
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompany ? p.company === filterCompany : true;
    const matchesLibrary = filterLibrary ? p.library === filterLibrary : true;
    // Category/Status logic could be added here if we had that data in our dummy objects
    return matchesSearch && matchesCompany && matchesLibrary;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCompany('');
    setFilterLibrary('');
    setFilterCategory1('');
    setFilterStatus('');
  };

  return (
    <div className="company-container">
      {/* Header Area */}
      <div className="page-header">
        <h2 className="page-title">
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', display: 'flex', color: '#0ea5e9' }}>
            <LayoutList size={24} />
          </div>
          Project List
        </h2>
        <div className="breadcrumb">
          <Home size={14} /> Home <ChevronRight size={14} /> Projects <ChevronRight size={14} /> Project List
        </div>
      </div>

      <div className="modern-card" style={{ padding: '24px' }}>
        
        {/* Filters */}
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr) auto auto', alignItems: 'end', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Project Name / Company</label>
            <input 
              className="modern-input" 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Company</label>
            <select 
              className="modern-input modern-select"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="">-- Select Company --</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Library</label>
            <select 
              className="modern-input modern-select"
              value={filterLibrary}
              onChange={(e) => setFilterLibrary(e.target.value)}
            >
              <option value="">-- Select Library --</option>
              {libraries.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Category 1</label>
            <select 
              className="modern-input modern-select"
              value={filterCategory1}
              onChange={(e) => setFilterCategory1(e.target.value)}
            >
              <option value="">-- Select Category 1 --</option>
              {categories1.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Status</label>
            <select 
              className="modern-input modern-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">-- Select Status --</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn-outline" style={{ height: '40px' }} onClick={resetFilters}><RefreshCw size={14} /> Reset</button>
          <button className="btn-primary" style={{ height: '40px', background: '#0ea5e9' }}><Search size={14} /> Search</button>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}>
              Total Records: {filteredProjects.length}
            </div>
            <Link href="/engineering/projects/add-project">
              <button className="btn-primary" style={{ background: '#0ea5e9' }}><Plus size={16} /> Add New Project</button>
            </Link>
            <button className="btn-primary" style={{ background: '#0ea5e9' }}>Reports <ChevronDown size={14} style={{ marginLeft: '4px' }} /></button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#64748b' }}>
            Page: <input className="modern-input" type="text" defaultValue="1" style={{ width: '40px', padding: '4px', textAlign: 'center' }} /> of 1
            <button className="btn-primary" style={{ padding: '4px 12px', background: '#0ea5e9', borderRadius: '16px' }}>Go</button>
          </div>
        </div>

        {/* Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="modern-table" style={{ width: '100%' }}>
            <thead style={{ background: '#0ea5e9' }}>
              <tr>
                <th style={{ color: 'white', background: '#0ea5e9' }}>Project<br/>Category • State</th>
                <th style={{ color: 'white', background: '#0ea5e9' }}>Company<br/>Library</th>
                <th style={{ color: 'white', background: '#0ea5e9' }}>Built-up Area<br/>Saleable Area</th>
                <th style={{ color: 'white', background: '#0ea5e9' }}>Start Date<br/>End Date</th>
                <th style={{ color: 'white', background: '#0ea5e9' }}>Project Cost</th>
                <th style={{ color: 'white', background: '#0ea5e9', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No projects found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => router.push('/engineering/projects/add-project')} 
                    style={{ cursor: 'pointer' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px' }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                        <MapPin size={12} /> {p.state}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#334155', marginBottom: '4px' }}>{p.company}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.library}</div>
                    </td>
                    <td>
                      <div style={{ color: '#334155', marginBottom: '4px' }}>{p.builtUpArea}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.saleableArea}</div>
                    </td>
                    <td>
                      <div style={{ color: '#334155', marginBottom: '4px' }}>{p.startDate}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.endDate}</div>
                    </td>
                    <td>
                      <div style={{ color: '#334155', marginBottom: '4px' }}>{p.cost.split('\n')[0]}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.cost.split('\n')[1]}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <div 
                          onClick={(e) => handleEdit(e, p.id)} 
                          style={{ padding: '6px', background: '#e0f2fe', borderRadius: '6px', color: '#0ea5e9' }}
                          title="Edit Project"
                        >
                          <Edit size={16} />
                        </div>
                        <div 
                          onClick={(e) => handleDelete(e, p.id)} 
                          style={{ padding: '6px', background: '#fee2e2', borderRadius: '6px', color: '#ef4444' }}
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}
