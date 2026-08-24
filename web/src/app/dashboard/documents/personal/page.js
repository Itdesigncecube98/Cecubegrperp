'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import Dialog from '@/components/Dialog';
import '../documents.css';
import { getDocuments, createDocument, deleteDocument, getEmployees } from '@/lib/data';
const showToast = (msg) => alert(msg);

export default function PersonalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, documentId: null });
  
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
    const savedTypes = localStorage.getItem('documentTypes');
    if (savedTypes) {
      setDocTypes(JSON.parse(savedTypes));
    }
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
          setFormData({ employeeId: '', documentName: '', customDocumentName: '', documentNumber: '', expiryDate: '' });
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

  const confirmDelete = async () => {
    if (!deleteDialog.documentId) return;
    try {
      const res = await deleteDocument(deleteDialog.documentId);
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
    setDeleteDialog({ isOpen: false, documentId: null });
  };

  const handleDelete = (id) => {
    setDeleteDialog({ isOpen: true, documentId: id });
  };

  const handleView = async (id, fileName) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

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
          <h1 className="pageTitle">Personal Documents</h1>
          <p className="pageSubtitle">Manage personal documents for employees</p>
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
              <h3>Upload Personal Document</h3>
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
                <label>Document Name (Type) *</label>
                <select 
                  className="modernInput"
                  required 
                  value={formData.documentName} 
                  onChange={(e) => setFormData({...formData, documentName: e.target.value})}
                  disabled={uploading}
                >
                  <option value="">Select Document Name</option>
                  {docTypes
                    .filter(d => d.scope === 'Individual')
                    .map(d => (
                    <option key={d.id} value={d.type}>{d.type}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              {formData.documentName === 'Other' && (
                <div className="formGroup">
                  <label>Custom Document Name *</label>
                  <input 
                    className="modernInput"
                    type="text" 
                    required 
                    value={formData.customDocumentName || ''} 
                    onChange={(e) => setFormData({...formData, customDocumentName: e.target.value})}
                    disabled={uploading}
                    placeholder="Enter document name"
                  />
                </div>
              )}
              <div className="formGroup">
                <label>Document Number</label>
                <input 
                  className="modernInput"
                  type="text" 
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
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
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

      <Dialog 
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, documentId: null })}
      />
    </div>
  );
}
