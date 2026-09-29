'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Save, Send, Download, Plus, Trash2, Edit2, FileIcon, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import Dialog from '@/components/Dialog';

export default function EmployeeDocGenerator() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [tableData, setTableData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState(null);
  
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

  const printRef = useRef(null);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      setEmployee(JSON.parse(empData));
    }

    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/doc-generator/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (err) {
        console.error('Failed to fetch document templates', err);
      }
    };
    fetchTemplates();

    loadSubmissions();
  }, []);

  const loadSubmissions = () => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) return;
    const emp = JSON.parse(empData);

    const savedSubmissions = localStorage.getItem('docGenerator_submissions');
    if (savedSubmissions) {
      const allSubs = JSON.parse(savedSubmissions);
      setSubmissions(allSubs.filter(s => s.employeeId === emp.id));
    }
  };

  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    setIsEditing(true);
    setEditingSubmissionId(null);
    
    const initialData = {};
    tmpl.fields?.forEach(f => {
      initialData[f.name] = '';
    });
    if (employee) {
      Object.keys(initialData).forEach(key => {
        const lower = key.toLowerCase();
        if (lower.includes('name')) initialData[key] = employee.name;
        else if (lower.includes('designation')) initialData[key] = employee.designation;
        else if (lower.includes('department')) initialData[key] = employee.department;
        else if (lower.includes('code')) initialData[key] = employee.empId;
      });
    }
    setFormData(initialData);
    
    if (tmpl.tableColumns && tmpl.tableColumns.length > 0) {
      const emptyRow = { id: Date.now() };
      tmpl.tableColumns.forEach(c => emptyRow[c.name] = '');
      setTableData([emptyRow]);
    } else {
      setTableData([]);
    }
  };

  const editSubmission = (sub) => {
    const tmpl = templates.find(t => t.id === sub.templateId);
    if (!tmpl) {
      setDialogConfig({ isOpen: true, type: 'info', title: 'Error', message: 'Original template not found.', onConfirm: null });
      return;
    }
    setSelectedTemplate(tmpl);
    setFormData(sub.formData);
    setTableData(sub.tableData);
    setEditingSubmissionId(sub.id);
    setIsEditing(true);
  };

  const deleteSubmission = (id) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Draft',
      message: 'Are you sure you want to delete this draft?',
      onConfirm: () => {
        const savedSubmissions = localStorage.getItem('docGenerator_submissions');
        if (savedSubmissions) {
          const allSubs = JSON.parse(savedSubmissions);
          const updated = allSubs.filter(s => s.id !== id);
          localStorage.setItem('docGenerator_submissions', JSON.stringify(updated));
          loadSubmissions();
        }
      }
    });
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addTableRow = () => {
    const emptyRow = { id: Date.now() };
    selectedTemplate.tableColumns.forEach(c => emptyRow[c.name] = '');
    setTableData([...tableData, emptyRow]);
  };

  const removeTableRow = (id) => {
    setTableData(tableData.filter(r => r.id !== id));
  };

  const handleTableCellChange = (rowId, colName, value) => {
    setTableData(tableData.map(r => r.id === rowId ? { ...r, [colName]: value } : r));
  };

  const saveDocument = (isSubmit = false) => {
    if (isSubmit && !formData._certified) {
      setDialogConfig({ isOpen: true, type: 'info', title: 'Action Required', message: 'Please check the certification box to agree to the Employee Declaration before submitting.', onConfirm: null });
      return;
    }
    if (isSubmit) {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: 'Submit Document',
        message: 'Are you sure you want to submit this document? It will go to your supervisor for approval.',
        onConfirm: () => performSave(true)
      });
      return;
    }

    performSave(false);
  };

  const performSave = (isSubmit) => {
    const allSubs = JSON.parse(localStorage.getItem('docGenerator_submissions') || '[]');
    
    const newSub = {
      id: editingSubmissionId || Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.formName,
      templateDescription: selectedTemplate.description,
      formData,
      tableData,
      status: isSubmit ? 'PENDING_SUPERVISOR' : 'DRAFT',
      createdAt: new Date().toISOString()
    };

    let updated;
    if (editingSubmissionId) {
      updated = allSubs.map(s => s.id === editingSubmissionId ? newSub : s);
    } else {
      updated = [...allSubs, newSub];
    }

    localStorage.setItem('docGenerator_submissions', JSON.stringify(updated));
    setDialogConfig({ isOpen: true, type: 'info', title: 'Success', message: isSubmit ? 'Document submitted successfully!' : 'Draft saved successfully!', onConfirm: null });
    setIsEditing(false);
    loadSubmissions();
  };

  const exportPDF = async (sub) => {
    const origin = window.location.origin;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; color: black; background: white; width: 800px; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Header Section -->
        <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 20px; border-bottom: 2px dashed #94a3b8; padding-bottom: 20px;">
          <img src="${origin}/logo.png" style="height: 60px; object-fit: contain; margin-right: 20px;" crossorigin="anonymous" />
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h1 style="font-size: 22px; font-weight: bold; margin: 0; color: #1e3a8a;">CeCube Engineering India Pvt. Ltd.</h1>
            <h2 style="font-size: 18px; font-weight: bold; margin: 0; color: #1e3a8a;">CeCube Green Energy Pvt. Ltd.</h2>
          </div>
        </div>

        <!-- Form Title -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${sub.templateName}</h3>
        </div>
        
        <!-- Static Fields Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          ${Object.entries(sub.formData).filter(([k]) => k !== '_certified').map(([k, v]) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #000; font-weight: bold; width: 40%;">${k}</td>
              <td style="padding: 8px; border: 1px solid #000;">${v || '-'}</td>
            </tr>
          `).join('')}
        </table>
        
        <!-- Description -->
        ${sub.templateDescription ? `
          <div style="margin-bottom: 20px; font-size: 12px; line-height: 1.5; font-family: inherit;">
            ${sub.templateDescription}
          </div>
        ` : ''}
        
        <!-- Dynamic Table -->
        ${sub.tableData && sub.tableData.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <thead>
              <tr>
                ${Object.keys(sub.tableData[0]).filter(k => k !== 'id').map(k => `
                  <th style="padding: 8px; border: 1px solid #000; background: #e0f2fe; text-align: left;">${k}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${sub.tableData.map(row => `
                <tr>
                  ${Object.entries(row).filter(([k]) => k !== 'id').map(([_, v]) => `
                    <td style="padding: 8px; border: 1px solid #000;">${v || '-'}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        <!-- Employee Declaration -->
        <div style="margin-bottom: 30px; font-size: 13px; line-height: 1.5;">
          <strong>Employee Declaration</strong><br/>
          I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.
          <div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div>Employee Signature: ______________________</div>
            <div>Place: ______________________</div>
            <div>Date: ______________________</div>
          </div>
        </div>
        
        <!-- Approval Workflow -->
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Approval Workflow</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
          <thead>
            <tr>
              <th style="padding: 8px; border: 1px solid #000; text-align: left; width: 33%;">Reporting Manager</th>
              <th style="padding: 8px; border: 1px solid #000; text-align: left; width: 33%;">HR Verification</th>
              <th style="padding: 8px; border: 1px solid #000; text-align: left; width: 33%;">Accounts Processing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #000; vertical-align: top; height: 100px;">
                <div style="margin-bottom: 15px;">
                  <span style="margin-right: 15px;">&#9744; Approved</span>
                  <span>&#9744; Not Approved</span>
                </div>
                <div style="line-height: 1.8;">
                  Name:<br/>
                  Designation:<br/>
                  Signature:<br/>
                  Date:
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #000; vertical-align: top;">
                <div style="margin-bottom: 15px; line-height: 1.8;">
                  &#9744; Eligibility Verified<br/>
                  &#9744; Policy Compliance Checked
                </div>
                <div style="line-height: 1.8;">
                  Verified By:<br/>
                  Signature:<br/>
                  Date:
                </div>
              </td>
              <td style="padding: 8px; border: 1px solid #000; vertical-align: top;">
                <div style="margin-bottom: 15px;">
                  &#9744; Processed for the Month of ______
                </div>
                <div style="line-height: 1.8;">
                  Processed By:<br/>
                  Signature:<br/>
                  Date:
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Important Notes -->
        <div style="font-size: 12px; line-height: 1.5;">
          <strong>Important Notes</strong>
          <ol style="margin-top: 5px; padding-left: 15px; margin-bottom: 0;">
            <li>Claim must be submitted on monthly basis.</li>
            <li>Supporting bills / invoices must be attached to this form wherever applicable.</li>
            <li>Reimbursements shall be processed subject to approval from Reporting Manager / Project Head.</li>
            <li>Incomplete forms or unsupported claims may be kept on hold.</li>
            <li>Company reserves the right to verify deployment details before processing reimbursement.</li>
          </ol>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${sub.templateName.replace(/\s+/g, '_')}_${sub.employeeName}.pdf`);
    } catch (err) {
      console.error(err);
      setDialogConfig({ isOpen: true, type: 'info', title: 'Error', message: 'Failed to generate PDF', onConfirm: null });
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const exportDOCX = async (sub) => {
    try {
      const response = await fetch('/logo.png');
      const blobLogo = await response.blob();
      const arrayBuffer = await blobLogo.arrayBuffer();

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new ImageRun({
                              data: arrayBuffer,
                              transformation: {
                                width: 80,
                                height: 80,
                              },
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 80, type: WidthType.PERCENTAGE },
                      verticalAlign: "center",
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "CeCube Engineering India Pvt. Ltd.", bold: true, size: 28, color: "1e3a8a" }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({ text: "CeCube Green Energy Pvt. Ltd.", bold: true, size: 24, color: "1e3a8a" }),
                          ],
                          alignment: AlignmentType.CENTER,
                          spacing: { after: 200 },
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          new Paragraph({
            children: [
              new TextRun({ text: sub.templateName.toUpperCase(), bold: true, size: 24 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          // Static Fields Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: Object.entries(sub.formData).filter(([k]) => k !== '_certified').map(([k, v]) => 
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: String(v || '-') })], width: { size: 60, type: WidthType.PERCENTAGE } }),
                ]
              })
            ),
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          // Description
          ...(sub.templateDescription ? [
            new Paragraph({ text: sub.templateDescription.replace(/<[^>]*>?/gm, ''), spacing: { after: 400 } })
          ] : []),
          // Dynamic Table
          ...(sub.tableData && sub.tableData.length > 0 ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: Object.keys(sub.tableData[0]).filter(k => k !== 'id').map(k => 
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })] })
                  )
                }),
                ...sub.tableData.map(row => 
                  new TableRow({
                    children: Object.entries(row).filter(([k]) => k !== 'id').map(([_, v]) => 
                      new TableCell({ children: [new Paragraph({ text: String(v || '-') })] })
                    )
                  })
                )
              ]
            })
          ] : []),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "Employee Declaration", bold: true }),
            ],
          }),
          new Paragraph({
            text: "I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.",
            spacing: { after: 400 },
          }),
          new Paragraph({ text: "Employee Signature: ______________________      Place: ______________________      Date: ______________________", spacing: { after: 400 } }),
          
          // Approval Workflow
          new Paragraph({
            children: [
              new TextRun({ text: "Approval Workflow", bold: true }),
            ],
            spacing: { after: 200 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Reporting Manager", bold: true })] })], width: { size: 33, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "HR Verification", bold: true })] })], width: { size: 33, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Accounts Processing", bold: true })] })], width: { size: 33, type: WidthType.PERCENTAGE } }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ text: "☐ Approved    ☐ Not Approved", spacing: { after: 200 } }),
                      new Paragraph({ text: "Name:" }),
                      new Paragraph({ text: "Designation:" }),
                      new Paragraph({ text: "Signature:" }),
                      new Paragraph({ text: "Date:" }),
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: "☐ Eligibility Verified" }),
                      new Paragraph({ text: "☐ Policy Compliance Checked", spacing: { after: 200 } }),
                      new Paragraph({ text: "Verified By:" }),
                      new Paragraph({ text: "Signature:" }),
                      new Paragraph({ text: "Date:" }),
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: "☐ Processed for the Month of ______", spacing: { after: 200 } }),
                      new Paragraph({ text: "Processed By:" }),
                      new Paragraph({ text: "Signature:" }),
                      new Paragraph({ text: "Date:" }),
                    ]
                  }),
                ]
              }),
            ]
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // Important Notes
          new Paragraph({
            children: [
              new TextRun({ text: "Important Notes", bold: true }),
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({ text: "1. Claim must be submitted on monthly basis." }),
          new Paragraph({ text: "2. Supporting bills / invoices must be attached to this form wherever applicable." }),
          new Paragraph({ text: "3. Reimbursements shall be processed subject to approval from Reporting Manager / Project Head." }),
          new Paragraph({ text: "4. Incomplete forms or unsupported claims may be kept on hold." }),
          new Paragraph({ text: "5. Company reserves the right to verify deployment details before processing reimbursement." }),
        ],
      }],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${sub.templateName.replace(/\\s+/g, '_')}_${sub.employeeName}.docx`);
    }).catch(err => {
      console.error(err);
      setDialogConfig({ isOpen: true, type: 'info', title: 'Error', message: 'Failed to generate DOCX', onConfirm: null });
    });
    } catch (error) {
      console.error(error);
      setDialogConfig({ isOpen: true, type: 'info', title: 'Error', message: 'Failed to fetch logo for DOCX', onConfirm: null });
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', 
    borderRadius: '6px', fontSize: '14px', outline: 'none'
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.push('/employee/dashboard')}
          style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={20} color="#475569" />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>My Applications</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Create and track your document requests.</p>
        </div>
      </div>

      {!isEditing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          {/* Templates Sidebar */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Available Forms</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.length === 0 && <p style={{ fontSize: '13px', color: '#64748b' }}>No forms available.</p>}
              {templates.map(tmpl => (
                <button 
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                >
                  <FileText size={20} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{tmpl.formName}</div>
                    <div 
                      style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: tmpl.description }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submissions List */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Form Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{sub.templateName}</td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>{new Date(sub.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: sub.status === 'DRAFT' ? '#f1f5f9' : sub.status === 'APPROVED' ? '#dcfce7' : '#fef9c3',
                        color: sub.status === 'DRAFT' ? '#475569' : sub.status === 'APPROVED' ? '#166534' : '#854d0e'
                      }}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {sub.status === 'DRAFT' && (
                          <>
                            <button onClick={() => editSubmission(sub)} style={{ padding: '6px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', borderRadius: '6px', cursor: 'pointer' }} title="Edit Draft">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteSubmission(sub.id)} style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }} title="Delete Draft">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <button onClick={() => exportPDF(sub)} style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }} title="Download PDF">
                          <Download size={16} /> PDF
                        </button>
                        <button onClick={() => exportDOCX(sub)} style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }} title="Download DOCX">
                          <FileIcon size={16} /> DOCX
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      You haven't submitted any applications yet. Select a form from the left to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
              {selectedTemplate.formName}
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => saveDocument(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <Save size={16} /> Save Draft
              </button>
              <button onClick={() => saveDocument(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <Send size={16} /> Submit
              </button>
            </div>
          </div>
          
          <div style={{ padding: '32px' }}>
            {/* Static Fields */}
            {selectedTemplate.fields?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {selectedTemplate.fields.map(field => (
                  <div key={field.id} style={{ gridColumn: field.width === 'full' ? 'span 2' : 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>{field.name}</label>
                    <input 
                      type={field.type} 
                      value={formData[field.name] || ''} 
                      onChange={e => handleFieldChange(field.name, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedTemplate.description && (
              <div style={{ padding: '16px', background: '#f8fafc', borderLeft: '4px solid #0ea5e9', marginBottom: '32px', color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                <div style={{ fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: selectedTemplate.description }} />
              </div>
            )}

            {/* Dynamic Table */}
            {selectedTemplate.tableColumns?.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Claim Details</h3>
                  <button onClick={addTableRow} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {selectedTemplate.tableColumns.map(col => (
                          <th key={col.id} style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, border: '1px solid #e2e8f0' }}>{col.name}</th>
                        ))}
                        <th style={{ padding: '12px', width: '50px', border: '1px solid #e2e8f0' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.id}>
                          {selectedTemplate.tableColumns.map(col => (
                            <td key={col.id} style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                              <input 
                                type={col.type} 
                                value={row[col.name] || ''}
                                onChange={e => handleTableCellChange(row.id, col.name, e.target.value)}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', borderBottom: '1px solid #cbd5e1', outline: 'none', background: 'transparent' }}
                                onFocus={e => e.target.style.borderBottom = '2px solid #0ea5e9'}
                                onBlur={e => e.target.style.borderBottom = '1px solid #cbd5e1'}
                              />
                            </td>
                          ))}
                          <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                            <button onClick={() => removeTableRow(row.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tableData.length === 0 && (
                        <tr>
                          <td colSpan={selectedTemplate.tableColumns.length + 1} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            No rows added. Click "Add Row" to start adding items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: '40px', padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Employee Declaration</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#475569' }}>
                I hereby certify that the above claim is true and correct to the best of my knowledge and is being submitted in accordance with company policy.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="certify" 
                  checked={formData._certified || false}
                  onChange={e => handleFieldChange('_certified', e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="certify" style={{ fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>I agree and certify the above statement.</label>
              </div>
            </div>
          </div>
        </div>
      )}
      <Dialog
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={() => {
          if (dialogConfig.onConfirm) dialogConfig.onConfirm();
          setDialogConfig({ ...dialogConfig, isOpen: false });
        }}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
