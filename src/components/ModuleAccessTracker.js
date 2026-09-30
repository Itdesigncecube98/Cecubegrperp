'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const MODULE_ROUTES = [
  ['/admin-dashboard', 'Admin'], ['/engineering', 'Engineering'], ['/marketing', 'Marketing'],
  ['/accounts', 'Accounts'], ['/tender', 'Tender'], ['/contracting', 'Contracting'],
  ['/site', 'Site'], ['/purchase', 'Purchase'], ['/employee', 'HRMS'], ['/employeedashboard', 'HRMS'],
  ['/hrms', 'HRMS'], ['/dashboard', 'Dashboard'],
];

function moduleForPath(pathname) {
  return MODULE_ROUTES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] || null;
}

export default function ModuleAccessTracker() {
  const pathname = usePathname();
  const lastModule = useRef(null);
  const currentPath = useRef(pathname || '/');

  useEffect(() => {
    currentPath.current = pathname || '/';
  }, [pathname]);

  useEffect(() => {
    if (window.__cecubeAuditFetchInstalled) return;
    window.__cecubeAuditFetchInstalled = true;
    const nativeFetch = window.fetch.bind(window);

    const capture = async (input, init, response) => {
      try {
        const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
        const url = new URL(rawUrl, window.location.href);
        if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/') || url.pathname === '/api/admin/audit-log') return;
        const method = String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;

        let payload = {};
        if (typeof init?.body === 'string') {
          try { payload = JSON.parse(init.body); } catch { payload = {}; }
        }
        const endpoint = url.pathname.toLowerCase();
        const requestedAction = String(payload.action || '').toUpperCase();
        const apiParts = endpoint.split('/').filter(Boolean);
        const moduleApiRoots = new Set(['admin', 'marketing', 'purchase', 'site', 'engineering', 'contracting', 'accounts', 'tender', 'hrms', 'auth']);
        const entityName = apiParts[moduleApiRoots.has(apiParts[1]) ? 2 : 1] || apiParts.at(-1) || 'record';
        let action;
        const nextStatus = String(payload.status || payload.leadStatus || payload.taskStatus || '').toLowerCase();
        if (endpoint.includes('email') || endpoint.includes('/send')) action = 'EMAIL_SEND';
        else if (requestedAction.includes('REJECT') || endpoint.includes('reject') || nextStatus === 'rejected') action = 'REJECT';
        else if (requestedAction.includes('APPROVE') || endpoint.includes('approve') || nextStatus === 'approved') action = 'APPROVE';
        else if (requestedAction.includes('STATUS') || (method !== 'POST' && (payload.status || payload.leadStatus || payload.taskStatus) && /task|lead|enquir/i.test(endpoint))) action = 'STATUS_CHANGE';
        else if (requestedAction.includes('DELETE')) action = 'DELETE';
        else if (requestedAction.includes('UPDATE') || requestedAction.includes('EDIT') || requestedAction.includes('SAVE')) action = 'UPDATE';
        else if (requestedAction.includes('CREATE') || requestedAction.includes('ADD')) action = 'CREATE';
        else if (method === 'POST') action = 'CREATE';
        else if (method === 'DELETE') action = 'DELETE';
        else action = 'UPDATE';

        const sensitiveKey = /(password|token|secret|email|phone|mobile|contact|address|gst|pan|aadhaar|document|attachment|file|remark|note|description|requirement|cookie|authorization)/i;
        const requestRecord = { ...payload, ...(payload.task || {}), ...(payload.taskUpdate || {}), ...(payload.project || {}), ...(payload.lead || {}), ...(payload.enquiry || {}) };
        const details = Object.fromEntries(Object.entries(requestRecord).filter(([key, value]) => !sensitiveKey.test(key) && ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 18).map(([key, value]) => [key, String(value).slice(0, 120)]));
        let id = requestRecord.id || requestRecord.taskId || requestRecord.leadId || requestRecord.enquiryId || requestRecord.projectId || null;
        if (response.ok) {
          try {
            const result = await response.clone().json();
            const record = result?.data || result?.task || result?.lead || result?.enquiry || result?.project || result;
            id = id || record?.id || null;
            for (const key of ['name', 'title', 'projectName', 'taskName', 'companyName', 'customerName', 'vendorName', 'supplierName', 'contractorName', 'employeeName', 'leadId', 'enquiryId', 'poNo', 'woNo', 'billNo', 'raBillNo', 'invoiceNumber']) {
              if (!details[key] && ['string', 'number'].includes(typeof record?.[key])) details[key] = String(record[key]).slice(0, 180);
            }
          } catch { /* Some endpoints return an empty or non-JSON response. */ }
        }
        const module = moduleForPath(currentPath.current);
        if (!module) return;

        nativeFetch('/api/admin/audit-log', {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pagePath: currentPath.current,
            apiPath: url.pathname,
            action,
            status: response.ok ? 'SUCCESS' : 'FAILURE',
            entityType: entityName.replace(/[^a-z0-9_-]/gi, '').slice(0, 80),
            entityId: id && !String(id).startsWith('api') ? String(id) : undefined,
            details,
          }),
        }).catch(error => console.error('Activity audit request failed.', error));
      } catch (error) {
        console.error('Could not capture activity audit event.', error);
      }
    };

    window.fetch = async (input, init) => {
      const response = await nativeFetch(input, init);
      capture(input, init, response).catch(error => console.error('Could not capture activity audit event.', error));
      return response;
    };
    return () => {
      if (window.fetch !== nativeFetch) window.fetch = nativeFetch;
      window.__cecubeAuditFetchInstalled = false;
    };
  }, []);

  useEffect(() => {
    const module = moduleForPath(pathname || '');
    if (module === lastModule.current) return;
    lastModule.current = module;
    if (!module) return;
    fetch('/api/admin/audit-log', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ pagePath: pathname, action: 'MODULE_OPEN' }),
    }).then(response => {
      if (!response.ok) console.error(`Module access log failed (${response.status}) for ${module}.`);
    }).catch(error => console.error('Module access log request failed.', error));
  }, [pathname]);

  return null;
}
