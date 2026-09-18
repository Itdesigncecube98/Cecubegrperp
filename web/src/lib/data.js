'use client';

export const loginAdmin = async (email, password) => {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  return data;
};

export const loginEmployee = async (email, password) => {
  const res = await fetch('/api/auth/employee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await res.json();
};

export const getEmployees = async (role = null) => {
  const url = role ? `/api/employees?role=${role}` : '/api/employees';
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
};

export const getAnalytics = async () => {
  const res = await fetch('/api/analytics', { cache: 'no-store' });
  return await res.json();
};

export const addEmployee = async (employeeData) => {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employeeData)
  });
  return await res.json();
};

export const updateEmployee = async (id, updatedData) => {
  // The PUT handler lives on the per-employee route (/api/employees/[id]).
  // The collection route (/api/employees) only supports GET and POST, so
  // posting to it returned 405 and silently discarded the changes.
  const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updatedData })
  });
  return await res.json();
};

export const deleteEmployee = async (id) => {
  const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getAttendance = async (date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const res = await fetch(`/api/attendance?date=${targetDate}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const markAttendance = async (employeeId, date, status, shiftType = 'Day', timeSlots = '[]') => {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, date, status, shiftType, timeSlots })
  });
  return await res.json();
};

export const getEmployeeStats = async (employeeId) => {
  const res = await fetch(`/api/attendance/stats?employeeId=${employeeId}`, { cache: 'no-store' });
  return await res.json();
};

export const getAdmins = async () => {
  const res = await fetch('/api/admins', { cache: 'no-store' });
  return await res.json();
};

export const addAdmin = async (adminData) => {
  const res = await fetch('/api/admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adminData)
  });
  return await res.json();
};

export const updateAdmin = async (id, updatedData) => {
  const res = await fetch('/api/admins', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updatedData })
  });
  return await res.json();
};

export const deleteAdmin = async (id) => {
  const res = await fetch(`/api/admins?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getPunchRequests = async (supervisorId = null, employeeId = null) => {
  let url = '/api/requests';
  const params = new URLSearchParams();
  if (supervisorId) params.append('supervisorId', supervisorId);
  if (employeeId) params.append('employeeId', employeeId);
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
};

export const createPunchRequest = async (data) => {
  const res = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updatePunchRequestStatus = async (id, status, grantCoff = false) => {
  const res = await fetch('/api/requests', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, grantCoff })
  });
  return await res.json();
};

export const getLeaveRequests = async (supervisorId = null, employeeId = null) => {
  let url = '/api/leaves';
  const params = new URLSearchParams();
  if (supervisorId) params.append('supervisorId', supervisorId);
  if (employeeId) params.append('employeeId', employeeId);
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
};

export const createLeaveRequest = async (data) => {
  const res = await fetch('/api/leaves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateLeaveRequestStatus = async (id, status, approvedBy = null, role = null) => {
  const res = await fetch('/api/leaves', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, approvedBy, role })
  });
  return await res.json();
};

export const getLeaveBalance = async (employeeId) => {
  const res = await fetch(`/api/leaves/balance?employeeId=${employeeId}`, { cache: 'no-store' });
  return await res.json();
};

export const updateLeaveBalance = async (data) => {
  const res = await fetch('/api/leaves/balance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const getHolidays = async () => {
  const res = await fetch('/api/leaves/holidays', { cache: 'no-store' });
  return await res.json();
};

export const createHoliday = async (data) => {
  const res = await fetch('/api/leaves/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const deleteHoliday = async (id) => {
  const res = await fetch(`/api/leaves/holidays?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getSettings = async () => {
  const res = await fetch('/api/settings', { cache: 'no-store' });
  return await res.json();
};

export const updateSettings = async (data) => {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const getWorkWeeks = async () => {
  const res = await fetch('/api/setup/workweek', { cache: 'no-store' });
  return await res.json();
};

export const updateWorkWeeks = async (data) => {
  const res = await fetch('/api/setup/workweek', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const getLeaveTypes = async () => {
  const res = await fetch('/api/setup/leavetype', { cache: 'no-store' });
  return await res.json();
};

export const createLeaveType = async (data) => {
  const res = await fetch('/api/setup/leavetype', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const deleteLeaveType = async (id) => {
  const res = await fetch(`/api/setup/leavetype?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getAnnouncements = async () => {
  const res = await fetch('/api/announcements', { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const createAnnouncement = async (data) => {
  const res = await fetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const deleteAnnouncement = async (id) => {
  const res = await fetch(`/api/announcements?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getLocations = async () => {
  const res = await fetch('/api/locations', { cache: 'no-store' });
  return await res.json();
};

export const createLocation = async (data) => {
  const res = await fetch('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateLocation = async (data) => {
  const res = await fetch('/api/locations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const deleteLocation = async (id) => {
  const res = await fetch(`/api/locations?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getLocationRequests = async (employeeId = '', date = '') => {
  let url = '/api/location-requests?';
  if (employeeId) url += `employeeId=${employeeId}&`;
  if (date) url += `date=${date}`;
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
};

export const requestLocation = async (employeeId) => {
  const res = await fetch('/api/location-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId })
  });
  return await res.json();
};

export const updateLocationRequest = async (data) => {
  const res = await fetch('/api/location-requests', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const deleteLocationRequest = async (id) => {
  const res = await fetch(`/api/location-requests?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const pingLocation = async (requestId, latitude, longitude) => {
  const res = await fetch('/api/location-requests/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, latitude, longitude })
  });
  return await res.json();
};

export const getDocuments = async (employeeId = '', type = '') => {
  let url = '/api/documents?';
  if (employeeId) url += `employeeId=${employeeId}&`;
  if (type) url += `type=${type}`;
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
};

export const createDocument = async (data) => {
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const deleteDocument = async (id) => {
  const res = await fetch(`/api/documents?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getImprestApprovals = async (approverId) => {
  const res = await fetch(`/api/imprest?approverId=${approverId}`, { cache: 'no-store' });
  return await res.json();
};

export const updateImprestRequest = async (id, action, updateData) => {
  const res = await fetch('/api/imprest', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action, ...updateData })
  });
  return await res.json();
};
export const getMyImprestRequests = async (employeeId) => {
  const res = await fetch(`/api/imprest?employeeId=${employeeId}`, { cache: 'no-store' });
  return await res.json();
};

export const getCandidates = async () => {
  const res = await fetch('/api/candidates', { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const addCandidate = async (candidateData) => {
  const res = await fetch('/api/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(candidateData)
  });
  return await res.json();
};

export const updateCandidate = async (id, updatedData) => {
  const res = await fetch('/api/candidates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updatedData })
  });
  return await res.json();
};

export const deleteCandidate = async (id) => {
  const res = await fetch(`/api/candidates?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};
