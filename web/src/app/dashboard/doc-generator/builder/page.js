'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, FileText, Settings, Type, AlignLeft } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function FormBuilderPage() {
  const [templates, setTemplates] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);

  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  };

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== description) {
        editorRef.current.innerHTML = description;
      }
    }
  }, [description, isFormOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('docGenerator_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setTemplates(parsed);
          return; // Templates exist, no need to seed
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Seed default templates if empty or not found
    const defaultTemplates = [
      {
        id: "tmpl_accommodation",
        formName: "Accommodation Reimbursement Form",
        description: "Applicable for Employees Stationed Outside Gurgaon Region\n\nEligibility Declaration:\n- I confirm that I am currently stationed outside Gurgaon region for official company work during the above-mentioned period.\n- I confirm that the accommodation reimbursement claimed below is as per company policy communicated through HR.\n- I understand that submission of incorrect information may lead to rejection of claim and disciplinary action as per company policy.",
        fields: [
          { id: 101, name: "Employee Name", type: "text", width: "half" },
          { id: 102, name: "Employee Code", type: "text", width: "half" },
          { id: 103, name: "Designation", type: "text", width: "half" },
          { id: 104, name: "Department", type: "text", width: "half" },
          { id: 105, name: "Project / Site Name", type: "text", width: "half" },
          { id: 106, name: "Month & Year of Claim", type: "text", width: "half" },
          { id: 107, name: "Reporting Manager", type: "text", width: "half" },
          { id: 108, name: "Location of Deployment", type: "text", width: "half" }
        ],
        tableColumns: [
          { id: 201, name: "Sr. No.", type: "text" },
          { id: 202, name: "Stay Period", type: "text" },
          { id: 203, name: "Accommodation Location / Hotel", type: "text" },
          { id: 204, name: "Bill / Invoice No.", type: "text" },
          { id: 205, name: "Amount Claimed", type: "number" },
          { id: 206, name: "Remarks", type: "text" }
        ],
        updatedAt: new Date().toISOString()
      },
      {
        id: "tmpl_food",
        formName: "Food Allowance Reimbursement Form",
        description: "Applicable for Employees Stationed Outside Gurgaon Region\n\nEligibility Declaration:\n- I confirm that I am currently stationed outside Gurgaon region for official company work during the above-mentioned period.\n- I confirm that the reimbursement claimed below is as per company policy communicated through HR circular dated 05 May 2026.\n- I understand that submission of incorrect information may lead to rejection of claim and disciplinary action as per company policy.",
        fields: [
          { id: 301, name: "Employee Name", type: "text", width: "half" },
          { id: 302, name: "Employee Code", type: "text", width: "half" },
          { id: 303, name: "Designation", type: "text", width: "half" },
          { id: 304, name: "Department", type: "text", width: "half" },
          { id: 305, name: "Project / Site Name", type: "text", width: "half" },
          { id: 306, name: "Month & Year of Claim", type: "text", width: "half" },
          { id: 307, name: "Reporting Manager", type: "text", width: "half" },
          { id: 308, name: "Location of Deployment", type: "text", width: "half" }
        ],
        tableColumns: [
          { id: 401, name: "Sr. No.", type: "text" },
          { id: 402, name: "Period", type: "text" },
          { id: 403, name: "Eligible Monthly Allowance", type: "number" },
          { id: 404, name: "Amount Claimed", type: "number" }
        ],
        updatedAt: new Date().toISOString()
      }
    ];
    setTemplates(defaultTemplates);
    localStorage.setItem('docGenerator_templates', JSON.stringify(defaultTemplates));
  }, []);

  const resetForm = () => {
    setFormName('');
    setDescription('');
    setFields([]);
    setTableColumns([]);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (tmpl) => {
    setFormName(tmpl.formName);
    setDescription(tmpl.description || '');
    setFields(tmpl.fields || []);
    setTableColumns(tmpl.tableColumns || []);
    setEditingId(tmpl.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem('docGenerator_templates', JSON.stringify(updated));
    }
  };

  const addField = () => {
    setFields([...fields, { id: Date.now(), name: '', type: 'text', width: 'half' }]);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const addTableColumn = () => {
    setTableColumns([...tableColumns, { id: Date.now(), name: '', type: 'text' }]);
  };

  const removeTableColumn = (id) => {
    setTableColumns(tableColumns.filter(c => c.id !== id));
  };

  const updateTableColumn = (id, key, value) => {
    setTableColumns(tableColumns.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const handleSave = () => {
    if (!formName.trim()) {
      alert('Form Name is required');
      return;
    }

    const newTemplate = {
      id: editingId || Date.now().toString(),
      formName,
      description,
      fields,
      tableColumns,
      updatedAt: new Date().toISOString()
    };

    let updatedTemplates;
    if (editingId) {
      updatedTemplates = templates.map(t => t.id === editingId ? newTemplate : t);
    } else {
      updatedTemplates = [...templates, newTemplate];
    }

    setTemplates(updatedTemplates);
    localStorage.setItem('docGenerator_templates', JSON.stringify(updatedTemplates));
    alert('Template saved successfully!');
    resetForm();
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', 
    borderRadius: '6px', fontSize: '14px', outline: 'none'
  };

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
      if (editorRef.current) setDescription(editorRef.current.innerHTML);
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
        if (editorRef.current) setDescription(editorRef.current.innerHTML);
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
        if (editorRef.current) setDescription(editorRef.current.innerHTML);
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Form Builder</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Create and manage dynamic document templates for employees.</p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0ea5e9', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={18} /> Create New Template
          </button>
        )}
      </div>

      {isFormOpen ? (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
              {editingId ? 'Edit Template' : 'New Template'}
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={resetForm} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <Save size={16} /> Save Template
              </button>
            </div>
          </div>
          
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Form Title (e.g. Food Allowance Form)</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} style={inputStyle} placeholder="Enter form title..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Description / Guidelines</label>
                <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <EditorToolbar />
                  <div 
                    ref={editorRef}
                    contentEditable
                    onBlur={saveSelection}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                    style={{ minHeight: '150px', padding: '16px', outline: 'none', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#111827' }}
                  />
                </div>
              </div>
            </div>

            {/* Static Fields Section */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Type size={18} color="#0ea5e9" /> Header Fields
                </h3>
                <button onClick={addField} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <Plus size={14} /> Add Field
                </button>
              </div>

              {fields.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No fields added yet. Click "Add Field" to add items like Employee Code, Designation, etc.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fields.map((field, index) => (
                    <div key={field.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>
                        {index + 1}
                      </div>
                      <input 
                        type="text" 
                        value={field.name} 
                        onChange={e => updateField(field.id, 'name', e.target.value)} 
                        placeholder="Field Name (e.g. Project Name)" 
                        style={{ ...inputStyle, flex: 2 }} 
                      />
                      <select 
                        value={field.type} 
                        onChange={e => updateField(field.id, 'type', e.target.value)} 
                        style={{ ...inputStyle, flex: 1 }}
                      >
                        <option value="text">Text Input</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                      <select 
                        value={field.width} 
                        onChange={e => updateField(field.id, 'width', e.target.value)} 
                        style={{ ...inputStyle, flex: 1 }}
                      >
                        <option value="half">Half Width (50%)</option>
                        <option value="full">Full Width (100%)</option>
                      </select>
                      <button onClick={() => removeField(field.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Table Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlignLeft size={18} color="#0ea5e9" /> Dynamic Table Columns
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Employees can add as many rows as they need to this table.</p>
                </div>
                <button onClick={addTableColumn} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <Plus size={14} /> Add Column
                </button>
              </div>

              {tableColumns.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No table columns configured. Add columns like "Period", "Amount", "Remarks".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tableColumns.map((col, index) => (
                    <div key={col.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <input 
                        type="text" 
                        value={col.name} 
                        onChange={e => updateTableColumn(col.id, 'name', e.target.value)} 
                        placeholder="Column Name (e.g. Amount Claimed)" 
                        style={{ ...inputStyle, flex: 2 }} 
                      />
                      <select 
                        value={col.type} 
                        onChange={e => updateTableColumn(col.id, 'type', e.target.value)} 
                        style={{ ...inputStyle, flex: 1 }}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                      <button onClick={() => removeTableColumn(col.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {templates.map(tmpl => (
            <div key={tmpl.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '8px' }}>
                    <FileText size={24} color="#0ea5e9" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{tmpl.formName}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>{tmpl.fields?.length || 0} Fields, {tmpl.tableColumns?.length || 0} Columns</p>
                  </div>
                </div>
                {tmpl.description && (
                  <div 
                    style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: tmpl.description }}
                  />
                )}
              </div>
              <div style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => handleEdit(tmpl)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', color: '#334155', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  Edit Form
                </button>
                <button onClick={() => handleDelete(tmpl.id)} style={{ padding: '6px 12px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '6px', color: '#ef4444', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          
          {templates.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ background: '#f0f9ff', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText size={32} color="#0ea5e9" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>No Forms Created</h3>
              <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>Get started by building your first dynamic form template.</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0ea5e9', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={18} /> Create Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
