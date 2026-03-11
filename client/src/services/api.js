const API_BASE = '/api';

async function request(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `Request failed (${res.status})`);
    }
    return json;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Unable to reach server. Please check your connection.');
    }
    throw err;
  }
}

export async function createSpace(data) {
  return request(`${API_BASE}/spaces/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function joinSpace(data) {
  return request(`${API_BASE}/spaces/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function sendMessage(data) {
  return request(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getMessages(spaceId) {
  if (!spaceId) throw new Error('Invalid space ID');
  return request(`${API_BASE}/messages/${encodeURIComponent(spaceId)}`);
}

export async function getLastMessage(spaceId) {
  if (!spaceId) return null;
  return request(`${API_BASE}/messages/${encodeURIComponent(spaceId)}/last`);
}

export async function markMessagesSeen(spaceId, sender) {
  if (!spaceId || !sender) return;
  return request(`${API_BASE}/messages/mark-seen/${encodeURIComponent(spaceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender }),
  });
}
