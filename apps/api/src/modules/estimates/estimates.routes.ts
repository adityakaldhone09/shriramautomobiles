import { Router } from 'express';
import { estimatesController } from './estimates.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const estimatesRouter = Router();

estimatesRouter.get('/:bookingId', (req, res) => estimatesController.getEstimate(req, res));
estimatesRouter.post('/:bookingId', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => estimatesController.createEstimate(req, res));
estimatesRouter.post('/:bookingId/approve', requireAuth, (req, res) => estimatesController.approveEstimate(req, res));
