import mongoose from 'mongoose';
import Message from '../models/Message.js';
import CoupleSpace from '../models/CoupleSpace.js';
import Activity from '../models/Activity.js';

// POST /api/messages/send
export const sendMessage = async (req, res) => {
  const { text } = req.body;
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
    const space = req.authorizedSpace || (await CoupleSpace.findById(spaceId).select('retentionHours').lean());
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (space.retentionHours ?? 168));

    const message = await Message.create({
      spaceId,
      sender,
      text: trimmedText,
      sent: true,
      delivered: false,
      expiresAt,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(spaceId).emit('message-created', { message });
      io.to(spaceId).emit('messages-updated', { sender });
    }

    await Activity.create({
      spaceId,
      type: 'message',
      actor: sender,
      description: `${sender} sent a message`,
    });

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
    const result = await Message.updateMany(
      {
        spaceId,
        sender: { $ne: sender },
        seen: false,
      },
      {
        seen: true,
        seenAt: new Date(),
        delivered: true,
        deliveredAt: new Date(),
      }
    );

    const io = req.app.get('io');
    if (io && result.modifiedCount > 0) {
      io.to(spaceId).emit('messages-read', { reader: sender });
    }

    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
