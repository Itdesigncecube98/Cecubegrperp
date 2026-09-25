'use client';
import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../dashboard/employee.css';
import { getDocuments, createDocument, deleteDocument } from '@/lib/data';
import { createWorker } from 'tesseract.js';
const showToast = (msg) => alert(msg);

export default function EmployeeDocuments() {
  const employeeStorage = useSyncExternalStore(() => () => {}, () => localStorage.getItem('employeeData'), () => null);
  const employee = useMemo(() => {
    if (!employeeStorage) return null;
    try { return JSON.parse(employeeStorage); } catch { return null; }
  }, [employeeStorage]);
  const [activeTab, setActiveTab] = useState('Personal'); // 'Personal', 'Company', or 'Dependent'
  const [documents, setDocuments] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    documentName: '',
    documentNumber: '',
    expiryDate: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  const loadData = async (empId, type) => {
    setLoading(true);
    try {
      const data = await getDocuments(empId, type);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast('Failed to load documents', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    // Data loading is intentionally triggered when the portal tab or employee changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (employee?.id) loadData(employee.id, activeTab);
    const savedTypes = localStorage.getItem('documentTypes');
    if (savedTypes) setDocTypes(JSON.parse(savedTypes));
  }, [activeTab, employee?.id]);

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

  const extractOcrText = async (file) => {
    const worker = await createWorker('eng');
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        const result = await worker.recognize(file);
        return result.data.text.trim();
      }

      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), disableWorker: true }).promise;
      const pageTexts = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const result = await worker.recognize(canvas);
        pageTexts.push(result.data.text.trim());
      }
      return pageTexts.filter(Boolean).join('\n\n');
    } finally {
      await worker.terminate();
    }
  };

  const extractDocumentNumber = (ocrText, documentName) => {
    const name = String(documentName || '').toLowerCase();
    const text = String(ocrText || '').replace(/\s+/g, ' ');
    if (name.includes('aadhaar') || name.includes('aadhar')) {
      const match = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
      return match ? match[0].replace(/[\s-]/g, '') : '';
    }
    if (name.includes('pan')) {
      const match = text.match(/\b[A-Z]{5}\s?\d{4}\s?[A-Z]\b/i);
      return match ? match[0].replace(/\s/g, '').toUpperCase() : '';
    }
    if (name.includes('passport')) {
      const match = text.match(/\b[A-Z][0-9]{7}\b/i);
      return match ? match[0].toUpperCase() : '';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !employee) return;

    setUploading(true);
    try {
      setOcrStatus(`Reading ${selectedFile.name}...`);
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read the selected file'));
        reader.readAsDataURL(selectedFile);
      });
      let ocrText = '';
      try {
        ocrText = await extractOcrText(selectedFile);
      } catch (ocrError) {
        console.warn('Portal OCR failed', ocrError);
      }
      const documentName = formData.documentName === 'Other' ? formData.customDocumentName : formData.documentName;
      const extractedNumber = extractDocumentNumber(ocrText, documentName);
      const payload = {
        employeeId: employee.id,
        documentType: activeTab,
        documentName,
        documentNumber: extractedNumber || formData.documentNumber,
        expiryDate: formData.expiryDate,
        fileData,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        ocrText,
      };

      const res = await createDocument(payload);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(extractedNumber ? `Document uploaded. Number detected: ${extractedNumber}` : 'Document uploaded successfully');
        setShowModal(false);
        setFormData({ documentName: '', customDocumentName: '', documentNumber: '', expiryDate: '' });
        setSelectedFile(null);
        loadData(employee.id, activeTab);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to upload', 'error');
    } finally {
      setUploading(false);
      setOcrStatus('');
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
        loadData(employee.id, activeTab);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete', 'error');
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

  if (!employee) return <div style={{padding:'2rem'}}>Loading...</div>;

  return (
    <div className="employee-container" style={{ padding: '2rem' }}>
      <Link href="/employee/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: '500' }}>
        <ChevronLeft size={18} /> Back to Dashboard
      </Link>
      
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', margin: '0' }}>My Documents</h2>
            <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0' }}>Manage your personal and company documents securely.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
          >
            Upload {activeTab} Document
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setActiveTab('Personal')}
            style={{ 
              padding: '0.5rem 1rem', 
              border: 'none', 
              background: activeTab === 'Personal' ? '#eff6ff' : 'transparent', 
              color: activeTab === 'Personal' ? '#2563eb' : '#6b7280',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Personal Documents
          </button>
          <button 
            onClick={() => setActiveTab('Company')}
            style={{ 
              padding: '0.5rem 1rem', 
              border: 'none', 
              background: activeTab === 'Company' ? '#eff6ff' : 'transparent', 
              color: activeTab === 'Company' ? '#2563eb' : '#6b7280',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Company Documents
          </button>
          <button 
            onClick={() => setActiveTab('Dependent')}
            style={{ 
              padding: '0.5rem 1rem', 
              border: 'none', 
              background: activeTab === 'Dependent' ? '#eff6ff' : 'transparent', 
              color: activeTab === 'Dependent' ? '#2563eb' : '#6b7280',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Dependent Documents
          </button>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', color: '#374151', fontWeight: '600' }}>DOCUMENT NAME</th>
                  <th style={{ padding: '1rem', color: '#374151', fontWeight: '600' }}>DOCUMENT NUMBER</th>
                  <th style={{ padding: '1rem', color: '#374151', fontWeight: '600' }}>EXPIRY DATE</th>
                  <th style={{ padding: '1rem', color: '#374151', fontWeight: '600' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      No {activeTab.toLowerCase()} documents found.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{doc.documentName}</td>
                      <td style={{ padding: '1rem' }}>{doc.documentNumber || '-'}</td>
                      <td style={{ padding: '1rem' }}>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button onClick={() => handleView(doc.id, doc.fileName)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}>
                            View
                          </button>
                          <button onClick={() => handleDelete(doc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '500' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !uploading && setShowModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Upload {activeTab} Document</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Document Name/Type *</label>
                <select 
                  required 
                  value={formData.documentName} 
                  onChange={e => setFormData({...formData, documentName: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  disabled={uploading}
                >
                  <option value="">Select Document</option>
                  {docTypes
                    .filter(d => d.uploadInPortal && (
                      activeTab === 'Personal' ? d.scope === 'Individual' : 
                      activeTab === 'Company' ? d.scope === 'Company' : true
                    ))
                    .map(d => (
                    <option key={d.id} value={d.type}>{d.type}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.documentName === 'Other' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Custom Document Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter document name"
                    value={formData.customDocumentName || ''} 
                    onChange={e => setFormData({...formData, customDocumentName: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    disabled={uploading}
                  />
                </div>
              )}
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Document Number</label>
                <input 
                  type="text" 
                  value={formData.documentNumber} 
                  onChange={e => setFormData({...formData, documentNumber: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  disabled={uploading}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Expiry Date</label>
                <input 
                  type="date" 
                  value={formData.expiryDate} 
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  disabled={uploading}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>File (Max 2MB) *</label>
                <input 
                  type="file" 
                  required 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
                {ocrStatus && <div style={{ marginTop: '0.5rem', color: '#2563eb', fontSize: '0.85rem' }}>{ocrStatus}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={uploading} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={uploading} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
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
