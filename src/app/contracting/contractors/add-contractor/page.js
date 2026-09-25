'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Home, ChevronRight, Save, ArrowLeft, User, Phone, MapPin, FileText
} from 'lucide-react';
import '../../contracting.css';

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
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

function AddContractorForm() {
  const router = useRouter();
  const [groups] = useState([
    'Water Tanker Supplier', 'Heavy Vehicle Rental Service Provider', 
    'Electrical Work Contractor', 'Calibration & Testing', 
    'Air-conditioning Services', 'VFD AMC and Servicing', 
    'Building Maintenance', 'Misc. Services', 'Solar Service', 
    'Civil Contractor', 'CCTV PA & FA'
  ]);
  const [statuses] = useState(['Regular', 'Inactive', 'Blacklisted']);

  const [formData, setFormData] = useState({
    name: '',
    group: '',
    phone: '',
    mobile: '',
    pan: '',
    status: 'Regular',
    email: '',
    address: '',
    address: '',
    gst: ''
  });
  
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  React.useEffect(() => {
    if (id) {
      fetch(`/api/contractors/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setFormData({
              name: data.companyName || '',
              group: '', // Not in DB currently
              phone: data.phone || '',
              mobile: data.phone || '',
              pan: data.panNumber || '',
              status: data.status || 'Regular',
              email: data.email || '',
              address: data.address || '',
              gst: data.gstNumber || ''
            });
          }
        })
        .catch(err => console.error('Error fetching contractor:', err));
    }
  }, [id]);

  const handleSave = async () => {
    if (!formData.name) {
      alert("Contractor Name is required!");
      return;
    }
    
    try {
      const url = id ? `/api/contractors/${id}` : '/api/contractors';
      const method = id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: formData.name,
          email: formData.email,
          phone: formData.mobile || formData.phone,
          address: formData.address,
          gstNumber: formData.gst,
          panNumber: formData.pan,
          status: formData.status
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${id ? 'update' : 'add'} contractor`);
      }

      alert(`Contractor ${id ? 'Updated' : 'Saved'} Successfully!`);
      router.push('/contracting/contractors/contractor-list');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="contracting-container">
      
      {/* Top Header */}
      <div className="contracting-header" style={{ background: 'white', padding: '16px 24px' }}>
        <div className="contracting-header-title" style={{ fontSize: '1.25rem' }}>
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#17a2b8' }}>
            <User size={20} />
          </div>
          Add / Edit Contractor
        </div>
        
        <Link href="/contracting/contractors/contractor-list">
          <button className="btn-cyan">
            <ArrowLeft size={16} /> Back to List
          </button>
        </Link>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        <FormSection title="Basic Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <FormGroup label="Contractor Name" required>
              <input 
                type="text" 
                className="contracting-input" 
                style={{ width: '100%', borderColor: '#818cf8', padding: '10px' }} 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </FormGroup>
            <FormGroup label="Group" required>
              <select 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }}
                value={formData.group}
                onChange={(e) => setFormData({...formData, group: e.target.value})}
              >
                <option value="">- Select Group -</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Status" required>
              <select 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }}
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="">- Select Status -</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Contact Information">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <FormGroup label="Phone No">
              <input 
                type="text" 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </FormGroup>
            <FormGroup label="Mobile No" required>
              <input 
                type="text" 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
              />
            </FormGroup>
            <FormGroup label="Email Address">
              <input 
                type="email" 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </FormGroup>
            <div style={{ gridColumn: 'span 3' }}>
              <FormGroup label="Full Address">
                <textarea 
                  className="contracting-input" 
                  style={{ width: '100%', padding: '10px', height: '80px', resize: 'vertical' }} 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                ></textarea>
              </FormGroup>
            </div>
          </div>
        </FormSection>

        <FormSection title="Legal & Tax Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <FormGroup label="PAN / PIN No" required>
              <input 
                type="text" 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={formData.pan}
                onChange={(e) => setFormData({...formData, pan: e.target.value})}
              />
            </FormGroup>
            <FormGroup label="GST No">
              <input 
                type="text" 
                className="contracting-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={formData.gst}
                onChange={(e) => setFormData({...formData, gst: e.target.value})}
              />
            </FormGroup>
            <FormGroup label="TDS Category">
              <select className="contracting-input" style={{ width: '100%', padding: '10px' }}>
                <option>- Select -</option>
                <option>Company</option>
                <option>Individual/HUF</option>
              </select>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Statutory Details" defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <FormGroup label="LBT No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="ST No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Nature Of Service (Category)"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Type Of Service (Classification)"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="ServiceTaxExemption Availed">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="ST Notification/Serial No"><input type="text" className="contracting-input" style={{ width: '100%', background: '#e9ecef' }} disabled /></FormGroup>
            <FormGroup label="Service Tax Assesse No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Premises/ECC Code No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="Excise Commisionarate And Division"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="ESIC No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Labour Welfare No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="PTRC No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="PTEC No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Firm Type">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Contractor labour Licence No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="BOCW Reg No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="Organization Type">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Category" defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <FormGroup label="Library">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Category">
              <select className="contracting-input" style={{ width: '100%' }}><option>Select Labour Category here</option></select>
            </FormGroup>
          </div>
        </FormSection>

        <FormSection title="Remark" defaultOpen={false}>
          <table className="contracting-table" style={{ marginTop: '8px' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Remark type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="2" style={{ textAlign: 'left', color: '#999', padding: '12px' }}>Data not available</td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <FormSection title="Account Mapping" defaultOpen={false}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
            <FormGroup label="Account Name">
              <input type="text" className="contracting-input" value={formData.name} disabled style={{ background: '#e9ecef', minWidth: '250px' }} />
            </FormGroup>
            <FormGroup label="Fixed Group">
              <select className="contracting-input" style={{ minWidth: '250px' }}><option>Sundry Creditors</option></select>
            </FormGroup>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
              <input type="checkbox" id="applyAll" style={{ marginRight: '8px' }} />
              <label htmlFor="applyAll" style={{ fontSize: '0.85rem' }}>Apply All</label>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="contracting-table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                  <th>Company Name</th>
                  <th>Group</th>
                  <th>Fixed Group</th>
                  <th>Account</th>
                  <th>Retention Group</th>
                  <th>Retention Account</th>
                  <th>TDS Account</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" defaultChecked /></td>
                  <td>CeCube Engineering India Private Limited</td>
                  <td><select className="contracting-input" style={{ width: '100%' }}><option>Labour Contractors</option></select></td>
                  <td>Sundry Creditors</td>
                  <td>Parveen Kumar_HWKPK5771D</td>
                  <td><select className="contracting-input" style={{ width: '100%' }}><option>Labour Contractors</option></select></td>
                  <td>Parveen Kumar_HWKPK5771D</td>
                  <td><select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select></td>
                </tr>
                {[ 'MEP Engineering & Traders', 'Rays Marketing', 'test', 'test 1 co.', 'TEST COMPANY', 'VR Eminent Infrastructure'].map(company => (
                  <tr key={company}>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                    <td>{company}</td>
                    <td><select className="contracting-input" style={{ width: '100%' }}><option>Select</option></select></td>
                    <td></td>
                    <td></td>
                    <td><select className="contracting-input" style={{ width: '100%' }}><option>--Select--</option></select></td>
                    <td></td>
                    <td><select className="contracting-input" style={{ width: '100%' }}><option>--Select--</option></select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormSection>

        <FormSection title="Document Upload" defaultOpen={false}>
          <div style={{ maxWidth: '400px' }}>
            <FormGroup label="Document Type">
              <select className="contracting-input" style={{ width: '100%' }}><option>Contractor</option></select>
            </FormGroup>
            
            <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
              No Document Found!!
            </div>
            
            <button style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              background: '#e2e8f0', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '24px', 
              width: '150px', cursor: 'pointer', color: '#475569'
            }}>
              <FileText size={32} style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>UPLOAD DOCUMENT</span>
            </button>
          </div>
        </FormSection>

        <FormSection title="Bank Details" defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <FormGroup label="Bank Name">
              <input type="text" className="contracting-input" style={{ width: '100%', padding: '10px' }} />
            </FormGroup>
            <FormGroup label="Branch Name">
              <input type="text" className="contracting-input" style={{ width: '100%', padding: '10px' }} />
            </FormGroup>
            <FormGroup label="Account No">
              <input type="text" className="contracting-input" style={{ width: '100%', padding: '10px' }} />
            </FormGroup>
            <FormGroup label="IFSC Code">
              <input type="text" className="contracting-input" style={{ width: '100%', padding: '10px' }} />
            </FormGroup>
          </div>
        </FormSection>

        <div style={{ padding: '24px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-cyan" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => router.push('/contracting/contractors/contractor-list')}>
            Cancel
          </button>
          <button className="btn-cyan" onClick={handleSave}>
            <Save size={16} /> Save Contractor
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddContractor() {
  return (
    <Suspense fallback={<div style={{ padding: '20px' }}>Loading...</div>}>
      <AddContractorForm />
    </Suspense>
  );
}
