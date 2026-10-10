'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getEmployeeStats, updateEmployee, getPunchRequests, createPunchRequest, getEmployees, getAnnouncements, getLocationRequests, updateLocationRequest, pingLocation, getLocations, getHolidays, getLeaveBalance, getImprestApprovals, updateImprestRequest, getMyImprestRequests } from '../../../lib/data';
import dynamic from 'next/dynamic';
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Plus, X, Trash2, UserCircle, Shield, Bell, MapPin, Car, IndianRupee, ClipboardList, Layers, Sun, Moon, Star, Briefcase, ShoppingCart, FileSignature, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImprestModal from './ImprestModal';


export default function EmployeeDashboard() {
  const [statsData, setStatsData] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [isMobileApp, setIsMobileApp] = useState(false);

  const [expandedMonth, setExpandedMonth] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(() => {
    const h = new Date().getHours();
    // Night shift: 7 PM (19:00) to 8 AM
    return (h >= 19 || h < 8) ? 'Night' : 'Day';
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLocationRequests, setPendingLocationRequests] = useState([]);
  const [activeLocationRequests, setActiveLocationRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [myImprestRequests, setMyImprestRequests] = useState([]);
  const [pendingImprestApprovals, setPendingImprestApprovals] = useState([]);
  const [selectedMovementType, setSelectedMovementType] = useState('Office to Site');
  const [announcements, setAnnouncements] = useState([]);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isAccountsAdmin, setIsAccountsAdmin] = useState(false);
  const [gpsLocations, setGpsLocations] = useState([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const router = useRouter();

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = React.useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const handleTrackingError = event => showToast(event.detail || 'Background location tracking could not start.', 'error');
    window.addEventListener('punch-location-tracking-error', handleTrackingError);
    return () => window.removeEventListener('punch-location-tracking-error', handleTrackingError);
  }, [showToast]);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ empId: '', name: '', email: '', department: '', password: '' });

  // Regularize Modal State
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  // COff Conversion Modal State
  const [isCoffModalOpen, setIsCoffModalOpen] = useState(false);
  const [coffData, setCoffData] = useState({ month: '', numCoffs: 1 });
  const [availableNightShifts, setAvailableNightShifts] = useState(0);
  const [regularizeData, setRegularizeData] = useState({ date: '', reason: '', inTime: '', outTime: '', latitude: null, longitude: null, locationName: '' });

  // Imprest Modal State
  const [isImprestModalOpen, setIsImprestModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isApp = localStorage.getItem('isMobileApp') === 'true' || 
                    Boolean(window.Capacitor?.isNativePlatform?.());
      setIsMobileApp(isApp);
    }
  }, []);

  const assignedList = React.useMemo(() => {
    if (!employee || !Array.isArray(employee.assignedModules)) return [];
    const available = [
      { id: 'Engineering', name: 'Engineering Dashboard', desc: 'Projects, WBS, Budgets, Unit Master & Planning', route: '/engineering', icon: Briefcase, color: '#8b5cf6' },
      { id: 'Purchase', name: 'Purchase Dashboard', desc: 'Suppliers, Purchase Orders, Items & Inward', route: '/purchase', icon: ShoppingCart, color: '#f59e0b' },
      { id: 'Contracting', name: 'Contracting Dashboard', desc: 'Work Orders, Subcontractors & Billing', route: '/contracting', icon: FileSignature, color: '#14b8a6' },
      { id: 'Accounts', name: 'Accounts Dashboard', desc: 'Finance, Ledgers, Vouchers & Invoicing', route: '/accounts', icon: FileText, color: '#6366f1' },
    ];
    return available.filter(mod => 
      employee.assignedModules.some(m => m === mod.id || m.startsWith(`${mod.id}:`))
    );
  }, [employee]);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      loadStats(parsed.id);
      
      // Fetch fresh employee data in background to sync any edits
      fetch(`/api/employees/${parsed.id}`)
        .then(res => res.json())
        .then(freshData => {
          if (freshData && freshData.id) {
            setEmployee(freshData);
            localStorage.setItem('employeeData', JSON.stringify(freshData));
          }
        })
        .catch(err => console.error('Failed to sync fresh employee data', err));

      const interval = setInterval(() => {
        loadStats(parsed.id, false);
      }, 15000); // refresh every 15s for near-real-time biometric sync
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // This empty effect keeps backward compatibility with previous modifications
    // State derivation happens inline below to avoid HMR staleness
  }, [employee]);

  async function loadStats(id, showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      // Critical path only — unblock UI fast
      const [data, reqs, bal] = await Promise.all([
        getEmployeeStats(id).catch(() => []),
        getPunchRequests(null, id).catch(() => []),
        getLeaveBalance(id).catch(() => null)
      ]);

      setStatsData(Array.isArray(data) ? data : []);
      setPendingRequests(Array.isArray(reqs) ? reqs.filter(r => r.status === 'PENDING') : []);
      setLeaveBalance(bal);
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
      getHolidays().catch(() => []),
      fetch(`/api/employees?checkSupervisor=${id}`).then(r => r.json()).catch(() => ({ isSupervisor: false })),
      getImprestApprovals(id).catch(() => []),
      getMyImprestRequests(id).catch(() => []),
      fetch('/api/synchronization/imprest-workflow').then(r => r.json()).catch(() => ({})),
      getEmployees().catch(() => [])
    ]).then(([locReqs, tripData, anns, locs, hols, supervisorFlag, imprestApprs, myImprests, wfConfig, allEmps]) => {
      if (Array.isArray(locReqs)) {
        setPendingLocationRequests(locReqs.filter(r => r.status === 'PENDING' && r.employeeId === id));
        setActiveLocationRequests(locReqs.filter(r => r.status === 'APPROVED' && r.employeeId === id));
      }
      if (Array.isArray(tripData)) {
        setActiveTrips(tripData.filter(t => t.status === 'APPROVED'));
        setPendingTrips(tripData.filter(t => t.status === 'PENDING'));
      }
      setAnnouncements(Array.isArray(anns) ? anns : []);
      setHolidays(Array.isArray(hols) ? hols : []);
      setIsSupervisor(!!supervisorFlag?.isSupervisor);
      
      if (Array.isArray(wfConfig) && wfConfig.length > 0) {
        setIsAccountsAdmin(wfConfig[0].accountsId === id);
      } else if (wfConfig?.accountsId === id) {
        setIsAccountsAdmin(true);
      }

      setPendingImprestApprovals(Array.isArray(imprestApprs) ? imprestApprs.filter(r => ['PENDING_SUPERVISOR', 'PENDING_PROJECTS_HEAD', 'PENDING_ACCOUNTS', 'PENDING_ADMIN'].includes(r.status)) : []);
      setMyImprestRequests(Array.isArray(myImprests) ? myImprests : []);
      setAllEmployees(Array.isArray(allEmps) ? allEmps : []);
    }).catch(() => { });
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
  const [punchStage, setPunchStage] = useState('');
  const [localPunchState, setLocalPunchState] = useState(null); // 'in' | 'out' | null
  const punchLocationIntervalRef = useRef(null);
  const punchLocationTrackingRef = useRef(false);
  const punchTrackingStateRef = useRef(null);

  const getPunchCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support location. Open the employee app in a location-enabled browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          reject(new Error('Could not determine your location. Turn on device location and try again.'));
          return;
        }
        resolve({ latitude, longitude });
      },
      error => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission is blocked. Allow location access for this site in browser settings, then try again.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your device could not find a location. Turn on GPS/location services and try again.'
            : 'Location is taking too long. Move to an area with GPS/network signal and try again.';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

  const lastKnownPositionRef = useRef(null);
  const punchLocationHeartbeatRef = useRef(null);

  const sendPunchLiveLocation = React.useCallback(async (position) => {
    const response = await fetch('/api/attendance/live-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employee?.id,
        latitude: position.coords?.latitude ?? position.latitude,
        longitude: position.coords?.longitude ?? position.longitude,
        accuracy: position.coords?.accuracy ?? position.accuracy ?? null,
      }),
    });
    if (response.status === 409) {
      void stopPunchLiveTracking();
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Could not update live location.');
    }
  }, [employee]); // note: stopPunchLiveTracking is used inside, but we'll manage the dependency to avoid loops

  const startPunchLiveTracking = React.useCallback(async (initialPosition = null) => {
    if (punchLocationTrackingRef.current) return;
    punchLocationTrackingRef.current = true;

    try {
      if (initialPosition) {
        lastKnownPositionRef.current = initialPosition;
        await sendPunchLiveLocation(initialPosition);
      }
      if (window.AndroidPunchTracking?.startPunchTracking) {
        window.AndroidPunchTracking.startPunchTracking();
        return;
      }

      if (!navigator.geolocation) return;
      
      const watchId = navigator.geolocation.watchPosition(
        position => {
          lastKnownPositionRef.current = position;
          sendPunchLiveLocation(position).catch(error => {
            console.error('Punch live-location update failed:', error);
          });
        },
        error => console.warn('Punch live-location GPS update failed:', error.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
      punchLocationIntervalRef.current = watchId;

      // Heartbeat to keep the user on the map even if they are stationary
      punchLocationHeartbeatRef.current = window.setInterval(() => {
        if (lastKnownPositionRef.current) {
          sendPunchLiveLocation(lastKnownPositionRef.current).catch(() => {});
        }
      }, 15000); // 15 seconds
    } catch (error) {
      punchLocationTrackingRef.current = false;
      showToast(error.message || 'Live location tracking could not start.', 'error');
    }
  }, [sendPunchLiveLocation, showToast]);

  const stopPunchLiveTracking = React.useCallback(async () => {
    punchLocationTrackingRef.current = false;
    if (punchLocationIntervalRef.current != null) {
      if (navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(punchLocationIntervalRef.current);
      }
      punchLocationIntervalRef.current = null;
    }
    if (punchLocationHeartbeatRef.current != null) {
      window.clearInterval(punchLocationHeartbeatRef.current);
      punchLocationHeartbeatRef.current = null;
    }
    window.AndroidPunchTracking?.stopPunchTracking?.();
    try {
      const response = await fetch(`/api/attendance/live-location${employee ? `?employeeId=${employee.id}` : ''}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not clear the live location.');
    } catch (error) {
      console.error('Could not stop punch live-location tracking:', error);
    }
  }, [employee]);

  const normalizeTimeInput = (value) => {
    if (!value || typeof value !== 'string') return '';
    const parts = value.trim().split(':');
    if (parts.length !== 2) return value;
    const [h, m] = parts;
    const hours = String(Math.max(0, Math.min(23, Number(h)))).padStart(2, '0');
    const mins = String(Math.max(0, Math.min(59, Number(m)))).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  // Night shift starts at 7 PM (19:00)
  const NIGHT_SHIFT_HOUR = 19;

  const isNightShiftTime = () => {
    const h = new Date().getHours();
    return h >= NIGHT_SHIFT_HOUR || h < 8;
  };

  const handlePunch = async (action, todayRecord, todayDate) => {
    if (isPunching) return;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (action === 'in') {
      const activeShiftObj = employee?.shifts?.[0]?.shift;
      if (activeShiftObj?.startTime) {
        const [sh, sm] = activeShiftObj.startTime.split(':').map(Number);
        const shiftStartMins = sh * 60 + sm;
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        if (currentMins < shiftStartMins - 60) {
          const allowedH = Math.floor((shiftStartMins - 60) / 60);
          const allowedM = (shiftStartMins - 60) % 60;
          alert(`You cannot punch in more than 1 hour before your shift starts. (Allowed from ${String(allowedH).padStart(2, '0')}:${String(allowedM).padStart(2, '0')})`);
          return;
        }
      }
    }

    setIsPunching(true);
    setPunchStage(action === 'in' ? 'Finding location…' : 'Saving punch…');

    // Duplicate declarations removed
    const isNight = isNightShiftTime();
    
    // --- SMART DAY ROLLOVER LOGIC ---
    let targetDate = todayDate;
    let activeRecord = todayRecord;

    if (action === 'out') {
      // For OUT punches, first check if there's an open shift TODAY
      let hasOpenShiftToday = false;
      if (todayRecord?.timeSlots) {
        hasOpenShiftToday = todayRecord.timeSlots.some(s => s.in && !s.out);
      }

      if (!hasOpenShiftToday && currentTime <= '12:00') {
        // No open shift today, and it's morning. Check if yesterday has an open night shift.
        const dObj = new Date(todayDate);
        dObj.setDate(dObj.getDate() - 1);
        const yesterdayStr = dObj.toISOString().split('T')[0];
        
        const yesterdayRecord = statsData.find(s => s.date === yesterdayStr);
        if (yesterdayRecord?.timeSlots) {
          const hasOpenShiftYesterday = yesterdayRecord.timeSlots.some(s => s.in && !s.out);
          if (hasOpenShiftYesterday) {
            targetDate = yesterdayStr;
            activeRecord = yesterdayRecord;
          }
        }
      }
    }
    // IN punches always use todayDate (the literal calendar date)
    // --------------------------------

    const shiftTypeToSave = isNight ? 'Night' : (activeRecord?.shiftType || selectedShift);
    let newSlots = activeRecord?.timeSlots ? activeRecord.timeSlots.map(s => ({ ...s })) : [];

    try {
      if (action === 'in') {
        // After 7 PM: always start a fresh night slot even if already punched in for day
        if (isNight) {
          // Only add a new night slot if there's no open night slot already
          const openNightSlot = newSlots.find(s => s.in >= '19:00' && !s.out);
          if (!openNightSlot) {
            newSlots.push({ in: currentTime, out: '' });
          }
        } else {
          // Normal day in
          const openSlot = newSlots.find(s => s.in && !s.out);
          if (openSlot) {
            openSlot.in = currentTime; // update if already pending?
          } else {
            newSlots.push({ in: currentTime, out: '' });
          }
        }
      } else {
        const openSlot = newSlots.find(s => s.in && !s.out);
        if (openSlot) {
          openSlot.out = currentTime;
        } else {
          newSlots.push({ in: '', out: currentTime });
        }
      }

      // Punch In must have a fresh GPS location, saved with its punch request.
      let coords = null;
      if (action === 'in') {
        try {
          coords = await getPunchCoords();
        } catch (locationError) {
          showToast(`${locationError.message} Regularization remains available without location.`, 'error');
          return;
        }
      } else {
        coords = await new Promise(resolve => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        });
      }

      setPunchStage('Saving punch…');
      const requestRes = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          type: action === 'in' ? 'IN' : 'OUT',
          time: currentTime,
          date: targetDate,
          shiftType: shiftTypeToSave,
          ...(coords || {}),
          locationName: coords ? `GPS location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})` : null
        })
      });
      const requestData = await requestRes.json().catch(() => ({}));
      if (!requestRes.ok) throw new Error(requestData.error || 'Could not save the punch location. Please try again.');

      const attendanceRes = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          date: targetDate,
          status: 'Present',
          shiftType: shiftTypeToSave,
          timeSlots: JSON.stringify(newSlots)
        })
      });
      const attendanceData = await attendanceRes.json().catch(() => ({}));
      if (!attendanceRes.ok) throw new Error(attendanceData.error || 'Could not save attendance. Please try again.');

      if (action === 'in') {
        punchTrackingStateRef.current = true;
        await startPunchLiveTracking(coords);
      } else {
        punchTrackingStateRef.current = false;
        await stopPunchLiveTracking();
      }

      setLocalPunchState(action === 'in' ? 'in' : 'out');

      // Update UI immediately so Punch Out / Punch In shows without waiting
      setStatsData(prev => patchTodayInStats(prev, targetDate, newSlots, shiftTypeToSave));
      setPendingRequests(prev => [
        {
          id: `temp-${Date.now()}`,
          employeeId: employee.id,
          type: action === 'in' ? 'IN' : 'OUT',
          time: currentTime,
          date: targetDate,
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

    } catch (err) {
      console.error(err);
      setLocalPunchState(null);
      showToast(err.message || `Failed to record punch ${action}`, 'error');
    } finally {
      setPunchStage('');
      setIsPunching(false); // unlock button NOW — do not wait for loadStats
    }

    // Background refresh (do not block UI)
    loadStats(employee.id, false);
  };

  useEffect(() => {
    if (!employee || loading) return;

    const today = getTodayDate();
    const yesterdayDate = new Date(`${today}T12:00:00Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    const hasOpenPunch = statsData
      .flatMap(month => month.details || [])
      .some(record => {
        if (record.date !== today && record.date !== yesterday) return false;
        return Array.isArray(record.timeSlots) && record.timeSlots.some(slot => slot?.in && !slot.out);
      });

    if (punchTrackingStateRef.current === hasOpenPunch) return undefined;
    const syncTimer = window.setTimeout(() => {
      punchTrackingStateRef.current = hasOpenPunch;
      if (hasOpenPunch) {
        void startPunchLiveTracking();
      } else {
        void stopPunchLiveTracking();
      }
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [employee, loading, statsData, startPunchLiveTracking, stopPunchLiveTracking]);

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
        localStorage.setItem('employeeData', JSON.stringify(res));
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
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  const handleDeleteSlot = async (date, slotIndex, currentSlots, shiftType, currentStatus) => {
    if (!confirm('Are you sure you want to delete this time slot? This cannot be undone.')) return;
    const updatedSlots = [...currentSlots];
    updatedSlots.splice(slotIndex, 1);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          date: date,
          status: currentStatus,
          shiftType: shiftType,
          timeSlots: updatedSlots
        })
      });
      if (res.ok) {
        showToast('Time slot deleted successfully', 'success');
        loadStats(employee.id, false);
      } else {
        showToast('Failed to delete time slot', 'error');
      }
    } catch (e) {
      showToast('Error deleting time slot', 'error');
    }
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
            } catch (e) { console.error('Ping failed', e); }
          }
        }, () => { }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      }, 30000); // Send ping every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeLocationRequests]);

  const handleCoffSubmit = async (e) => {
    e.preventDefault();
    if (!coffData.month || coffData.numCoffs < 1) {
      showToast('Please select a valid month and number of COffs.', 'error');
      return;
    }
    try {
      await createPunchRequest({
        employeeId: employee.id,
        type: 'COFF_CONVERSION',
        date: coffData.month + '-01',
        time: String(coffData.numCoffs),
        reason: `Requesting ${coffData.numCoffs} COff(s) for Night Shifts in ${coffData.month}`
      });
      showToast('COff conversion request submitted successfully!', 'success');
      setIsCoffModalOpen(false);
      setCoffData({ month: '', numCoffs: 1 });
      loadStats(employee.id);
    } catch (err) {
      console.error(err);
      showToast('Failed to submit COff conversion request.', 'error');
    }
  };

  const openCoffModal = () => {
    const cm = expandedMonth || (statsData.length > 0 ? statsData[0].month : null);
    if (!cm) {
      showToast('No data available to convert.', 'error');
      return;
    }
    const currentMonthStats = statsData.find(s => s.month === cm);
    const totalNightShifts = currentMonthStats?.['Night Shift'] || currentMonthStats?.NightShift || 0;

    // Calculate pending/approved conversions for this month
    const conversionsThisMonth = pendingRequests.filter(r => r.type === 'COFF_CONVERSION' && r.date.startsWith(cm));
    const alreadyRequested = conversionsThisMonth.reduce((acc, curr) => acc + (parseInt(curr.time) || 0), 0);

    setAvailableNightShifts(totalNightShifts);
    setCoffData({ month: cm, numCoffs: 1 });
    setIsCoffModalOpen(true);
  };

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
        //  it's fine, but if it was night shift out, targetDate is yesterday.)
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
      const timeData = JSON.stringify({
        in: normalizeTimeInput(regularizeData.inTime),
        out: normalizeTimeInput(regularizeData.outTime)
      });
      await createPunchRequest({
        employeeId: employee.id,
        date: regularizeData.date,
        type: 'REGULARIZE',
        time: timeData,
        reason: regularizeData.reason,
        latitude: regularizeData.latitude,
        longitude: regularizeData.longitude
      });
      showToast("Regularization request submitted");
      setIsRegularizeModalOpen(false);
      setRegularizeData({ date: '', reason: '', inTime: '', outTime: '', latitude: null, longitude: null });
      loadStats(employee.id); // reload stats
    } catch (e) {
      console.error(e);
      alert("Failed to submit request.");
    }
  };

  const handleImprestSubmit = async (formData) => {
    try {
      const res = await fetch('/api/imprest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          ...formData
        })
      });
      if (res.ok) {
        showToast('Imprest request submitted successfully!');
        setIsImprestModalOpen(false);
        loadStats(employee.id);
      } else {
        showToast('Failed to submit Imprest request', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit Imprest request', 'error');
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

  const nowHour = new Date().getHours();
  const isCurrentlyNightTime = nowHour >= NIGHT_SHIFT_HOUR || nowHour < 7;

  let isPunchedIn = false;
  if (localPunchState === 'in') {
    isPunchedIn = true;
  } else if (localPunchState === 'out') {
    isPunchedIn = false;
  } else if (todayRecord?.timeSlots?.length > 0) {
    const last = todayRecord.timeSlots[todayRecord.timeSlots.length - 1];
    if (last.in && !last.out) {
      // After 7 PM: only consider punched-in if the open slot is a night slot (>= 19:00)
      if (isCurrentlyNightTime) {
        isPunchedIn = last.in >= '19:00';
      } else {
        isPunchedIn = true;
      }
    }
  }

  const pendingToday = pendingRequests.filter(r => r.date === todayDate && (r.type === 'IN' || r.type === 'OUT'));
  const pendingInCount = pendingToday.filter(r => r.type === 'IN').length;
  const pendingOutCount = pendingToday.filter(r => r.type === 'OUT').length;
  const hasPendingPunch = pendingToday.length > 0;

  // Open time slot from today's record — covers both biometric and app punches
  const openTimeSlot = todayRecord?.timeSlots?.find(s => s.in && !s.out) || null;
  const openPunchInTime = openTimeSlot?.in || null;
  // True if punch came from biometric (no pending app request for IN today)
  const biometricPunchedIn = isPunchedIn && pendingInCount === 0 && !!openPunchInTime;

  // Calculate upcoming events
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();
  
  const upcomingEvents = [];
  if (allEmployees && allEmployees.length > 0) {
    allEmployees.forEach(emp => {
      if (['Resigned', 'Retired', 'Terminated', 'Inactive'].includes(emp.employmentStatus)) return; // skip inactive
      const checkEvent = (dateString, type, label, icon) => {
        if (!dateString) return;
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return;
        const m = d.getMonth();
        const day = d.getDate();
        
        // Show if it's in the current month and upcoming or today
        if (m === currentMonth && day >= currentDay) {
          upcomingEvents.push({
            id: `${emp.id}-${type}`,
            name: emp.name,
            type: label,
            icon: icon,
            dayObj: day,
            dayStr: day === currentDay ? 'Today!' : `on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          });
        }
      };

      checkEvent(emp.dateOfBirth, 'birthday', 'Birthday', '🎂');
      checkEvent(emp.joinedDate, 'work_anniv', 'Work Anniversary', '🎉');
      checkEvent(emp.marriageAnniversary, 'marriage_anniv', 'Marriage Anniversary', '💍');
    });
  }
  
  upcomingEvents.sort((a, b) => a.dayObj - b.dayObj);

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



      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt="Profile" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }} />
        ) : (
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <UserCircle size={40} color="#94a3b8" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="portal-badge" style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>Employee Portal</span>
            {!isMobileApp && assignedList.length > 0 && (
              <button
                type="button"
                onClick={() => router.push('/portal')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #bfdbfe', color: '#1d4ed8',
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Switch to Assigned Workspaces"
              >
                <Layers size={13} />
                <span>Assigned Workspaces ({assignedList.length})</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Welcome back, {employee.name}!</h1>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          {todayHoliday && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', padding: '8px 16px', borderRadius: '10px', border: '1px solid #86efac', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)' }}>
              <span style={{ fontSize: '20px' }}>🌴</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532d', textTransform: 'uppercase' }}>Holiday: {todayHoliday.subject}</div>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Enjoy your day off! Working today will earn you a COff.</div>
              </div>
            </div>
          )}
          {isPunchedIn ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#ffffff', padding: '6px', borderRadius: '14px', border: '1px solid #fee2e2', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                padding: '6px 14px', borderRadius: '10px',
                border: '1px solid #fca5a5',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)'
              }}>
                <span style={{ fontSize: '14px', filter: 'drop-shadow(0 2px 2px rgba(220,38,38,0.2))' }}>🔴</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#dc2626', letterSpacing: '0.02em', userSelect: 'none' }}>Active Shift</span>
              </div>
              {/* Time slot display — shows biometric punch-in time */}
              {openPunchInTime && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 10px', borderRadius: '8px',
                  background: biometricPunchedIn ? '#eff6ff' : '#f0fdf4',
                  border: biometricPunchedIn ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: biometricPunchedIn ? '#3b82f6' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {biometricPunchedIn ? '📡 Biometric' : '📱 App'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {openPunchInTime} – <span style={{ color: '#ef4444' }}>Open</span>
                  </span>
                </div>
              )}
              <button
                onClick={() => handlePunch('out', todayRecord, todayDate)}
                disabled={isPunching}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 22px', borderRadius: '10px',
                  fontWeight: 700, fontSize: '14px', cursor: isPunching ? 'not-allowed' : 'pointer',
                  opacity: isPunching ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white', border: 'none',
                  boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(220, 38, 38, 0.35)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220, 38, 38, 0.25)' }}
              >
                <Clock size={16} /> {isPunching ? punchStage : 'Punch Out'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#ffffff', padding: '6px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              {isCurrentlyNightTime ? (
                <div style={{
                  position: 'relative', width: '120px', height: '38px', borderRadius: '19px', overflow: 'hidden',
                  background: 'rgba(248, 250, 252, 0.7)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.03), inset 0 2px 5px rgba(255,255,255,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 0 14px'
                }}>
                  {/* Blue/Purple Blob on the right */}
                  <div style={{ position: 'absolute', right: '-8px', top: '-6px', width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', filter: 'blur(8px)', zIndex: 0 }}></div>
                  
                  {/* Text on left */}
                  <span style={{ position: 'relative', zIndex: 1, fontWeight: 600, fontSize: '13px', color: '#475569', letterSpacing: '0.3px', userSelect: 'none' }}>Night</span>
                  
                  {/* Icon wrapper on right */}
                  <div style={{ position: 'relative', zIndex: 1, width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                    <Moon size={14} color="#ffffff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                  </div>
                </div>
              ) : (
                <div style={{
                  position: 'relative', width: '120px', height: '38px', borderRadius: '19px', overflow: 'hidden',
                  background: 'rgba(248, 250, 252, 0.7)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.03), inset 0 2px 5px rgba(255,255,255,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 0 4px'
                }}>
                  {/* Orange/Yellow Blob on the left */}
                  <div style={{ position: 'absolute', left: '-8px', top: '-6px', width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #fbbf24)', filter: 'blur(8px)', zIndex: 0 }}></div>
                  
                  {/* Icon wrapper on left */}
                  <div style={{ position: 'relative', zIndex: 1, width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                    <Sun size={15} color="#ffffff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                  </div>
                  
                  {/* Text on right */}
                  <span style={{ position: 'relative', zIndex: 1, fontWeight: 600, fontSize: '13px', color: '#475569', letterSpacing: '0.3px', userSelect: 'none' }}>Day</span>
                </div>
              )}
              <button
                onClick={() => handlePunch('in', todayRecord, todayDate)}
                disabled={isPunching}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', borderRadius: '19px',
                  fontWeight: 700, fontSize: '14px', cursor: isPunching ? 'not-allowed' : 'pointer',
                  opacity: isPunching ? 0.6 : 1,
                  background: isCurrentlyNightTime ? '#1e293b' : '#0f172a',
                  color: 'white', border: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)' }}
              >
                <Clock size={16} /> {isPunching ? punchStage : 'Punch In'}
              </button>
            </div>
          )}

            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: '#475569', fontWeight: 500, alignItems: 'center' }}>
            {employee.empId && <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{employee.empId}</span>}
            {employee.designation && <span>{employee.designation}</span>}
            {employee.department && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></span> {employee.department}</span>}
            {employee.siteOffice && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}><span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1', marginRight: '2px' }}></span> <MapPin size={12} /> {employee.siteOffice}</span>}
            {employee.branch && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}><span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1', marginRight: '2px' }}></span> <MapPin size={12} /> {employee.branch}</span>}
          </div>
        </div>
      </div>

      {/* --- ASSIGNED WORKSPACES & MODULES (Web Only) --- */}
      {!isMobileApp && assignedList.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          color: '#ffffff',
          boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', border: '1px solid rgba(165, 180, 252, 0.2)' }}>
                <Layers size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Your Assigned Workspaces</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>You have access to the following departmental modules</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/portal')}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>View All Workspaces</span>
              <span>→</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {assignedList.map(mod => {
              const IconComp = mod.icon;
              return (
                <div
                  key={mod.id}
                  onClick={() => router.push(mod.route)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${mod.color}25`, color: mod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComp size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{mod.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{mod.desc}</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', display: 'flex', alignItems: 'center', color: '#38bdf8', fontSize: '12px', fontWeight: 600 }}>
                    Open →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- EMPLOYEE DETAILS WIDGETS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* Basic Info Card */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#6366f1', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <UserCircle size={16} /> Basic Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Aadhaar No</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.aadharNo || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>PAN No</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.pan || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Gender</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.gender || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Blood Group</span><span style={{ color: '#ef4444', fontWeight: 600 }}>{employee.bloodGroup || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Nationality</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.nationality || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Marital Status</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.maritalStatus || 'N/A'}</span></div>
          </div>
        </div>

        {/* Job Details Card */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#10b981', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <ClipboardList size={16} /> Job Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Designation</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.designation || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Department</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.department || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Position</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.position || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Grade</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.grade || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: '1 / -1' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Joined Date</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.joinedDate ? new Date(employee.joinedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span></div>
          </div>
        </div>

        {/* Account Details Card */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#f59e0b', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <IndianRupee size={16} /> Account Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Account Owner</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.name || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Bank Name</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.bankName || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Account No.</span><span style={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{employee.bankAccountNo || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>IFSC Code</span><span style={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{employee.ifscCode || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>UAN No.</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.uan || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>ESIC No.</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.esicNo || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Debit Account</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.debitAccount || 'N/A'}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>Credit Account</span><span style={{ color: '#1e293b', fontWeight: 500 }}>{employee.creditAccount || 'N/A'}</span></div>
          </div>
        </div>

      </div>

      {/* --- DASHBOARD ACTION GRID --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Upcoming Events Card */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#fdf4ff', padding: '6px', borderRadius: '8px', color: '#d946ef' }}>🎉</span>
            Upcoming Events (Team)
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
            {upcomingEvents.length === 0 ? (
              <li style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No upcoming events this month.
              </li>
            ) : (
              upcomingEvents.map(evt => (
                <li key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: '#475569' }}>
                  <span style={{ fontSize: '1.1rem' }}>{evt.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{evt.name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{evt.type} • {evt.dayStr}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        
        {/* Muster Card */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#e0f2fe', padding: '6px', borderRadius: '8px', color: '#0ea5e9' }}><CheckCircle size={18} /></span>
            Muster
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <button onClick={() => { setRegularizeData({ date: new Date().toISOString().split('T')[0], reason: '', inTime: '', outTime: '' }); setIsRegularizeModalOpen(true); }} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Regularize Attendance
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/dashboard/payslips')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'color 0.2s' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Pay Slip
              </button>
            </li>
          </ul>
        </div>

        {/* Leave Card */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px', color: '#d97706' }}><Calendar size={18} /></span>
            Leave
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <button onClick={() => router.push('/employee/leave?tab=apply')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Apply Leave
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/leave?tab=history')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Your Leave Applications
              </button>
            </li>
          </ul>
        </div>

        {/* Imprest Card */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#e0e7ff', padding: '6px', borderRadius: '8px', color: '#4f46e5' }}><IndianRupee size={18} /></span>
            Imprest
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <button onClick={() => setIsImprestModalOpen(true)} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Apply Imprest
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/my-imprests')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> My Imprests
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/imprestresponsibilities')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Imprest Approvals
              </button>
            </li>
          </ul>
        </div>

        {/* Org 1 Card (Formerly Appraisals) */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px', color: '#10b981' }}><Star size={18} /></span>
            Org 1
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <button onClick={() => router.push('/employee/appraisal')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> View Appraisals
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/announcements')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Announcements
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/documents')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Documents
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/declarations')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Income Declarations
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/tds')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> File TDS
              </button>
            </li>
          </ul>
        </div>

        {/* Org 2 Card (Formerly Organization) */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#ede9fe', padding: '6px', borderRadius: '8px', color: '#7c3aed' }}><Shield size={18} /></span>
            Org 2
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <button onClick={() => router.push('/employee/dashboard/doc-generator')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Doc Generator
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/profile')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Profile
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/requirements')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Position Indent
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/dashboard/dpr')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Daily Progress Report (DPR)
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/dashboard/material-requisition')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Material Requisition
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/dashboard/labour-requisition')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Labour Requisition
              </button>
            </li>
          </ul>
        </div>

        {/* Field Journey Card */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
            <span style={{ background: '#dcfce7', padding: '6px', borderRadius: '8px', color: '#16a34a' }}><MapPin size={18} /></span>
            Field Journey
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeLocationRequests.length === 0 && (
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <select
                  value={selectedMovementType}
                  onChange={e => setSelectedMovementType(e.target.value)}
                  style={{ border: '1px solid #e2e8f0', background: '#fff', outline: 'none', color: '#475569', fontSize: '12px', borderRadius: '4px', padding: '4px' }}
                >
                  <option value="Office to Site">Office to Site</option>
                  <option value="Home to Site">Home to Site</option>
                  <option value="Site to Office">Site to Office</option>
                  <option value="Site to Site">Site to Site</option>
                  <option value="Client Visit">Client Visit</option>
                </select>
                <button onClick={handleStartLiveLocation} style={{ all: 'unset', cursor: 'pointer', color: '#3b82f6', fontSize: '0.9rem', fontWeight: 600 }}>
                  Share Location
                </button>
              </li>
            )}
            <li>
              <button onClick={() => router.push('/employee/reports/location')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Location Report
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/vehicles')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> My Vehicles
              </button>
            </li>
            <li>
              <button onClick={() => router.push('/employee/reports/trips')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#cbd5e1' }}>•</span> Trip Report
              </button>
            </li>
          </ul>
        </div>

        {/* Merged Supervisor, Accounts & Doc Approvals Card */}
        {(() => {
          if (!employee) return null;
          
          const docConfig = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('docGenerator_workflowConfig') || '{}') : {};
          const r = (employee.role || '').toUpperCase();
          const dp = (employee.department || '').toUpperCase();
          const ds = (employee.designation || '').toUpperCase();
          
          const isMatch = (str) => {
            if (!str) return false;
            return str.includes('HR') || str.includes('HUMAN RESOURCE') || 
                   str.includes('ADMIN') || str.includes('ACCOUNT') || 
                   str.includes('FINANCE');
          };

          const isDocApprover = Object.values(docConfig).some(config => 
            config.hrId === employee.id || 
            config.accountsId === employee.id ||
            config.hodId === employee.id
          );

          const showDocCard = isMatch(r) || isMatch(dp) || isMatch(ds) || isDocApprover;

          const hasAnyRole = isSupervisor || isAccountsAdmin || showDocCard;

          if (!hasAnyRole) return null;

          return (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
                <span style={{ background: '#fee2e2', padding: '6px', borderRadius: '8px', color: '#ef4444' }}><Shield size={18} /></span>
                Supervisor & Admin Tasks
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {isSupervisor && (
                  <li>
                    <button onClick={() => router.push('/employee/supervisor')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#cbd5e1' }}>•</span> Supervisor Dashboard
                    </button>
                  </li>
                )}
                {isAccountsAdmin && (
                  <li>
                    <button onClick={() => router.push('/employee/imprest-management')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#cbd5e1' }}>•</span> Full Imprest Dashboard
                    </button>
                  </li>
                )}
                {showDocCard && (
                  <li>
                    <button onClick={() => router.push('/employee/doc-approvals')} style={{ all: 'unset', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#cbd5e1' }}>•</span> Doc Approvals Dashboard
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })()}

      </div>

      {currentMonthData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #94a3b8' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Total Days ({currentMonthData.month})</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.TotalDays || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #475569' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Working Days</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.TotalWorkingDays || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #22c55e' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Present</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.Present || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #ef4444' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Absent</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.Absent || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #10b981' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>On Leave</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.Leave || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #f59e0b' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Holidays</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.Holidays || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #3b82f6' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Off Days</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.OffDays || 0}</h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #166534' }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>COFF Taken</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData.COFF || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}> / Bal: {leaveBalance?.compensatoryLeaves || 0}</span></h2>
          </div>

          <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Night Shift</p>
              <button
                onClick={openCoffModal}
                style={{ fontSize: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                title="Convert to COff"
              >
                Convert
              </button>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentMonthData['Night Shift'] || currentMonthData.NightShift || 0}</h2>
          </div>

        </div>
      )}

      <div className="saas-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="var(--accent-color)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Attendance History</h2>
        </div>

        <div className="table-container">
          <table className="attendance-history-table" style={{ marginBottom: '0' }}>
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-center">Working Days</th>
                <th className="text-center">Present</th>
                <th className="text-center">Absent</th>
                <th className="text-center">Leave</th>
                <th className="text-center">Holidays</th>
                <th className="text-center">Off Days</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {statsData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state" style={{ padding: '3rem' }}>No attendance records found yet.</td>
                </tr>
              ) : (
                statsData.map(stat => (
                  <React.Fragment key={stat.month}>
                    <tr>
                      <td style={{ fontWeight: '600' }}>{stat.month}</td>
                      <td className="text-center">{stat.TotalWorkingDays || 0}</td>
                      <td className="text-center"><span className="badge badge-success">{stat.Present || 0}</span></td>
                      <td className="text-center"><span className="badge badge-danger">{stat.Absent || 0}</span></td>
                      <td className="text-center"><span className="badge badge-warning" style={{ background: '#ecfdf5', color: '#047857' }}>{stat.Leave || 0}</span></td>
                      <td className="text-center"><span className="badge" style={{ background: '#fef3c7', color: '#d97706' }}>{stat.Holidays || 0}</span></td>
                      <td className="text-center"><span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>{stat.OffDays || 0}</span></td>
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
                      <tr className="attendance-details-row">
                        <td colSpan="8">
                          <div className="attendance-details-wrapper">
                          <table className="attendance-details-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Shift</th>
                                <th>Time Slots (In - Out)</th>
                                <th>Total Time</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stat.details.map(d => {
                                const dayName = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
                                const isSunday = new Date(d.date + 'T00:00:00').getDay() === 0;
                                const isHoliday = holidays.some(h => h.date === d.date);
                                const isRedDay = isSunday || isHoliday;
                                return (
                                  <tr key={d.date} style={{ backgroundColor: isRedDay ? '#fff1f2' : '#ffffff' }}>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      <div style={{ fontWeight: 600, color: isRedDay ? '#be123c' : 'inherit' }}>
                                        {dayName} {isHoliday && <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Holiday)</span>}
                                      </div>
                                      <div style={{ fontSize: '12px', color: isRedDay ? '#e11d48' : '#6b7280' }}>{d.date}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      <span className={`badge ${d.status === 'Present' ? 'badge-success' :
                                        (d.status === 'Half Day' || d.status === 'HD') ? 'badge-info' :
                                        d.status === 'Absent' ? 'badge-danger' :
                                          d.status === 'Holiday' ? 'badge-warning' : ''
                                        }`}>{d.status === 'Half Day' ? 'HD' : d.status}</span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                                      {(() => {
                                        const isNightTime = (t) => t ? (t > '19:00' || t <= '08:00') : false;
                                        let hasDay = false;
                                        let hasNight = false;
                                        if (d.timeSlots && d.timeSlots.length > 0) {
                                          d.timeSlots.forEach(s => {
                                            if (isNightTime(s.in)) hasNight = true;
                                            else hasDay = true;
                                          });
                                        } else {
                                          if (d.shiftType === 'Night') hasNight = true;
                                          else if (d.shiftType === 'Day') hasDay = true;
                                        }

                                        if (hasDay && hasNight) {
                                          return (
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                              <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>Day</span>
                                              <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>Night</span>
                                            </div>
                                          );
                                        } else if (hasNight) {
                                          return <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>Night</span>;
                                        } else if (hasDay) {
                                          return <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>Day</span>;
                                        }
                                        return <span style={{ color: 'var(--text-secondary)' }}>{d.shiftType || '-'}</span>;
                                      })()}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      {(() => {
                                        const pendingReg = pendingRequests.find(pr => pr.date === d.date && pr.type === 'REGULARIZE');
                                        let reqSlots = null;
                                        if (pendingReg && pendingReg.time) {
                                          try { reqSlots = JSON.parse(pendingReg.time); } catch(e){}
                                        }

                                        if (d.timeSlots && d.timeSlots.length > 0) {
                                          return (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              {d.timeSlots.map((slot, i) => {
                                                const isNight = slot.in ? (slot.in > '19:00' || slot.in <= '08:00') : false;
                                                return (
                                                  <span key={i} className="badge" 
                                                    onClick={() => handleDeleteSlot(d.date, i, d.timeSlots, d.shiftType, d.status)}
                                                    title="Click to delete this time slot"
                                                    style={{
                                                      cursor: 'pointer',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      backgroundColor: isNight ? '#f3e8ff' : '#e0f2fe',
                                                      color: isNight ? '#6b21a8' : '#0369a1'
                                                    }}>
                                                    {slot.in || '?'} - {slot.out || '?'}
                                                    <XCircle size={12} style={{marginLeft: '4px'}} />
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          );
                                        } else if (reqSlots) {
                                          return (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px dashed #fcd34d' }}>
                                                Requested: {reqSlots.in || '?'} - {reqSlots.out || '?'}
                                              </span>
                                            </div>
                                          );
                                        } else {
                                          return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
                                        }
                                      })()}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Clock size={14} color="var(--text-secondary)" />
                                        {calculateTotalTime(d.timeSlots)}
                                      </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      {pendingRequests.some(pr => pr.date === d.date && (pr.type === 'IN' || pr.type === 'OUT' || pr.type === 'REGULARIZE')) ? (
                                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}>Pending Approval</span>
                                      ) : (d.status === 'Absent' || d.status === 'Holiday') ? (
                                        <button
                                          onClick={() => {
                                            const newRegData = { date: d.date, reason: '', inTime: '', outTime: '', latitude: 28.6139, longitude: 77.2090 };
                                            if (navigator.geolocation) {
                                              navigator.geolocation.getCurrentPosition((pos) => {
                                                setRegularizeData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                                              });
                                            }
                                            setRegularizeData(newRegData);
                                            setIsRegularizeModalOpen(true);
                                          }}
                                          style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                          Regularize
                                        </button>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          </div>
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
                  onChange={e => setProfileData({ ...profileData, empId: e.target.value })}
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
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Email</label>
                <input
                  required
                  type="email"
                  value={profileData.email}
                  onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Department</label>
                <input
                  required
                  type="text"
                  value={profileData.department}
                  onChange={e => setProfileData({ ...profileData, department: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Password</label>
                <input
                  type="text"
                  value={profileData.password}
                  onChange={e => setProfileData({ ...profileData, password: e.target.value })}
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
              <div style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', color: '#92400e', fontSize: '12px' }}>
                <strong>Note:</strong> Please enter the time in <strong>24-hour format</strong> (e.g. 19:30 instead of 7:30 PM).
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Date</label>
                <input
                  type="date"
                  value={regularizeData.date}
                  onChange={e => setRegularizeData({ ...regularizeData, date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Punch In Time</label>
                  <input
                    type="time"
                    value={regularizeData.inTime}
                    onChange={e => setRegularizeData({ ...regularizeData, inTime: e.target.value })}
                  />
                  <small style={{ color: '#64748b' }}>Leave blank if not missed</small>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Punch Out Time</label>
                  <input
                    type="time"
                    value={regularizeData.outTime}
                    onChange={e => setRegularizeData({ ...regularizeData, outTime: e.target.value })}
                  />
                  <small style={{ color: '#64748b' }}>Leave blank if not missed</small>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Reason for Regularization</label>
                <textarea
                  required
                  value={regularizeData.reason || ''}
                  onChange={e => setRegularizeData({ ...regularizeData, reason: e.target.value })}
                  placeholder="E.g., Forgot to punch in, Biometric issue, etc."
                  rows={3}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Location Name (Where were you present?)</label>
                <input
                  type="text"
                  value={regularizeData.locationName || ''}
                  onChange={e => setRegularizeData({ ...regularizeData, locationName: e.target.value })}
                  placeholder="E.g., Client Office (ABC Corp), Delhi"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Location (Pin on map)</label>
                <LocationPicker
                  defaultPosition={regularizeData.latitude ? { lat: regularizeData.latitude, lng: regularizeData.longitude } : null}
                  onChange={(pos) => setRegularizeData({ ...regularizeData, latitude: pos.lat, longitude: pos.lng })}
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

      {/* COff Conversion Modal */}
      {isCoffModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCoffModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Convert Night Shifts to COff</h2>
              <button className="close-btn" onClick={() => setIsCoffModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCoffSubmit} className="modal-body">
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, color: '#0369a1', fontSize: '13px', fontWeight: 500 }}>
                  You have <strong>{availableNightShifts}</strong> total Night Shifts logged in <strong>{coffData.month}</strong>.
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#0284c7', fontSize: '12px' }}>
                  Please verify you haven't already converted these before submitting.
                </p>
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Target Month</label>
                <input
                  type="month"
                  value={coffData.month}
                  onChange={e => setCoffData({ ...coffData, month: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Number of COffs to Claim</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, availableNightShifts)}
                  value={coffData.numCoffs}
                  onChange={e => setCoffData({ ...coffData, numCoffs: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>

              <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-outline" onClick={() => setIsCoffModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#8b5cf6', color: '#fff', border: 'none' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <ImprestModal 
        isOpen={isImprestModalOpen} 
        onClose={() => setIsImprestModalOpen(false)} 
        employee={employee} 
        onSubmit={handleImprestSubmit} 
      />     {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: '500' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
