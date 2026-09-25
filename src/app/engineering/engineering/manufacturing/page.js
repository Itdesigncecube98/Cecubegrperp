'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Home, ChevronRight, Layers, Building2, Search, 
  RefreshCw, Plus, CheckCircle2, Clock, Truck, Hammer, 
  Wrench, ShieldCheck, Download, X, Eye, ChevronDown
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function ManufacturingPage() {
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, completedOrders: 0, inProgressOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    assemblyName: '',
    category: 'Busduct Assembly',
    targetQty: '',
    unit: 'Sections',
    assignedEngineer: '',
    targetDate: '',
    remarks: ''
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrders = async (projectIdToFetch = selectedProjectId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engineering/manufacturing?projectId=${projectIdToFetch || ''}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setOrders(data.orders || []);
        setStats(data.stats || { totalOrders: 0, completedOrders: 0, inProgressOrders: 0 });

        if (!selectedProjectId && data.selectedProjectId) {
          setSelectedProjectId(data.selectedProjectId);
        }
      } else {
        showToast('Failed to load manufacturing orders', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to manufacturing service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedProjectId);
  }, [selectedProjectId]);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') return projects;
    return projects.filter(p => p.company?.toLowerCase() === selectedCompany.toLowerCase());
  }, [projects, selectedCompany]);

  const handleCompanyChange = (companyName) => {
    setSelectedCompany(companyName);
    if (companyName === 'ALL') {
      if (projects.length > 0) setSelectedProjectId(projects[0].id);
    } else {
      const matching = projects.filter(p => p.company?.toLowerCase() === companyName.toLowerCase());
      if (matching.length > 0) setSelectedProjectId(matching[0].id);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m1 = o.assemblyName?.toLowerCase().includes(q);
        const m2 = o.orderNumber?.toLowerCase().includes(q);
        const m3 = o.assignedEngineer?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [orders, searchQuery]);

  const handleAddOrder = async (e) => {
    e.preventDefault();
    if (!form.assemblyName || !form.targetQty) {
      showToast('Assembly Name and Target Qty are required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          ...form
        })
      });

      if (res.ok) {
        showToast('Work order created successfully!');
        setShowAddModal(false);
        setForm({
          assemblyName: '',
          category: 'Busduct Assembly',
          targetQty: '',
          unit: 'Sections',
          assignedEngineer: '',
          targetDate: '',
          remarks: ''
        });
        fetchOrders(selectedProjectId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to create work order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating work order', 'error');
    }
  };

  const handleAdvanceStage = async (order, nextStage, nextStatus) => {
    try {
      const res = await fetch('/api/engineering/manufacturing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          orderId: order.id,
          stage: nextStage,
          status: nextStatus || order.status,
          completedQty: nextStatus === 'Completed' ? order.targetQty : order.completedQty
        })
      });

      if (res.ok) {
        showToast(`Order updated to: ${nextStage}`);
        fetchOrders(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating stage', 'error');
    }
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? '#ef4444' : '#0891b2',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Engineering <ChevronRight size={14} /> <span style={{ color: '#0891b2', fontWeight: 600 }}>Manufacturing</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#cffafe', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hammer size={24} color="#0891b2" />
            </div>
            Manufacturing & Fabrication Work Orders
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Track workshop fabrication, panel assembly, Bill of Materials (BOM), quality testing (FAT), and dispatch milestones.
          </p>
        </div>

        {/* Dual Selectors: Company Library + Project */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none' }}
            >
              <option value="ALL">All Companies</option>
              {companies.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={16} color="#0891b2" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none', minWidth: '220px' }}
            >
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchOrders(selectedProjectId)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#0891b2" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#cffafe', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hammer size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Work Orders</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalOrders}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>In Production</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{stats.inProgressOrders}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Quality Cleared / Ready</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{stats.completedOrders}</div>
          </div>
        </div>
      </div>

      {/* Orders List Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Search assemblies or WO#..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0891b2',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(8, 145, 178, 0.25)'
            }}
          >
            <Plus size={16} />
            <span>Create Work Order</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" color="#0891b2" style={{ margin: '0 auto 10px auto' }} />
            <div>Loading Work Orders...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No manufacturing work orders recorded for this project.
          </div>
        ) : (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredOrders.map(order => {
              const progressPct = order.targetQty > 0 ? Math.round(((order.completedQty || 0) / order.targetQty) * 100) : 0;

              return (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    background: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0891b2', background: '#cffafe', padding: '2px 8px', borderRadius: '6px' }}>
                          {order.orderNumber}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          {order.assemblyName}
                        </h3>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                          {order.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Assigned Engineer: <strong>{order.assignedEngineer}</strong> • Target Date: <strong>{new Date(order.targetDate).toLocaleDateString('en-GB')}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: order.status === 'Quality Cleared' ? '#dcfce7' : '#fef3c7',
                        color: order.status === 'Quality Cleared' ? '#15803d' : '#b45309'
                      }}>
                        {order.status}
                      </span>

                      {order.stage !== 'FAT Testing & Inspection' && order.status !== 'Completed' && (
                        <button
                          onClick={() => handleAdvanceStage(order, 'FAT Testing & Inspection', 'Quality Cleared')}
                          style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Clear for QA
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '4px', fontWeight: 600 }}>
                      <span>Production Stage: <strong>{order.stage}</strong></span>
                      <span>{order.completedQty} / {order.targetQty} {order.unit} ({progressPct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? '#10b981' : '#0891b2', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Bill of Materials (BOM) pills */}
                  {order.bom && order.bom.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b' }}>
                      <span style={{ fontWeight: 700 }}>Key Materials (BOM):</span>
                      {order.bom.map((b, bi) => (
                        <span key={bi} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                          {b.material}: <strong>{b.qty}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal: Create Work Order */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Create Manufacturing Work Order</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddOrder} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Assembly / Panel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11KV Indoor Switchgear Panel, Main Busduct Trunk"
                  value={form.assemblyName}
                  onChange={(e) => setForm({ ...form, assemblyName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Target Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 12"
                    value={form.targetQty}
                    onChange={(e) => setForm({ ...form, targetQty: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Unit</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Assigned Engineer</label>
                <input
                  type="text"
                  placeholder="e.g. Amit Sharma"
                  value={form.assignedEngineer}
                  onChange={(e) => setForm({ ...form, assignedEngineer: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', background: '#0891b2', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
