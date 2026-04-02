export const REDIS_CHANNELS = {
  CHAT_MESSAGES: 'chat_messages',
  MESSAGE_STATUS: 'message_status',
};

export const REDIS_KEYS = {
  ONLINE_USERS: 'online_users',
  ONLINE_USERS_HASH: 'online_users_hash',
  MESSAGE_STATUS_PREFIX: 'msg:',
  USER_SOCKETS_PREFIX: 'user_sockets:',
  SOCKET_USER_PREFIX: 'socket_user:',
  USER_SOCKET_COUNT_HASH: 'user_socket_count',
  SPACE_MEMBERS_PREFIX: 'space_members:',
  EVENT_DEDUPE_PREFIX: 'event_dedupe:',
};

export function buildUserId(spaceId, userName) {
  return `${spaceId}:${String(userName || '').trim().toLowerCase()}`;
}

export function userSocketsKey(userId) {
  return `${REDIS_KEYS.USER_SOCKETS_PREFIX}${userId}`;
}

export function socketUserKey(socketId) {
  return `${REDIS_KEYS.SOCKET_USER_PREFIX}${socketId}`;
}

export function messageStatusKey(messageId) {
  return `${REDIS_KEYS.MESSAGE_STATUS_PREFIX}${messageId}`;
}

export function eventDedupeKey(eventId) {
  return `${REDIS_KEYS.EVENT_DEDUPE_PREFIX}${eventId}`;
}

export function spaceMembersKey(spaceId) {
  return `${REDIS_KEYS.SPACE_MEMBERS_PREFIX}${spaceId}`;
}
