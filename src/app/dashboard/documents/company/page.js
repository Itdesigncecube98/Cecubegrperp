'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../documents.css';
import { getDocuments, createDocument, deleteDocument, getEmployees } from '@/lib/data';
const showToast = (msg) => alert(msg);

export default function CompanyDocuments() {
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
        getDocuments('', 'Company'),
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
          documentType: 'Company',
          documentName: formData.documentName === 'Other' ? formData.customDocumentName : formData.documentName,
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
          setFormData({ employeeId: '', documentName: '', customDocumentName: '', documentNumber: '', expiryDate: '', dependentName: '', dependentRelation: '' });
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
    if (!window.confirm('Are you sure you want to delete this company document?')) return;
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
      // Create a Blob URL to open the file in a new tab for viewing
      const response = await fetch(data.fileData);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Clean up the object URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.error(err);
      showToast('Failed to view document', 'error');
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
    <div className="docsContainer">
      <div className="docsHeader">
        <div>
          <Link href="/dashboard" className="backLink">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="pageTitle">Company Documents</h1>
          <p className="pageSubtitle">Manage company-wide documents for employees</p>
        </div>
        <button className="primaryBtn" onClick={() => setShowModal(true)}>
          + Add Document
        </button>
      </div>

      <div className="modernCard">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <table className="modernTable">
              <thead>
                <tr>
                  <th>EMPLOYEE CODE</th>
                  <th>EMPLOYEE NAME</th>
                  <th>DOCUMENT NAME</th>
                  <th>DOCUMENT NUMBER</th>
                  <th>EXPIRY DATE</th>
                  <th>EXPIRES IN</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No company documents found</td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const daysLeft = getDaysUntilExpiry(doc.expiryDate);
                    return (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 600 }}>{doc.employee?.empId || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{doc.employee?.name || 'Unknown'}</td>
                        <td>{doc.documentName}</td>
                        <td style={{ color: '#64748b' }}>{doc.documentNumber || '-'}</td>
                        <td>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}</td>
                        <td>
                          {daysLeft === 'N/A' ? '-' : (
                            <span className={`statusBadge ${daysLeft < 30 ? 'danger' : (daysLeft < 90 ? 'warning' : 'success')}`}>
                              {daysLeft} days
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="actionBtn view" onClick={() => handleView(doc.id, doc.fileName)} title="Download / View">
                              View
                            </button>
                            <button className="actionBtn delete" onClick={() => handleDelete(doc.id)} title="Delete">
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
        <div className="modernModalOverlay" onClick={() => !uploading && setShowModal(false)}>
          <div className="modernModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Upload Company Document</h3>
              <button className="closeBtn" onClick={() => !uploading && setShowModal(false)} disabled={uploading}>&times;</button>
            </div>
            <form className="modalBody" onSubmit={handleSubmit}>
              <div className="formGroup">
                <label>Employee *</label>
                <select 
                  className="modernInput"
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
                <label>Document Name / Title *</label>
                <input 
                  className="modernInput"
                  type="text" 
                  placeholder="e.g. Offer Letter, Relieving Letter"
                  required 
                  value={formData.documentName} 
                  onChange={(e) => setFormData({...formData, documentName: e.target.value})}
                  disabled={uploading}
                />
              </div>
              <div className="formGroup">
                <label>Document Number</label>
                <input 
                  className="modernInput"
                  type="text" 
                  placeholder="Leave blank if N/A"
                  value={formData.documentNumber} 
                  onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                  disabled={uploading}
                />
              </div>
              <div className="formGroup">
                <label>Expiry Date</label>
                <input 
                  className="modernInput"
                  type="date" 
                  value={formData.expiryDate} 
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  disabled={uploading}
                />
              </div>
              <div className="formGroup">
                <label>File (Max 2MB) *</label>
                <input 
                  className="modernInput"
                  type="file" 
                  required 
                  onChange={handleFileChange}
                  disabled={uploading}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="actionBtn" onClick={() => setShowModal(false)} disabled={uploading} style={{ flex: 1, padding: '12px' }}>
                  Cancel
                </button>
                <button type="submit" className="primaryBtn" disabled={uploading} style={{ flex: 1, justifyContent: 'center' }}>
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
