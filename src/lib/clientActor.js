'use client';

export function getClientActor() {
  if (typeof window === 'undefined') return '';
  for (const key of ['employeeData', 'activeEmp', 'adminData']) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
      const name = data?.name || data?.fullName || data?.username || data?.email;
      if (name) return name;
    } catch { /* Ignore stale or malformed local session data. */ }
  }
  return 'System User';
}
