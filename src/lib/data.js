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
  const res = await fetch(url);
  return await res.json();
};

export const getAnalytics = async () => {
  const res = await fetch('/api/analytics');
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
  const res = await fetch('/api/employees', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updatedData })
  });
  return await res.json();
};

export const deleteEmployee = async (id) => {
  const res = await fetch(`/api/employees?id=${id}`, {
    method: 'DELETE'
  });
  return await res.json();
};

export const getAttendance = async (date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const res = await fetch(`/api/attendance?date=${targetDate}`);
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
  const res = await fetch(`/api/attendance/stats?employeeId=${employeeId}`);
  return await res.json();
};

export const getAdmins = async () => {
  const res = await fetch('/api/admins');
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
  
  const res = await fetch(url);
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

export const updatePunchRequestStatus = async (id, status) => {
  const res = await fetch('/api/requests', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status })
  });
  return await res.json();
};

export const getLeaveRequests = async (supervisorId = null, employeeId = null) => {
  let url = '/api/leaves';
  const params = new URLSearchParams();
  if (supervisorId) params.append('supervisorId', supervisorId);
  if (employeeId) params.append('employeeId', employeeId);
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url);
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
  const res = await fetch(`/api/leaves/balance?employeeId=${employeeId}`);
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
  const res = await fetch('/api/leaves/holidays');
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
  const res = await fetch('/api/settings');
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
  const res = await fetch('/api/setup/workweek');
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
  const res = await fetch('/api/setup/leavetype');
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
  const res = await fetch('/api/announcements');
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
  const res = await fetch(url);
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
  const res = await fetch(url);
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

// ─────────────────────────────────────────────────────────────
// ENGINEERING MODULE
// ─────────────────────────────────────────────────────────────

// --- Projects ---
export const getEnggDashboard = async () => {
  const res = await fetch('/api/engg/dashboard-summary');
  return await res.json();
};

export const getProjects = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/engg/projects${q ? '?' + q : ''}`);
  return await res.json();
};

export const getProject = async (id) => {
  const res = await fetch(`/api/engg/projects?id=${id}`);
  return await res.json();
};

export const createProject = async (data) => {
  const res = await fetch('/api/engg/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateProject = async (id, data) => {
  const res = await fetch('/api/engg/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteProject = async (id) => {
  const res = await fetch(`/api/engg/projects?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Work Orders ---
export const getWorkOrders = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/engg/work-orders${q ? '?' + q : ''}`);
  return await res.json();
};

export const getWorkOrder = async (id) => {
  const res = await fetch(`/api/engg/work-orders?id=${id}`);
  return await res.json();
};

export const createWorkOrder = async (data) => {
  const res = await fetch('/api/engg/work-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateWorkOrder = async (id, data) => {
  const res = await fetch('/api/engg/work-orders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteWorkOrder = async (id) => {
  const res = await fetch(`/api/engg/work-orders?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Site Visits ---
export const getSiteVisits = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/engg/site-visits${q ? '?' + q : ''}`);
  return await res.json();
};

export const createSiteVisit = async (data) => {
  const res = await fetch('/api/engg/site-visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateSiteVisit = async (id, data) => {
  const res = await fetch('/api/engg/site-visits', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteSiteVisit = async (id) => {
  const res = await fetch(`/api/engg/site-visits?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Material Requests ---
export const getMaterialRequests = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/engg/material-requests${q ? '?' + q : ''}`);
  return await res.json();
};

export const getMaterialRequest = async (id) => {
  const res = await fetch(`/api/engg/material-requests?id=${id}`);
  return await res.json();
};

export const createMaterialRequest = async (data) => {
  const res = await fetch('/api/engg/material-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateMaterialRequest = async (id, data) => {
  const res = await fetch('/api/engg/material-requests', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteMaterialRequest = async (id) => {
  const res = await fetch(`/api/engg/material-requests?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Drawings ---
export const getDrawings = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/engg/drawings${q ? '?' + q : ''}`);
  return await res.json();
};

export const createDrawing = async (data) => {
  const res = await fetch('/api/engg/drawings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateDrawing = async (id, data) => {
  const res = await fetch('/api/engg/drawings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteDrawing = async (id) => {
  const res = await fetch(`/api/engg/drawings?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Equipment ---
export const getEquipment = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/engg/equipment${q ? '?' + q : ''}`);
  return await res.json();
};

export const createEquipment = async (data) => {
  const res = await fetch('/api/engg/equipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateEquipment = async (id, data) => {
  const res = await fetch('/api/engg/equipment', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteEquipment = async (id) => {
  const res = await fetch(`/api/engg/equipment?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// ─────────────────────────────────────────────────────────────
// ACCOUNTS PORTAL
// ─────────────────────────────────────────────────────────────

// --- Dashboard ---
export const getAccountsDashboard = async () => {
  const res = await fetch('/api/accounts/dashboard-summary');
  return await res.json();
};

// --- Vendors ---
export const getVendors = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/accounts/vendors${q ? '?' + q : ''}`);
  return await res.json();
};

export const createVendor = async (data) => {
  const res = await fetch('/api/accounts/vendors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateVendor = async (id, data) => {
  const res = await fetch('/api/accounts/vendors', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteVendor = async (id) => {
  const res = await fetch(`/api/accounts/vendors?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Purchase Orders ---
export const getPurchaseOrders = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/accounts/purchase-orders${q ? '?' + q : ''}`);
  return await res.json();
};

export const getPurchaseOrder = async (id) => {
  const res = await fetch(`/api/accounts/purchase-orders?id=${id}`);
  return await res.json();
};

export const createPurchaseOrder = async (data) => {
  const res = await fetch('/api/accounts/purchase-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updatePurchaseOrder = async (id, data) => {
  const res = await fetch('/api/accounts/purchase-orders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deletePurchaseOrder = async (id) => {
  const res = await fetch(`/api/accounts/purchase-orders?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Invoices ---
export const getInvoices = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/accounts/invoices${q ? '?' + q : ''}`);
  return await res.json();
};

export const getInvoice = async (id) => {
  const res = await fetch(`/api/accounts/invoices?id=${id}`);
  return await res.json();
};

export const createInvoice = async (data) => {
  const res = await fetch('/api/accounts/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateInvoice = async (id, data) => {
  const res = await fetch('/api/accounts/invoices', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteInvoice = async (id) => {
  const res = await fetch(`/api/accounts/invoices?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Expenses ---
export const getExpenses = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/accounts/expenses${q ? '?' + q : ''}`);
  return await res.json();
};

export const createExpense = async (data) => {
  const res = await fetch('/api/accounts/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateExpense = async (id, data) => {
  const res = await fetch('/api/accounts/expenses', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteExpense = async (id) => {
  const res = await fetch(`/api/accounts/expenses?id=${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- Payroll ---
export const getPayrolls = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/accounts/payroll${q ? '?' + q : ''}`);
  return await res.json();
};

export const processPayroll = async (data) => {
  const res = await fetch('/api/accounts/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updatePayroll = async (id, data) => {
  const res = await fetch('/api/accounts/payroll', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

// --- Budget ---
export const getBudget = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/accounts/budget${q ? '?' + q : ''}`);
  return await res.json();
};

export const createBudgetItem = async (data) => {
  const res = await fetch('/api/accounts/budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const updateBudgetItem = async (id, data) => {
  const res = await fetch('/api/accounts/budget', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data })
  });
  return await res.json();
};

export const deleteBudgetItem = async (id) => {
  const res = await fetch(`/api/accounts/budget?id=${id}`, { method: 'DELETE' });
  return await res.json();
};
