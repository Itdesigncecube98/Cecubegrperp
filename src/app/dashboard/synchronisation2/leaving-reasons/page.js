'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';

export default function LeavingReasonsPage() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup/leaving-reasons');
      if (res.ok) {
        const data = await res.json();
        setReasons(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaving reasons:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Name is required');

    try {
      const url = editingId ? `/api/setup/leaving-reasons/${editingId}` : '/api/setup/leaving-reasons';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchReasons();
        handleCloseModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this reason?')) return;
    try {
      const res = await fetch(`/api/setup/leaving-reasons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReasons();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleEdit = (reason) => {
    setFormData({ name: reason.name, description: reason.description || '', isActive: reason.isActive });
    setEditingId(reason.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormData({ name: '', description: '', isActive: true });
    setEditingId(null);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leaving Reasons</h1>
          <p className="text-sm text-slate-500">Manage reasons for employee termination or resignation</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Reason
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Description</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500"><RefreshCw className="spin mx-auto mb-2" /> Loading...</td></tr>
            ) : reasons.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">No leaving reasons found. Add one to get started.</td></tr>
            ) : reasons.map(reason => (
              <tr key={reason.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-800">{reason.name}</td>
                <td className="p-4 text-slate-600">{reason.description || '-'}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${reason.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {reason.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleEdit(reason)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(reason.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Reason' : 'Add Reason'}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason Name *</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Resigned, Performance Issue"
                  required 
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Optional details..."
                  rows={3}
                />
              </div>
              <div className="mb-6 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
