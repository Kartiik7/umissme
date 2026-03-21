import { Router } from 'express';
import {
	createSpace,
	joinSpace,
	identifySpaceUser,
	getSpaceOverview,
	sendPing,
	addMemory,
	updateRetention,
} from '../controllers/spaceController.js';
import { authorizeSpaceAccess } from '../middleware/spaceAuthorization.js';

const router = Router();

router.post('/create', createSpace);
router.post('/join', joinSpace);
router.use('/:spaceId', authorizeSpaceAccess);
router.post('/:spaceId/identify', identifySpaceUser);
router.get('/:spaceId/overview', getSpaceOverview);
router.post('/:spaceId/ping', sendPing);
router.post('/:spaceId/memories', addMemory);
router.put('/:spaceId/retention', updateRetention);

export default router;
