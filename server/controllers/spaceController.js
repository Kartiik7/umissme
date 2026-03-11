import CoupleSpace from '../models/CoupleSpace.js';

// POST /api/spaces/create
export const createSpace = async (req, res) => {
  const { spaceName, partnerOneName, partnerTwoName, accessCode } = req.body;

  if (!spaceName || !partnerOneName || !partnerTwoName || !accessCode) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await CoupleSpace.findOne({ spaceName: spaceName.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'A space with that name already exists' });
    }

    const space = await CoupleSpace.create({
      spaceName,
      partnerOneName,
      partnerTwoName,
      accessCode,
    });

    res.status(201).json(space);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/spaces/join
export const joinSpace = async (req, res) => {
  const { spaceName, accessCode } = req.body;

  if (!spaceName || !accessCode) {
    return res.status(400).json({ message: 'Space name and access code are required' });
  }

  try {
    const space = await CoupleSpace.findOne({ spaceName: spaceName.toLowerCase() });

    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    if (space.accessCode !== accessCode) {
      return res.status(401).json({ message: 'Invalid access code' });
    }

    res.json(space);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
