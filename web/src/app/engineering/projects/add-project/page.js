'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Home, ChevronRight, Save, Plus, FileText, ArrowLeft, Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../../accounts/company/company.css';

const FormSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: '#f1f5f9', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          fontWeight: 600, fontSize: '0.85rem', color: '#334155', cursor: 'pointer', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none'
        }}
      >
        <span>{isOpen ? '-' : '+'}</span>
        {title}
      </div>
      {isOpen && (
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function AddProject() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [states] = useState(['Maharashtra', 'Delhi', 'Haryana', 'Gujarat', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chattisgarh', 'Goa', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Orissa', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Tripura', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']);
  const [libraries, setLibraries] = useState([]);
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  const [statuses, setStatuses] = useState([]);

  React.useEffect(() => {
    // Fetch all master data for dropdowns
    const fetchMasterData = async () => {
      try {
        const [compRes, libRes, cat1Res, cat2Res, statRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/libraries'),
          fetch('/api/project-categories-1'),
          fetch('/api/project-categories-2'),
          fetch('/api/project-statuses')
        ]);
        
        if (compRes.ok) setCompanies(await compRes.json());
        if (libRes.ok) setLibraries(await libRes.json());
        if (cat1Res.ok) setCategories1(await cat1Res.json());
        if (cat2Res.ok) setCategories2(await cat2Res.json());
        if (statRes.ok) setStatuses(await statRes.json());
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchMasterData();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    library: '',
    state: ''
  });

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const id = searchParams?.get('id');

  React.useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/projects?id=${id}`);
        if (res.ok) {
          const project = await res.json();
          setFormData({
            id: project.id,
            name: project.name || '',
            company: project.company || '',
            library: project.library || '',
            state: project.state || '',
            category2: project.category2 || '',
            status: project.status || '',
            cost: project.cost || ''
          });
        }
      } catch (err) {
        console.error("Error fetching project", err);
      }
    };
    fetchProject();
  }, [id]);

  const handleSave = async () => {
    if (!formData.name) {
      alert("Project Name is required!");
      return;
    }
    
    const isEditing = !!formData.id;
    const projectData = {
      ...(isEditing && { id: formData.id }),
      name: formData.name,
      state: formData.state || 'Haryana',
      company: formData.company || 'CeCube Engineering',
      library: formData.library || 'Default Library',
      category1: formData.category1 || '',
      category2: formData.category2 || '',
      status: formData.status || 'Planning',
      builtUpArea: '0.0000',
      saleableArea: '0.0000',
      startDate: '01/01/2026 00:00:00',
      endDate: '01/01/2026 00:00:00',
      cost: formData.cost || '0.0000\n01/01/1900'
    };

    try {
      const res = await fetch('/api/projects', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (res.ok) {
        alert(`Project ${isEditing ? 'updated' : 'saved'} successfully!`);
        router.push('/engineering/projects/project-list');
      } else {
        const errorData = await res.json();
        alert("Error saving project: " + (errorData.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save project.");
    }
  };

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      
      {/* Top Header */}
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#0ea5e9' }}>
            <FileText size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>Project definition</h2>
        </div>
        
        <Link href="/engineering/projects/project-list">
          <button className="btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Project List
          </button>
        </Link>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        <FormSection title="Project Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Project Name" required>
              <input 
                type="text" 
                className="modern-input" 
                style={{ width: '100%', borderColor: '#818cf8' }} 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </FormGroup>
            <FormGroup label="Project Short Name">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Company" required>
              <select 
                className="modern-input modern-select" 
                style={{ width: '100%' }}
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
              >
                <option value="">- Select Company -</option>
                {companies.map(c => <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Library" required>
              <select 
                className="modern-input modern-select" 
                style={{ width: '100%' }}
                value={formData.library}
                onChange={(e) => setFormData({...formData, library: e.target.value})}
              >
                <option value="">- Select Library -</option>
                {libraries.map(l => <option key={l.id || l.name || l} value={l.name || l}>{l.name || l}</option>)}
              </select>
            </FormGroup>
            
            <FormGroup label="State" required>
              <select 
                className="modern-input modern-select" 
                style={{ width: '100%' }}
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
              >
                <option value="">- Select State -</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Job No">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Site Contact No.">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Architect">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            
            <FormGroup label="Structural Consultant">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Engineer In Charge">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Project Category 1">
              <select className="modern-input modern-select" style={{ width: '100%' }}
                value={formData.category1}
                onChange={(e) => setFormData({...formData, category1: e.target.value})}
              >
                <option value="">- Select Category 1 -</option>
                {categories1.map(c => <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Project Category 2">
              <select className="modern-input modern-select" style={{ width: '100%' }}
                value={formData.category2}
                onChange={(e) => setFormData({...formData, category2: e.target.value})}
              >
                <option value="">- Select Category 2 -</option>
                {categories2.map(c => <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>)}
              </select>
            </FormGroup>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '16px' }}>
            <FormGroup label="Project Cost">
              <textarea className="modern-input" rows={2} style={{ width: '100%', resize: 'none' }}
                value={formData.cost || ''}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
              ></textarea>
            </FormGroup>
            <FormGroup label="Project Address">
              <textarea className="modern-input" rows={2} style={{ width: '100%', resize: 'none' }}></textarea>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Project Status">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Project Completion No">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Project Completion Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
            <FormGroup label="Project Status">
              <select className="modern-input modern-select" style={{ width: '100%' }}
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="">- Select Status -</option>
                {statuses.map(s => <option key={s.id || s.name || s} value={s.name || s}>{s.name || s}</option>)}
              </select>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Legal Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Sanction No">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Sanction Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
            <FormGroup label="Start Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
            <FormGroup label="Finish Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
            
            <FormGroup label="VAT No.">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="ECC No.">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="CST No.">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Legal Address">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            
            <FormGroup label="Development Permission No">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Development Permission Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
            <FormGroup label="Permitting Authority">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="RERA Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="RERA Reg. No">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="RERA Reg. Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
            <FormGroup label="RERA End Date">
              <div style={{ position: 'relative' }}>
                <input type="text" className="modern-input" defaultValue="24/08/2026" style={{ width: '100%' }} />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Land Details (Sq. Mtr.)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Plot Area">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Builtup Area (Sq.Ft.)">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Carpet Area">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Saleable Area">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            
            <FormGroup label="FSI">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="TDR">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Legal Advisor">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Local Body">
              <select className="modern-input modern-select" style={{ width: '100%' }}>
                <option></option>
              </select>
            </FormGroup>
            
            <FormGroup label="Plot Specification">
              <input type="text" className="modern-input" style={{ width: '100%' }} />
            </FormGroup>
          </div>
        </FormSection>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingBottom: '32px' }}>
          <button 
            className="btn-primary" 
            style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleSave}
          >
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
