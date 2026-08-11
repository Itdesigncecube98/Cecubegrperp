'use client';
import React, { useState, useEffect } from 'react';
import { getEmployeeStats, updateEmployee, getPunchRequests, createPunchRequest, getEmployees, getAnnouncements, getLocationRequests, updateLocationRequest, pingLocation, getLocations } from '../../../lib/data';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Plus, X, Trash2, UserCircle, Shield, Bell, MapPin, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboard() {
  const [statsData, setStatsData] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState('Day');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLocationRequests, setPendingLocationRequests] = useState([]);
  const [activeLocationRequests, setActiveLocationRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [selectedMovementType, setSelectedMovementType] = useState('Office to Site');
  const [announcements, setAnnouncements] = useState([]);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [gpsLocations, setGpsLocations] = useState([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
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

  // Regularize Modal State
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [regularizeData, setRegularizeData] = useState({ date: '', reason: '', inTime: '', outTime: '' });

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      loadStats(parsed.id);

      const interval = setInterval(() => {
        loadStats(parsed.id, false);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  async function loadStats(id, showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      // Critical path only — unblock UI fast
      const [data, reqs] = await Promise.all([
        getEmployeeStats(id).catch(() => []),
        getPunchRequests(null, id).catch(() => [])
      ]);

      setStatsData(Array.isArray(data) ? data : []);
      setPendingRequests(Array.isArray(reqs) ? reqs.filter(r => r.status === 'PENDING') : []);
    } catch (e) {
      if (e.message !== 'Failed to fetch') console.error('Failed to load stats', e);
    } finally {
      if (showLoader) setLoading(false);
    }

    // Deferred: secondary widgets (do not block Punch In)
    Promise.all([
      getLocationRequests(id).catch(() => []),
      fetch(`/api/trips?employeeId=${id}`).then(r => r.json()).catch(() => []),
      getAnnouncements().catch(() => []),
      getLocations().catch(() => []),
      fetch(`/api/employees?checkSupervisor=${id}`).then(r => r.json()).catch(() => ({ isSupervisor: false }))
    ]).then(([locReqs, tripData, anns, locs, supervisorFlag]) => {
      if (Array.isArray(locReqs)) {
        setPendingLocationRequests(locReqs.filter(r => r.status === 'PENDING'));
        setActiveLocationRequests(locReqs.filter(r => r.status === 'ACTIVE'));
      }
      if (Array.isArray(tripData)) {
        setActiveTrips(tripData.filter(t => t.status === 'ACTIVE'));
        setPendingTrips(tripData.filter(t => t.status === 'REQUESTED'));
      }
      setAnnouncements(Array.isArray(anns) ? anns : []);
      setGpsLocations(Array.isArray(locs) ? locs.filter(l => l.isActive) : []);
      setIsSupervisor(!!supervisorFlag?.isSupervisor);
    });
  }

  // Local calendar date (IST-safe) — avoid UTC day mismatch
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const patchTodayInStats = (prev, date, slots, shiftType) => {
    const month = date.slice(0, 7);
    const list = Array.isArray(prev) ? prev.map(m => ({ ...m, details: [...(m.details || [])] })) : [];
    let monthData = list.find(m => m.month === month);
    if (!monthData) {
      monthData = { month, Present: 0, Absent: 0, details: [] };
      list.unshift(monthData);
    }
    const idx = monthData.details.findIndex(d => d.date === date);
    const row = { date, status: 'Present', shiftType, timeSlots: slots };
    if (idx >= 0) monthData.details[idx] = { ...monthData.details[idx], ...row };
    else {
      monthData.details.unshift(row);
      monthData.Present = (monthData.Present || 0) + 1;
    }
    return list;
  };

  const [isPunching, setIsPunching] = useState(false);
  const [localPunchState, setLocalPunchState] = useState(null); // 'in' | 'out' | null

  const getPunchCoords = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 2500, maximumAge: 60000 }
      );
    });

  const normalizeTimeInput = (value) => {
    if (!value || typeof value !== 'string') return '';
    const parts = value.trim().split(':');
    if (parts.length !== 2) return value;
    const [h, m] = parts;
    const hours = String(Math.max(0, Math.min(23, Number(h)))).padStart(2, '0');
    const mins = String(Math.max(0, Math.min(59, Number(m)))).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const handlePunch = async (action, todayRecord, todayDate) => {
    if (isPunching) return;
    setIsPunching(true);
    // Instant button switch — NEVER wait for supervisor approval
    setLocalPunchState(action === 'in' ? 'in' : 'out');

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const shiftTypeToSave = todayRecord?.shiftType || selectedShift;
    let newSlots = todayRecord?.timeSlots ? todayRecord.timeSlots.map(s => ({ ...s })) : [];

    try {
      if (action === 'in') {
        if (!newSlots.some(s => s.in && !s.out)) {
          newSlots.push({ in: currentTime, out: '' });
        }
      } else {
        const openIdx = newSlots.findIndex(s => s.in && !s.out);
        if (openIdx !== -1) newSlots[openIdx].out = currentTime;
        else newSlots.push({ in: '', out: currentTime });
      }

      // Capture GPS with the punch so Team Regularization shows location while still PENDING
      const coords = await getPunchCoords();

      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          date: todayDate,
          status: 'Present',
          shiftType: shiftTypeToSave,
          timeSlots: JSON.stringify(newSlots)
        })
      });

      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          type: action === 'in' ? 'IN' : 'OUT',
          time: currentTime,
          date: todayDate,
          shiftType: shiftTypeToSave,
          ...(coords || {})
        })
      });

      // Update UI immediately so Punch Out / Punch In shows without waiting
      setStatsData(prev => patchTodayInStats(prev, todayDate, newSlots, shiftTypeToSave));
      setPendingRequests(prev => [
        {
          id: `temp-${Date.now()}`,
          employeeId: employee.id,
          type: action === 'in' ? 'IN' : 'OUT',
          time: currentTime,
          date: todayDate,
          status: 'PENDING',
          ...(coords || {})
        },
        ...prev
      ]);

      showToast(
        action === 'in'
          ? 'Punch In recorded — supervisor can approve anytime. You can Punch Out now.'
          : 'Punch Out recorded — supervisor can approve anytime. You can Punch In again.'
      );

      // Fallback: if geo was slow/denied on create, still try to attach location after
      if (!coords && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await fetch('/api/requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employeeId: employee.id,
                  type: action === 'in' ? 'IN' : 'OUT',
                  date: todayDate,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                })
              });
            } catch (e) { /* silent */ }
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );
      }
    } catch (err) {
      console.error(err);
      setLocalPunchState(null);
      showToast(`Failed to record punch ${action}`, 'error');
    } finally {
      setIsPunching(false); // unlock button NOW — do not wait for loadStats
    }

    // Background refresh (do not block UI)
    loadStats(employee.id, false);
  };

  // Profile Handlers
  const openProfileModal = async () => {
    // Fetch fresh employee data to get the current password
    try {
      const res = await fetch(`/api/employees/${employee.id}`);
      const fresh = await res.json();
      setProfileData({ 
        empId: fresh.empId || employee.empId || '',
        name: fresh.name || employee.name, 
        email: fresh.email || employee.email,
        department: fresh.department || employee.department,
        password: fresh.password || ''
      });
    } catch {
      setProfileData({ 
        empId: employee.empId || '',
        name: employee.name, 
        email: employee.email,
        department: employee.department,
        password: employee.password || ''
      });
    }
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
          outTotal = adjustedOut >= inTotal ? adjustedOut : outTotal + 24 * 60;
        }
        totalMinutes += (outTotal - inTotal);
      }
    });
    if (totalMinutes === 0) return '-';
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };

  const handleStartLiveLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Create location request directly as ACTIVE — no admin approval needed
          const res = await fetch('/api/location-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: employee.id })
          });
          const newReq = await res.json();

          await fetch('/api/location-requests', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newReq.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              status: 'ACTIVE',
              movementType: selectedMovementType
            })
          });

          await fetch('/api/location-requests/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: newReq.id, latitude: position.coords.latitude, longitude: position.coords.longitude })
          });

          showToast('Live location sharing started!');
          loadStats(employee.id);
        } catch (e) {
          console.error(e);
          showToast('Failed to start location sharing.', 'error');
        }
      },
      (error) => {
        let errorMsg = "Unable to retrieve location.";
        if (error.code === 1) errorMsg = "Permission denied. Please allow location access.";
        else if (error.code === 2) errorMsg = "Position unavailable. Please ensure GPS is on.";
        else if (error.code === 3) errorMsg = "Request timed out.";
        showToast(errorMsg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSendLocation = (reqId) => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateLocationRequest({
            id: reqId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            status: 'ACTIVE',
            movementType: selectedMovementType
          });
          await pingLocation(reqId, position.coords.latitude, position.coords.longitude);
          showToast('Location tracking started!');
          loadStats(employee.id);
        } catch (e) {
          console.error(e);
          showToast('Failed to start tracking.', 'error');
        }
      },
      (error) => {
        let errorMsg = "Unable to retrieve location.";
        if (error.code === 1) errorMsg = "Permission denied. Please allow location access in your browser settings.";
        else if (error.code === 2) errorMsg = "Position unavailable. Please ensure GPS is turned on.";
        else if (error.code === 3) errorMsg = "Request timed out. Please try again.";
        showToast(errorMsg, 'error');
        alert("Geolocation Error: " + errorMsg + "\n(Browser might block this on non-HTTPS networks unless it's localhost)");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleStopTracking = async (reqId) => {
    try {
      await updateLocationRequest({
        id: reqId,
        status: 'STOPPED'
      });
      showToast('Location tracking stopped.');
      loadStats(employee.id);
    } catch (e) {
      console.error(e);
      showToast('Failed to stop tracking.', 'error');
    }
  };

  // Background location pinging for active requests
  useEffect(() => {
    let interval;
    if (activeLocationRequests.length > 0) {
      interval = setInterval(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(async (pos) => {
          for (const req of activeLocationRequests) {
            try {
              await pingLocation(req.id, pos.coords.latitude, pos.coords.longitude);
            } catch(e) { console.error('Ping failed', e); }
          }
        }, () => {}, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      }, 30000); // Send ping every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeLocationRequests]);

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!regularizeData.reason || (!regularizeData.inTime && !regularizeData.outTime)) {
      showToast("Please provide a reason and at least one time (In or Out).", 'error');
      return;
    }

    // Overlap validation
    let existingSlots = [];
    for (const month of statsData) {
      const record = month.details.find(d => d.date === regularizeData.date);
      if (record) {
        existingSlots = record.timeSlots || [];
        break;
      }
    }

    const timeToMins = (t) => {
      if (!t) return null;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const reqIn = timeToMins(regularizeData.inTime);
    const reqOut = timeToMins(regularizeData.outTime);

    for (const slot of existingSlots) {
      if (slot.in && slot.out) {
        // Skip checking against the exact slot they might be completing
        // (if they had {in: "07:00", out: ""} and they submit {out: "09:00"}, 
        // the existing slot doesn't have an out time yet, so it won't hit this block)
        const slotIn = timeToMins(slot.in);
        const slotOut = timeToMins(slot.out);
        
        let overlap = false;
        if (reqIn !== null && reqOut !== null) {
          // Both in and out provided
          if (reqIn < slotOut && reqOut > slotIn) overlap = true;
        } else if (reqIn !== null) {
          // Only in provided
          if (reqIn >= slotIn && reqIn < slotOut) overlap = true;
        } else if (reqOut !== null) {
          // Only out provided
          if (reqOut > slotIn && reqOut <= slotOut) overlap = true;
        }

        if (overlap) {
          showToast(`Time overlaps with existing entry (${slot.in} - ${slot.out}).`, 'error');
          return;
        }
      }
    }
    try {
      const coords = await getPunchCoords();
      const timeData = JSON.stringify({
        in: normalizeTimeInput(regularizeData.inTime),
        out: normalizeTimeInput(regularizeData.outTime)
      });
      await createPunchRequest({
        employeeId: employee.id,
        date: regularizeData.date,
        type: 'REGULARIZE',
        time: timeData,
        shiftType: 'Day',
        reason: regularizeData.reason,
        ...(coords || {})
      });
      showToast("Regularization request submitted");
      setIsRegularizeModalOpen(false);
      setRegularizeData({ date: '', reason: '', inTime: '', outTime: '' });
      loadStats(employee.id); // reload stats
    } catch (e) {
      console.error(e);
      alert("Failed to submit request.");
    }
  };

  if (loading || !employee) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your dashboard...</div>;
  }

  const currentMonthData = statsData.length > 0 ? statsData[0] : null;

  // Button: localPunchState wins (instant), else last attendance slot
  const todayDate = getTodayDate();
  const todayHoliday = announcements.find(a => a.isHoliday && a.date === todayDate);
  const todayRecord = currentMonthData?.details?.find(d => d.date === todayDate) || null;

  let isPunchedIn = false;
  if (localPunchState === 'in') {
    isPunchedIn = true;
  } else if (localPunchState === 'out') {
    isPunchedIn = false;
  } else if (todayRecord?.timeSlots?.length > 0) {
    const last = todayRecord.timeSlots[todayRecord.timeSlots.length - 1];
    if (last.in && !last.out) isPunchedIn = true;
  }

  const pendingToday = pendingRequests.filter(r => r.date === todayDate && (r.type === 'IN' || r.type === 'OUT'));
  const pendingInCount = pendingToday.filter(r => r.type === 'IN').length;
  const pendingOutCount = pendingToday.filter(r => r.type === 'OUT').length;
  const hasPendingPunch = pendingToday.length > 0;

  return (
    <div className="dashboard-container">
      {hasPendingPunch && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a', color: '#92400e', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.1)'
        }}>
          <Clock size={20} color="#d97706" />
          <div>
            <div style={{ fontWeight: 600 }}>
              Awaiting supervisor approval ({pendingInCount} In, {pendingOutCount} Out)
            </div>
            <div style={{ fontSize: '13px', color: '#b45309' }}>
              Both Punch In and Punch Out go for approval. You can Punch Out right after Punch In — no need to wait.
            </div>
          </div>
        </div>
      )}

      {activeTrips.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', color: '#1e3a8a', padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Car size={24} color="#3b82f6" />
            <div>
              <div style={{ fontWeight: '600' }}>Live Trip Tracking Active</div>
              <div style={{ fontSize: '14px', color: '#3b82f6' }}>You have an active vehicle trip tracking session.</div>
            </div>
          </div>
          <button onClick={() => router.push('/employee/vehicles')} style={{
            background: '#3b82f6', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '8px',
            border: 'none', cursor: 'pointer', fontWeight: '600'
          }}>Manage Trip</button>
        </div>
      )}

      {pendingTrips.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fecaca', color: '#991b1b', padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Car size={24} color="#ef4444" />
            <div>
              <div style={{ fontWeight: '600' }}>Trip Tracking Requested</div>
              <div style={{ fontSize: '14px', color: '#ef4444' }}>Admin has requested to track your trip.</div>
            </div>
          </div>
          <button onClick={() => router.push('/employee/vehicles')} style={{
            background: '#ef4444', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '8px',
            border: 'none', cursor: 'pointer', fontWeight: '600'
          }}>View Request</button>
        </div>
      )}

      {activeLocationRequests.map(req => (
        <div key={req.id} style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', color: '#1e3a8a', padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MapPin size={24} color="#3b82f6" />
            <div>
              <div style={{ fontWeight: '600' }}>Live Location Sharing Active</div>
              <div style={{ fontSize: '14px', color: '#3b82f6' }}>You are sharing your live location. ({req.movementType || ''})</div>
            </div>
          </div>
          <button onClick={() => handleStopTracking(req.id)} style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '8px',
            border: 'none', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
          }}>Stop Sharing</button>
        </div>
      ))}

      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Welcome back, {employee.name.split(' ')[0]}!</h1>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0, fontWeight: 500 }}>Here is your attendance overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isSupervisor && (
            <button onClick={() => router.push('/employee/supervisor')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Shield size={16} /> Supervisor
            </button>
          )}
          <button onClick={() => router.push('/employee/announcements')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Bell size={16} /> Announcements
          </button>
          <button onClick={() => router.push('/employee/documents')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Documents
          </button>
          <button onClick={() => { setRegularizeData({ date: new Date().toISOString().split('T')[0], reason: '', inTime: '', outTime: '' }); setIsRegularizeModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Clock size={16} /> Regularize
          </button>
          <button onClick={() => router.push('/employee/leave?tab=apply')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
            Apply Leave
          </button>
          <button onClick={() => router.push('/employee/leave?tab=history')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Your Leave Appn
          </button>
          <button onClick={() => router.push('/employee/vehicles')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Car size={16} /> My Vehicles
          </button>
          <button onClick={() => router.push('/employee/reports/trips')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Car size={16} /> Trip Report
          </button>
          <button onClick={() => router.push('/employee/reports/location')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <MapPin size={16} /> Location Report
          </button>
          {activeLocationRequests.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 4px 4px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <select
                value={selectedMovementType}
                onChange={e => setSelectedMovementType(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: '#334155', fontSize: '12px', cursor: 'pointer' }}
              >
                <option value="Office to Site">Office to Site</option>
                <option value="Home to Site">Home to Site</option>
                <option value="Site to Office">Site to Office</option>
                <option value="Site to Site">Site to Site</option>
                <option value="Client Visit">Client Visit</option>
              </select>
              <button onClick={handleStartLiveLocation} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                <MapPin size={14} /> Share Location
              </button>
            </div>
          ) : null}
          <button onClick={openProfileModal} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <UserCircle size={16} /> Profile
          </button>
          
          {todayHoliday ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', padding: '8px 16px', borderRadius: '10px', border: '1px solid #86efac', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)' }}>
              <span style={{ fontSize: '20px' }}>🌴</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532d', textTransform: 'uppercase' }}>Holiday: {todayHoliday.subject}</div>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Enjoy your day off! No punch required.</div>
              </div>
            </div>
          ) : isPunchedIn ? (
            <button 
              onClick={() => handlePunch('out', todayRecord, todayDate)} 
              disabled={isPunching}
              className="btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: isPunching ? 'not-allowed' : 'pointer', opacity: isPunching ? 0.6 : 1 }}
            >
              <Clock size={16} /> {isPunching ? 'Saving...' : 'Punch Out'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {!todayRecord && (
                <select 
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: '#334155', fontSize: '13px' }}
                >
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
              )}
              <button 
                onClick={() => handlePunch('in', todayRecord, todayDate)} 
                disabled={isPunching}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: isPunching ? 'not-allowed' : 'pointer', opacity: isPunching ? 0.6 : 1 }}
              >
                <Clock size={16} /> {isPunching ? 'Saving...' : 'Punch In'}
              </button>
            </div>
          )}
        </div>
      </div>


      {currentMonthData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="saas-card" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', padding: '1.25rem', borderRadius: '14px', color: '#15803d', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.15)' }}>
              <CheckCircle size={28} />
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Present ({currentMonthData.month})</p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.Present} <span style={{fontSize: '15px', fontWeight: 600, color: '#94a3b8'}}>Days</span></h2>
            </div>
          </div>

          <div className="saas-card" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', padding: '1.25rem', borderRadius: '14px', color: '#b91c1c', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.15)' }}>
              <XCircle size={28} />
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absent ({currentMonthData.month})</p>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.Absent} <span style={{fontSize: '15px', fontWeight: 600, color: '#94a3b8'}}>Days</span></h2>
            </div>
          </div>
        </div>
      )}

      <div className="saas-card" style={{ overflow: 'hidden' }}>
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
                <th>Absent</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {statsData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state" style={{ padding: '3rem' }}>No attendance records found yet.</td>
                </tr>
              ) : (
                statsData.map(stat => (
                  <React.Fragment key={stat.month}>
                    <tr>
                      <td style={{ fontWeight: '600' }}>{stat.month}</td>
                      <td><span className="badge badge-success">{stat.Present}</span></td>
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
                        <td colSpan="4" style={{ padding: '0', backgroundColor: '#f9fafb' }}>
                          <table style={{ margin: '1rem', width: 'calc(100% - 2rem)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <thead>
                              <tr>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Date</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Status</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Shift</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Time Slots (In - Out)</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Total Time</th>
                                <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.75rem' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stat.details.map(d => (
                                <tr key={d.date} style={{ backgroundColor: '#ffffff' }}>
                                  <td style={{ padding: '0.75rem 1rem' }}>{d.date}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <span className={`badge ${
                                      d.status === 'Present' ? 'badge-success' : 
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
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    {pendingRequests.some(pr => pr.date === d.date && (pr.type === 'IN' || pr.type === 'OUT' || pr.type === 'REGULARIZE')) ? (
                                      <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}>Pending Approval</span>
                                    ) : d.status === 'Absent' ? (
                                      <button 
                                        onClick={() => {
                                          setRegularizeData({ date: d.date, reason: '', inTime: '', outTime: '' });
                                          setIsRegularizeModalOpen(true);
                                        }}
                                        style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                                      >
                                        Regularize
                                      </button>
                                    ) : null}
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

      {/* Regularize Modal */}
      {isRegularizeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Regularize Attendance</h2>
              <button className="icon-btn" onClick={() => setIsRegularizeModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleRegularizeSubmit}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={regularizeData.date} 
                  onChange={e => setRegularizeData({...regularizeData, date: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Punch In Time</label>
                  <input 
                    type="time" 
                    value={regularizeData.inTime} 
                    onChange={e => setRegularizeData({...regularizeData, inTime: e.target.value})} 
                  />
                  <small style={{ color: '#64748b' }}>Leave blank if not missed</small>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Punch Out Time</label>
                  <input 
                    type="time" 
                    value={regularizeData.outTime} 
                    onChange={e => setRegularizeData({...regularizeData, outTime: e.target.value})} 
                  />
                  <small style={{ color: '#64748b' }}>Leave blank if not missed</small>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Reason for Regularization</label>
                <textarea 
                  required
                  value={regularizeData.reason} 
                  onChange={e => setRegularizeData({...regularizeData, reason: e.target.value})} 
                  placeholder="E.g., Forgot to punch in, Biometric issue, etc."
                  rows={3}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>

              <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={() => setIsRegularizeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>Submit Request</button>
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
