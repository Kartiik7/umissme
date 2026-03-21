const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const spaceId = localStorage.getItem('spaceId') || '';
  const userName = localStorage.getItem('userName') || localStorage.getItem('displayName') || '';

  return {
    'x-space-id': spaceId,
    'x-user-name': userName,
  };
}

async function request(url, options = {}) {
  try {
    const mergedHeaders = {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });

    // Handle empty body (e.g. 502/504 from proxy when server is down)
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Server is unreachable. Please try again.');
    }

    if (!res.ok) {
      throw new Error(json.message || `Request failed (${res.status})`);
    }
    return json;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Server is unreachable. Please check your connection.');
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

export async function identifySpaceUser(spaceId, displayName) {
  if (!spaceId || !displayName) throw new Error('Space ID and display name are required');
  return request(`${API_BASE}/spaces/${encodeURIComponent(spaceId)}/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
}

export async function getSpaceOverview(spaceId) {
  if (!spaceId) throw new Error('Invalid space ID');
  return request(`${API_BASE}/spaces/${encodeURIComponent(spaceId)}/overview`);
}

export async function sendPing(spaceId, displayName) {
  if (!spaceId || !displayName) throw new Error('Space ID and display name are required');
  return request(`${API_BASE}/spaces/${encodeURIComponent(spaceId)}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
}

export async function addMemory(spaceId, payload) {
  if (!spaceId) throw new Error('Invalid space ID');
  return request(`${API_BASE}/spaces/${encodeURIComponent(spaceId)}/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getMessages(spaceId) {
  if (!spaceId) throw new Error('Invalid space ID');
  return request(`${API_BASE}/messages/${encodeURIComponent(spaceId)}`);
}

export async function updateRetention(spaceId, retentionHours) {
  if (!spaceId) throw new Error('Invalid space ID');
  return request(`${API_BASE}/spaces/${encodeURIComponent(spaceId)}/retention`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ retentionHours }),
  });
}

export async function sendMessage(payload) {
  return request(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function markMessagesSeen(spaceId, sender) {
  if (!spaceId || !sender) return;
  return request(`${API_BASE}/messages/mark-seen/${encodeURIComponent(spaceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender }),
  });
}
