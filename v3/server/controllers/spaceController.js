import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import CoupleSpace from '../models/CoupleSpace.js';
import Activity from '../models/Activity.js';
import Memory from '../models/Memory.js';
import Message from '../models/Message.js';

const ACCESS_CODE_SALT_ROUNDS = 10;

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeSpaceName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeAccessCode(value) {
  return String(value || '').trim();
}

function isSixDigitAccessCode(value) {
  return /^\d{6}$/.test(value);
}

async function verifyAccessCode(plainCode, storedCode) {
  // Backward-compatible path for older plaintext records.
  if (!storedCode || !String(storedCode).startsWith('$2')) {
    return plainCode === String(storedCode || '').trim();
  }

  return bcrypt.compare(plainCode, storedCode);
}

async function findSpaceByName(spaceName) {
  const normalized = normalizeSpaceName(spaceName);
  if (!normalized) return null;
  return CoupleSpace.findOne({ spaceName: normalized });
}

function toDayKey(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getDaysActive(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.floor((toDayKey(end) - toDayKey(start)) / 86400000) + 1;
  return Math.max(1, diff);
}

function hasMember(space, displayName) {
  const normalized = normalizeText(displayName).toLowerCase();
  return (
    normalizeText(space.friendOneName).toLowerCase() === normalized ||
    normalizeText(space.friendTwoName).toLowerCase() === normalized
  );
}

function toSafeSpace(spaceDoc) {
  if (!spaceDoc) return null;
  const space = typeof spaceDoc.toObject === 'function' ? spaceDoc.toObject() : { ...spaceDoc };
  const { accessCode, ...safeSpace } = space;
  return safeSpace;
}

async function buildOverview(space) {
  const [memories, activities, totalPings, totalMemories, totalMessages] = await Promise.all([
    Memory.find({ spaceId: space._id }).sort({ createdAt: -1 }).lean(),
    Activity.find({ spaceId: space._id }).sort({ createdAt: -1 }).lean(),
    Activity.countDocuments({ spaceId: space._id, type: 'ping' }),
    Memory.countDocuments({ spaceId: space._id }),
    Message.countDocuments({ spaceId: space._id }),
  ]);

  const lastActivity = activities[0] || null;

  return {
    space: {
      _id: space._id,
      spaceName: space.spaceName,
      friendOneName: space.friendOneName,
      friendTwoName: space.friendTwoName,
      createdAt: space.createdAt,
      retentionHours: space.retentionHours ?? 168,
    },
    memories,
    activityTimeline: activities,
    lastInteractionAt: lastActivity ? lastActivity.createdAt : space.createdAt,
    stats: {
      totalMessages,
      totalPings,
      memoriesShared: totalMemories,
      daysActive: getDaysActive(space.createdAt, lastActivity ? lastActivity.createdAt : new Date()),
    },
  };
}

// POST /api/spaces/create
export const createSpace = async (req, res) => {
  const spaceName = normalizeSpaceName(req.body.spaceName);
  const friendOneName = normalizeText(req.body.friendOneName);
  const friendTwoName = normalizeText(req.body.friendTwoName);
  const accessCode = normalizeAccessCode(req.body.accessCode);

  if (!spaceName || !friendOneName || !friendTwoName || !accessCode) {
    return res.status(400).json({ message: 'spaceName, friendOneName, friendTwoName, and accessCode are required' });
  }

  if (!isSixDigitAccessCode(accessCode)) {
    return res.status(400).json({ message: 'Access code must be exactly 6 digits' });
  }

  try {
    const existing = await findSpaceByName(spaceName);
    if (existing) {
      return res.status(409).json({ message: 'A space with that name already exists' });
    }

    const hashedCode = await bcrypt.hash(accessCode, ACCESS_CODE_SALT_ROUNDS);

    const space = await CoupleSpace.create({
      spaceName,
      friendOneName,
      friendTwoName,
      accessCode: hashedCode,
    });

    await Activity.create({
      spaceId: space._id,
      type: 'joined',
      actor: friendOneName,
      description: `${friendOneName} created the space`,
    });

    return res.status(201).json(toSafeSpace(space));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'A space with that name already exists' });
    }

    if (error?.name === 'ValidationError') {
      const firstMessage = Object.values(error.errors || {})[0]?.message;
      return res.status(400).json({ message: firstMessage || 'Invalid create space payload' });
    }

    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/spaces/join
export const joinSpace = async (req, res) => {
  console.log('Join request received');

  const spaceName = normalizeSpaceName(req.body.spaceName);
  const accessCode = normalizeAccessCode(req.body.accessCode);

  if (!spaceName || !accessCode) {
    return res.status(400).json({ message: 'spaceName and accessCode are required' });
  }

  if (!isSixDigitAccessCode(accessCode)) {
    return res.status(400).json({ message: 'Access code must be exactly 6 digits' });
  }

  try {
    const space = await findSpaceByName(spaceName);

    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const isValid = await verifyAccessCode(accessCode, space.accessCode);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid access code' });
    }

    return res.json(toSafeSpace(space));
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/spaces/:spaceId/identify
export const identifySpaceUser = async (req, res) => {
  const { spaceId } = req.params;
  const displayName = normalizeText(req.body?.displayName || req.headers['x-user-name']);

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  if (!displayName) {
    return res.status(400).json({ message: 'Display name is required' });
  }

  try {
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    if (!hasMember(space, displayName)) {
      return res.status(403).json({ message: 'Invalid identity for this space' });
    }

    const existingJoin = await Activity.findOne({
      spaceId,
      type: 'joined',
      actor: displayName,
    });

    if (!existingJoin) {
      await Activity.create({
        spaceId,
        type: 'joined',
        actor: displayName,
        description: `${displayName} joined the space`,
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/spaces/:spaceId/overview
export const getSpaceOverview = async (req, res) => {
  const { spaceId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const overview = await buildOverview(space);
    return res.json(overview);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/spaces/:spaceId/ping
export const sendPing = async (req, res) => {
  const { spaceId } = req.params;
  const displayName = normalizeText(req.body.displayName);

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  if (!displayName) {
    return res.status(400).json({ message: 'Display name is required' });
  }

  try {
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    if (!hasMember(space, displayName)) {
      return res.status(403).json({ message: 'Only members can interact in this space' });
    }

    const activity = await Activity.create({
      spaceId: space._id,
      type: 'ping',
      actor: displayName,
      description: `${displayName} sent a ping`,
    });

    return res.status(201).json(activity);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/spaces/:spaceId/memories
export const addMemory = async (req, res) => {
  const { spaceId } = req.params;
  const displayName = normalizeText(req.body.displayName);
  const title = normalizeText(req.body.title);
  const note = normalizeText(req.body.note);
  const imageUrl = normalizeText(req.body.imageUrl);

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  if (!displayName || !title || !note) {
    return res.status(400).json({ message: 'Display name, title, and note are required' });
  }

  try {
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    if (!hasMember(space, displayName)) {
      return res.status(403).json({ message: 'Only members can add memories in this space' });
    }

    const memory = await Memory.create({
      spaceId: space._id,
      title,
      note,
      imageUrl,
      createdBy: displayName,
    });

    await Activity.create({
      spaceId: space._id,
      type: 'memory',
      actor: displayName,
      description: `${displayName} added a memory: ${title}`,
    });

    return res.status(201).json(memory);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/spaces/:spaceId/update-name
export const updateDisplayName = async (req, res) => {
  const { spaceId } = req.params;
  const newName = normalizeText(req.body.newName);
  const oldName = normalizeText(req.headers['x-user-name']);

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  if (!newName) {
    return res.status(400).json({ message: 'New name is required' });
  }

  try {
    const space = await CoupleSpace.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Determine which friend is updating their name
    const normalizedOldName = normalizeText(oldName).toLowerCase();
    const isFriendOne = normalizeText(space.friendOneName).toLowerCase() === normalizedOldName;
    const isFriendTwo = normalizeText(space.friendTwoName).toLowerCase() === normalizedOldName;

    if (!isFriendOne && !isFriendTwo) {
      return res.status(403).json({ message: 'Only members can update their name' });
    }

    const actualOldName = isFriendOne ? space.friendOneName : space.friendTwoName;
    const updateObj = isFriendOne ? { friendOneName: newName } : { friendTwoName: newName };

    const spaceUpdate = await CoupleSpace.findByIdAndUpdate(
      spaceId,
      updateObj,
      { new: true, runValidators: true }
    );

    // Cascade name changes across collections so history doesn't break
    await Promise.all([
      Message.updateMany({ spaceId, sender: actualOldName }, { sender: newName }),
      Activity.updateMany({ spaceId, createdBy: actualOldName }, { createdBy: newName }),
      Memory.updateMany({ spaceId, createdBy: actualOldName }, { createdBy: newName })
    ]);

    return res.json({ success: true, space: toSafeSpace(spaceUpdate) });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/spaces/:spaceId/retention
export const updateRetention = async (req, res) => {
  const { spaceId } = req.params;
  const retentionHours = Number(req.body.retentionHours);

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  if (![42, 72, 168, 240].includes(retentionHours)) {
    return res.status(400).json({ message: 'Invalid retention period. Must be 42, 72, 168, or 240 hours.' });
  }

  try {
    const space = await CoupleSpace.findByIdAndUpdate(
      spaceId,
      { retentionHours },
      { new: true, runValidators: true }
    );
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }
    return res.json({ retentionHours: space.retentionHours });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
