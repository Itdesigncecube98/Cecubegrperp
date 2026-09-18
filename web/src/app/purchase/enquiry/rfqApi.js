const RFQ_ENDPOINT = '/api/purchase/rfq';

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
  const data = await response.json();
  return data;
}

export const listEnquiries = () => getJson(RFQ_ENDPOINT, 'Failed to load enquiries.');

export const getEnquiry = (id) =>
  getJson(`${RFQ_ENDPOINT}?id=${encodeURIComponent(id)}`, 'Failed to load the enquiry.');

export async function createEnquiry(payload) {
  const response = await fetch(RFQ_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to save the enquiry.'));
  return response.json();
}

export async function deleteEnquiry(id) {
  const response = await fetch(RFQ_ENDPOINT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to delete the enquiry.'));
  return response.json();
}

export const listIndents = async () => {
  const data = await getJson('/api/purchase/pr', 'Failed to load purchase indents.');
  return Array.isArray(data) ? data : [];
};

export const listVendors = async () => {
  const data = await getJson('/api/purchase/vendors', 'Failed to load vendors.');
  return Array.isArray(data) ? data : [];
};

export const listBrands = async () => {
  const data = await getJson('/api/brands', 'Failed to load brands.');
  return Array.isArray(data) ? data : [];
};
