'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  Search, Plus, ChevronRight, ChevronDown,
  Home, Package, Box, Edit, Trash2, MapPin, Folder,
  Sparkles, X, Check, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function MaterialLibrary() {
  const pathname = usePathname();
  const resourceType = pathname?.includes('/equipment') ? 'Equipment' : pathname?.includes('/labour') ? 'Labour' : 'Material';
  const resourceLabel = resourceType === 'Labour' ? 'Labour' : resourceType;
  const [mounted, setMounted] = useState(false);
  const [libraries, setLibraries] = useState([]);
  const [activeLibId, setActiveLibId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected node in tree: { type: 'material' | 'group' | 'subgroup', data: object, path: array }
  const [selectedItem, setSelectedItem] = useState(null);

  // Unit Library suggestions
  const [unitList, setUnitList] = useState([]);

  // Expanded nodes map: { [nodeId]: boolean }
  const [expandedNodes, setExpandedNodes] = useState({});

  // Modal State: { open: boolean, mode: 'create' | 'edit', parentId: null, parentName: '', targetType: 'subgroup' | 'material', data: null }
  const [modal, setModal] = useState({
    open: false,
    mode: 'create',
    parentId: null,
    parentName: '',
    targetType: 'subgroup',
    data: null
  });

  // Modal form fields
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('Nos');
  const [formRate, setFormRate] = useState(0);
  const [formTaxScheme, setFormTaxScheme] = useState('C+SGST 18%');
  const [formTaxAmount, setFormTaxAmount] = useState(0);
  const [formPriceIncTax, setFormPriceIncTax] = useState(0);
  const [formTransportPerUnit, setFormTransportPerUnit] = useState(0);
  const [formSpecification, setFormSpecification] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Mount & Fetch libraries & units
  useEffect(() => {
    setMounted(true);
    fetchLibraries();
    fetchUnits();
  }, []);

  const fetchLibraries = async () => {
    try {
      const res = await fetch('/api/libraries?_t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const allLibs = Array.isArray(data) ? data : [];
        const libs = allLibs; // All libraries are accessible in all pages
        setLibraries(libs);
        if (libs.length > 0) {
          // Default to electrical library if present, else first
          const elect = libs.find(l => l.name?.toLowerCase().includes('electrical'));
          const initialLibraryId = elect ? elect.id : libs[0].id;
          setActiveLibId(initialLibraryId);
          fetchMaterialTree(initialLibraryId);
        }
      }
    } catch (err) {
      console.error('Error loading libraries:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/engineering/unit-library?_t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const names = (Array.isArray(data) ? data : []).map(u => typeof u === 'string' ? u : u.name).filter(Boolean);
        setUnitList(Array.from(new Set([...names, 'Coil', 'Nos', 'Litre', 'Mtr', 'Bag', 'Ton', 'Kg', 'Sqm', 'Cum', 'Lot', 'Rmt'])));
      }
    } catch {
      setUnitList(['Coil', 'Nos', 'Litre', 'Mtr', 'Bag', 'Ton', 'Kg', 'Sqm', 'Cum', 'Lot', 'Rmt']);
    }
  };

  const fetchMaterialTree = async (libId) => {
    try {
      setLoading(true);
      setGroups([]);
      setSelectedItem(null);
      const url = libId
        ? `/api/engineering/material-library?libraryId=${encodeURIComponent(libId)}&resourceType=${encodeURIComponent(resourceType)}&_t=${Date.now()}`
        : `/api/engineering/material-library?resourceType=${resourceType}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Library fetch failed with status ${res.status}`);

      const data = await res.json();
      const loadedGroups = Array.isArray(data) ? data : [];
      setGroups(loadedGroups);

      const initExp = {};
      const markExpanded = (nodes) => {
        if (!nodes) return;
        nodes.forEach(node => {
          initExp[node.id] = true;
          if (node.subgroups) markExpanded(node.subgroups);
        });
      };
      markExpanded(loadedGroups);
      setExpandedNodes(prev => ({ ...initExp, ...prev }));
    } catch (err) {
      console.error('Failed to load material tree:', err);
      showToast('Failed to load materials tree', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to count all materials recursively inside any folder
  const countAllMaterials = (node) => {
    let count = (node.materials || []).length;
    (node.subgroups || []).forEach(sub => {
      count += countAllMaterials(sub);
    });
    return count;
  };

  // ==================== ACTIONS / HANDLERS ====================
  const handleOpenAdd = (parentNode, defaultType = 'subgroup', e) => {
    if (e) e.stopPropagation();
    setFormName('');
    setFormUnit('Nos');
    setFormRate(0);
    setFormTaxScheme('C+SGST 18%');
    setFormTaxAmount(0);
    setFormPriceIncTax(0);
    setFormTransportPerUnit(0);
    setFormSpecification('');
    setFormDescription('');
    setModal({
      open: true,
      mode: 'create',
      parentId: parentNode ? parentNode.id : null,
      parentName: parentNode ? parentNode.name : activeLibraryObj?.name || 'Library',
      targetType: defaultType,
      data: null
    });
  };

  const handleOpenEdit = (item, type, e) => {
    if (e) e.stopPropagation();
    setFormName(item.name || '');
    setFormUnit(item.unit || 'Nos');
    setFormRate(item.rate || 0);
    setFormTaxScheme(item.taxScheme || 'C+SGST 18%');
    setFormTaxAmount(item.taxAmount || 0);
    setFormPriceIncTax(item.priceIncTax || 0);
    setFormTransportPerUnit(item.transportPerUnit || 0);
    setFormSpecification(item.specification || '');
    setFormDescription(item.description || '');
    setModal({
      open: true,
      mode: 'edit',
      parentId: null,
      parentName: '',
      targetType: type,
      data: item
    });
  };

  const handleDelete = async (item, type, e) => {
    if (e) e.stopPropagation();
    const typeLabel = type === 'material' ? 'material' : type === 'subgroup' ? 'subgroup' : 'group';
    if (!window.confirm(`Are you sure you want to delete ${typeLabel} "${item.name}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/engineering/material-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type })
      });

      if (res.ok) {
        showToast(`Deleted "${item.name}" successfully`);
        if (selectedItem?.data?.id === item.id) {
          setSelectedItem(null);
        }
        await fetchMaterialTree(activeLibId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while deleting', 'error');
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (modal.mode === 'create') {
        const payload = modal.targetType === 'subgroup'
          ? {
            type: modal.parentId ? 'subgroup' : 'group',
            libraryId: activeLibId || null,
            parentId: modal.parentId || null,
            name: formName.trim(),
            description: formDescription.trim() || null
          }
          : {
            type: 'material',
            groupId: modal.parentId,
            name: formName.trim(),
            unit: formUnit.trim() || 'Nos',
            rate: parseFloat(formRate) || 0,
            specification: formSpecification.trim() || null,
            description: formDescription.trim() || null
          };

        const res = await fetch('/api/engineering/material-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, resourceType })
        });

        if (res.ok) {
          showToast(`${modal.targetType === 'subgroup' ? 'Subgroup' : 'Material'} "${formName}" created!`);
          setModal({ open: false, mode: 'create', parentId: null, parentName: '', targetType: 'subgroup', data: null });
          if (modal.parentId) {
            setExpandedNodes(prev => ({ ...prev, [modal.parentId]: true }));
          }
          await fetchMaterialTree(activeLibId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create item', 'error');
        }
      } else {
        // Edit mode
        const payload = modal.targetType === 'material'
          ? {
            id: modal.data.id,
            type: 'material',
            name: formName.trim(),
            unit: formUnit.trim() || 'Nos',
            rate: parseFloat(formRate) || 0,
            specification: formSpecification.trim() || null,
            description: formDescription.trim() || null
          }
          : {
            id: modal.data.id,
            type: 'group',
            name: formName.trim(),
            description: formDescription.trim() || null
          };

        const res = await fetch('/api/engineering/material-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast('Changes saved successfully!');
          setModal({ open: false, mode: 'create', parentId: null, parentName: '', targetType: 'subgroup', data: null });
          await fetchMaterialTree(activeLibId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update item', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeLibraryObj = libraries.find(l => l.id === activeLibId) || { name: 'Electrical Work Library' };

  // ==================== TREE BRANCH COMPONENT ====================
  // Rule: Folders (groups & subgroups) have green + sign.
  // Materials are leaf items: NO + sign!
  const TreeBranch = ({ node, type = 'group', depth = 0, path = [] }) => {
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedItem?.data?.id === node.id;
    const currentPath = [...path, node.name];

    const hasSubgroups = node.subgroups && node.subgroups.length > 0;
    const hasMaterials = node.materials && node.materials.length > 0;
    const hasChildren = hasSubgroups || hasMaterials;

    const totalCount = countAllMaterials(node);
    const isMaterial = type === 'material';

    // Search filter
    const matchesQuery = !searchQuery.trim() ||
      node.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (node.specification && node.specification.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));

    const hasMatchingDescendant = (n) => {
      if (!searchQuery.trim()) return true;
      if (n.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())) return true;
      if (n.subgroups && n.subgroups.some(hasMatchingDescendant)) return true;
      if (n.materials && n.materials.some(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()))) return true;
      return false;
    };

    if (searchQuery.trim() && !matchesQuery && !hasMatchingDescendant(node)) {
      return null;
    }

    return (
      <div style={{ marginTop: depth === 0 ? '6px' : '2px' }}>
        {/* Node Row */}
        <div
          onClick={() => setSelectedItem({ type, data: node, path: currentPath })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: depth === 0 ? '7px 10px' : '5px 8px',
            borderRadius: '6px',
            background: isSelected
              ? (isMaterial ? '#e0f2fe' : '#f0fdf4')
              : 'transparent',
            border: isSelected
              ? (isMaterial ? '1px solid #7dd3fc' : '1px solid #86efac')
              : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
            {/* Expand / Collapse Icon */}
            {!isMaterial && hasChildren ? (
              <div
                onClick={(e) => toggleExpand(node.id, e)}
                style={{ padding: '2px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            ) : (
              <span style={{ width: 14, display: 'inline-block' }}></span>
            )}

            {/* Icon */}
            {depth === 0 ? (
              <Package size={16} color="#d97706" />
            ) : isMaterial ? (
              <Box size={14} color={isSelected ? '#0284c7' : '#94a3b8'} />
            ) : (
              <Folder size={15} color="#059669" fill="#059669" />
            )}

            {/* Title */}
            <span style={{
              fontWeight: depth === 0 ? 600 : isMaterial ? (isSelected ? 600 : 400) : 500,
              color: isSelected
                ? (isMaterial ? '#0369a1' : '#15803d')
                : '#334155',
              fontSize: depth === 0 ? '0.86rem' : '0.82rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {node.name}
            </span>

            {/* Total items badge for folders */}
            {!isMaterial && totalCount > 0 && (
              <span style={{
                fontSize: '0.68rem',
                color: isSelected ? '#15803d' : '#64748b',
                background: isSelected ? '#dcfce7' : '#f1f5f9',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 600
              }}>
                {totalCount}
              </span>
            )}

            {/* Unit tag if material */}
            {isMaterial && node.unit && (
              <span style={{
                fontSize: '0.68rem',
                color: '#64748b',
                background: '#f1f5f9',
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                {node.unit}
              </span>
            )}
          </div>

          {/* Action buttons on Node */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* ONLY FOLDERS (Groups & Subgroups) HAVE THE + SIGN! */}
            {/* If material is added, then NO + sign */}
            {!isMaterial && (
              <button
                title={`Add Subgroup or Material to "${node.name}"`}
                onClick={(e) => handleOpenAdd(node, 'subgroup', e)}
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#059669',
                  padding: '3px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#10b981';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ecfdf5';
                  e.currentTarget.style.color = '#059669';
                }}
              >
                <Plus size={12} />
              </button>
            )}

            {/* Edit Button */}
            <button
              title={`Edit "${node.name}"`}
              onClick={(e) => handleOpenEdit(node, type, e)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0284c7'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <Edit size={13} />
            </button>

            {/* Delete Button */}
            <button
              title={`Delete "${node.name}"`}
              onClick={(e) => handleDelete(node, type, e)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Children (Subgroups & Materials) */}
        {isExpanded && hasChildren && (
          <div style={{
            borderLeft: '1.5px dashed #cbd5e1',
            marginLeft: '14px',
            marginTop: '2px',
            paddingLeft: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {/* 1. Subgroups (Folders) */}
            {node.subgroups && node.subgroups.map(sub => (
              <TreeBranch
                key={sub.id}
                node={sub}
                type="subgroup"
                depth={depth + 1}
                path={currentPath}
              />
            ))}

            {/* 2. Materials (Leaf Items) */}
            {node.materials && node.materials.map(mat => (
              <TreeBranch
                key={mat.id}
                node={mat}
                type="material"
                depth={depth + 1}
                path={currentPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!mounted) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading {resourceLabel} Library...</div>;
  }

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toastMessage.type === 'error' ? '#ef4444' : '#0f172a',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 500,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} color="#38bdf8" />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* ==================== LEFT PANE: TREE VIEW ==================== */}
      <div style={{
        width: '420px',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        zIndex: 10,
        boxShadow: '2px 0 8px rgba(0,0,0,0.02)'
      }}>
        {/* Header section */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                <Package size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {resourceLabel} Library
                </h2>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Groups, Subgroups & {resourceLabel}s</span>
              </div>
            </div>

            <button
              onClick={() => activeLibId && fetchMaterialTree(activeLibId)}
              title="Refresh tree from database"
              style={{
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Library selector */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Library
            </label>
            <select
              className="modern-input modern-select"
              style={{ width: '100%', padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#0f172a' }}
              value={activeLibId}
              onChange={(e) => {
                const libraryId = e.target.value;
                setActiveLibId(libraryId);
                setSelectedItem(null);
                if (libraryId) fetchMaterialTree(libraryId);
              }}
            >
              {libraries.map(lib => (
                <option key={lib.id} value={lib.id}>{lib.name}</option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="search-wrapper" style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              type="text"
              className="modern-input"
              placeholder="Search groups, subgroups or materials..."
              style={{ paddingRight: '32px', width: '100%', boxSizing: 'border-box', height: '36px', fontSize: '0.82rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <X
                size={14}
                color="#94a3b8"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
              />
            ) : (
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>

          {/* Add Root Group Action */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-primary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '7px 10px' }}
              onClick={() => handleOpenAdd(null, 'subgroup')}
            >
              <Plus size={14} /> Add Root Group
            </button>
          </div>
        </div>

        {/* Tree Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748b', fontSize: '0.85rem' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#0ea5e9', marginBottom: '8px' }} />
              <span>Loading Material Tree...</span>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px', fontSize: '0.85rem' }}>
              <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div>No groups found in this library.</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Click "Add Root Group" to create the first group.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {groups.map(group => (
                <TreeBranch
                  key={group.id}
                  node={group}
                  type="group"
                  depth={0}
                  path={[activeLibraryObj.name]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== RIGHT PANE: DETAIL & WORKSPACE ==================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>

        {/* Top Breadcrumb Bar */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="breadcrumb" style={{ margin: 0, fontSize: '0.82rem' }}>
            <Home size={14} />
            <span>Home</span>
            <ChevronRight size={13} color="#94a3b8" />
            <span>Library</span>
            <ChevronRight size={13} color="#94a3b8" />
            <span style={{ color: '#0ea5e9', fontWeight: 600 }}>{resourceLabel} Library</span>
            {selectedItem?.path && selectedItem.path.map((segment, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={13} color="#94a3b8" />
                <span style={{ color: idx === selectedItem.path.length - 1 ? '#0369a1' : '#64748b', fontWeight: idx === selectedItem.path.length - 1 ? 600 : 400 }}>
                  {segment}
                </span>
              </React.Fragment>
            ))}
          </div>

          <span style={{
            fontSize: '0.75rem',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '3px 10px',
            borderRadius: '20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Sparkles size={12} /> {activeLibraryObj.name}
          </span>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {!selectedItem ? (
            /* Empty State */
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', maxWidth: '440px', textAlign: 'center' }}>
                <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '50%' }}>
                  <Package size={44} color="#cbd5e1" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px', color: '#334155', fontSize: '1.1rem', fontWeight: 600 }}>Material Tree Explorer</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5' }}>
                    Select any group, subgroup, or material from the tree on the left to view details,
                    or click the green <strong style={{ color: '#059669' }}>+</strong> button on any folder to add subgroups and materials!
                  </p>
                </div>
              </div>
            </div>
          ) : selectedItem.type === 'material' ? (
            /* MATERIAL DETAILS VIEW (Leaf Item: NO + sign on material!) */
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>

                {/* Detail Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                      <Box size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1',
                          padding: '2px 8px', borderRadius: '6px', fontWeight: 600
                        }}>
                          Unit: {selectedItem.data.unit || 'Nos'}
                        </span>
                        <span style={{
                          fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b',
                          padding: '2px 8px', borderRadius: '6px'
                        }}>
                          ID: MAT-{selectedItem.data.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        {selectedItem.data.name}
                      </h2>
                    </div>
                  </div>

                  {/* Actions: ONLY Edit and Delete on Material (No + button) */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-outline"
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9', borderColor: '#0ea5e9', fontSize: '0.8rem' }}
                      onClick={(e) => handleOpenEdit(selectedItem.data, 'material', e)}
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: '#fca5a5', fontSize: '0.8rem' }}
                      onClick={(e) => handleDelete(selectedItem.data, 'material', e)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                {/* Detail Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Specification Box */}
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Specification / Grade</h3>
                    <div style={{ color: '#475569', fontSize: '0.88rem', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {selectedItem.data.specification || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No specific technical grade specified.</span>}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Description</h3>
                    <div style={{ color: '#475569', fontSize: '0.88rem', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: '1.5' }}>
                      {selectedItem.data.description || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No description provided for this material.</span>}
                    </div>
                  </div>

                  {/* Where is it used? (Project List) */}
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color="#0ea5e9" /> Where is it used? (Project List)
                    </h3>

                    {selectedItem.data.usedIn && selectedItem.data.usedIn.length > 0 ? (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead style={{ background: '#f1f5f9' }}>
                            <tr>
                              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.82rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Project Name</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.82rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: '100px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedItem.data.usedIn.map((proj, idx) => (
                              <tr key={idx} style={{ borderBottom: idx !== selectedItem.data.usedIn.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#334155' }}>{proj}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                  <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600 }}>Active</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.82rem' }}>
                        This material is not currently assigned to any projects.
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          ) : (
            /* FOLDER OVERVIEW (Group or Subgroup) */
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '8px',
                      background: selectedItem.type === 'group' ? '#fef3c7' : '#dcfce7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: selectedItem.type === 'group' ? '#d97706' : '#059669'
                    }}>
                      {selectedItem.type === 'group' ? <Package size={22} /> : <Folder size={22} fill="#059669" />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: selectedItem.type === 'group' ? '#fef3c7' : '#ecfdf5',
                          color: selectedItem.type === 'group' ? '#b45309' : '#059669',
                          padding: '2px 8px', borderRadius: '6px', fontWeight: 600
                        }}>
                          {selectedItem.type === 'group' ? 'Root Group' : 'Subgroup'}
                        </span>
                        <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '6px' }}>
                          {countAllMaterials(selectedItem.data)} Total Materials
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        {selectedItem.data.name}
                      </h2>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      onClick={(e) => handleOpenAdd(selectedItem.data, 'subgroup', e)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#0ea5e9' }}
                    >
                      <Plus size={14} /> Add Subgroup
                    </button>
                    <button
                      className="btn-primary"
                      onClick={(e) => handleOpenAdd(selectedItem.data, 'material', e)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#059669' }}
                    >
                      <Plus size={14} /> Add Material
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                      onClick={(e) => handleOpenEdit(selectedItem.data, selectedItem.type, e)}
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: '#fca5a5', fontSize: '0.78rem' }}
                      onClick={(e) => handleDelete(selectedItem.data, selectedItem.type, e)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                {selectedItem.data.description && (
                  <div style={{
                    background: '#f8fafc', padding: '12px 16px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569', marginBottom: '20px'
                  }}>
                    {selectedItem.data.description}
                  </div>
                )}

                {/* Subgroups in this folder */}
                {selectedItem.data.subgroups && selectedItem.data.subgroups.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Folder size={16} color="#059669" /> Nested Subgroups ({selectedItem.data.subgroups.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                      {selectedItem.data.subgroups.map(sub => (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedItem({ type: 'subgroup', data: sub, path: [...selectedItem.path, sub.name] })}
                          style={{
                            padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                            background: '#f8fafc', cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#f0fdf4'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Folder size={15} color="#059669" fill="#059669" />
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{sub.name}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
                              {countAllMaterials(sub)} items
                            </span>
                          </div>
                          {sub.description && (
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sub.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Materials in this folder */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Box size={16} color="#0284c7" /> Direct Materials ({(selectedItem.data.materials || []).length})
                    </h3>
                    <button
                      className="btn-primary"
                      onClick={(e) => handleOpenAdd(selectedItem.data, 'material', e)}
                      style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#059669' }}
                    >
                      <Plus size={12} /> Add Material
                    </button>
                  </div>

                  {(!selectedItem.data.materials || selectedItem.data.materials.length === 0) ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.82rem' }}>
                      No direct materials in this {selectedItem.type}. Click "Add Material" above or click the green + on the folder in the tree.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <tr>
                            <th style={{ padding: '10px 14px', textAlign: 'left', width: '40px' }}>#</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left' }}>Material Name</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', width: '90px' }}>Unit</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left' }}>Specification</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '120px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.data.materials.map((mat, idx) => (
                            <tr
                              key={mat.id}
                              style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                              onClick={() => setSelectedItem({ type: 'material', data: mat, path: [...selectedItem.path, mat.name] })}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0284c7' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Box size={14} color="#0ea5e9" />
                                  <span>{mat.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#475569' }}>
                                <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                  {mat.unit || 'Nos'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                {mat.specification || mat.description || '-'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button
                                    title="View / Details"
                                    onClick={() => setSelectedItem({ type: 'material', data: mat, path: [...selectedItem.path, mat.name] })}
                                    style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#0284c7', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                                  >
                                    Open
                                  </button>
                                  <button
                                    title="Edit Material"
                                    onClick={(e) => handleOpenEdit(mat, 'material', e)}
                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '3px' }}
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    title="Delete Material"
                                    onClick={(e) => handleDelete(mat, 'material', e)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '3px' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODAL: ADD / EDIT NODE ==================== */}
      {modal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white', borderRadius: '18px', width: '560px', maxWidth: '92%',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)', overflow: 'hidden'
          }}>
            <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid #e2e8f0', background: '#fbfdff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 750, color: '#1e293b' }}>
                  {modal.mode === 'create'
                    ? (modal.parentId ? `Add to: ${modal.parentName}` : 'Add New Root Group')
                    : `Edit ${modal.targetType === 'subgroup' ? 'Subgroup' : 'Material'}`}
                </h3>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>{resourceLabel} library item details</span>
              </div>
              <button
                onClick={() => setModal({ open: false, mode: 'create', parentId: null, parentName: '', targetType: 'subgroup', data: null })}
                style={{ width: '34px', height: '34px', border: '1px solid #dbe4ee', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div style={{ padding: '26px 28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Type toggle: only when adding under an existing folder */}
                {modal.mode === 'create' && modal.parentId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Item Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setModal(prev => ({ ...prev, targetType: 'subgroup' }))}
                        style={{
                          padding: '8px', borderRadius: '8px',
                          border: modal.targetType === 'subgroup' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: modal.targetType === 'subgroup' ? '#ecfdf5' : '#ffffff',
                          color: modal.targetType === 'subgroup' ? '#065f46' : '#64748b',
                          fontWeight: 600, fontSize: '0.82rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Folder size={16} color="#059669" fill={modal.targetType === 'subgroup' ? '#059669' : 'none'} />
                        <span>Subgroup (Folder)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModal(prev => ({ ...prev, targetType: 'material' }))}
                        style={{
                          padding: '8px', borderRadius: '8px',
                          border: modal.targetType === 'material' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: modal.targetType === 'material' ? '#f0f9ff' : '#ffffff',
                          color: modal.targetType === 'material' ? '#0369a1' : '#64748b',
                          fontWeight: 600, fontSize: '0.82rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Box size={16} color="#0284c7" />
                        <span>Material (Item)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    {modal.targetType === 'subgroup' ? 'Subgroup / Category Name' : 'Material Name'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="modern-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={modal.targetType === 'subgroup' ? 'e.g. Wires & Cables, Switchgears, Conduits...' : 'e.g. Copper Wire 1.5mm, Modular Switch...'}
                  />
                </div>

                {/* Material Specific Fields */}
                {modal.targetType === 'material' && (
                  <>
                    {/* Row 1: Unit + Price Per Unit */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Unit *</label>
                        <select
                          required
                          className="modern-input modern-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formUnit}
                          onChange={e => setFormUnit(e.target.value)}
                        >
                          <option value="" disabled>Select unit from Unit Master</option>
                          {formUnit && !unitList.includes(formUnit) && (
                            <option value={formUnit}>{formUnit}</option>
                          )}
                          {unitList.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>{resourceType === 'Labour' ? 'Labour Rate' : 'Price Per Unit'}</label>
                        <input
                          type="number" step="any"
                          className="modern-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formRate}
                          onChange={e => {
                            const r = parseFloat(e.target.value) || 0;
                            setFormRate(r);
                            const taxPct = formTaxScheme.includes('18') ? 18 : formTaxScheme.includes('12') ? 12 : formTaxScheme.includes('5') ? 5 : 0;
                            const tax = parseFloat((r * taxPct / 100).toFixed(2));
                            setFormTaxAmount(tax);
                            setFormPriceIncTax(parseFloat((r + tax).toFixed(2)));
                          }}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Row 2: Tax Scheme + Tax Amount + Price incl. Tax */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tax Scheme</label>
                        <select
                          className="modern-input modern-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formTaxScheme}
                          onChange={e => {
                            setFormTaxScheme(e.target.value);
                            const taxPct = e.target.value.includes('18') ? 18 : e.target.value.includes('12') ? 12 : e.target.value.includes('5') ? 5 : 0;
                            const tax = parseFloat((formRate * taxPct / 100).toFixed(2));
                            setFormTaxAmount(tax);
                            setFormPriceIncTax(parseFloat((parseFloat(formRate) + tax).toFixed(2)));
                          }}
                        >
                          <option value="">None</option>
                          <option value="C+SGST 5%">C+SGST 5%</option>
                          <option value="C+SGST 12%">C+SGST 12%</option>
                          <option value="C+SGST 18%">C+SGST 18%</option>
                          <option value="IGST 5%">IGST 5%</option>
                          <option value="IGST 12%">IGST 12%</option>
                          <option value="IGST 18%">IGST 18%</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tax Amount</label>
                        <input
                          type="number" step="any"
                          className="modern-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formTaxAmount}
                          onChange={e => setFormTaxAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Price Per Unit (incl. tax)</label>
                        <input
                          type="number" step="any"
                          className="modern-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formPriceIncTax}
                          onChange={e => setFormPriceIncTax(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Row 3: Transport Per Unit + Grade/Spec */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Transport Per Unit</label>
                        <input
                          type="number" step="any"
                          className="modern-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formTransportPerUnit}
                          onChange={e => setFormTransportPerUnit(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Grade / Spec</label>
                        <input
                          type="text"
                          className="modern-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formSpecification}
                          onChange={e => setFormSpecification(e.target.value)}
                          placeholder="e.g. ISI, Grade 53, FR"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Description / Scope
                  </label>
                  <textarea
                    className="modern-input"
                    style={{ width: '100%', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical' }}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Provide technical details, specifications, or usage scope..."
                  ></textarea>
                </div>

              </div>

              <div style={{ padding: '18px 28px 22px', borderTop: '1px solid #edf2f7', background: '#fbfdff', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={submitting}
                  onClick={() => setModal({ open: false, mode: 'create', parentId: null, parentName: '', targetType: 'subgroup', data: null })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{ background: modal.targetType === 'subgroup' ? '#0ea5e9' : '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{modal.mode === 'create' ? (modal.targetType === 'subgroup' ? 'Create Subgroup' : 'Add Material') : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
