import { Router } from 'express';
import { sendMessage, getMessages, getLastMessage, markMessagesSeen } from '../controllers/messageController.js';
import { authorizeSpaceAccess } from '../middleware/spaceAuthorization.js';

const router = Router();

router.post('/send', authorizeSpaceAccess, sendMessage);
router.put('/mark-seen/:spaceId', authorizeSpaceAccess, markMessagesSeen);
router.get('/:spaceId', authorizeSpaceAccess, getMessages);
router.get('/:spaceId/last', authorizeSpaceAccess, getLastMessage);

export default router;
