const BRANDS_ENDPOINT = '/api/brands';

const readErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
};

export async function listBrands() {
  const response = await fetch(`${BRANDS_ENDPOINT}?_t=${Date.now()}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to load brands.'));
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function createBrand({ name, status }) {
  const response = await fetch(BRANDS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, status })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to save brand.'));
  }

  return response.json();
}

export async function updateBrand({ id, name, status }) {
  const response = await fetch(BRANDS_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, status })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to update brand.'));
  }

  return response.json();
}

export async function removeBrand(id) {
  const response = await fetch(BRANDS_ENDPOINT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete brand.'));
  }

  return response.json();
}
