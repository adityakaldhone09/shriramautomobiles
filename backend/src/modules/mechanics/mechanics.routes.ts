import { Router } from 'express';
import { mechanicsController } from './mechanics.controller';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const mechanicsRouter = Router();

mechanicsRouter.get('/', optionalAuth, (req, res) => mechanicsController.getMechanics(req, res));
mechanicsRouter.get('/slots', (req, res) => mechanicsController.getAvailableSlots(req, res));
mechanicsRouter.get(
  '/my-jobs',
  requireAuth,
  requireRole('MECHANIC', 'ADMIN', 'STAFF'),
  (req, res) => mechanicsController.getMyJobs(req, res)
);
