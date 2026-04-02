import mongoose from 'mongoose';
import CoupleSpace from '../models/CoupleSpace.js';
import Message from '../models/Message.js';
import {
  buildUserId,
  REDIS_KEYS,
  spaceMembersKey,
  userSocketsKey,
  socketUserKey,
} from '../pubsub/channels.js';
import { publishMessageStatus } from '../pubsub/publisher.js';

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

async function getSpaceMembers(redisPublisher, spaceId) {
  const cacheKey = spaceMembersKey(spaceId);
  const cached = await redisPublisher.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const space = await CoupleSpace.findById(spaceId)
    .select('friendOneName friendTwoName friendOneLastSeenAt friendTwoLastSeenAt')
    .lean();

  if (!space) return null;

  const payload = {
    friendOneName: space.friendOneName,
    friendTwoName: space.friendTwoName,
    friendOneLastSeenAt: space.friendOneLastSeenAt,
    friendTwoLastSeenAt: space.friendTwoLastSeenAt,
  };

  await redisPublisher.set(cacheKey, JSON.stringify(payload), 'EX', 300);
  return payload;
}

async function persistLastSeen(spaceId, userName, lastSeenAt) {
  const space = await CoupleSpace.findById(spaceId)
    .select('friendOneName friendTwoName')
    .lean();

  if (!space) return;

  const update =
    normalizeName(userName) === normalizeName(space.friendOneName)
      ? { friendOneLastSeenAt: lastSeenAt }
      : normalizeName(userName) === normalizeName(space.friendTwoName)
        ? { friendTwoLastSeenAt: lastSeenAt }
        : null;

  if (!update) return;

  await CoupleSpace.findByIdAndUpdate(spaceId, { $set: update });
}

async function buildLastSeenList(redisPublisher, spaceId) {
  const members = await getSpaceMembers(redisPublisher, spaceId);
  if (!members) return [];

  return [
    {
      userName: members.friendOneName,
      lastSeen: members.friendOneLastSeenAt,
    },
    {
      userName: members.friendTwoName,
      lastSeen: members.friendTwoLastSeenAt,
    },
  ];
}

async function canJoinSpaceRoom(redisPublisher, spaceId, userName) {
  const trimmedSpaceId = String(spaceId || '').trim();
  const trimmedUserName = String(userName || '').trim();

  if (!trimmedSpaceId || !trimmedUserName) return false;
  if (!mongoose.Types.ObjectId.isValid(trimmedSpaceId)) return false;

  const members = await getSpaceMembers(redisPublisher, trimmedSpaceId);
  if (!members) return false;

  const normalized = normalizeName(trimmedUserName);
  return [members.friendOneName, members.friendTwoName]
    .map(normalizeName)
    .includes(normalized);
}

function resolveAuthorizedEventContext(socket, payloadSpaceId, payloadUserName) {
  const requestedSpaceId = String(payloadSpaceId || '').trim();
  const requestedUserName = String(payloadUserName || '').trim();
  const context = socket.data.session;

  if (!context) return null;
  if (!requestedSpaceId || !requestedUserName) return null;
  if (!mongoose.Types.ObjectId.isValid(requestedSpaceId)) return null;
  if (context.spaceId !== requestedSpaceId) return null;
  if (normalizeName(context.userName) !== normalizeName(requestedUserName)) return null;
  if (!socket.rooms.has(context.userId)) return null;

  return context;
}

async function upsertSocketSession(redisClient, socket, spaceId, userName) {
  const userId = buildUserId(spaceId, userName);
  socket.data.session = { spaceId, userName, userId };
  const nowIso = new Date().toISOString();
  const presencePayload = JSON.stringify({
    userId,
    spaceId,
    userName,
    lastSeen: null,
    updatedAt: nowIso,
  });

  await redisClient.multi()
    .set(socketUserKey(socket.id), userId, 'EX', 60 * 60 * 24)
    .sadd(userSocketsKey(userId), socket.id)
    .expire(userSocketsKey(userId), 60 * 60 * 24)
    .hincrby(REDIS_KEYS.USER_SOCKET_COUNT_HASH, userId, 1)
    .sadd(REDIS_KEYS.ONLINE_USERS, userId)
    .hset(REDIS_KEYS.ONLINE_USERS_HASH, userId, presencePayload)
    .exec();

  return userId;
}

async function markPendingDelivered(redisPublisher, spaceId, userName, partnerName) {
  const senderId = buildUserId(spaceId, partnerName);
  const receiverId = buildUserId(spaceId, userName);

  const pendingMessages = await Message.find(
    {
      spaceId,
      sender: partnerName,
      delivered: false,
    },
    { _id: 1 }
  ).lean();

  if (!pendingMessages.length) return;

  const deliveredAt = new Date();
  const pendingIds = pendingMessages.map((entry) => entry._id);
  await Message.updateMany(
    { _id: { $in: pendingIds } },
    {
      $set: {
        delivered: true,
        deliveredAt,
      },
    }
  );

  await Promise.all(
    pendingIds.map((messageId) =>
      publishMessageStatus(redisPublisher, {
        eventId: `status:delivered:${messageId}:${deliveredAt.getTime()}`,
        spaceId,
        messageId: String(messageId),
        sender: partnerName,
        receiver: userName,
        senderId,
        receiverId,
        status: 'delivered',
        updatedAt: deliveredAt.toISOString(),
      })
    )
  );
}

async function emitOnlineUsers(io, redisClient, spaceId) {
  const onlineUsersMap = await redisClient.hgetall(REDIS_KEYS.ONLINE_USERS_HASH);
  const users = Object.entries(onlineUsersMap)
    .filter(([_userId, serialized]) => {
      try {
        const payload = JSON.parse(serialized);
        return payload?.spaceId === spaceId;
      } catch (_error) {
        return false;
      }
    })
    .map(([userId]) => userId);

  io.to(spaceId).emit('online_users', { users });
}

async function emitPresenceState(io, redisClient, spaceId, excludeUserName = '') {
  const [onlineUsersMap, lastSeenList] = await Promise.all([
    redisClient.hgetall(REDIS_KEYS.ONLINE_USERS_HASH),
    buildLastSeenList(redisClient, spaceId),
  ]);

  const exclude = normalizeName(excludeUserName);
  const online = Object.values(onlineUsersMap)
    .map((serialized) => {
      try {
        return JSON.parse(serialized);
      } catch (_error) {
        return null;
      }
    })
    .filter((entry) => entry && entry.spaceId === spaceId)
    .map((entry) => normalizeName(entry.userName))
    .filter((name) => name && name !== exclude);

  const lastSeen = lastSeenList
    .filter((entry) => normalizeName(entry.userName) !== exclude)
    .map((entry) => ({
      userName: entry.userName,
      lastSeen: entry.lastSeen ? new Date(entry.lastSeen).toISOString() : null,
    }));

  io.to(spaceId).emit('presence-state', { online, lastSeen });
}

export function setupSocket({ io, redisPublisher, redisClient }) {
  io.on('connection', (socket) => {
    console.log('[socket] connected', socket.id);

    socket.on('join-space', async ({ spaceId, userName }) => {
      const authorized = await canJoinSpaceRoom(redisPublisher, spaceId, userName).catch((error) => {
        console.error('[socket] join-space authorize error:', error.message);
        return false;
      });

      if (!authorized) {
        socket.emit('join-error', { message: 'Unauthorized room join.' });
        return;
      }

      try {
        const userId = await upsertSocketSession(redisClient, socket, spaceId, userName);
        socket.join(spaceId);
        socket.join(userId);

        socket.emit('joined-space', { spaceId, userName, userId });
        io.to(spaceId).emit('user_status', { userId, status: 'online' });
        socket.to(spaceId).emit('user-online', { userName });
        await emitOnlineUsers(io, redisClient, spaceId);
        await emitPresenceState(io, redisClient, spaceId, '');

        const lastSeen = await buildLastSeenList(redisClient, spaceId);
        const partnerName = lastSeen
          .map((entry) => entry.userName)
          .find((name) => normalizeName(name) !== normalizeName(userName));

        if (partnerName) {
          await markPendingDelivered(redisPublisher, spaceId, userName, partnerName);
        }

        console.log('[socket] join-space', socket.id, spaceId, userName);
      } catch (error) {
        console.error('[socket] join-space error:', error.message);
        socket.emit('join-error', { message: 'Join failed. Please retry.' });
      }
    });

    socket.on('typing', ({ spaceId, userName }) => {
      const context = resolveAuthorizedEventContext(socket, spaceId, userName);
      if (!context) return;

      socket.to(context.spaceId).emit('user-typing', {
        userName: context.userName,
      });
    });

    socket.on('stop-typing', ({ spaceId, userName }) => {
      const context = resolveAuthorizedEventContext(socket, spaceId, userName);
      if (!context) return;

      socket.to(context.spaceId).emit('user-stop-typing', {
        userName: context.userName,
      });
    });

    socket.on('message-sent', ({ spaceId, userName }) => {
      const context = resolveAuthorizedEventContext(socket, spaceId, userName);
      if (!context) return;

      // Message propagation is handled through API -> Redis pub/sub to avoid duplicates.
      console.log('[socket] message-sent ack', context.spaceId, context.userName);
    });

    socket.on('mark-seen', async ({ spaceId, reader }) => {
      const context = resolveAuthorizedEventContext(socket, spaceId, reader);
      if (!context) return;

      // Seen updates are persisted by HTTP endpoint to avoid heavy socket-side DB operations.
      console.log('[socket] mark-seen ack', context.spaceId, context.userId);
    });

    socket.on('disconnect', async () => {
      let session = socket.data.session;
      if (!session) {
        const storedUserId = await redisClient.get(socketUserKey(socket.id));
        if (storedUserId) {
          const splitIndex = storedUserId.indexOf(':');
          if (splitIndex > 0) {
            session = {
              spaceId: storedUserId.slice(0, splitIndex),
              userName: storedUserId.slice(splitIndex + 1),
              userId: storedUserId,
            };
          }
        }
      }

      if (!session?.spaceId || !session?.userName || !session?.userId) {
        console.log('[socket] disconnect (no session)', socket.id);
        return;
      }

      const { spaceId, userName, userId } = session;
      const socketSet = userSocketsKey(userId);

      try {
        await redisClient.multi()
          .srem(socketSet, socket.id)
          .del(socketUserKey(socket.id))
          .hincrby(REDIS_KEYS.USER_SOCKET_COUNT_HASH, userId, -1)
          .exec();

        const remainingSockets = await redisClient.scard(socketSet);
        if (remainingSockets > 0) {
          console.log('[socket] disconnect kept-online', socket.id, userName);
          return;
        }

        const lastSeen = new Date();
        await redisClient.multi()
          .srem(REDIS_KEYS.ONLINE_USERS, userId)
          .hdel(REDIS_KEYS.ONLINE_USERS_HASH, userId)
          .hdel(REDIS_KEYS.USER_SOCKET_COUNT_HASH, userId)
          .exec();
        await persistLastSeen(spaceId, userName, lastSeen);

        io.to(spaceId).emit('user_status', {
          userId,
          status: 'offline',
          lastSeen: lastSeen.toISOString(),
        });
        io.to(spaceId).emit('user-last-seen', {
          userName,
          lastSeen: lastSeen.toISOString(),
        });
        await emitOnlineUsers(io, redisClient, spaceId);
        await emitPresenceState(io, redisClient, spaceId, '');

        console.log('[socket] disconnect offline', socket.id, userName);
      } catch (error) {
        console.error('[socket] disconnect error:', error.message);
      }
    });
  });
}
