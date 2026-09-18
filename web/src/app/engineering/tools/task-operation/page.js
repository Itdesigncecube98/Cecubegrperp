'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, Home, ChevronRight, ChevronDown, Search, CheckSquare, 
  Folder, FolderOpen, Layers, Edit3, Copy, Clipboard, ArrowUp, 
  ArrowDown, Trash2, Plus, CheckCircle2, AlertTriangle, RefreshCw, 
  Check, X, HardHat, FileText, CornerDownRight
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function TaskOperationPage() {
  // Projects
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Tree Data
  const [treeData, setTreeData] = useState(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedNode, setSelectedNode] = useState(null);

  // Rename Form
  const [renameValue, setRenameValue] = useState('');

  // Copy/Paste Form
  const [copiedNode, setCopiedNode] = useState(null);
  const [pasteTargetNode, setPasteTargetNode] = useState(null);
  const [copyWithRate, setCopyWithRate] = useState(false);
  const [copyReason, setCopyReason] = useState('New Assignment');
  const [copyRemark, setCopyRemark] = useState('');

  // Add Node Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeForm, setNewNodeForm] = useState({
    type: 'task', // group, subgroup, task
    name: '',
    qty: 100,
    unit: 'Nos',
    rate: 250
  });

  // Expanded nodes set
  const [expandedNodes, setExpandedNodes] = useState(new Set(['all', 'root']));

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Projects from /api/projects
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setProjects(list);
          if (list.length > 0 && !selectedProjectId) {
            setSelectedProjectId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load projects', err);
        showToast('Failed to load projects', 'error');
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // 2. Fetch Tree Data for Project
  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadTree() {
      setLoadingTree(true);
      try {
        const res = await fetch(`/api/engineering/tools/task-operation?projectId=${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.rootNode) {
            setTreeData(data.rootNode);
            // Auto expand root and first group
            const exp = new Set(['all', data.rootNode.id]);
            if (data.rootNode.children && data.rootNode.children.length > 0) {
              data.rootNode.children.forEach(c => {
                exp.add(c.id);
                if (c.children) {
                  c.children.forEach(sub => exp.add(sub.id));
                }
              });

              // Select first task if available
              const firstGroup = data.rootNode.children[0];
              if (firstGroup && firstGroup.children && firstGroup.children.length > 0) {
                const firstItem = firstGroup.children[0];
                const nodeToSelect = firstItem.type === 'task' ? firstItem : (firstItem.children?.[0] || firstItem);
                setSelectedNode(nodeToSelect);
                setRenameValue(nodeToSelect.name);
                setCopiedNode(nodeToSelect);
                setPasteTargetNode(firstGroup);
              }
            }
            setExpandedNodes(exp);
          }
        }
      } catch (err) {
        console.error('Failed to load task operation tree', err);
        showToast('Failed to load task operations', 'error');
      } finally {
        setLoadingTree(false);
      }
    }
    loadTree();
  }, [selectedProjectId]);

  const handleSyncTaskLibrary = async () => {
    if (!selectedProjectId) return;
    setLoadingTree(true);
    try {
      const res = await fetch(`/api/engineering/tools/task-operation?projectId=${selectedProjectId}&sync=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.rootNode) {
          setTreeData(data.rootNode);
          showToast('Synced tree directly from Task Library!');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to sync from Task Library', 'error');
    } finally {
      setLoadingTree(false);
    }
  };

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Toggle node expand/collapse
  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Node selection handler
  const handleSelectNode = (node) => {
    setSelectedNode(node);
    setRenameValue(node.name);

    // If a group or subgroup is selected, default it as paste target
    if (node.type === 'group' || node.type === 'subgroup' || node.type === 'project') {
      setPasteTargetNode(node);
    }
  };

  // Set as Node to Copy
  const handleSetCopiedNode = (node = selectedNode) => {
    if (!node) {
      showToast('Please select a node to copy first', 'error');
      return;
    }
    setCopiedNode(node);
    showToast(`Copied: ${node.name}`);
  };

  // Set as Paste Target
  const handleSetPasteTarget = (node = selectedNode) => {
    if (!node) return;
    setPasteTargetNode(node);
    showToast(`Paste destination set to: ${node.name}`);
  };

  // 1. Rename Action
  const handleRename = async () => {
    if (!selectedNode || !renameValue.trim()) {
      showToast('Please enter a valid task name', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/tools/task-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'RENAME_NODE',
          nodeId: selectedNode.id,
          newName: renameValue.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTreeData(data.rootNode);
        setSelectedNode(prev => ({ ...prev, name: renameValue.trim() }));
        showToast('Task renamed successfully!');
      } else {
        showToast('Failed to rename node', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error renaming task', 'error');
    }
  };

  // 2. Paste Action
  const handlePaste = async () => {
    if (!copiedNode) {
      showToast('Please choose a node to copy first', 'error');
      return;
    }

    const targetId = pasteTargetNode ? pasteTargetNode.id : (selectedNode ? selectedNode.id : treeData?.id);

    try {
      const res = await fetch('/api/engineering/tools/task-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'COPY_PASTE_NODE',
          sourceNodeId: copiedNode.id,
          targetNodeId: targetId,
          copyWithRate,
          reason: copyReason,
          remark: copyRemark
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTreeData(data.rootNode);
        showToast(`Successfully pasted "${copiedNode.name}" into ${pasteTargetNode?.name || 'group'}!`);
        setCopyRemark('');
      } else {
        showToast('Failed to paste node', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error pasting node', 'error');
    }
  };

  // 3. Move Up / Down
  const handleMove = async (direction) => {
    if (!selectedNode) {
      showToast('Please select a task to move', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/tools/task-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'MOVE_NODE',
          nodeId: selectedNode.id,
          direction
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTreeData(data.rootNode);
        showToast(`Moved ${direction.toLowerCase()}!`);
      }
    } catch (err) {
      console.error(err);
      showToast(`Error moving task`, 'error');
    }
  };

  // 4. Delete Action
  const handleDelete = async () => {
    if (!selectedNode) {
      showToast('Please select a node to delete', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${selectedNode.name}"?`)) return;

    try {
      const res = await fetch('/api/engineering/tools/task-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'DELETE_NODE',
          nodeId: selectedNode.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTreeData(data.rootNode);
        setSelectedNode(null);
        setRenameValue('');
        showToast('Task removed from hierarchy!');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting task', 'error');
    }
  };

  // 5. Add New Node
  const handleSaveAddNode = async (e) => {
    e.preventDefault();
    const parentId = selectedNode ? selectedNode.id : treeData?.id;

    try {
      const res = await fetch('/api/engineering/tools/task-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'ADD_NODE',
          parentNodeId: parentId,
          nodeType: newNodeForm.type,
          name: newNodeForm.name,
          qty: newNodeForm.qty,
          unit: newNodeForm.unit,
          rate: newNodeForm.rate
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTreeData(data.rootNode);
        setShowAddModal(false);
        setNewNodeForm({ type: 'task', name: '', qty: 100, unit: 'Nos', rate: 250 });
        showToast('New item added to hierarchy!');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating new item', 'error');
    }
  };

  // Recursive Tree Renderer to match user's screenshot layout
  const renderTreeNode = (node, depth = 0) => {
    if (!node) return null;

    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const isProject = node.type === 'project';
    const isGroup = node.type === 'group';
    const isSubgroup = node.type === 'subgroup';
    const isTask = node.type === 'task';

    // Search filter check
    const matchesSearch = searchQuery ? node.name?.toLowerCase().includes(searchQuery.toLowerCase()) : true;

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? '16px' : '0px' }}>
        <div 
          onClick={() => handleSelectNode(node)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            background: isSelected ? '#fef3c7' : 'transparent',
            color: isSelected ? '#b45309' : '#1e293b',
            fontWeight: isSelected ? 700 : (isGroup || isProject ? 700 : 500),
            fontSize: '12px',
            userSelect: 'none',
            transition: 'background 0.1s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => !isSelected && (e.currentTarget.style.background = '#f1f5f9')}
          onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
        >
          {/* Arrow for expandable nodes */}
          {hasChildren ? (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: '#64748b' }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span style={{ width: '14px', display: 'inline-block' }}></span>
          )}

          {/* Node Icon matching screenshot */}
          {isProject ? (
            <CheckSquare size={14} color="#0284c7" />
          ) : isGroup || isSubgroup ? (
            <CheckSquare size={14} color="#059669" />
          ) : (
            // Brick icon for tasks as in screenshot
            <span style={{ fontSize: '13px', lineHeight: 1 }}>🧱</span>
          )}

          {/* Node Text */}
          <span style={{
            color: isSelected ? '#b45309' : (isTask ? '#334155' : '#0f172a'),
            fontWeight: isSelected ? 800 : (isTask ? 500 : 700)
          }}>
            {node.name}
            {isTask && (
              <span style={{ color: isSelected ? '#b45309' : '#64748b', fontWeight: 600, marginLeft: '4px' }}>
                - {node.qty !== undefined ? node.qty : 0} {node.unit || 'Nos'}
              </span>
            )}
          </span>
        </div>

        {/* Children nodes */}
        {hasChildren && isExpanded && (
          <div style={{ borderLeft: '1px dotted #cbd5e1', marginLeft: '7px', paddingLeft: '4px' }}>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="custom-horizontal-scrollbar" 
      style={{ 
        padding: '1.25rem 1.75rem', 
        background: '#f8fafc', 
        minHeight: 'calc(100vh - 60px)', 
        color: '#0f172a',
        overflowX: 'auto',
        minWidth: 0,
        scrollbarWidth: 'thin',
        scrollbarColor: '#0284c7 #e2e8f0'
      }}
    >
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar matching Screenshot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Menu size={20} color="#0f172a" />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Task Operations
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleSyncTaskLibrary}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#ffffff', border: '1px solid #cbd5e1', color: '#0284c7',
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
            }}
            title="Sync tree directly from Task Library"
          >
            <RefreshCw size={13} color="#0284c7" /> Sync Task Library
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
            <Home size={13} /> Home &gt; Tools &gt; <b>Task Operations</b>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Workspace matching user's screenshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: TreeView Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Project Dropdown at Top */}
          <div style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={loadingProjects}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input with Magnifier icon */}
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
            <input 
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 28px 6px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <Search size={14} style={{ position: 'absolute', right: '16px', top: '14px', color: '#64748b' }} />
          </div>

          {/* TreeView Header */}
          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '4px solid #0284c7', boxSizing: 'border-box' }}></div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>TreeView</span>
          </div>

          {/* Tree Content with dedicated horizontal & vertical scrollbar */}
          <div 
            className="custom-horizontal-scrollbar" 
            style={{ 
              padding: '0.75rem', 
              maxHeight: '620px', 
              minHeight: '440px',
              overflowY: 'auto', 
              overflowX: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#0284c7 #e2e8f0'
            }}
          >
            {loadingTree ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '12px' }}>Loading task hierarchy...</p>
              </div>
            ) : treeData ? (
              <div>
                {/* Root ▼ All */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  <ChevronDown size={14} />
                  <span>All</span>
                </div>

                <div style={{ marginLeft: '14px' }}>
                  {renderTreeNode(treeData)}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>No hierarchy loaded.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Operations Tab Panel */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          {/* Active Tab Header */}
          <div style={{ borderBottom: '1px solid #e2e8f0', padding: '0.5rem 1rem', background: '#ffffff', display: 'flex', gap: '6px' }}>
            <button 
              type="button" 
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderBottom: 'none',
                padding: '6px 14px',
                borderRadius: '6px 6px 0 0',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0284c7',
                cursor: 'pointer'
              }}
            >
              Task Operations
            </button>
          </div>

          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* BOX 1: Task Rename */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Task Rename
              </div>

              <div style={{ padding: '1rem' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>
                  Task Name
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Select a task or enter new name"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleRename}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      padding: '7px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Edit3 size={13} />
                    Rename
                  </button>
                </div>
              </div>
            </div>

            {/* BOX 2: Copy/Paste */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Header with toolbar buttons */}
              <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  Copy/Paste
                </span>

                {/* Toolbar Buttons matching Screenshot (+, Copy, Paste, Up, Down, X) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Add new task under selected node"
                  >
                    <Plus size={13} color="#0284c7" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetCopiedNode()}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Set selected node as Node to Copy"
                  >
                    <Copy size={13} color="#475569" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePaste}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Paste copied node"
                  >
                    <Clipboard size={13} color="#475569" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMove('UP')}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Move selected node Up"
                  >
                    <ArrowUp size={13} color="#475569" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMove('DOWN')}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Move selected node Down"
                  >
                    <ArrowDown size={13} color="#475569" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Delete selected task"
                  >
                    <X size={13} color="#dc2626" />
                  </button>
                </div>
              </div>

              {/* Form Content matching Screenshot */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Row 1: Node to Copy & Paste to */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                      Node to Copy
                    </label>
                    <input 
                      type="text"
                      readOnly
                      value={copiedNode ? `${copiedNode.name} (${copiedNode.type})` : ''}
                      placeholder="Select a node and click Copy"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: '#f8fafc',
                        color: '#1e293b',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                      Paste to
                    </label>
                    <input 
                      type="text"
                      readOnly
                      value={pasteTargetNode ? `${pasteTargetNode.name} (${pasteTargetNode.type})` : 'No Node Selected'}
                      placeholder="Click target parent node in tree"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: '#f8fafc',
                        color: pasteTargetNode ? '#0284c7' : '#94a3b8',
                        fontWeight: pasteTargetNode ? 600 : 400,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Copy with task rate & Reason */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                      Copy with task rate
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px' }}>
                      <input 
                        type="checkbox"
                        checked={copyWithRate}
                        onChange={(e) => setCopyWithRate(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: '#475569' }}>Include unit rate and estimation budget</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                      Reason
                    </label>
                    <select
                      value={copyReason}
                      onChange={(e) => setCopyReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="New Assignment">New Assignment</option>
                      <option value="Scope Revision">Scope Revision</option>
                      <option value="Duplicate Activity">Duplicate Activity</option>
                      <option value="Site Variation">Site Variation</option>
                      <option value="Subcontractor Allocation">Subcontractor Allocation</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Remark */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                    Remark
                  </label>
                  <input 
                    type="text"
                    value={copyRemark}
                    onChange={(e) => setCopyRemark(e.target.value)}
                    placeholder="Enter operation remarks or audit notes..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Bottom Right: Paste Button matching Screenshot */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handlePaste}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      padding: '7px 20px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Clipboard size={14} />
                    Paste
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add New Node */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Add New Item to Hierarchy
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddNode}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Item Type *
                  </label>
                  <select
                    value={newNodeForm.type}
                    onChange={(e) => setNewNodeForm({ ...newNodeForm, type: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                  >
                    <option value="task">Task / Material (Execution)</option>
                    <option value="subgroup">Subgroup (WBS Level 2)</option>
                    <option value="group">Group (WBS Level 1)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Item Name *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Copper Earth Mat 25x3mm"
                    value={newNodeForm.name}
                    onChange={(e) => setNewNodeForm({ ...newNodeForm, name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                {newNodeForm.type === 'task' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Qty</label>
                      <input 
                        type="number"
                        value={newNodeForm.qty}
                        onChange={(e) => setNewNodeForm({ ...newNodeForm, qty: e.target.value })}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Unit</label>
                      <input 
                        type="text"
                        value={newNodeForm.unit}
                        onChange={(e) => setNewNodeForm({ ...newNodeForm, unit: e.target.value })}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Rate (₹)</label>
                      <input 
                        type="number"
                        value={newNodeForm.rate}
                        onChange={(e) => setNewNodeForm({ ...newNodeForm, rate: e.target.value })}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: '#e2e8f0', border: 'none', color: '#475569', padding: '6px 14px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', border: 'none', color: 'white', padding: '6px 18px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
