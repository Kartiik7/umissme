import { Router } from 'express';
import { createSpace, joinSpace } from '../controllers/spaceController.js';

const router = Router();

router.post('/create', createSpace);
router.post('/join', joinSpace);

export default router;
