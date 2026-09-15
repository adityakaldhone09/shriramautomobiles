import { Router, type IRouter } from 'express';
import { createMechanic, listMechanics } from '../controllers/mechanicController';
import { requireAuth, requireRole } from '../middlewares/auth';

const router: IRouter = Router();
router.get('/mechanics', listMechanics);
router.get('/mechanics/available', listMechanics);
router.post('/mechanics', requireAuth, requireRole('ADMIN', 'STAFF'), createMechanic);
export default router;
