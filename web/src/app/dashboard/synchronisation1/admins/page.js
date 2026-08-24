'use client';
import React, { useState, useEffect } from 'react';
import { getAdmins, addAdmin, updateAdmin, deleteAdmin } from '@/lib/data';
import { Plus, Edit2, Trash2, X, ShieldAlert } from 'lucide-react';
import Dialog from '@/components/Dialog';
import './admins.css';

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, adminId: null });
  const [formData, setFormData] = useState({ id: '', adminId: '', name: '', email: '', department: '', password: '' });
  const [error, setError] = useState('');

  const loadAdmins = async () => {
    const data = await getAdmins();
    if (!data.error) {
      setAdmins(data);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const openModal = (admin = null) => {
    setError('');
    if (admin) {
      setFormData({ id: admin.id, adminId: admin.adminId || '', name: admin.name, email: admin.email, department: admin.department, password: admin.password || '' }); 
    } else {
      setFormData({ id: '', adminId: '', name: '', email: '', department: '', password: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.id) {
      const res = await updateAdmin(formData.id, formData);
      if (res.error) setError(res.error);
      else {
        loadAdmins();
        closeModal();
      }
    } else {
      // Create new admin
      if (!formData.email || !formData.password || !formData.name || !formData.department) {
        setError('All fields are required.');
        return;
      }
      const res = await addAdmin(formData);
      if (res.error) setError(res.error);
      else {
        loadAdmins();
        closeModal();
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.adminId) return;
    const res = await deleteAdmin(deleteDialog.adminId);
    if (res.error) {
      alert(res.error);
    } else {
      loadAdmins();
    }
    setDeleteDialog({ isOpen: false, adminId: null });
  };

  const handleDelete = (id) => {
    setDeleteDialog({ isOpen: true, adminId: id });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Super Admin Panel</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>Manage administrative accounts that have access to this dashboard.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Add Admin
        </button>
      </div>

      <div className="glass-panel table-container">
        <table>
          <thead>
            <tr>
              <th>Admin ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Password</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">Loading admins...</td>
              </tr>
            ) : (
              admins.map(admin => (
                <tr key={admin.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {admin.adminId || '-'}
                  </td>
                  <td>
                    <div className="admin-name">
                      <ShieldAlert size={16} className="admin-icon" />
                      {admin.name}
                    </div>
                  </td>
                  <td>{admin.email}</td>
                  <td><span className="badge badge-success">{admin.department}</span></td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>••••••••</td>
                  <td className="text-right">
                    <button className="icon-btn edit-btn" title="Edit Admin" onClick={() => openModal(admin)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="icon-btn delete-btn" title="Delete Admin" onClick={() => handleDelete(admin.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Admin Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{formData.id ? 'Edit Admin Profile' : 'Add New Admin'}</h2>
              <button className="icon-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Admin ID (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. A-001"
                  value={formData.adminId} 
                  onChange={e => setFormData({...formData, adminId: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label>Email ID</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label>Department</label>
                <input 
                  type="text" 
                  value={formData.department} 
                  onChange={e => setFormData({...formData, department: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input 
                  type="text" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {formData.id ? 'Update Admin' : 'Save Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog 
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Admin"
        message="Are you sure you want to delete this admin account?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, adminId: null })}
      />
    </div>
  );
}
