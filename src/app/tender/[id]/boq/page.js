'use client';
import React, { useState, useEffect, use } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function TenderBOQ({ params }) {
  const unwrappedParams = use(params);
  const tenderId = unwrappedParams.id;
  const [loading, setLoading] = useState(false);
  const [boqItems, setBoqItems] = useState([]);

  const [newItem, setNewItem] = useState({
    serialNo: '',
    description: '',
    unit: '',
    quantity: '',
    clientRate: '',
    estimatedRate: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/tender/${tenderId}`);
        if (res.ok) {
          const data = await res.json();
          setBoqItems(data.boqItems || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [tenderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/tender/${tenderId}/boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        const added = await res.json();
        setBoqItems(prev => [...prev, added]);
        setNewItem({
          serialNo: '',
          description: '',
          unit: '',
          quantity: '',
          clientRate: '',
          estimatedRate: ''
        });
      } else {
        alert('Failed to add BOQ item');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val).toLocaleString('en-IN')}`;

  const totals = boqItems.reduce((acc, item) => {
    const qty = item.quantity || 0;
    acc.clientTotal += qty * (item.clientRate || 0);
    acc.estTotal += qty * (item.estimatedRate || 0);
    return acc;
  }, { clientTotal: 0, estTotal: 0 });

  return (
    <div className="tnd-card">
      <div className="tnd-card-header">
        <h2 className="tnd-card-title">Bill of Quantities (BOQ)</h2>
      </div>

      <div className="tnd-table-wrapper tnd-mb-6">
        <table className="tnd-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Sr.</th>
              <th>Description</th>
              <th style={{ width: '80px' }}>Unit</th>
              <th style={{ width: '100px' }} className="tnd-text-right">Qty</th>
              <th style={{ width: '120px' }} className="tnd-text-right">Client Rate</th>
              <th style={{ width: '120px' }} className="tnd-text-right">Est. Rate</th>
              <th style={{ width: '140px' }} className="tnd-text-right">Client Amount</th>
              <th style={{ width: '140px' }} className="tnd-text-right">Est. Amount</th>
            </tr>
          </thead>
          <tbody>
            {boqItems.map((item, index) => {
              const qty = item.quantity || 0;
              const cRate = item.clientRate || 0;
              const eRate = item.estimatedRate || 0;
              return (
                <tr key={item.id}>
                  <td>{item.serialNo || index + 1}</td>
                  <td>{item.description}</td>
                  <td>{item.unit}</td>
                  <td className="tnd-text-right">{qty}</td>
                  <td className="tnd-text-right">{formatCurrency(cRate)}</td>
                  <td className="tnd-text-right">{formatCurrency(eRate)}</td>
                  <td className="tnd-text-right">{formatCurrency(qty * cRate)}</td>
                  <td className="tnd-text-right tnd-font-semibold">{formatCurrency(qty * eRate)}</td>
                </tr>
              )
            })}
            
            {boqItems.length === 0 && (
              <tr>
                <td colSpan="8" className="tnd-text-center tnd-text-muted tnd-py-4">No BOQ items added yet.</td>
              </tr>
            )}
          </tbody>
          {boqItems.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan="6" className="tnd-text-right">Total:</td>
                <td className="tnd-text-right">{formatCurrency(totals.clientTotal)}</td>
                <td className="tnd-text-right tnd-text-indigo-600">{formatCurrency(totals.estTotal)}</td>
              </tr>
              <tr style={{ backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                <td colSpan="6" className="tnd-text-right">Gross Margin:</td>
                <td colSpan="2" className="tnd-text-right tnd-text-emerald-600">
                  {formatCurrency(totals.clientTotal - totals.estTotal)} 
                  <span className="tnd-text-sm tnd-ml-2">
                    ({totals.clientTotal > 0 ? ((totals.clientTotal - totals.estTotal) / totals.clientTotal * 100).toFixed(2) : 0}%)
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 className="tnd-font-semibold tnd-mb-4">Add BOQ Item</h3>
        <form onSubmit={handleAddItem} className="tnd-flex tnd-items-end" style={{ gap: '12px' }}>
          <div className="tnd-form-group" style={{ width: '80px' }}>
            <label className="tnd-label">Sr No.</label>
            <input type="text" name="serialNo" value={newItem.serialNo} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group tnd-flex-1">
            <label className="tnd-label">Description *</label>
            <input type="text" name="description" required value={newItem.description} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '80px' }}>
            <label className="tnd-label">Unit</label>
            <input type="text" name="unit" value={newItem.unit} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '100px' }}>
            <label className="tnd-label">Qty *</label>
            <input type="number" step="any" name="quantity" required value={newItem.quantity} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '120px' }}>
            <label className="tnd-label">Client Rate</label>
            <input type="number" step="any" name="clientRate" value={newItem.clientRate} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '120px' }}>
            <label className="tnd-label">Est. Rate *</label>
            <input type="number" step="any" name="estimatedRate" required value={newItem.estimatedRate} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group">
            <button type="submit" disabled={loading} className="tnd-btn tnd-btn-primary" style={{ padding: '8px 16px', height: '42px' }}>
              <Plus size={16} /> Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
