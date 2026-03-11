import mongoose from 'mongoose';
import Message from '../models/Message.js';
import CoupleSpace from '../models/CoupleSpace.js';

// POST /api/messages/send
export const sendMessage = async (req, res) => {
  const { spaceId, sender, text } = req.body;

  if (!spaceId || !sender || !text) {
    return res.status(400).json({ message: 'spaceId, sender, and text are required' });
  }

  const trimmedText = String(text).trim();
  const trimmedSender = String(sender).trim();

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
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const message = await Message.create({
      spaceId,
      sender: trimmedSender,
      text: trimmedText,
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages/:spaceId
export const getMessages = async (req, res) => {
  const { spaceId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const messages = await Message.find({ spaceId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/messages/mark-seen/:spaceId
export const markMessagesSeen = async (req, res) => {
  const { spaceId } = req.params;
  const { sender } = req.body;

  if (!sender) {
    return res.status(400).json({ message: 'sender is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const result = await Message.updateMany(
      {
        spaceId,
        sender: { $ne: sender.trim() },
        seen: false,
      },
      {
        seen: true,
        seenAt: new Date(),
      }
    );
    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages/:spaceId/last
export const getLastMessage = async (req, res) => {
  const { spaceId } = req.params;

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
