import { REDIS_CHANNELS, messageStatusKey } from './channels.js';

const STATUS_TTL_SECONDS = 60 * 60 * 24;

export async function publishChatMessage(redisPublisher, payload) {
  const body = JSON.stringify(payload);
  console.log('[pubsub] publish chat_messages', payload.eventId, payload.message?._id);
  await redisPublisher.publish(REDIS_CHANNELS.CHAT_MESSAGES, body);
}

export async function publishMessageStatus(redisPublisher, payload) {
  const body = JSON.stringify(payload);
  console.log('[pubsub] publish message_status', payload.eventId, payload.messageId, payload.status);
  await redisPublisher.publish(REDIS_CHANNELS.MESSAGE_STATUS, body);
}

export async function setMessageStatus(redisClient, payload) {
  if (!payload?.messageId) return;

  await redisClient.hset(messageStatusKey(payload.messageId), {
    status: payload.status,
    sender: payload.sender,
    receiver: payload.receiver,
    senderId: payload.senderId,
    receiverId: payload.receiverId,
    updatedAt: payload.updatedAt,
  });
  await redisClient.expire(messageStatusKey(payload.messageId), STATUS_TTL_SECONDS);
}
