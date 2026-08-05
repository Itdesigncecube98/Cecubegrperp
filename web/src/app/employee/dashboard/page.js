'use client';
import React, { useState, useEffect } from 'react';
import { getEmployeeStats, updateEmployee, getPunchRequests, createPunchRequest, getEmployees } from '../../../lib/data';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Plus, X, Trash2, UserCircle, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboard() {
  const [statsData, setStatsData] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState('Day');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const router = useRouter();

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ empId: '', name: '', email: '', department: '', password: '' });

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      loadStats(parsed.id);
    }
  }, []);

  const loadStats = async (id) => {
    try {
      const data = await getEmployeeStats(id);
      setStatsData(data);
      const reqs = await getPunchRequests(null, id);
      setPendingRequests(reqs.filter(r => r.status === 'PENDING' && r.date === new Date().toISOString().split('T')[0]));
      
      const allEmps = await getEmployees();
      setIsSupervisor(allEmps.some(e => e.supervisorId === id));
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalTime = (slots) => {
    if (!slots || slots.length === 0) return '-';
    let totalMinutes = 0;
    slots.forEach(slot => {
      if (slot.in && slot.out) {
        const [inH, inM] = slot.in.split(':').map(Number);
        const [outH, outM] = slot.out.split(':').map(Number);
        const inTotal = (inH || 0) * 60 + (inM || 0);
        let outTotal = (outH || 0) * 60 + (outM || 0);
        
        if (outTotal < inTotal) {
          const adjustedOut = outTotal + 12 * 60;
          if (adjustedOut >= inTotal) {
            outTotal = adjustedOut; 
          } else {
            outTotal += 24 * 60; 
          }
        }
        
        totalMinutes += (outTotal - inTotal);
      }
    });
    if (totalMinutes === 0) return '-';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  // Profile Handlers
  const openProfileModal = () => {
    setProfileData({ 
      empId: employee.empId || '',
      name: employee.name, 
      email: employee.email,
      department: employee.department,
      password: employee.password || '' 
    });
    setIsProfileModalOpen(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profileData.name || !profileData.password || !profileData.email) return showToast('Name, Email and Password are required', 'error');
    try {
      const res = await updateEmployee(employee.id, profileData);
      if (res.id) {
        // Update local state and session storage
        setEmployee(res);
        sessionStorage.setItem('employeeData', JSON.stringify(res));
        setIsProfileModalOpen(false);
        showToast('Profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile', 'error');
    }
  };

  const handleAction = async (reqId, status) => {
    try {
      await updatePunchRequestStatus(reqId, status);
      showToast(`Request ${status.toLowerCase()} successfully!`);
      loadStats(employee.id);
    } catch (e) {
      console.error('Failed to update status', e);
      showToast('Failed to update status', 'error');
    }
  };

  // Helper to calculate distance in meters (Haversine formula)
  const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; 
    return d;
  };

  const handlePunch = async (action, todayRecord, todayDate) => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", 'error');
      return;
    }

    // Attempt to get location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const empLat = position.coords.latitude;
        const empLon = position.coords.longitude;
        
        // CeCube Engineering India exact coordinates
        const OFFICE_LAT = 28.5125122;
        const OFFICE_LON = 77.0234885;
        const MAX_DISTANCE = 500; // allowed radius in meters

        const distance = getDistanceFromLatLonInM(empLat, empLon, OFFICE_LAT, OFFICE_LON);

        if (distance > MAX_DISTANCE) {
          showToast(`You are not at the office! Distance: ${Math.round(distance)}m.`, 'error');
          return;
        }

        try {
          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          let newSlots = [];
          if (action === 'in') {
            if (todayRecord && todayRecord.timeSlots) {
              newSlots = [...todayRecord.timeSlots, { in: currentTime, out: '' }];
            } else {
              newSlots = [{ in: currentTime, out: '' }];
            }
          } else if (action === 'out') {
            if (todayRecord && todayRecord.timeSlots) {
              newSlots = [...todayRecord.timeSlots];
              newSlots[newSlots.length - 1].out = currentTime;
            } else {
              newSlots = [{ in: '', out: currentTime }];
            }
          }

          // Use 'Present' status by default when punching in initially. Admin can change later.
          const status = todayRecord ? todayRecord.status : 'Present';
          const shiftTypeToSave = todayRecord ? todayRecord.shiftType : selectedShift;
          
          await createPunchRequest({
            employeeId: employee.id,
            type: action === 'in' ? 'IN' : 'OUT',
            time: currentTime,
            date: todayDate,
            shiftType: shiftTypeToSave
          });
          
          loadStats(employee.id); // Reload stats immediately
          showToast(`Punch ${action} request sent successfully for approval!`);
        } catch (err) {
          console.error(err);
          showToast(`Failed to send punch ${action} request`, 'error');
        }
      },
      (error) => {
        console.error("Location error:", error);
        showToast(`Unable to retrieve your location. Please allow location access.`, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (loading || !employee) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your dashboard...</div>;
  }

  const currentMonthData = statsData.length > 0 ? statsData[0] : null;

  // Smart Punch Detection
  const todayDate = new Date().toISOString().split('T')[0];
  let todayRecord = null;
  let isPunchedIn = false;

  if (currentMonthData && currentMonthData.details) {
    todayRecord = currentMonthData.details.find(d => d.date === todayDate);
    if (todayRecord && todayRecord.timeSlots && todayRecord.timeSlots.length > 0) {
      const lastSlot = todayRecord.timeSlots[todayRecord.timeSlots.length - 1];
      if (lastSlot.in && !lastSlot.out) {
        isPunchedIn = true;
      }
    }
  }

  const hasPendingIn = pendingRequests.some(r => r.type === 'IN');
  const hasPendingOut = pendingRequests.some(r => r.type === 'OUT');

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Welcome back, {employee.name.split(' ')[0]}!</h1>
          <p className="page-subtitle">Here is your attendance overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isSupervisor && (
            <button className="btn-outline" onClick={() => router.push('/employee/supervisor')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              <Shield size={18} /> Supervisor Dashboard
            </button>
          )}
          <button className="btn-outline" onClick={openProfileModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCircle size={18} /> Edit Profile
          </button>
          <button className="btn-outline" onClick={() => router.push('/employee/leave')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', borderColor: '#34d399', backgroundColor: '#ecfdf5' }}>
            <Calendar size={18} /> Leaves
          </button>
          
          {isPunchedIn ? (
            <button 
              className="btn-danger" 
              onClick={() => handlePunch('out', todayRecord, todayDate)} 
              disabled={hasPendingOut}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: hasPendingOut ? 0.6 : 1, cursor: hasPendingOut ? 'not-allowed' : 'pointer' }}
            >
              <Clock size={18} /> {hasPendingOut ? 'Punch Out Pending' : 'Punch Out'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!todayRecord && !hasPendingIn && (
                <select 
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="status-select"
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
                >
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
              )}
              <button 
                className="btn-primary" 
                onClick={() => handlePunch('in', todayRecord, todayDate)} 
                disabled={hasPendingIn}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: hasPendingIn ? 0.6 : 1, cursor: hasPendingIn ? 'not-allowed' : 'pointer' }}
              >
                <Clock size={18} /> {hasPendingIn ? 'Punch In Pending' : 'Punch In'}
              </button>
            </div>
          )}
        </div>
      </div>

      {currentMonthData && (
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#dcfce7', padding: '1rem', borderRadius: '50%', color: '#15803d' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Present ({currentMonthData.month})</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{currentMonthData.Present} Days</h2>
            </div>
          </div>
          
          <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '50%', color: '#b45309' }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Late ({currentMonthData.month})</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{currentMonthData.Late} Days</h2>
            </div>
          </div>

          <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '50%', color: '#b91c1c' }}>
              <XCircle size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Absent ({currentMonthData.month})</p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{currentMonthData.Absent} Days</h2>
            </div>
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="glass-panel table-container" style={{ marginBottom: '2.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fffbeb' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} /> Pending Punch Requests
            </h2>
          </div>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map(req => (
                <tr key={req.id}>
                  <td>{req.date}</td>
                  <td>
                    <span className={`badge badge-${req.type === 'IN' ? 'success' : 'danger'}`}>
                      PUNCH {req.type}
                    </span>
                  </td>
                  <td>{req.time}</td>
                  <td>
                    <span className="badge badge-warning">Pending Approval</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="glass-panel">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="var(--accent-color)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Attendance History</h2>
        </div>
        
        <div className="table-container">
          <table style={{ marginBottom: '0' }}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {statsData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state" style={{ padding: '3rem' }}>No attendance records found yet.</td>
                </tr>
              ) : (
                statsData.map(stat => (
                  <React.Fragment key={stat.month}>
                    <tr>
                      <td style={{ fontWeight: '600' }}>{stat.month}</td>
                      <td><span className="badge badge-success">{stat.Present}</span></td>
                      <td><span className="badge badge-warning">{stat.Late}</span></td>
                      <td><span className="badge badge-danger">{stat.Absent}</span></td>
                      <td className="text-right">
                        <button 
                          className="btn-outline" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => setExpandedMonth(expandedMonth === stat.month ? null : stat.month)}
                        >
                          {expandedMonth === stat.month ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedMonth === stat.month && (
                      <tr>
                        <td colSpan="5" style={{ padding: '0', backgroundColor: '#f9fafb' }}>
                          <table style={{ margin: '1rem', width: 'calc(100% - 2rem)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <thead>
                              <tr>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Date</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Status</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Shift</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Time Slots (In - Out)</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Total Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stat.details.map(d => (
                                <tr key={d.date} style={{ backgroundColor: '#ffffff' }}>
                                  <td style={{ padding: '0.75rem 1rem' }}>{d.date}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span className={`badge ${
                                      d.status === 'Present' ? 'badge-success' : 
                                      d.status === 'Late' ? 'badge-warning' : 
                                      d.status === 'Absent' ? 'badge-danger' : ''
                                    }`}>{d.status}</span>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {d.shiftType || '-'}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    {d.timeSlots && d.timeSlots.length > 0 ? (
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {d.timeSlots.map((slot, i) => (
                                          <span key={i} className="badge" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-hover)' }}>
                                            {slot.in || '?'} - {slot.out || '?'}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <Clock size={14} color="var(--text-secondary)"/>
                                      {calculateTotalTime(d.timeSlots)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="icon-btn" onClick={() => setIsProfileModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={saveProfile}>
              <div className="input-group">
                <label>Employee ID</label>
                <input 
                  type="text" 
                  value={profileData.empId} 
                  onChange={e => setProfileData({...profileData, empId: e.target.value})} 
                  placeholder="e.g. E-001"
                  disabled
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Name</label>
                <input 
                  required 
                  type="text" 
                  value={profileData.name} 
                  onChange={e => setProfileData({...profileData, name: e.target.value})} 
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Email</label>
                <input 
                  required
                  type="email" 
                  value={profileData.email} 
                  onChange={e => setProfileData({...profileData, email: e.target.value})} 
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Department</label>
                <input 
                  required
                  type="text" 
                  value={profileData.department} 
                  onChange={e => setProfileData({...profileData, department: e.target.value})} 
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Password</label>
                <input 
                  type="text" 
                  value={profileData.password} 
                  onChange={e => setProfileData({...profileData, password: e.target.value})} 
                  placeholder="Enter new password to change"
                />
              </div>
              <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn-outline" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: '500' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
