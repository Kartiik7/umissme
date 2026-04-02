import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import Message from '../models/Message.js';
import CoupleSpace from '../models/CoupleSpace.js';
import Activity from '../models/Activity.js';
import { publishChatMessage, publishMessageStatus, setMessageStatus } from '../pubsub/publisher.js';
import { buildUserId } from '../pubsub/channels.js';

// POST /api/messages/send
export const sendMessage = async (req, res) => {
  const { text, type = 'text' } = req.body;
  const spaceId = String(req.authorizedSpaceId || '').trim();
  const sender = String(req.authorizedUserName || '').trim();

  if (!spaceId || !sender) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (!text) {
    return res.status(400).json({ message: 'spaceId, sender, and text are required' });
  }

  const trimmedText = String(text).trim();

  if (!trimmedText) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }

  if (trimmedText.length > 500) {
    return res.status(400).json({ message: 'Message must be 500 characters or fewer' });
  }

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const space = req.authorizedSpace || (await CoupleSpace.findById(spaceId).select('retentionHours friendOneName friendTwoName').lean());
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (space.retentionHours ?? 168));

    const message = await Message.create({
      spaceId,
      sender,
      text: trimmedText,
      type,
      sent: true,
      delivered: false,
      expiresAt,
    });

    await Activity.create({
      spaceId,
      type: 'message',
      actor: sender,
      description: `${sender} sent a message`,
    });

    const receiver = normalizeMemberName(space.friendOneName, space.friendTwoName, sender);
    const redisPublisher = req.app.get('redisPublisher');
    const redisClient = req.app.get('redisClient');
    const senderId = buildUserId(spaceId, sender);
    const receiverId = receiver ? buildUserId(spaceId, receiver) : null;

    if (redisPublisher && redisClient && receiver && receiverId) {
      const sentAt = new Date().toISOString();

      await setMessageStatus(redisClient, {
        messageId: String(message._id),
        sender,
        receiver,
        senderId,
        receiverId,
        status: 'sent',
        updatedAt: sentAt,
      });

      await publishChatMessage(redisPublisher, {
        eventId: `chat:${message._id}:${randomUUID()}`,
        spaceId,
        sender,
        receiver,
        senderId,
        receiverId,
        message,
      });

      await publishMessageStatus(redisPublisher, {
        eventId: `status:sent:${message._id}:${randomUUID()}`,
        spaceId,
        messageId: String(message._id),
        sender,
        receiver,
        senderId,
        receiverId,
        status: 'sent',
        updatedAt: sentAt,
      });
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages/:spaceId
export const getMessages = async (req, res) => {
  const spaceId = String(req.authorizedSpaceId || '').trim();

  if (!spaceId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const messages = await Message.find({ spaceId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/messages/mark-seen/:spaceId
export const markMessagesSeen = async (req, res) => {
  const spaceId = String(req.authorizedSpaceId || '').trim();
  const sender = String(req.authorizedUserName || '').trim();

  if (!spaceId || !sender) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const unreadMessages = await Message.find(
      {
        spaceId,
        sender: { $ne: sender },
        seen: false,
      },
      { _id: 1, sender: 1 }
    ).lean();

    const seenAt = new Date();
    const unreadIds = unreadMessages.map((entry) => entry._id);

    if (unreadIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        {
          $set: {
            seen: true,
            seenAt,
            delivered: true,
            deliveredAt: seenAt,
          },
        }
      );

      const redisPublisher = req.app.get('redisPublisher');
      if (redisPublisher) {
        await Promise.all(
          unreadMessages.map((message) =>
            publishMessageStatus(redisPublisher, {
              eventId: `status:seen:${message._id}:${randomUUID()}`,
              spaceId,
              messageId: String(message._id),
              sender: message.sender,
              receiver: sender,
              senderId: buildUserId(spaceId, message.sender),
              receiverId: buildUserId(spaceId, sender),
              status: 'seen',
              updatedAt: seenAt.toISOString(),
            })
          )
        );
      }
    }

    res.json({ modifiedCount: unreadIds.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function normalizeMemberName(friendOneName, friendTwoName, sender) {
  const normalizedSender = String(sender || '').trim().toLowerCase();
  if (String(friendOneName || '').trim().toLowerCase() === normalizedSender) {
    return friendTwoName;
  }
  if (String(friendTwoName || '').trim().toLowerCase() === normalizedSender) {
    return friendOneName;
  }
  return null;
}

// GET /api/messages/:spaceId/last
export const getLastMessage = async (req, res) => {
  const spaceId = String(req.authorizedSpaceId || '').trim();

  if (!spaceId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const message = await Message.findOne({ spaceId }).sort({ createdAt: -1 });
    res.json(message || null);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
