import { Router } from 'express';
import { sendMessage, getMessages, getLastMessage, markMessagesSeen } from '../controllers/messageController.js';

const router = Router();

router.post('/send', sendMessage);
router.put('/mark-seen/:spaceId', markMessagesSeen);
router.get('/:spaceId', getMessages);
router.get('/:spaceId/last', getLastMessage);

export default router;
