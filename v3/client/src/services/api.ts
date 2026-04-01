const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const getAuth = () => {
  const spaceId = localStorage.getItem('pinglet_spaceId');
  const userName = localStorage.getItem('pinglet_userName');
  return { spaceId, userName };
};

export const setAuth = (spaceId: string, userName: string) => {
  localStorage.setItem('pinglet_spaceId', spaceId);
  localStorage.setItem('pinglet_userName', userName);
};

export const clearAuth = () => {
  localStorage.removeItem('pinglet_spaceId');
  localStorage.removeItem('pinglet_userName');
};

const fetchJson = async (path: string, options: RequestInit = {}) => {
  const { spaceId, userName } = getAuth();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(spaceId && { 'x-space-id': spaceId }),
    ...(userName && { 'x-user-name': userName }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Request Failed' }));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }

  return response.json();
};

export const createSpace = (spaceName: string, friendOneName: string, friendTwoName: string, accessCode: string) =>
  fetchJson('/spaces/create', {
    method: 'POST',
    body: JSON.stringify({ spaceName, friendOneName, friendTwoName, accessCode }),
  });

export const joinSpace = (spaceName: string, accessCode: string) =>
  fetchJson('/spaces/join', {
    method: 'POST',
    body: JSON.stringify({ spaceName, accessCode }),
  });

export const getSpaceOverview = (spaceId: string) => 
  fetchJson(`/spaces/${spaceId}/overview`);

export const sendPing = (spaceId: string, pingType: string) => 
  fetchJson(`/spaces/${spaceId}/ping`, {
    method: 'POST',
    body: JSON.stringify({ pingType }),
  });

export const getMessages = (spaceId: string, limit = 50, before?: string) => {
  const query = new URLSearchParams({ limit: limit.toString() });
  if (before) query.append('before', before);
  return fetchJson(`/messages/${spaceId}?${query.toString()}`);
};

export const sendMessage = (spaceId: string, content: string, type: 'text' | 'ping' = 'text', metadata = {}) => 
  fetchJson('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ spaceId, text: content, type, metadata }),
  });

export const markMessagesSeen = (spaceId: string) => 
  fetchJson(`/messages/mark-seen/${spaceId}`, { method: 'PUT' });

export const updateName = (spaceId: string, newName: string) => 
  fetchJson(`/spaces/${spaceId}/update-name`, {
    method: 'PUT',
    body: JSON.stringify({ newName }),
  });

export const addMemory = (spaceId: string, memoryData: { title: string, note: string, imageUrl?: string }) => 
  fetchJson(`/spaces/${spaceId}/memories`, {
    method: 'POST',
    body: JSON.stringify(memoryData),
  });

export const updateRetention = (spaceId: string, retentionHours: number) => 
  fetchJson(`/spaces/${spaceId}/retention`, {
    method: 'PUT',
    body: JSON.stringify({ retentionHours }),
  });
