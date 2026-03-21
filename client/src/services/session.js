function sanitizeSpaceForSession(space) {
  if (!space || typeof space !== 'object') return null;
  const { accessCode, ...safeSpace } = space;
  return safeSpace;
}

export function saveSpaceSession(space) {
  const safeSpace = sanitizeSpaceForSession(space);
  if (!safeSpace?._id) return;

  localStorage.setItem('spaceId', safeSpace._id);
  if (safeSpace.spaceName) localStorage.setItem('spaceName', safeSpace.spaceName);
  localStorage.setItem('spaceSession', JSON.stringify(safeSpace));
}

export function getSavedSpaceId() {
  return localStorage.getItem('spaceId') || '';
}

export function getSavedSpaceSession() {
  const raw = localStorage.getItem('spaceSession');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const safeSpace = sanitizeSpaceForSession(parsed);

    if (safeSpace && parsed && Object.prototype.hasOwnProperty.call(parsed, 'accessCode')) {
      localStorage.setItem('spaceSession', JSON.stringify(safeSpace));
    }

    return safeSpace;
  } catch {
    return null;
  }
}

export function saveDisplayName(name) {
  if (!name) return;
  const normalized = name.trim();
  localStorage.setItem('displayName', normalized);
  localStorage.setItem('senderName', normalized);
  localStorage.setItem('userName', normalized);
}

export function getSavedDisplayName() {
  return localStorage.getItem('displayName') || localStorage.getItem('senderName') || '';
}

export function saveUserName(name) {
  if (!name) return;
  localStorage.setItem('userName', name.trim());
}

export function getSavedUserName() {
  return localStorage.getItem('userName') || getSavedDisplayName();
}

export function saveSenderName(name) {
  saveDisplayName(name);
}

export function getSavedSenderName() {
  return getSavedDisplayName();
}

export function clearSession() {
  localStorage.removeItem('spaceId');
  localStorage.removeItem('spaceName');
  localStorage.removeItem('spaceSession');
  localStorage.removeItem('displayName');
  localStorage.removeItem('senderName');
  localStorage.removeItem('userName');
}

export function hasActiveSession() {
  return Boolean(getSavedSpaceId() && getSavedDisplayName());
}
