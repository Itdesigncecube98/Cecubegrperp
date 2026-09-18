'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, RefreshCw, Plus, ChevronDown, ChevronRight, Home, LayoutList, MapPin, Edit, Trash2
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';
import MultiSelect from '../../../../components/MultiSelect';

export default function ProjectList() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [filterCompany, setFilterCompany] = useState([]);
  const [filterLibrary, setFilterLibrary] = useState([]);
  const [filterCategory1, setFilterCategory1] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  
  // Dummy data for dropdowns
  const companies = ['CeCube Engineering India Private Limited', 'CeCube Green Energy Private Limited', 'Godrej Properties Ltd', 'Unitech Group'];
  const libraries = ['Unitech Library', 'Consultancy', 'CeCube Green Energy', 'Default Library'];
  const categories1 = ['Residential', 'Commercial', 'Industrial', 'Infrastructure'];
  const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed'];

  React.useEffect(() => {
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
    fetchProjects();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        const res = await fetch('/api/projects', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          setProjects(projects.filter(p => p.id !== id));
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleEdit = (e, id) => {
    e.stopPropagation();
    router.push(`/engineering/projects/add-project?id=${id}`);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompany.length > 0 ? filterCompany.includes(p.company) : true;
    const matchesLibrary = filterLibrary.length > 0 ? filterLibrary.includes(p.library) : true;
    const matchesCategory = filterCategory1.length > 0 ? filterCategory1.includes(p.category) : true;
    const matchesStatus = filterStatus.length > 0 ? filterStatus.includes(p.status) : true;
    return matchesSearch && matchesCompany && matchesLibrary && matchesCategory && matchesStatus;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCompany([]);
    setFilterLibrary([]);
    setFilterCategory1([]);
    setFilterStatus([]);
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
            <MultiSelect options={companies} selected={filterCompany} onChange={setFilterCompany} placeholder="-- Select Company --" />
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Library</label>
            <MultiSelect options={libraries} selected={filterLibrary} onChange={setFilterLibrary} placeholder="-- Select Library --" />
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Category 1</label>
            <MultiSelect options={categories1} selected={filterCategory1} onChange={setFilterCategory1} placeholder="-- Select Category 1 --" />
          </div>
          <div>
            <label className="modern-label" style={{ color: '#0ea5e9' }}>Status</label>
            <MultiSelect options={statuses} selected={filterStatus} onChange={setFilterStatus} placeholder="-- Select Status --" />
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
                    onClick={() => router.push(`/engineering/projects/add-project?id=${p.id}`)} 
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
                      <div style={{ color: '#334155', marginBottom: '4px' }}>{p.cost ? p.cost.split('\n')[0] : '0.0000'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.cost ? (p.cost.split('\n')[1] || '') : '01/01/1900'}</div>
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
