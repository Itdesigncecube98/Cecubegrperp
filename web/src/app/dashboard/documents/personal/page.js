'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';
import { getDocuments, createDocument, deleteDocument, getEmployees } from '@/lib/data';
const showToast = (msg) => alert(msg);

export default function PersonalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    documentName: '',
    documentNumber: '',
    expiryDate: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, empsData] = await Promise.all([
        getDocuments('', 'Personal'),
        getEmployees()
      ]);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setEmployees(Array.isArray(empsData) ? empsData : []);
    } catch (error) {
      console.error(error);
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('File size must be less than 2MB', 'error');
        e.target.value = null;
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a file', 'error');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64Data = reader.result;
        
        const payload = {
          employeeId: formData.employeeId,
          documentType: 'Personal',
          documentName: formData.documentName,
          documentNumber: formData.documentNumber,
          expiryDate: formData.expiryDate,
          fileData: base64Data,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        };

        const res = await createDocument(payload);
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          showToast('Document uploaded successfully');
          setShowModal(false);
          setFormData({ employeeId: '', documentName: '', documentNumber: '', expiryDate: '' });
          setSelectedFile(null);
          loadData();
        }
        setUploading(false);
      };
    } catch (err) {
      console.error(err);
      showToast('Failed to upload document', 'error');
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await deleteDocument(id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Document deleted');
        loadData();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete document', 'error');
    }
  };

  const handleView = async (id, fileName) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Create a temporary link to download/view the file
      const a = document.createElement('a');
      a.href = data.fileData;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      showToast('Failed to download document', 'error');
    }
  };

  const getDaysUntilExpiry = (expiryStr) => {
    if (!expiryStr) return 'N/A';
    const expiry = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="filterActions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btnPrimary" onClick={() => setShowModal(true)}>Add Document</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Employee Personal Documents</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of your Personal Documents.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <table className="dataTable">
              <thead>
                <tr>
                  <th>EMPLOYEE CODE</th>
                  <th>EMPLOYEE NAME</th>
                  <th>DOCUMENT NAME</th>
                  <th>DOCUMENT NUMBER</th>
                  <th>EXPIRY DATE</th>
                  <th>EXPIRES IN (DAYS)</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const daysLeft = getDaysUntilExpiry(doc.expiryDate);
                    return (
                      <tr key={doc.id}>
                        <td>{doc.employee?.empId || '-'}</td>
                        <td style={{ fontWeight: '600' }}>{doc.employee?.name || 'Unknown'}</td>
                        <td>{doc.documentName}</td>
                        <td>{doc.documentNumber || '-'}</td>
                        <td>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}</td>
                        <td>
                          {daysLeft === 'N/A' ? '-' : (
                            <span style={{ color: daysLeft < 30 ? '#dc2626' : (daysLeft < 90 ? '#d97706' : 'inherit') }}>
                              {daysLeft}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="icon-btn" onClick={() => handleView(doc.id, doc.fileName)} title="Download / View" style={{color: '#3b82f6'}}>
                              View
                            </button>
                            <button className="icon-btn" onClick={() => handleDelete(doc.id)} title="Delete" style={{color: '#ef4444'}}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modalOverlay" onClick={() => !uploading && setShowModal(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modalHeader">
              <h3>Upload Personal Document</h3>
              <button className="closeBtn" onClick={() => !uploading && setShowModal(false)} disabled={uploading}>&times;</button>
            </div>
            <form className="modalBody" onSubmit={handleSubmit}>
              <div className="formGroup">
                <label>Employee *</label>
                <select 
                  required 
                  value={formData.employeeId} 
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  disabled={uploading}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.empId || 'No ID'})</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Document Name (Type) *</label>
                <select 
                  required 
                  value={formData.documentName} 
                  onChange={(e) => setFormData({...formData, documentName: e.target.value})}
                  disabled={uploading}
                >
                  <option value="">Select Document Name</option>
                  <option value="Aadhar Card">Aadhar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Document Number</label>
                <input 
                  type="text" 
                  value={formData.documentNumber} 
                  onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                  disabled={uploading}
                />
              </div>
              <div className="formGroup">
                <label>Expiry Date</label>
                <input 
                  type="date" 
                  value={formData.expiryDate} 
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  disabled={uploading}
                />
              </div>
              <div className="formGroup">
                <label>File (Max 2MB) *</label>
                <input 
                  type="file" 
                  required 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>
              <div className="modalFooter">
                <button type="button" className="btn btnSecondary" onClick={() => setShowModal(false)} disabled={uploading}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
