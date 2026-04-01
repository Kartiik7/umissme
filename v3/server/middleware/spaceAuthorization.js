import mongoose from 'mongoose';
import CoupleSpace from '../models/CoupleSpace.js';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export async function authorizeSpaceAccess(req, res, next) {
  const headerSpaceId = String(req.headers['x-space-id'] || '').trim();
  const headerUserName = String(req.headers['x-user-name'] || '').trim();
  const targetSpaceId = String(req.params.spaceId || req.body.spaceId || '').trim();

  if (!headerSpaceId || !headerUserName) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (!targetSpaceId) {
    return res.status(400).json({ message: 'Space ID is required' });
  }

  if (headerSpaceId !== targetSpaceId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (!mongoose.Types.ObjectId.isValid(targetSpaceId)) {
    return res.status(400).json({ message: 'Invalid space ID' });
  }

  try {
    const space = await CoupleSpace.findById(targetSpaceId)
      .select('friendOneName friendTwoName retentionHours')
      .lean();

    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const memberNames = [space.friendOneName, space.friendTwoName].map(normalize);
    if (!memberNames.includes(normalize(headerUserName))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const actor = req.body.displayName || req.body.sender;
    if (actor && normalize(actor) !== normalize(headerUserName)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    req.authorizedSpaceId = targetSpaceId;
    req.authorizedUserName = headerUserName;
    req.authorizedSpace = space;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
