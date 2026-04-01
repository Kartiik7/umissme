import {
  activities,
  firstUnreadMessageId,
  memories,
  seedMessages,
} from '../data/mockData'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isSameDay = (dateA, dateB) => dateA.toDateString() === dateB.toDateString()

function toMessageDateLabel(isoDate) {
  const messageDate = new Date(isoDate)
  const today = new Date()

  if (isSameDay(messageDate, today)) {
    return 'Today'
  }

  return messageDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function toMessageTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function withAuthHeaders(spaceId, userName) {
  return {
    'x-space-id': spaceId,
    'x-user-name': userName,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`)
  }

  return payload
}

export async function createSpace(payload) {
  return request('/spaces/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function joinSpace(payload) {
  return request('/spaces/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function identifySpaceUser(spaceId, displayName) {
  return request(`/spaces/${spaceId}/identify`, {
    method: 'POST',
    headers: withAuthHeaders(spaceId, displayName),
    body: JSON.stringify({
      spaceId,
      displayName,
    }),
  })
}

export async function fetchConversation({ spaceId, identity }) {
  try {
    const [overview, rawMessages] = await Promise.all([
      request(`/spaces/${spaceId}/overview`, {
        headers: withAuthHeaders(spaceId, identity),
      }),
      request(`/messages/${spaceId}`, {
        headers: withAuthHeaders(spaceId, identity),
      }),
    ])

    const friendName =
      overview.space.friendOneName.toLowerCase() === identity.toLowerCase()
        ? overview.space.friendTwoName
        : overview.space.friendOneName

    const mappedMessages = rawMessages.map((message) => ({
      id: message._id,
      sender: message.sender.toLowerCase() === identity.toLowerCase() ? 'me' : 'friend',
      text: message.text,
      dateLabel: toMessageDateLabel(message.createdAt),
      time: toMessageTime(message.createdAt),
      read: Boolean(message.seen),
    }))

    const firstUnread = mappedMessages.find(
      (message) => message.sender === 'friend' && !message.read,
    )

    return {
      friendName,
      online: false,
      lastSeen: 'Last seen recently',
      typing: false,
      firstUnreadMessageId: firstUnread?.id || null,
      messages: mappedMessages,
      memories: overview.memories.map((memory) => ({
        id: memory._id,
        title: memory.title,
        note: memory.note,
        date: new Date(memory.createdAt).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      })),
      activities: overview.activityTimeline.map((activity) => ({
        id: activity._id,
        type: activity.type,
        content: activity.description,
        time: new Date(activity.createdAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    }
  } catch {
    await delay(650)

    return {
      friendName: 'Abhi',
      online: true,
      lastSeen: 'last seen 3m ago',
      typing: false,
      firstUnreadMessageId,
      messages: seedMessages,
      memories,
      activities,
    }
  }
}

export async function sendMessage(payload) {
  try {
    const result = await request('/messages/send', {
      method: 'POST',
      headers: withAuthHeaders(payload.spaceId, payload.sender),
      body: JSON.stringify(payload),
    })
    return result
  } catch {
    await delay(250)

    return {
      ...payload,
      id: `m-${Date.now()}`,
    }
  }
}

export async function sendPing(spaceId, displayName) {
  try {
    const result = await request(`/spaces/${spaceId}/ping`, {
      method: 'POST',
      headers: withAuthHeaders(spaceId, displayName),
      body: JSON.stringify({ displayName }),
    })
    return result
  } catch {
    await delay(220)

    return {
      ok: true,
      label: 'Ping sent',
    }
  }
}

export { API_BASE }
