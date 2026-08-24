'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getEmployees, getCandidates } from '../../../../lib/data';
import { useRouter } from 'next/navigation';
import Dialog from '../../../../components/Dialog';
import { Users, ZoomIn, ZoomOut, Maximize, Plus, Trash2, X, Edit2 } from 'lucide-react';

export default function OrganizationStructure() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message, onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })) });
  const [orgNodes, setOrgNodes] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRootEmployeeId, setSelectedRootEmployeeId] = useState('');
  
  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' | 'vacant'
  const [vacantTitle, setVacantTitle] = useState('');
  const [vacantDept, setVacantDept] = useState('');
  const [vacantDesc, setVacantDesc] = useState('');
  const [assigningNode, setAssigningNode] = useState(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignCandidateId, setAssignCandidateId] = useState('');
  const [assignMode, setAssignMode] = useState('existing'); // 'existing' | 'new' | 'candidate'
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  // Edit Vacant Position State
  const [isEditingVacantNode, setIsEditingVacantNode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editParentId, setEditParentId] = useState('');

  const containerRef = useRef(null);
  const treeRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empData, orgRes, candData] = await Promise.all([
        getEmployees(),
        fetch('/api/organization'),
        getCandidates()
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setCandidates(Array.isArray(candData) ? candData.filter(c => c.status !== 'HIRED' && c.status !== 'REJECTED') : []);
      if (orgRes.ok) {
        const nodes = await orgRes.json();
        setOrgNodes(nodes);
      }
    } catch (err) {
      console.error("Failed to load org chart data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    if (activeTab === 'vacant' && !vacantTitle) return;

    setSubmitting(true);
    try {
      // For vacant positions: parentId stores the supervisor's employee ID
      const payload = {
        isVacant: true,
        positionTitle: vacantTitle,
        department: vacantDept,
        jobDescription: vacantDesc,
        parentId: selectedParentId || null,  // supervisor's employee ID
      };

      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setVacantTitle('');
        setVacantDept('');
        setVacantDesc('');
        setSelectedParentId('');
        await fetchData();
      } else {
        const data = await res.json();
        showAlert('Notice', data.error || 'Failed to add vacant position');
      }
    } catch (err) {
      console.error(err);
      showAlert('Notice', 'Error adding vacant position');
    }
    setSubmitting(false);
  };

  const handleAssignEmployee = async (e) => {
    e.preventDefault();
    if (!assigningNode) return;
    
    setSubmitting(true);
    try {
      let finalEmployeeId = assignEmployeeId;

      if (assignMode === 'new') {
        const empRes = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newEmpName,
            email: newEmpEmail,
            password: newEmpPassword,
            department: assigningNode.department || '',
            role: 'EMPLOYEE'
          })
        });
        if (!empRes.ok) {
          const empData = await empRes.json();
          showAlert('Notice', empData.error || 'Failed to create new employee');
          setSubmitting(false);
          return;
        }
        const createdEmp = await empRes.json();
        finalEmployeeId = createdEmp.id;
      }

      let updatePayload = { id: assigningNode.id };
      
      if (assignMode === 'candidate') {
        if (!assignCandidateId) { setSubmitting(false); return; }
        updatePayload.candidateId = assignCandidateId;
      } else {
        if (!finalEmployeeId) {
          setSubmitting(false);
          return;
        }
        updatePayload.employeeId = finalEmployeeId;
      }

      const res = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        setAssigningNode(null);
        setAssignEmployeeId('');
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpPassword('');
        setAssignMode('existing');
        await fetchData();
      } else {
        const data = await res.json();
        showAlert('Notice', data.error || 'Failed to assign employee');
      }
    } catch (err) {
      console.error(err);
      showAlert('Notice', 'Error assigning employee');
    }
    setSubmitting(false);
  };

  const handleEditVacantNode = async (e) => {
    e.preventDefault();
    if (!assigningNode) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assigningNode.id,
          isVacant: true,
          positionTitle: editTitle,
          department: editDept,
          jobDescription: editDesc,
          parentId: editParentId || null
        })
      });
      if (res.ok) {
        setIsEditingVacantNode(false);
        setAssigningNode({
          ...assigningNode,
          positionTitle: editTitle,
          department: editDept,
          jobDescription: editDesc
        });
        await fetchData();
      } else {
        const data = await res.json();
        showAlert('Notice', data.error || 'Failed to update position');
      }
    } catch (err) {
      console.error(err);
      showAlert('Notice', 'Error updating position');
    }
    setSubmitting(false);
  };

  const handleRemoveNode = async (nodeId, e, customTitle, customMessage) => {
    e.stopPropagation();
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: customTitle || 'Remove Person',
      message: customMessage || 'Are you sure you want to remove this person from the organization structure?',
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/organization?id=${nodeId}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Build the manual hierarchical tree (from OrgChartNode table)
  const tree = useMemo(() => {
    if (!orgNodes || orgNodes.length === 0) return [];
    
    const nodeMap = {};
    orgNodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });

    const roots = [];
    orgNodes.forEach(node => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children.push(nodeMap[node.id]);
      } else {
        roots.push(nodeMap[node.id]);
      }
    });

    return roots;
  }, [orgNodes]);

  // Build the supervisor-based hierarchy from employee supervisorId field
  // Also merges vacant OrgChartNodes that have a supervisorEmployeeId stored in parentId
  const supervisorTree = useMemo(() => {
    if ((!employees || employees.length === 0) && (!orgNodes || orgNodes.length === 0)) return [];

    try {
      // Build empMap — only valid employees
      const empMap = {};
      employees.forEach(emp => {
        if (emp.id) empMap[emp.id] = { ...emp, children: [], isVacant: false };
      });

      // Merge vacant OrgChartNodes into supervisor hierarchy
      const vacantNodes = orgNodes.filter(n => n.isVacant);
      vacantNodes.forEach(vn => {
        let supervisorEmpId = null;
        if (vn.parentId) {
          const parentOrgNode = orgNodes.find(n => n.id === vn.parentId);
          if (parentOrgNode) {
            supervisorEmpId = parentOrgNode.employeeId;
          }
        }

        const vacantNode = {
          id: `vacant-${vn.id}`,
          name: vn.positionTitle || 'Vacant Position',
          department: vn.department || '',
          jobDescription: vn.jobDescription || '',
          isVacant: true,
          orgNodeId: vn.id,
          supervisorEmpId: supervisorEmpId,
          candidates: vn.candidates || [],
          children: []
        };
        if (supervisorEmpId && empMap[supervisorEmpId] && supervisorEmpId !== vacantNode.id) {
          empMap[supervisorEmpId].children.push(vacantNode);
        } else {
          // No supervisor → treat as top-level vacant
          empMap[vacantNode.id] = vacantNode;
        }
      });

      // Build children arrays from supervisorId (ignore self-loops to prevent trivial cycles)
      employees.forEach(emp => {
        if (emp.supervisorId && empMap[emp.supervisorId] && emp.supervisorId !== emp.id) {
          empMap[emp.supervisorId].children.push(empMap[emp.id]);
        }
      });

      // Natural roots: employees with no supervisor, supervisor not in list, or self-loop supervisor
      let roots = employees.filter(
        emp => !emp.supervisorId || !empMap[emp.supervisorId] || emp.supervisorId === emp.id
      );

      // Track reachable nodes to find disconnected components
      const reachable = new Set();
      const bfs = (nodeList) => {
        const queue = [...nodeList];
        const visited = new Set();
        while (queue.length > 0) {
          const node = queue.shift();
          if (node && !visited.has(node.id)) {
            visited.add(node.id);
            reachable.add(node.id);
            if (node.children) {
              queue.push(...node.children);
            }
          }
        }
      };

      bfs(roots.map(r => empMap[r.id]));

      // Count direct reports for tie-breaking when finding roots for disconnected components
      const directReports = {};
      employees.forEach(emp => { directReports[emp.id] = 0; });
      employees.forEach(emp => {
        if (emp.supervisorId && empMap[emp.supervisorId] && emp.supervisorId !== emp.id) {
          directReports[emp.supervisorId]++;
        }
      });

      // Resolve unreachable disconnected components
      while (reachable.size < employees.length) {
        const unreached = employees.filter(emp => !reachable.has(emp.id));
        if (unreached.length === 0) break;

        let maxReports = -1;
        let bestRoot = null;
        for (const emp of unreached) {
          if (directReports[emp.id] > maxReports) {
            maxReports = directReports[emp.id];
            bestRoot = emp;
          }
        }

        if (bestRoot) {
          // If this new root can reach existing roots, the existing roots should be demoted
          const newlyReached = new Set();
          const queue = [empMap[bestRoot.id]];
          while (queue.length > 0) {
            const node = queue.shift();
            if (node && !newlyReached.has(node.id)) {
              newlyReached.add(node.id);
              if (node.children) queue.push(...node.children);
            }
          }

          roots = roots.filter(r => !newlyReached.has(r.id));
          roots.push(bestRoot);

          for (const id of newlyReached) {
            reachable.add(id);
          }
        }
      }

      // We also need to add top-level vacant nodes (that had no valid supervisorEmpId) to roots
      const topLevelVacants = Object.values(empMap).filter(n => n.isVacant && !reachable.has(n.id));
      
      // Deduplicate roots by ID just in case
      const uniqueRootIds = new Set();
      const finalRoots = [];
      for (const r of roots) {
        if (r && r.id && !uniqueRootIds.has(r.id)) {
          uniqueRootIds.add(r.id);
          finalRoots.push(empMap[r.id]);
        }
      }

      return [...finalRoots.filter(Boolean), ...topLevelVacants];
    } catch (e) {
      console.error(e);
    }
  }, [employees, orgNodes]);

  const displayedTree = useMemo(() => {
    if (!selectedRootEmployeeId) return supervisorTree;
    
    const findNode = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const rootNode = findNode(supervisorTree, selectedRootEmployeeId);
    return rootNode ? [rootNode] : supervisorTree;
  }, [supervisorTree, selectedRootEmployeeId]);

  const handleAutoZoom = () => {
    if (containerRef.current && treeRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const treeWidth = treeRef.current.scrollWidth;
      
      if (treeWidth > 0) {
        const targetScale = (containerWidth - 80) / treeWidth; 
        if (targetScale < 1) {
          setScale(Math.max(targetScale, 0.2)); // allow zooming out to 0.2 to fit very large charts
        } else {
          setScale(1);
        }
        
        // Scroll to center of the tree to ensure the root and centered items are visible
        if (treeWidth > containerWidth) {
          containerRef.current.scrollLeft = (treeWidth - containerWidth) / 2;
        } else {
          containerRef.current.scrollLeft = 0;
        }
      }
    }
  };

  useEffect(() => {
    // Small timeout to allow DOM to render the new tree before measuring
    const timeout = setTimeout(handleAutoZoom, 100);
    return () => clearTimeout(timeout);
  }, [tree, supervisorTree, displayedTree]);

  // Render the MANUAL org chart (OrgChartNode-based)
  const renderTree = (nodes) => {
    if (!nodes || nodes.length === 0) return null;
    return (
      <ul>
        {nodes.map(node => (
          <li key={node.id}>
            <div 
              className={`org-node ${node.isVacant ? 'vacant-node' : ''}`} 
              onClick={() => {
                if (node.isVacant) {
                  setAssigningNode(node);
                  setIsEditingVacantNode(false);
                  setEditTitle(node.positionTitle || '');
                  setEditDept(node.department || '');
                  setEditDesc(node.jobDescription || '');
                } else if (node.employeeId) {
                  router.push(`/dashboard/employees/${node.employeeId}`);
                }
              }}
            >
              
              <button 
                className="remove-btn" 
                onClick={(e) => handleRemoveNode(node.id, e)}
                title="Remove from Org Chart"
              >
                <Trash2 size={14} />
              </button>

              <div className="node-photo">
                {node.isVacant ? (
                  <div className="placeholder-photo vacant-photo">
                    V
                  </div>
                ) : node.employee?.photoUrl ? (
                  <img src={node.employee.photoUrl} alt={node.employee.name} />
                ) : (
                  <div className="placeholder-photo">
                    {node.employee?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="node-details">
                <div className="node-name">{node.isVacant ? node.positionTitle : node.employee?.name}</div>
                <div className="node-designation">{node.isVacant ? (node.department || 'Vacant') : (node.employee?.department || 'Employee')}</div>
              </div>
              {node.isVacant && (
                <div className="vacant-badge">
                  {node.candidates && node.candidates.length > 0 
                    ? (node.candidates.length === 1 ? `Candidate: ${node.candidates[0].name}` : `${node.candidates.length} Candidates`)
                    : 'Vacant Position'}
                </div>
              )}
            </div>
            {node.children && node.children.length > 0 && renderTree(node.children)}
          </li>
        ))}
      </ul>
    );
  };

  // Render the SUPERVISOR-based tree (auto from employee.supervisorId)
  // visited set passed through recursion to prevent infinite loops from circular supervisorId data
  const renderSupervisorTree = (nodes, visited = new Set()) => {
    if (!nodes || nodes.length === 0) return null;
    return (
      <ul>
        {nodes.map(emp => {
          if (!emp || visited.has(emp.id)) return null;
          const nextVisited = new Set(visited);
          nextVisited.add(emp.id);
          return (
            <li key={emp.id}>
              <div
                className={`org-node ${
                  emp.isVacant ? 'vacant-node' :
                  emp.role === 'SUPERVISOR' ? 'supervisor-node' : ''
                }`}
                onClick={() => {
                  if (emp.isVacant) {
                    setAssigningNode({ id: emp.orgNodeId, positionTitle: emp.name, department: emp.department, jobDescription: emp.jobDescription });
                    setIsEditingVacantNode(false);
                  } else {
                    router.push(`/dashboard/employees/${emp.id}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="node-photo">
                  {!emp.isVacant && emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name} onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex'; }} />
                  ) : null}
                  <div className="placeholder-photo" style={{
                    display: (!emp.isVacant && emp.photoUrl) ? 'none' : 'flex',
                    background: emp.isVacant
                      ? 'linear-gradient(135deg,#94a3b8,#64748b)'
                      : emp.role === 'SUPERVISOR'
                        ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                        : 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                  }}>
                    {emp.isVacant ? '?' : emp.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="node-details">
                  <div className="node-name">{emp.isVacant ? (emp.name || 'Vacant Position') : emp.name}</div>
                  <div className="node-designation">{emp.department || (emp.isVacant ? 'Open Role' : 'Employee')}</div>
                  {emp.isVacant && <div className="vacant-badge">
                    {emp.candidates && emp.candidates.length > 0 
                      ? (emp.candidates.length === 1 ? `Candidate: ${emp.candidates[0].name}` : `${emp.candidates.length} Candidates`)
                      : 'Vacant Position'}
                  </div>}
                  {!emp.isVacant && emp.role === 'SUPERVISOR' && <div className="supervisor-badge">Supervisor</div>}
                </div>
                {emp.isVacant && (
                  <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: '4px' }}>
                    <button
                      onClick={e => { 
                        e.stopPropagation(); 
                        setAssigningNode({ id: emp.orgNodeId, positionTitle: emp.name, department: emp.department, jobDescription: emp.jobDescription, candidates: emp.candidates });
                        setEditTitle(emp.name);
                        setEditDept(emp.department);
                        setEditDesc(emp.jobDescription || '');
                        setEditParentId(emp.supervisorEmpId || '');
                        setIsEditingVacantNode(true); 
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                      title="Edit vacant position"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveNode(emp.orgNodeId, e, 'Remove Vacant Position', 'Are you sure you want to remove this vacant position?'); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
                      title="Remove vacant position"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
              {emp.children && emp.children.length > 0 && renderSupervisorTree(emp.children, nextVisited)}
            </li>
          );
        })}
      </ul>
    );
  };

  const availableEmployees = employees.filter(emp => !orgNodes.some(n => n.employeeId === emp.id));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="#3b82f6" /> Organization Structure
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Auto-generated from supervisor assignments</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            value={selectedRootEmployeeId}
            onChange={(e) => setSelectedRootEmployeeId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: 13, fontWeight: 600, color: '#334155', background: 'white', maxWidth: '200px' }}
          >
            <option value="">View All (Whole Org)</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setActiveTab('vacant'); setIsModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <Plus size={15} /> Add Vacant Position
          </button>
          <div style={{ display: 'flex', gap: '6px', background: 'white', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} style={btnStyle} title="Zoom In"><ZoomIn size={18} /></button>
            <button onClick={handleAutoZoom} style={btnStyle} title="Fit to Screen"><Maximize size={18} /></button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} style={btnStyle} title="Zoom Out"><ZoomOut size={18} /></button>
          </div>
        </div>
      </div>

      <div className="org-container" ref={containerRef}>
        <div className="tree" ref={treeRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          {displayedTree.length > 0 ? renderSupervisorTree(displayedTree) : (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'rgba(255,255,255,0.5)', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
              <Users size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>No Employees Found</h3>
              <p style={{ margin: 0 }}>Add employees and assign supervisors to build the hierarchy.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Add to Organization Chart</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddNode}>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Position Title *</label>
                  <input
                    type="text"
                    value={vacantTitle}
                    onChange={e => setVacantTitle(e.target.value)}
                    required
                    placeholder="e.g. Senior Engineer"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Department</label>
                  <input
                    type="text"
                    value={vacantDept}
                    onChange={e => setVacantDept(e.target.value)}
                    placeholder="e.g. Engineering"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Job Description</label>
                  <textarea 
                    value={vacantDesc}
                    onChange={e => setVacantDesc(e.target.value)}
                    placeholder="Details about this role..."
                    rows="3"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  ></textarea>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Reports To (Supervisor)</label>
                  <select
                    value={selectedParentId}
                    onChange={e => setSelectedParentId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">-- None (Top Level) --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || 'No Dept'})</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={submitting || !vacantTitle} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                    {submitting ? 'Adding...' : 'Add to Chart'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningNode && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{isEditingVacantNode ? 'Edit Vacant Position' : 'Assign Employee to Vacant Position'}</h2>
              <button className="icon-btn" onClick={() => setAssigningNode(null)}><X size={20} /></button>
            </div>
            
            {isEditingVacantNode ? (
              <form onSubmit={handleEditVacantNode}>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Position Title</label>
                    <input 
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Department</label>
                    <input 
                      type="text"
                      value={editDept}
                      onChange={e => setEditDept(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Job Description</label>
                    <textarea 
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      rows="3"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                    ></textarea>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Reports To (Supervisor)</label>
                    <select
                      value={editParentId}
                      onChange={e => setEditParentId(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    >
                      <option value="">-- None (Top Level) --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || 'No Dept'})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => setIsEditingVacantNode(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={submitting || !editTitle} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAssignEmployee}>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsEditingVacantNode(true)}
                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                      title="Edit Position Details"
                      onMouseOver={e => e.currentTarget.style.color = '#3b82f6'}
                      onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                    >
                      <Edit2 size={16} />
                    </button>
                    
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a', paddingRight: '24px' }}>{assigningNode.positionTitle}</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{assigningNode.department}</p>
                    
                    {assigningNode.jobDescription && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Job Description</h4>
                        <p style={{ margin: 0, fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {assigningNode.jobDescription}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                    <button type="button" onClick={() => setAssignMode('existing')} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: assignMode === 'existing' ? 'white' : 'transparent', border: 'none', boxShadow: assignMode === 'existing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 600, color: assignMode === 'existing' ? '#0f172a' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>Existing Employee</button>
                    <button type="button" onClick={() => setAssignMode('candidate')} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: assignMode === 'candidate' ? 'white' : 'transparent', border: 'none', boxShadow: assignMode === 'candidate' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 600, color: assignMode === 'candidate' ? '#0f172a' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>Assign Candidate</button>
                    <button type="button" onClick={() => setAssignMode('new')} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: assignMode === 'new' ? 'white' : 'transparent', border: 'none', boxShadow: assignMode === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 600, color: assignMode === 'new' ? '#0f172a' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>Add Employee</button>
                  </div>

                  {assignMode === 'existing' ? (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Select Employee</label>
                      <select
                        value={assignEmployeeId}
                        onChange={e => setAssignEmployeeId(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                        required={assignMode === 'existing'}
                      >
                        <option value="">-- Select an employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : assignMode === 'candidate' ? (
                    <div style={{ marginBottom: '24px' }}>
                      {assigningNode.candidates && assigningNode.candidates.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Currently Assigned Candidates</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {assigningNode.candidates.map(c => (
                              <div key={c.id} style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                {c.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Add Another Candidate</label>
                      <select
                        value={assignCandidateId}
                        onChange={e => setAssignCandidateId(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                        required={assignMode === 'candidate'}
                      >
                        <option value="">-- Select a candidate --</option>
                        {candidates.filter(c => !(assigningNode.candidates || []).find(ac => ac.id === c.id)).map(cand => (
                          <option key={cand.id} value={cand.id}>{cand.name} {cand.appliedFor ? `(${cand.appliedFor})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Name</label>
                        <input type="text" required={assignMode === 'new'} value={newEmpName} onChange={e => setNewEmpName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email</label>
                        <input type="email" required={assignMode === 'new'} value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Password</label>
                        <input type="password" required={assignMode === 'new'} value={newEmpPassword} onChange={e => setNewEmpPassword(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => setAssigningNode(null)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={submitting || (assignMode === 'existing' && !assignEmployeeId) || (assignMode === 'new' && (!newEmpName || !newEmpEmail || !newEmpPassword)) || (assignMode === 'candidate' && !assignCandidateId)} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                      {submitting ? 'Processing...' : (assignMode === 'existing' ? 'Assign Employee' : assignMode === 'candidate' ? 'Assign Candidate' : 'Create & Assign')}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .org-container {
          flex: 1;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          overflow: auto;
          position: relative;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
          padding: 40px;
          text-align: center;
        }

        .tree {
          transition: transform 0.2s ease-in-out;
          display: inline-block;
          text-align: left;
        }

        .tree ul {
          padding-top: 30px;
          position: relative;
          transition: all 0.5s;
          display: flex;
          justify-content: center;
          padding-left: 0;
        }

        .tree li {
          float: left;
          text-align: center;
          list-style-type: none;
          position: relative;
          padding: 30px 10px 0 10px;
          transition: all 0.5s;
        }

        /* Connectors */
        .tree li::before, .tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #3b82f6;
          width: 50%;
          height: 30px;
        }
        .tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #3b82f6;
        }

        /* Remove connectors for single children */
        .tree li:only-child::after, .tree li:only-child::before {
          display: none;
        }
        .tree li:only-child {
          padding-top: 0;
        }

        /* First/Last child border logic */
        .tree li:first-child::before, .tree li:last-child::after {
          border: 0 none;
        }
        .tree li:last-child::before {
          border-right: 2px solid #3b82f6;
          border-radius: 0 5px 0 0;
        }
        .tree li:first-child::after {
          border-radius: 5px 0 0 0;
        }

        /* Parent connector */
        .tree ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #3b82f6;
          width: 0;
          height: 30px;
        }

        /* Node Styling */
        .org-node {
          background: linear-gradient(to bottom, #ffffff, #eff6ff);
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          display: inline-block;
          min-width: 180px;
          text-align: center;
          padding: 16px 12px 12px 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          z-index: 10;
        }
        
        .org-node:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px rgba(59, 130, 246, 0.1), 0 4px 6px rgba(59, 130, 246, 0.05);
          border-color: #60a5fa;
        }

        .remove-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .org-node:hover .remove-btn {
          opacity: 1;
        }
        
        .remove-btn:hover {
          transform: scale(1.1);
          background: #b91c1c;
        }

        .node-photo {
          width: 70px;
          height: 70px;
          margin: 0 auto 10px auto;
          border-radius: 50%;
          background: #fff;
          padding: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .node-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .placeholder-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
        }

        .node-name {
          font-weight: 700;
          color: #1e3a8a;
          font-size: 15px;
          margin-bottom: 2px;
        }

        .node-designation {
          font-weight: 600;
          color: #3b82f6;
          font-size: 13px;
          font-style: italic;
        }
        
        .vacant-node {
          border: 2px dashed #94a3b8;
          background: #f8fafc;
        }
        .vacant-photo {
          background: linear-gradient(135deg, #94a3b8, #64748b);
        }
        .vacant-badge {
          display: inline-block;
          margin-top: 8px;
          padding: 2px 8px;
          background: #e2e8f0;
          color: #475569;
          font-size: 10px;
          font-weight: bold;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .supervisor-node {
          background: linear-gradient(to bottom, #fffbeb, #fef3c7);
          border: 1.5px solid #fbbf24;
        }
        .supervisor-node:hover {
          border-color: #f59e0b;
          box-shadow: 0 10px 15px rgba(245, 158, 11, 0.15), 0 4px 6px rgba(245, 158, 11, 0.08);
        }
        .supervisor-badge {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          background: #fef3c7;
          color: #92400e;
          font-size: 10px;
          font-weight: 700;
          border-radius: 12px;
          text-transform: uppercase;
          border: 1px solid #fde68a;
        }
          
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          width: 100%;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
          max-height: 90vh;
        }
        
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }
      `}</style>
      <Dialog isOpen={dialogConfig.isOpen} type={dialogConfig.type} title={dialogConfig.title} message={dialogConfig.message} onConfirm={dialogConfig.onConfirm} onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}

const btnStyle = {
  background: 'white',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
};
