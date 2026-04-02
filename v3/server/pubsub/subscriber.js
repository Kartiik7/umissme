import Message from '../models/Message.js';
import { REDIS_CHANNELS, eventDedupeKey } from './channels.js';
import { publishMessageStatus, setMessageStatus } from './publisher.js';

function parsePayload(channel, rawData) {
  try {
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`[pubsub] invalid payload on ${channel}:`, error.message);
    return null;
  }
}

async function shouldProcessEvent(redisClient, eventId) {
  if (!eventId) return false;
  const result = await redisClient.set(eventDedupeKey(eventId), '1', 'EX', 120, 'NX');
  return result === 'OK';
}

async function emitToUserRoom(io, userId, eventName, payload) {
  io.to(userId).emit(eventName, payload);
  const room = io.sockets.adapter.rooms.get(userId);
  return Boolean(room?.size);
}

async function handleChatMessage(io, redisPublisher, redisClient, payload) {
  if (!(await shouldProcessEvent(redisClient, payload.eventId))) return;

  const { spaceId, message, sender, receiver, senderId, receiverId } = payload;
  if (!spaceId || !message?._id || !sender || !receiver || !senderId || !receiverId) return;

  console.log('[pubsub] receive chat_messages', payload.eventId, message._id);
  const delivered = await emitToUserRoom(io, receiverId, 'message-created', { message });
  io.to(spaceId).emit('messages-updated', { sender });

  if (!delivered) {
    return;
  }

  const deliveredAt = new Date();
  await Message.updateOne(
    { _id: message._id, delivered: false },
    {
      $set: {
        delivered: true,
        deliveredAt,
      },
    }
  );

  await publishMessageStatus(redisPublisher, {
    eventId: `status:delivered:${message._id}:${deliveredAt.getTime()}`,
    spaceId,
    messageId: String(message._id),
    sender,
    receiver,
    senderId,
    receiverId,
    status: 'delivered',
    updatedAt: deliveredAt.toISOString(),
  });
}

async function handleMessageStatus(io, redisClient, payload) {
  if (!(await shouldProcessEvent(redisClient, payload.eventId))) return;

  const { spaceId, messageId, sender, receiver, senderId, receiverId, status, updatedAt } = payload;
  if (!spaceId || !messageId || !sender || !receiver || !senderId || !receiverId || !status) return;

  await setMessageStatus(redisClient, payload);
  console.log('[pubsub] receive message_status', payload.eventId, messageId, status);

  if (status === 'sent') {
    await emitToUserRoom(io, senderId, 'message-sent-status', {
      receiver,
      messageId,
      sentAt: updatedAt,
    });
    return;
  }

  if (status === 'delivered') {
    await emitToUserRoom(io, senderId, 'message-delivered', {
      receiver,
      messageId,
      deliveredAt: updatedAt,
    });
    return;
  }

  if (status === 'seen') {
    await emitToUserRoom(io, senderId, 'messages-read', {
      reader: receiver,
      messageId,
      seenAt: updatedAt,
    });
  }
}

export async function startPubSub({ io, redisPublisher, redisSubscriber, redisClient }) {
  redisSubscriber.on('message', async (channel, rawData) => {
    const payload = parsePayload(channel, rawData);
    if (!payload) return;

    try {
      if (channel === REDIS_CHANNELS.CHAT_MESSAGES) {
        await handleChatMessage(io, redisPublisher, redisClient, payload);
      } else if (channel === REDIS_CHANNELS.MESSAGE_STATUS) {
        await handleMessageStatus(io, redisClient, payload);
      }
    } catch (error) {
      console.error(`[pubsub] handler error on ${channel}:`, error.message);
    }
  });

  await redisSubscriber.subscribe(REDIS_CHANNELS.CHAT_MESSAGES, REDIS_CHANNELS.MESSAGE_STATUS);

  console.log('[pubsub] subscriber ready', Object.values(REDIS_CHANNELS).join(', '));
}
