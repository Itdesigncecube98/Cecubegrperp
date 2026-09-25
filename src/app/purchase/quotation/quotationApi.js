const QUOTATION_ENDPOINT = '/api/purchase/quotation';
const COMPARE_ENDPOINT = '/api/purchase/quotation/compare';

async function readError(response, fallback) {
  try {
    const data = await response.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

async function getJson(url, fallback) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(await readError(response, fallback));
  return response.json();
}

async function sendJson(url, method, payload, fallback) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readError(response, fallback));
  return response.json();
}

export const listQuotations = async (rfqId) => {
  const data = await getJson(
    rfqId ? `${QUOTATION_ENDPOINT}?rfqId=${encodeURIComponent(rfqId)}` : QUOTATION_ENDPOINT,
    'Failed to load quotations.'
  );
  return Array.isArray(data) ? data : [];
};

export const getComparison = (rfqId) =>
  getJson(`${COMPARE_ENDPOINT}?rfqId=${encodeURIComponent(rfqId)}`, 'Failed to load the comparison.');

export const saveQuotation = (payload) =>
  sendJson(QUOTATION_ENDPOINT, 'POST', payload, 'Failed to save the quotation.');

export const deleteQuotation = (id) =>
  sendJson(QUOTATION_ENDPOINT, 'DELETE', { id }, 'Failed to delete the quotation.');

export const approveSelection = (rfqId, selections) =>
  sendJson(COMPARE_ENDPOINT, 'POST', { rfqId, selections }, 'Failed to approve the selection.');

/** Line total used for live preview before saving: qty x rate, less discount %, plus GST %. */
export function computeLineTotal(quantity, rate, discountPercent, gstPercent) {
  const gross = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
  const taxable = gross - (gross * (parseFloat(discountPercent) || 0)) / 100;
  const total = taxable + (taxable * (parseFloat(gstPercent) || 0)) / 100;
  return Math.round(total * 100) / 100;
}
