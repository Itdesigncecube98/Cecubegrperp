'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function CreatePR() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    department: '',
    project: '',
    site: '',
    requiredDate: '',
    priority: 'Normal',
    purpose: '',
    remarks: '',
    requestedById: ''
  });

  const [items, setItems] = useState([
    { item: '', specification: '', unit: 'Nos', quantity: '', requiredDate: '' }
  ]);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : data.employees || []);
        }
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    }
    loadEmployees();
  }, []);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index][name] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { item: '', specification: '', unit: 'Nos', quantity: '', requiredDate: '' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/purchase/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, items })
      });
      if (res.ok) {
        router.push('/purchase/pr');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create PR');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">New Purchase Indent</h1>
          <p className="pur-subtitle">Create a request for material procurement</p>
        </div>
        <Link href="/purchase/pr" className="pur-btn pur-btn-outline">
          <ArrowLeft size={16} /> Back to Register
        </Link>
      </div>

      <div className="pur-card">
        <form onSubmit={handleSubmit}>
          
          <div className="pur-form-section">
            <h2 className="pur-section-title"><ShoppingCart size={20} className="pur-text-amber-600" /> Header Details</h2>
            
            <div className="pur-grid-3">
              <div className="pur-form-group">
                <label className="pur-label">Project Name *</label>
                <input type="text" name="project" required value={formData.project} onChange={handleHeaderChange} className="pur-input" />
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Site / Location</label>
                <input type="text" name="site" value={formData.site} onChange={handleHeaderChange} className="pur-input" />
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Department</label>
                <select name="department" value={formData.department} onChange={handleHeaderChange} className="pur-select">
                  <option value="">Select Department</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Civil">Civil</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="IT">IT</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="pur-grid-3">
              <div className="pur-form-group">
                <label className="pur-label">Requested By *</label>
                <select name="requestedById" required value={formData.requestedById} onChange={handleHeaderChange} className="pur-select">
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Overall Required Date</label>
                <input type="date" name="requiredDate" value={formData.requiredDate} onChange={handleHeaderChange} className="pur-input" />
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleHeaderChange} className="pur-select">
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="pur-grid-2">
              <div className="pur-form-group">
                <label className="pur-label">Purpose of Procurement</label>
                <textarea name="purpose" rows="2" value={formData.purpose} onChange={handleHeaderChange} className="pur-textarea" />
              </div>
              <div className="pur-form-group">
                <label className="pur-label">Remarks</label>
                <textarea name="remarks" rows="2" value={formData.remarks} onChange={handleHeaderChange} className="pur-textarea" />
              </div>
            </div>
          </div>

          <div className="pur-form-section">
            <div className="pur-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="pur-section-title" style={{ margin: 0 }}>Item Details</h2>
              <button type="button" onClick={addItem} className="pur-btn pur-btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                <Plus size={14} /> Add Item
              </button>
            </div>
            
            <div className="pur-table-wrapper" style={{ overflow: 'visible' }}>
              <table className="pur-table" style={{ border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th>Item Name *</th>
                    <th>Specification</th>
                    <th style={{ width: '100px' }}>Unit</th>
                    <th style={{ width: '100px' }}>Qty *</th>
                    <th style={{ width: '150px' }}>Required Date</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px' }}>
                        <input type="text" name="item" required value={item.item} onChange={(e) => handleItemChange(index, e)} className="pur-input" placeholder="E.g. Transformer" />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input type="text" name="specification" value={item.specification} onChange={(e) => handleItemChange(index, e)} className="pur-input" placeholder="E.g. 500kVA, 11kV/433V" />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input type="text" name="unit" value={item.unit} onChange={(e) => handleItemChange(index, e)} className="pur-input" />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input type="number" step="any" name="quantity" required value={item.quantity} onChange={(e) => handleItemChange(index, e)} className="pur-input" />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input type="date" name="requiredDate" value={item.requiredDate} onChange={(e) => handleItemChange(index, e)} className="pur-input" />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="pur-icon-btn pur-text-danger">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pur-form-section" style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
              <Save size={16} /> {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
