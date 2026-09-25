'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit, Trash2, Search, Save, X, ChevronUp, Plus, Check, Loader2, AlertCircle, ArrowUpDown, Sparkles
} from 'lucide-react';
import '../../engineering-ui.css';

export default function UnitMaster() {
  const [units, setUnits] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [libraryId, setLibraryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' or 'alpha'
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default to 50 so units are immediately visible

  // Add new unit state
  const [isAdding, setIsAdding] = useState(true);
  const [newName, setNewName] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Newly added ID for highlighting
  const [highlightedId, setHighlightedId] = useState(null);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Feedback notification
  const [notification, setNotification] = useState(null);

  const scrollContainerRef = useRef(null);
  const newUnitInputRef = useRef(null);
  const editInputRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchUnits = async (searchTerm = '') => {
    try {
      setLoading(true);
      const apiSort = sortBy === 'recent' ? 'recent' : 'name';
      const q = searchTerm.trim();
      const url = `/api/engineering/unit-library?sortBy=${apiSort}${q ? `&search=${encodeURIComponent(q)}` : ''}${libraryId ? `&libraryId=${libraryId}` : ''}&_t=${Date.now()}`;
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnits(data);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || 'Failed to load units', 'error');
      }
    } catch (err) {
      console.error('Error fetching units:', err);
      showNotification('Network error while loading units', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(search);
  }, [sortBy, libraryId]);

  useEffect(() => {
    fetch('/api/libraries')
      .then(res => res.ok ? res.json() : [])
      .then(data => setLibraries(Array.isArray(data) ? data : []))
      .catch(() => setLibraries([]));
  }, []);

  // Handle client-side search filtering and sorting
  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort filtered units
  const displayUnits = [...filteredUnits].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  });

  const effectivePageSize = pageSize === 'all' ? (displayUnits.length || 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(displayUnits.length / effectivePageSize));

  // Keep current page within valid bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (newPage) => {
    const pageNum = Math.max(1, Math.min(totalPages, parseInt(newPage, 10) || 1));
    setCurrentPage(pageNum);
  };

  const paginatedUnits = pageSize === 'all' 
    ? displayUnits 
    : displayUnits.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  // Save New Unit
  const handleSaveNew = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showNotification('Unit name cannot be empty', 'error');
      if (newUnitInputRef.current) newUnitInputRef.current.focus();
      return;
    }

    try {
      setIsSubmittingNew(true);
      const res = await fetch('/api/engineering/unit-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, libraryId: libraryId || null })
      });

      const result = await res.json();
      if (!res.ok) {
        showNotification(result.error || 'Failed to add unit', 'error');
        return;
      }

      showNotification(`Unit "${trimmed}" added successfully!`, 'success');
      setNewName('');
      
      // Highlight the new unit
      if (result.id) {
        setHighlightedId(result.id);
        setTimeout(() => setHighlightedId(null), 5000);
      }

      // If sorted alphabetically, switch to 'recent' or ensure page is 1 so user immediately sees their newly added unit!
      if (sortBy !== 'recent') {
        setSortBy('recent'); // Automatically shows newest items on top!
      } else {
        await fetchUnits(search);
      }
      
      setCurrentPage(1);

      // Keep focus on input for fast rapid data entry
      setTimeout(() => {
        if (newUnitInputRef.current) newUnitInputRef.current.focus();
      }, 100);
    } catch (err) {
      console.error(err);
      showNotification('An unexpected error occurred while saving unit', 'error');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Start Inline Edit
  const handleStartEdit = (unit) => {
    setEditingId(unit.id);
    setEditName(unit.name);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  // Save Inline Edit
  const handleSaveEdit = async (id) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showNotification('Unit name cannot be empty', 'error');
      if (editInputRef.current) editInputRef.current.focus();
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const res = await fetch('/api/engineering/unit-library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: trimmed })
      });

      const result = await res.json();
      if (!res.ok) {
        showNotification(result.error || 'Failed to update unit', 'error');
        return;
      }

      showNotification(`Unit updated to "${trimmed}"`, 'success');
      setEditingId(null);
      setEditName('');
      await fetchUnits(search);
    } catch (err) {
      console.error(err);
      showNotification('An unexpected error occurred while updating unit', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Unit
  const handleDelete = async (unit) => {
    if (!window.confirm(`Are you sure you want to delete unit "${unit.name}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/engineering/unit-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: unit.id })
      });

      const result = await res.json();
      if (!res.ok) {
        showNotification(result.error || 'Failed to delete unit', 'error');
        return;
      }

      showNotification(`Unit "${unit.name}" deleted successfully`, 'success');
      await fetchUnits(search);
    } catch (err) {
      console.error(err);
      showNotification('An unexpected error occurred while deleting unit', 'error');
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="premium-page-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left Side: Search & Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="search-wrapper" style={{ position: 'relative', width: '260px' }}>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="Search units..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingRight: '32px', width: '100%', height: '36px', fontSize: '0.875rem' }} 
            />
            {search ? (
              <X 
                size={16} 
                color="#94a3b8" 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                onClick={() => setSearch('')}
              />
            ) : (
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>

          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total: <strong style={{ color: '#0ea5e9' }}>{displayUnits.length}</strong> units
          </span>
        </div>
        
        {/* Right Side Controls: Sort, Page Size, Add Button, Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          
          {/* Sort Order Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
            <ArrowUpDown size={14} color="#0ea5e9" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white', color: '#334155', cursor: 'pointer' }}
            >
              <option value="recent">⚡ Recently Added First</option>
              <option value="alpha">🔤 Alphabetical (A - Z)</option>
            </select>
          </div>

          {/* Rows per page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white', color: '#334155', cursor: 'pointer' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Add Unit Button */}
          <select
            value={libraryId}
            onChange={(e) => { setLibraryId(e.target.value); setCurrentPage(1); }}
            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
          >
            <option value="">All Libraries</option>
            {libraries.map(library => <option key={library.id} value={library.id}>{library.name}</option>)}
          </select>
          <button 
            className="premium-btn-primary" 
            style={{ 
              background: '#0ea5e9', 
              padding: '6px 14px', 
              fontSize: '0.85rem', 
              borderRadius: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              cursor: 'pointer',
              border: 'none',
              color: 'white',
              fontWeight: 500
            }}
            onClick={() => {
              setIsAdding(true);
              setTimeout(() => {
                if (newUnitInputRef.current) newUnitInputRef.current.focus();
              }, 50);
            }}
          >
            <Plus size={16} /> Add Unit
          </button>

          {/* Page Pagination if multiple pages */}
          {totalPages > 1 && pageSize !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Page:</span>
              <input 
                type="number" 
                min="1"
                max={totalPages}
                value={currentPage} 
                onChange={(e) => handlePageChange(e.target.value)}
                style={{ width: '42px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem' }} 
              />
              <span>of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Bar Top Banner */}
      <div style={{ padding: '12px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>
            ➕ Quick Add New Unit:
          </span>
          <input 
            ref={newUnitInputRef}
            type="text" 
            className="premium-input" 
            placeholder="Type unit name (e.g. Barrel, Box, Coil, Kilowatt)..."
            value={newName}
            disabled={isSubmittingNew}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNew();
              if (e.key === 'Escape') setNewName('');
            }}
            style={{ padding: '7px 14px', flex: 1, maxWidth: '400px', fontSize: '0.875rem', background: 'white' }}
          />
          <button
            type="button"
            onClick={handleSaveNew}
            disabled={isSubmittingNew || !newName.trim()}
            className="premium-btn-primary"
            style={{ 
              background: '#0ea5e9', 
              padding: '7px 18px', 
              fontSize: '0.85rem', 
              borderRadius: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              cursor: isSubmittingNew || !newName.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmittingNew || !newName.trim() ? 0.6 : 1
            }}
          >
            {isSubmittingNew ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save Unit</span>
          </button>
          {newName && (
            <button
              type="button"
              onClick={() => setNewName('')}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontStyle: 'italic' }}>
          💡 Press Enter to save instantly
        </div>
      </div>

      {/* Main Content Table Area */}
      <div ref={scrollContainerRef} style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table className="premium-data-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem', width: '70px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem' }}>Unit Library Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem', width: '130px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem', width: '140px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 size={20} className="animate-spin" color="#0ea5e9" />
                      <span>Loading Unit Library...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    {search ? `No units matching "${search}".` : 'No units in database. Use the Quick Add box above to add units.'}
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((row, index) => {
                  const isEditingThisRow = editingId === row.id;
                  const isHighlighted = highlightedId === row.id;
                  const rowNumber = (currentPage - 1) * effectivePageSize + index + 1;

                  return (
                    <tr 
                      key={row.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: isHighlighted ? '#dcfce7' : isEditingThisRow ? '#fef3c7' : 'transparent',
                        transition: 'background 0.3s ease'
                      }}
                    >
                      {/* Row Number */}
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                        {rowNumber}
                      </td>

                      {/* Unit Name Column */}
                      <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#1e293b' }}>
                        {isEditingThisRow ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              ref={editInputRef}
                              type="text" 
                              className="premium-input" 
                              value={editName}
                              disabled={isSubmittingEdit}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(row.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              style={{ padding: '6px 12px', width: '100%', maxWidth: '320px', fontSize: '0.875rem', borderColor: '#0ea5e9', background: 'white' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Press Enter to save</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</span>
                            {isHighlighted && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#22c55e', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                <Sparkles size={11} /> Just Added!
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          background: row.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                          color: row.status === 'Active' ? '#166534' : '#64748b'
                        }}>
                          {row.status || 'Active'}
                        </span>
                      </td>

                      {/* Action Column */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {isEditingThisRow ? (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(row.id)}
                              disabled={isSubmittingEdit}
                              title="Save Changes"
                              style={{ background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                            >
                              {isSubmittingEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              title="Cancel"
                              style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              title="Edit Unit Name"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#0ea5e9' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              title="Delete Unit"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#ef4444' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Brand Line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Powered by Kanix Infotech Pvt. Ltd.</span>
          <span style={{ color: '#0ea5e9' }}>India's first Construction ERP Software. Ver: 33.00.00</span>
        </div>
      </div>

      {/* Floating Action Button (Scroll to Top) */}
      <div 
        onClick={scrollToTop}
        title="Scroll to Top"
        style={{ 
          position: 'absolute', bottom: '24px', right: '24px', 
          width: '40px', height: '40px', borderRadius: '50%', background: '#0ea5e9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 6px rgba(14, 165, 233, 0.3)', cursor: 'pointer',
          transition: 'transform 0.15s',
          zIndex: 10
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
      >
        <ChevronUp size={20} color="white" />
      </div>
    </div>
  );
}
