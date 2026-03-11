export function saveSpaceSession(space) {
  if (!space?._id) return;

  localStorage.setItem('spaceId', space._id);
  if (space.spaceName) localStorage.setItem('spaceName', space.spaceName);
  localStorage.setItem('spaceSession', JSON.stringify(space));
}

export function getSavedSpaceId() {
  return localStorage.getItem('spaceId') || '';
}

export function getSavedSpaceSession() {
  const raw = localStorage.getItem('spaceSession');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSenderName(name) {
  if (!name) return;
  localStorage.setItem('senderName', name.trim());
}

export function getSavedSenderName() {
  return localStorage.getItem('senderName') || '';
}

export function clearSession() {
  localStorage.removeItem('spaceId');
  localStorage.removeItem('spaceName');
  localStorage.removeItem('spaceSession');
  localStorage.removeItem('senderName');
}

export function hasActiveSession() {
  return Boolean(getSavedSpaceId() && getSavedSenderName());
}
