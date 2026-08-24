'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, FileText, Download, Users, Edit, Trash2, ChevronDown, Printer } from 'lucide-react';
import { getEmployees, getCandidates } from '../../../lib/data';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function HrDocsPage() {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('TEMPLATES'); // TEMPLATES or GENERATE
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  
  // Template Form State
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  
  // Generate Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [customPlaceholderValues, setCustomPlaceholderValues] = useState({});
  const [detectedCustomPlaceholders, setDetectedCustomPlaceholders] = useState([]);
  const [configPlaceholders, setConfigPlaceholders] = useState([]);
  
  // Base legacy placeholders for backward compatibility
  const [standardPlaceholders, setStandardPlaceholders] = useState([
    'empName', 'empCode', 'designation', 'department', 'fatherName',
    'email', 'phone', 'dateOfJoining', 'dateOfBirth', 'panNumber',
    'aadharNumber', 'bankName', 'bankAccountNo', 'basicSalary', 'annualCtc', 'currentDate'
  ]);

  useEffect(() => {
    // Load Templates
    const savedTemplates = localStorage.getItem('hrDocs_templates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      const defaultTemplates = [
        {
          id: '1',
          name: 'Bonafide Certificate',
          content: 'TO WHOMSOEVER IT MAY CONCERN\n\nThis is to certify that Mr./Ms. {{empName}} (Employee Code: {{empCode}}) is a bonafide employee of our organization. They are currently working with us in the capacity of {{designation}} in the {{department}} department.\n\nThis certificate is issued at the specific request of the employee and does not hold the company liable for any financial or legal obligations.\n\nDate: {{currentDate}}\n\n\n\nAuthorized Signatory\nHuman Resources'
        }
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('hrDocs_templates', JSON.stringify(defaultTemplates));
    }

    // Load Employees & Candidates from database & dynamically extract all their data fields as placeholders
    Promise.all([getEmployees(), getCandidates()]).then(([parsedEmployees, parsedCandidates]) => {
      const emps = Array.isArray(parsedEmployees) ? parsedEmployees : [];
      const cands = Array.isArray(parsedCandidates) ? parsedCandidates : [];
      setEmployees(emps);
      setCandidates(cands);
      
      const allKeys = new Set([
        'empName', 'empCode', 'designation', 'department', 'fatherName',
        'email', 'phone', 'dateOfJoining', 'dateOfBirth', 'panNumber',
        'aadharNumber', 'bankName', 'bankAccountNo', 'basicSalary', 'annualCtc', 'currentDate'
      ]);
      
      const extractKeys = (arr) => {
        arr.forEach(item => {
          Object.keys(item).forEach(key => {
            if (typeof item[key] === 'string' || typeof item[key] === 'number') {
              allKeys.add(key);
            }
          });
        });
      };
      
      extractKeys(emps);
      extractKeys(cands);
      setStandardPlaceholders(Array.from(allKeys));
    }).catch(err => console.error("Failed to fetch data", err));

    // Load Config Placeholders
    const savedConfig = localStorage.getItem('hrDocs_customPlaceholdersConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      setConfigPlaceholders(parsedConfig.map(p => p.name));
    }
  }, []);

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      alert('Please fill both name and content.');
      return;
    }

    const newTemplate = {
      id: editId || Date.now().toString(),
      name: templateName,
      content: templateContent,
    };

    let newTemplates;
    if (editId) {
      newTemplates = templates.map(t => t.id === editId ? newTemplate : t);
    } else {
      newTemplates = [...templates, newTemplate];
    }

    setTemplates(newTemplates);
    localStorage.setItem('hrDocs_templates', JSON.stringify(newTemplates));
    setIsEditingTemplate(false);
    setEditId(null);
    setTemplateName('');
    setTemplateContent('');
  };

  const handleDeleteTemplate = (id) => {
    if(confirm('Are you sure you want to delete this template?')) {
      const newTemplates = templates.filter(t => t.id !== id);
      setTemplates(newTemplates);
      localStorage.setItem('hrDocs_templates', JSON.stringify(newTemplates));
    }
  };

  const handleEditTemplate = (tmpl) => {
    setEditId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateContent(tmpl.content);
    setIsEditingTemplate(true);
  };

  const generatePreview = () => {
    if (!selectedTemplateId || !selectedEmployeeId) {
      setGeneratedContent('');
      setDetectedCustomPlaceholders([]);
      return;
    }

    const tmpl = templates.find(t => t.id === selectedTemplateId);
    const emp = employees.find(e => e.id === selectedEmployeeId) || candidates.find(c => c.id === selectedEmployeeId);

    if (tmpl && emp) {
      // 1. Detect custom placeholders
      const matches = tmpl.content.match(/{{(.*?)}}/g) || [];
      const allPlaceholders = matches.map(m => m.replace(/{{|}}/g, ''));
      const customs = allPlaceholders.filter(p => !standardPlaceholders.includes(p));
      const uniqueCustoms = [...new Set(customs)];
      
      setDetectedCustomPlaceholders(uniqueCustoms);

      // 2. Replace standard placeholders (Legacy aliases)
      let content = tmpl.content;
      content = content.replace(/{{empName}}/g, emp.name || '');
      content = content.replace(/{{empCode}}/g, emp.empId || emp.id || '');
      content = content.replace(/{{phone}}/g, emp.phone || emp.workTelephone || '');
      content = content.replace(/{{dateOfJoining}}/g, emp.joinedDate || '');
      content = content.replace(/{{currentDate}}/g, new Date().toLocaleDateString('en-GB'));
      
      // 3. Replace dynamic standard placeholders directly from the employee object
      Object.keys(emp).forEach(key => {
        if (typeof emp[key] === 'string' || typeof emp[key] === 'number') {
          content = content.replace(new RegExp(`{{${key}}}`, 'g'), emp[key]);
        }
      });
      
      // 4. Replace custom manual placeholders
      uniqueCustoms.forEach(cp => {
        const val = customPlaceholderValues[cp] || `[${cp}]`;
        content = content.split(`{{${cp}}}`).join(val);
      });
      
      setGeneratedContent(content);
    }
  };

  useEffect(() => {
    generatePreview();
  }, [selectedTemplateId, selectedEmployeeId, templates, employees, candidates, customPlaceholderValues]);

  const exportPDF = async () => {
    // jsPDF image slicing cuts text in half and cannot add margins without deleting text.
    // Native browser printing (Save as PDF) is the only way to get perfect text-aware pagination.
    handlePrint();
  };

  const handlePrint = () => {
    if (!generatedContent) return;
    const printContent = document.getElementById('document-preview').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Document</title>
          <style>
            body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              @page { size: a4; margin: 0; } /* Removes browser date/URL headers */
              
              /* Allow text to break naturally, but keep images intact */
              img { page-break-inside: avoid; }
              h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <table style="width: 100%; border: none; border-collapse: collapse;">
            <thead style="height: 1.31in; display: table-header-group;">
              <tr><td style="border: none;"></td></tr>
            </thead>
            <tbody style="display: table-row-group;">
              <tr>
                <td style="border: none; padding-left: 1in; padding-right: 1in; vertical-align: top;">
                  ${printContent}
                </td>
              </tr>
            </tbody>
            <tfoot style="height: 0.63in; display: table-footer-group;">
              <tr><td style="border: none;"></td></tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', 
    borderRadius: '8px', fontSize: '14px', outline: 'none'
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  };

  // Sync state to editor only when it changes externally
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== templateContent) {
        editorRef.current.innerHTML = templateContent;
      }
    }
  }, [templateContent]);

  const EditorToolbar = () => {
    const insertTable = () => {
      if (editorRef.current) {
        editorRef.current.focus();
        if (savedRangeRef.current) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        }
      }
      const tableHTML = '<br/><table border="1" style="width:100%; border-collapse: collapse; margin: 10px 0;"><tbody><tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Header 1</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Header 2</td></tr><tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Cell 1</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Cell 2</td></tr></tbody></table><br/>';
      document.execCommand('insertHTML', false, tableHTML);
      if (editorRef.current) setTemplateContent(editorRef.current.innerHTML);
    };

    const addColumn = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      let node = sel.focusNode;
      while (node && node.nodeName !== 'TD' && node.nodeName !== 'TH' && node.nodeName !== 'TABLE') {
        node = node.parentNode;
      }
      if (node && (node.nodeName === 'TD' || node.nodeName === 'TH')) {
        const cellIndex = node.cellIndex;
        const table = node.closest('table');
        for (let i = 0; i < table.rows.length; i++) {
          const newCell = table.rows[i].insertCell(cellIndex + 1);
          newCell.innerHTML = 'New Cell';
          newCell.style.padding = '8px';
          newCell.style.border = '1px solid #cbd5e1';
        }
        if (editorRef.current) setTemplateContent(editorRef.current.innerHTML);
      } else {
        alert("Please click inside a table cell first.");
      }
    };

    const addRow = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      let node = sel.focusNode;
      while (node && node.nodeName !== 'TR' && node.nodeName !== 'TABLE') {
        node = node.parentNode;
      }
      if (node && node.nodeName === 'TR') {
        const table = node.closest('table');
        const rowIndex = node.rowIndex;
        const newRow = table.insertRow(rowIndex + 1);
        for (let i = 0; i < node.cells.length; i++) {
          const newCell = newRow.insertCell(i);
          newCell.innerHTML = 'New Cell';
          newCell.style.padding = '8px';
          newCell.style.border = '1px solid #cbd5e1';
        }
        if (editorRef.current) setTemplateContent(editorRef.current.innerHTML);
      } else {
        alert("Please click inside a table row first.");
      }
    };

    return (
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', textDecoration: 'underline' }}>U</button>
        <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyLeft', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Left</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyCenter', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Center</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyRight', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Right</button>
        <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Bullet List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList', false, null); }} style={{ padding: '4px 8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Number List</button>
        <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertTable(); }} style={{ padding: '4px 8px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Insert Table</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); addRow(); }} style={{ padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>+ Row</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); addColumn(); }} style={{ padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>+ Column</button>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>HR Letters & Documents</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Create templates and generate official HR documents.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          style={{
            padding: '8px 16px', background: activeTab === 'TEMPLATES' ? '#0ea5e9' : 'transparent',
            color: activeTab === 'TEMPLATES' ? 'white' : '#64748b', border: 'none',
            borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <FileText size={18} /> Manage Templates
        </button>
        <button
          onClick={() => setActiveTab('GENERATE')}
          style={{
            padding: '8px 16px', background: activeTab === 'GENERATE' ? '#0ea5e9' : 'transparent',
            color: activeTab === 'GENERATE' ? 'white' : '#64748b', border: 'none',
            borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Download size={18} /> Generate Document
        </button>
      </div>

      {activeTab === 'TEMPLATES' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Your Templates</h2>
              {!isEditingTemplate && (
                <button 
                  onClick={() => { setEditId(null); setTemplateName(''); setTemplateContent(''); setIsEditingTemplate(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  <Plus size={16} /> New Template
                </button>
              )}
            </div>

            {templates.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                No templates found. Create one to get started.
              </div>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
              {templates.map(tmpl => (
                <div key={tmpl.id} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{tmpl.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                      {tmpl.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditTemplate(tmpl)} style={{ padding: '8px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteTemplate(tmpl.id)} style={{ padding: '8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isEditingTemplate && (
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>{editId ? 'Edit Template' : 'Create Template'}</h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Template Name</label>
                <input 
                  type="text" 
                  value={templateName} 
                  onChange={e => setTemplateName(e.target.value)} 
                  style={inputStyle} 
                  placeholder="e.g. Experience Letter" 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155' }}>Document Content</label>
                  
                  <select 
                    onChange={(e) => {
                      if(e.target.value) {
                        const val = `{{${e.target.value}}}`;
                        if (editorRef.current) {
                          editorRef.current.focus();
                          if (savedRangeRef.current) {
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(savedRangeRef.current);
                          }
                          document.execCommand('insertText', false, val);
                          setTemplateContent(editorRef.current.innerHTML);
                        }
                        e.target.value = '';
                      }
                    }}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc', color: '#0f172a', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="">+ Insert Placeholder</option>
                    <optgroup label="Employee Data">
                      {standardPlaceholders.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                    {configPlaceholders.length > 0 && (
                      <optgroup label="Custom Config">
                        {configPlaceholders.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>
                  Select from dropdown or type your own custom placeholders like {'{{customNotes}}'}
                </p>
                <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <EditorToolbar />
                  <div 
                    ref={editorRef}
                    contentEditable
                    onBlur={saveSelection}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    onInput={(e) => setTemplateContent(e.currentTarget.innerHTML)}
                    style={{ minHeight: '300px', padding: '16px', outline: 'none', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '1.6', color: '#111827' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setIsEditingTemplate(false)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={handleSaveTemplate} style={{ padding: '10px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Template</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'GENERATE' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ width: '400px', background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Generate Document</h2>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Template</label>
              <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} style={inputStyle}>
                <option value="">-- Choose Template --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Employee or Candidate</label>
              <select 
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Select Person --</option>
                <optgroup label="Employees">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || 'No Dept'})</option>
                  ))}
                </optgroup>
                <optgroup label="Candidates">
                  {candidates.map(cand => (
                    <option key={cand.id} value={cand.id}>{cand.name} (Candidate)</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {detectedCustomPlaceholders.length > 0 && (
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Custom Variables</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detectedCustomPlaceholders.map(cp => (
                    <div key={cp}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{cp}</label>
                      <input 
                        type="text" 
                        value={customPlaceholderValues[cp] || ''} 
                        onChange={e => setCustomPlaceholderValues(prev => ({ ...prev, [cp]: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px 12px' }}
                        placeholder={`Enter ${cp}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                disabled={!selectedTemplateId || !selectedEmployeeId}
                onClick={exportPDF}
                style={{ 
                  flex: 1, padding: '12px', background: (!selectedTemplateId || !selectedEmployeeId) ? '#cbd5e1' : '#10b981', 
                  color: 'white', border: 'none', borderRadius: '8px', cursor: (!selectedTemplateId || !selectedEmployeeId) ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' 
                }}
              >
                <Download size={18} /> Download PDF
              </button>

              <button 
                disabled={!selectedTemplateId || !selectedEmployeeId}
                onClick={handlePrint}
                style={{ 
                  flex: 1, padding: '12px', background: (!selectedTemplateId || !selectedEmployeeId) ? '#cbd5e1' : '#3b82f6', 
                  color: 'white', border: 'none', borderRadius: '8px', cursor: (!selectedTemplateId || !selectedEmployeeId) ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' 
                }}
              >
                <Printer size={18} /> Print Document
              </button>
            </div>
          </div>

          <div style={{ flex: 1, background: '#e2e8f0', padding: '24px', borderRadius: '12px', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
            {generatedContent ? (
              <div id="document-preview" style={{ background: 'white', width: '210mm', minHeight: '297mm', padding: '1.31in 1in 0.63in 1in', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' }}>
                {/* Content */}
                <div 
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '1.6', color: '#111827', outline: 'none', minHeight: '100%' }}
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                  onBlur={(e) => setGeneratedContent(e.target.innerHTML)}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: '#64748b' }}>
                Select a template and an employee to preview the document.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
